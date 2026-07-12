// audio.js — Web Audio engine, lookahead scheduler, visualSync, and start/stop playback control.
    // ============================================
    // AUDIO ENGINE
    // Web Audio synth with a lookahead scheduler. Notes are scheduled
    // slightly ahead on the audio clock for rock-solid timing (the old
    // setInterval metronome drifted and jittered); a rAF loop syncs the
    // visuals to what is actually sounding.
    // ============================================

    const SCHEDULE_AHEAD_SEC = 0.12;   // How far ahead to schedule audio
    const SCHEDULER_INTERVAL_MS = 25;  // How often the scheduler wakes up

    const audioEngine = {
      ctx: null,
      master: null,       // persistent output chain (gain -> compressor)
      sessionGain: null,  // per-playback-session gain, faded out on stop
      session: 0,         // generation token: invalidates in-flight async starts
      beatCounter: 0,     // global beat index since playback started
      nextBeatTime: 0,    // audio-clock time of the next unscheduled beat
      schedulerId: null,
      rafId: null,
      loopBase: 0,        // loops completed before the current play span (survives pause/resume)
      auditionGain: null, // one-shot step-audition gain; replaced per audition, never the sessionGain
      visualQueue: []     // scheduled beats awaiting their visual update
    };

    function ensureAudioContext() {
      if (!audioEngine.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        audioEngine.ctx = new AC();
        const master = audioEngine.ctx.createGain();
        master.gain.value = 0.7;
        const comp = audioEngine.ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 6;
        master.connect(comp);
        comp.connect(audioEngine.ctx.destination);
        audioEngine.master = master;
      }
      if (audioEngine.ctx.state === 'suspended') {
        audioEngine.ctx.resume();
      }
      return true;
    }

    function midiToFreq(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    /**
     * A single EP-ish synth note: two slightly detuned triangles plus a sine
     * an octave down for body, through a lowpass whose cutoff falls over the
     * note (pluck-like), with a fast-attack / slow-decay envelope.
     */
    function synthNote(midi, time, duration, velocity, dest) {
      const ctx = audioEngine.ctx;
      const freq = midiToFreq(midi);

      const o1 = ctx.createOscillator();
      o1.type = 'triangle';
      o1.frequency.value = freq;
      const o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = freq;
      o2.detune.value = 5;
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = freq / 2;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.3;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.4;
      const bright = Math.min(freq * 7, 6000);
      filter.frequency.setValueAtTime(bright, time);
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(freq * 2, 500), time + Math.min(duration, 1.2));

      const env = ctx.createGain();
      const end = time + duration;
      env.gain.setValueAtTime(0.0001, time);
      env.gain.exponentialRampToValueAtTime(velocity, time + 0.012);
      env.gain.exponentialRampToValueAtTime(velocity * 0.45, time + Math.min(0.6, duration * 0.6));
      env.gain.exponentialRampToValueAtTime(Math.max(velocity * 0.25, 0.001), end);
      env.gain.exponentialRampToValueAtTime(0.0001, end + 0.18);

      o1.connect(filter);
      o2.connect(filter);
      sub.connect(subGain);
      subGain.connect(filter);
      filter.connect(env);
      env.connect(dest);
      [o1, o2, sub].forEach(o => { o.start(time); o.stop(end + 0.25); });
    }

    /** Short metronome blip, accented on beat 1. */
    function clickAt(time, accented, dest) {
      const ctx = audioEngine.ctx;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = accented ? 1568 : 1046;
      const g = ctx.createGain();
      g.gain.setValueAtTime(accented ? 0.12 : 0.06, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      o.connect(g);
      g.connect(dest);
      o.start(time);
      o.stop(time + 0.06);
    }

    /** Realized pitches for a chord, using the optimized voicing choices. */
    function chordPitchesAt(index) {
      const chord = state.progression[index];
      const vIndex = (state.voicingIndices && state.voicingIndices[index]) || 0;
      const shift = (state.voicingShifts && state.voicingShifts[index] !== undefined)
        ? state.voicingShifts[index] : undefined;
      return getChordNotesAtIndex(chord.root, chord.quality, state.complexity, vIndex, shift);
    }

    // ============================================
    // COMPING GROOVES
    // Onset patterns per 4-beat cycle, in beats: t = when the right hand
    // strikes, d = how long it rings. The pattern repeats every 4 beats of a
    // chord's span (an 8-beat chord comps it twice), and onsets that don't
    // fit a short span are dropped. 'block' (no pattern) = one strike held
    // for the whole chord — the original behavior.
    // ============================================

    const GROOVE_PATTERNS = {
      charleston: [{ t: 0, d: 1.5 }, { t: 1.5, d: 2 }],
      bossa: [{ t: 0, d: 1 }, { t: 1.5, d: 1.5 }, { t: 3, d: 1 }],
      pulse: [{ t: 0, d: 2 }, { t: 2, d: 2 }]
    };

    /**
     * Expand a groove into concrete onsets for one chord. Pure. With swing,
     * off-beat eighths (fractional part .5) land at the swung 2/3 position.
     */
    function grooveOnsets(groove, beatsPerChord, swing) {
      const pattern = GROOVE_PATTERNS[groove];
      if (!pattern) return [{ t: 0, d: beatsPerChord }];
      const out = [];
      for (let base = 0; base < beatsPerChord; base += 4) {
        const cycleLen = Math.min(4, beatsPerChord - base);
        for (const hit of pattern) {
          if (hit.t >= cycleLen) continue;
          let t = hit.t;
          if (swing && t % 1 === 0.5) t = Math.floor(t) + 2 / 3;
          out.push({ t: base + t, d: hit.d });
        }
      }
      return out;
    }

    /** Schedule everything that happens on one beat. */
    function scheduleBeat(globalBeat, time) {
      const { progression, beatsPerChord } = state;
      if (!progression.length || !audioEngine.sessionGain) return;

      const beatInChord = globalBeat % beatsPerChord;
      const chordStep = Math.floor(globalBeat / beatsPerChord);
      const chordIndex = chordStep % progression.length;

      if (beatInChord === 0) {
        const secPerBeat = 60 / state.tempo;
        const d = chordPitchesAt(chordIndex);
        // LH bass holds the whole chord span regardless of groove
        const span = beatsPerChord * secPerBeat * 0.92;
        // Slight roll (a few ms per note) so the attack sounds played, not stamped
        d.leftHandPitches.forEach((p, i) => {
          synthNote(p.midi, time + i * 0.006, span, 0.30, audioEngine.sessionGain);
        });
        // RH comps the groove pattern (a single held hit for 'block')
        const hits = grooveOnsets(state.groove, beatsPerChord, state.swing);
        hits.forEach((hit, hi) => {
          const t0 = time + hit.t * secPerBeat;
          const dur = hit.d * secPerBeat * 0.92;
          const vel = hi === 0 ? 0.16 : 0.13; // slight accent on the downbeat hit
          d.rightHandPitches.forEach((p, i) => {
            synthNote(p.midi, t0 + 0.008 + i * 0.007, dur, vel, audioEngine.sessionGain);
          });
        });
      }

      if (state.metronomeOn) {
        clickAt(time, beatInChord === 0, audioEngine.sessionGain);
      }

      audioEngine.visualQueue.push({ time, chordIndex, beatInChord, chordStep });
    }

    /** Lookahead scheduler: keeps the next ~120ms of audio scheduled. */
    function schedulerTick() {
      const ctx = audioEngine.ctx;
      // Hidden tabs throttle setInterval to ~1s, which would blow past the
      // normal 120ms lookahead and drop notes. Widen the horizon when hidden.
      const ahead = document.hidden ? 1.2 : SCHEDULE_AHEAD_SEC;
      while (audioEngine.nextBeatTime < ctx.currentTime + ahead) {
        scheduleBeat(audioEngine.beatCounter, audioEngine.nextBeatTime);
        audioEngine.nextBeatTime += 60 / state.tempo;
        audioEngine.beatCounter++;
      }
    }

    /** rAF loop: advance the visual state as scheduled beats become audible. */
    function visualSync() {
      audioEngine.rafId = requestAnimationFrame(visualSync);
      const ctx = audioEngine.ctx;
      const q = audioEngine.visualQueue;
      let updated = false;
      let chordChanged = false;
      let loopWrapped = false;
      while (q.length && q[0].time <= ctx.currentTime) {
        const ev = q.shift();
        if (ev.beatInChord === 0 && ev.chordIndex !== state.currentChordIndex) chordChanged = true;
        // Derive the loop count from the monotonic chord step, so it also
        // increments correctly for one-chord progressions (the old wrap test
        // using '<' never fired when the index never changed). loopBase carries
        // loops completed before this play span so the count survives pause/resume
        // (chordStep restarts from the resume position on each start).
        const newLoopCount = audioEngine.loopBase + Math.floor(ev.chordStep / state.progression.length) + 1;
        if (newLoopCount > state.loopCount) loopWrapped = true;
        state.currentChordIndex = ev.chordIndex;
        state.currentBeat = ev.beatInChord;
        state.loopCount = newLoopCount;
        updated = true;
      }
      if (updated) {
        updatePlaybackState();
        updateProgress();
        if (chordChanged) {
          if (state.showVoicing) renderVoicing();
          scrollActiveChordIntoView();
        }
      }
      // Practice modes fire once per completed pass through the progression.
      if (loopWrapped && state.isPlaying) handleLoopBoundary();
    }

    // Flat spellings for the practice-transposer (matches the key select).
    const FLAT_KEY_CYCLE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    /**
     * Practice modes (per completed loop): tempo ramp, and the 12-keys
     * transposer (cycle of 4ths — the classic shed order — or half steps).
     * The transpose reuses the normal key-change path, so voicings re-optimize
     * and playback re-anchors to the top of the progression in the new key.
     */
    function handleLoopBoundary() {
      if (state.tempoRamp > 0) setTempo(state.tempo + state.tempoRamp);
      if (state.autoTranspose && state.autoTranspose !== 'off') {
        const pc = NOTE_TO_SEMITONE[state.key];
        if (pc === undefined) return;
        const step = state.autoTranspose === 'chromatic' ? 1 : 5;
        const nextKey = FLAT_KEY_CYCLE[(pc + step) % 12];
        // Keep the loop display climbing across the rebuild (which zeroes the
        // chord step, same as pause/resume).
        audioEngine.loopBase = state.loopCount - 1;
        state.key = nextKey;
        state.asWritten = false;
        elements.keySelect.value = nextKey;
        updateAsWrittenChip();
        buildProgressionFromSource();
        // The rebuild resets loopCount to 1; restore the climbing count so the
        // next visual event doesn't read as another wrap and transpose again.
        state.loopCount = audioEngine.loopBase + 1;
        updateProgress();
      }
    }

    /** Reset the playback clock to the top of the progression. */
    function resetPlaybackClock() {
      audioEngine.beatCounter = 0;
      audioEngine.visualQueue = [];
      if (audioEngine.ctx) {
        audioEngine.nextBeatTime = audioEngine.ctx.currentTime + 0.06;
      }
    }

    /**
     * Set the tempo live. The lookahead scheduler reads state.tempo on every
     * scheduled beat, so no stop/restart is needed (that caused audible stutter
     * while dragging the slider).
     */
    function setTempo(bpm) {
      state.tempo = Math.max(40, Math.min(220, bpm));
      elements.tempoSlider.value = state.tempo;
      elements.tempoDisplay.textContent = state.tempo;
      if (elements.tempoBtnValue) elements.tempoBtnValue.textContent = state.tempo;
    }

    // ============================================
    // PLAYBACK CONTROL
    // ============================================

    async function startPlayback() {
      if (state.progression.length === 0) {
        generateRandomProgression();
      }

      // Each start gets a generation token. If a stop() — or a newer start() —
      // supersedes this call while it's awaiting resume(), the token mismatch
      // makes it bail, preventing a second sessionGain (which would orphan the
      // live one) and a second scheduler interval (which could never be cleared).
      audioEngine.session += 1;
      const mySession = audioEngine.session;

      if (!ensureAudioContext()) {
        // Web Audio is required for playback; there's no visual-only fallback.
        state.isPlaying = false;
        updateStatus();
        elements.statusText.textContent = 'Audio not supported in this browser';
        return;
      }

      // Clear manual selection when playing
      state.selectedChordIndex = null;
      state.isPlaying = true;
      updateStatus();
      updatePlaybackState();

      // Wait for the context to actually be running before scheduling, so the
      // first chord's notes don't pile up at t=0 (notably on iOS Safari).
      if (audioEngine.ctx.state === 'suspended') {
        try { await audioEngine.ctx.resume(); } catch (e) { /* ignore */ }
      }
      // A stop() or newer start() may have superseded us while we awaited.
      if (!state.isPlaying || audioEngine.session !== mySession) return;

      // Anchor the loop counter to where we're resuming from, so pausing and
      // resuming mid-progression doesn't reset Loop N back to Loop 1 (chordStep
      // restarts from the resume position on each start).
      audioEngine.loopBase = state.loopCount - 1;

      // Fresh gain node per session so stopping can fade everything out
      audioEngine.sessionGain = audioEngine.ctx.createGain();
      audioEngine.sessionGain.gain.value = 1;
      audioEngine.sessionGain.connect(audioEngine.master);
      // Resume from the current chord (beat position within it resets)
      audioEngine.beatCounter = state.currentChordIndex * state.beatsPerChord;
      audioEngine.nextBeatTime = audioEngine.ctx.currentTime + 0.06;
      audioEngine.visualQueue = [];
      audioEngine.schedulerId = setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
      schedulerTick();
      visualSync();

      // Update play button
      elements.playBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        <span class="btn-label">Playing...</span>
      `;
    }

    function stopPlayback() {
      state.isPlaying = false;
      // Invalidate any in-flight startPlayback still awaiting resume().
      audioEngine.session += 1;
      updateStatus();
      
      if (audioEngine.schedulerId) {
        clearInterval(audioEngine.schedulerId);
        audioEngine.schedulerId = null;
      }
      if (audioEngine.rafId) {
        cancelAnimationFrame(audioEngine.rafId);
        audioEngine.rafId = null;
      }
      if (audioEngine.sessionGain) {
        // Fade the whole session out quickly instead of cutting notes dead
        const g = audioEngine.sessionGain;
        const t = audioEngine.ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        setTimeout(() => g.disconnect(), 150);
        audioEngine.sessionGain = null;
      }
      audioEngine.visualQueue = [];
      
      updatePlaybackState();
      
      elements.playBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span class="btn-label">Play</span>
      `;
    }

    /** True stop: halt playback and rewind to the top of the progression. */
    function stopAndReset() {
      stopPlayback();
      state.currentChordIndex = 0;
      state.currentBeat = 0;
      state.loopCount = 1;
      audioEngine.loopBase = 0;
      resetPlaybackClock();
      updatePlaybackState();
      updateProgress();
    }

    function togglePlayback() {
      if (state.isPlaying) {
        stopPlayback();
      } else {
        startPlayback();
      }
    }

    // ============================================
    // STEP TRANSPORT (Prev/Next chord)
    // ============================================

    /**
     * One-shot audition of a chord while stopped. Plays through a dedicated
     * auditionGain connected to master — deliberately NOT the sessionGain, so
     * the playback session-token discipline is untouched. Each audition
     * replaces the previous gain, so retriggering cuts the prior chord off.
     */
    function auditionChord(index) {
      if (!state.progression.length) return;
      if (!ensureAudioContext()) return; // no Web Audio: step silently
      const ctx = audioEngine.ctx;

      if (audioEngine.auditionGain) {
        const old = audioEngine.auditionGain;
        const t0 = ctx.currentTime;
        old.gain.setValueAtTime(old.gain.value, t0);
        old.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
        setTimeout(() => old.disconnect(), 120);
        audioEngine.auditionGain = null;
      }

      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(audioEngine.master);
      audioEngine.auditionGain = g;

      const t = ctx.currentTime + 0.02;
      const duration = 1.4;
      const d = chordPitchesAt(index);
      // Same slight roll as scheduled playback so it sounds played, not stamped
      d.leftHandPitches.forEach((p, i) => {
        synthNote(p.midi, t + i * 0.006, duration, 0.30, g);
      });
      d.rightHandPitches.forEach((p, i) => {
        synthNote(p.midi, t + 0.008 + i * 0.007, duration, 0.16, g);
      });
    }

    /**
     * Step to the previous/next chord (delta = -1 / +1), with wraparound.
     * Stopped: moves the selection (voicing panel follows) and auditions it.
     * Playing: jumps playback to the chord's downbeat, resyncing the scheduler
     * clock and anchoring loopBase so the loop display doesn't jump.
     */
    function stepChord(delta) {
      const n = state.progression.length;
      if (!n) return;

      if (state.isPlaying) {
        const newIndex = ((state.currentChordIndex + delta) % n + n) % n;
        // Freeze the displayed loop count across the jump: chordStep restarts
        // from the new position, so fold completed loops into loopBase.
        audioEngine.loopBase = state.loopCount - 1;
        state.currentChordIndex = newIndex;
        state.currentBeat = 0;
        audioEngine.beatCounter = newIndex * state.beatsPerChord;
        audioEngine.visualQueue = [];
        if (audioEngine.ctx) {
          audioEngine.nextBeatTime = audioEngine.ctx.currentTime + 0.06;
        }
        updatePlaybackState();
        updateProgress();
        scrollActiveChordIntoView();
      } else {
        const selectedIdx = state.selectedChordIndex !== null
          ? state.selectedChordIndex : state.currentChordIndex;
        const newIndex = ((selectedIdx + delta) % n + n) % n;
        selectChord(newIndex); // voicing panel already follows selection
        auditionChord(newIndex);
      }
    }

