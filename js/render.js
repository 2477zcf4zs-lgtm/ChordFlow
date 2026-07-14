// render.js — chord dictionary data, renderChordStructure/updatePlaybackState, voicing panel,
// piano SVG, dictionary panel, and substitution menu rendering.
    // ============================================
    // CHORD DICTIONARY DATA
    // ============================================
    
    const CHORD_CATEGORIES = {
      triads: ['maj', 'min', 'dim', 'aug', 'sus4', 'sus2'],
      seventh: ['maj7', 'min7', 'dom7', 'dim7', 'm7b5', 'minMaj7', 'dom7sus4'],
      extended: ['maj9', 'min9', 'dom9', 'dom11', 'min11', 'maj13', 'dom13', 'min13', 'add9', 'madd9', '6', 'm6', '69'],
      altered: ['dom7b9', 'dom7s9', 'dom7b5', 'dom7s5', 'dom7s11', 'dom7b13', 'dom7alt', 'dom9b5', 'dom9s5', 'dom13b9', 'dom13s11']
    };
    
    const CHORD_FORMULAS = {
      maj: '1 - 3 - 5',
      min: '1 - ♭3 - 5',
      dim: '1 - ♭3 - ♭5',
      aug: '1 - 3 - ♯5',
      sus4: '1 - 4 - 5',
      sus2: '1 - 2 - 5',
      maj7: '1 - 3 - 5 - 7',
      min7: '1 - ♭3 - 5 - ♭7',
      dom7: '1 - 3 - 5 - ♭7',
      dim7: '1 - ♭3 - ♭5 - ♭♭7',
      m7b5: '1 - ♭3 - ♭5 - ♭7',
      minMaj7: '1 - ♭3 - 5 - 7',
      dom7sus4: '1 - 4 - 5 - ♭7',
      maj9: '1 - 3 - 5 - 7 - 9',
      min9: '1 - ♭3 - 5 - ♭7 - 9',
      dom9: '1 - 3 - 5 - ♭7 - 9',
      dom11: '1 - 3 - 5 - ♭7 - 9 - 11',
      min11: '1 - ♭3 - 5 - ♭7 - 9 - 11',
      maj13: '1 - 3 - 5 - 7 - 9 - 13',
      dom13: '1 - 3 - 5 - ♭7 - 9 - 13',
      min13: '1 - ♭3 - 5 - ♭7 - 9 - 13',
      add9: '1 - 3 - 5 - 9',
      madd9: '1 - ♭3 - 5 - 9',
      '6': '1 - 3 - 5 - 6',
      'm6': '1 - ♭3 - 5 - 6',
      '69': '1 - 3 - 5 - 6 - 9',
      dom7b9: '1 - 3 - 5 - ♭7 - ♭9',
      dom7s9: '1 - 3 - 5 - ♭7 - ♯9',
      dom7b5: '1 - 3 - ♭5 - ♭7',
      dom7s5: '1 - 3 - ♯5 - ♭7',
      dom7s11: '1 - 3 - 5 - ♭7 - ♯11',
      dom7b13: '1 - 3 - 5 - ♭7 - ♭13',
      dom7alt: '1 - 3 - ♯5 - ♭7 - ♭9',
      dom9b5: '1 - 3 - ♭5 - ♭7 - 9',
      dom9s5: '1 - 3 - ♯5 - ♭7 - 9',
      dom13b9: '1 - 3 - 5 - ♭7 - ♭9 - 13',
      dom13s11: '1 - 3 - 5 - ♭7 - 9 - ♯11 - 13'
    };

    // TIPS: drafted for review — Anthony to veto/edit wording
    // Practical "think of it as…" shortcuts, rendered in the dictionary panel.
    // Every claim below was verified against CHORD_FORMULAS/INTERVALS (root G or
    // C, pitch-class arithmetic). Qualities with no honest shortcut have none.
    const CHORD_TIPS = {
      // Em7 = E G B D = 3-5-7-9 of C. Exact match.
      maj9: 'a min7 chord built on the 3rd, over the root: Cmaj9 = Em7/C (E–G–B–D covers 3–5–7–9).',
      // Dm = D F A = ♭3-♭5-♭7 of B. Exact match.
      m7b5: 'a minor triad a minor 3rd up, over the root: Bm7♭5 = Dm/B (D–F–A covers ♭3–♭5–♭7).',
      // C = C E G = ♭7-9-11 of D.
      min11: 'a major triad a whole step below, over the root: Dm11 → C/D (C–E–G covers ♭7–9–11).',
      // A♭ melodic minor over G contains 3, ♭7 and every altered tension (♭9 ♯9 ♯11 ♭13).
      dom7alt: 'melodic minor a half step up: G7alt → A♭ melodic minor (it holds the 3, ♭7, ♭9, ♯9, ♯11 and ♭13).',
      // A = A C♯ E = 9-♯11-13 of G; the ♯11 plus the 9 and 13 colors.
      dom7s11: 'upper structure: a major triad on the 2 over the ♭7 shell — G7♯11 → A/G7 (A–C♯–E adds 9–♯11–13).',
      // Exact: dom13s11's formula is 1-3-5-♭7-9-♯11-13 and A/G supplies 9-♯11-13.
      dom13s11: 'upper structure: a major triad on the 2 over the ♭7 shell — G13♯11 = A/G7 (A–C♯–E is exactly 9–♯11–13).',
      // B-E-F-A = 3-13-♭7-9 of G: the Bill Evans rootless shape this app plays at the jazz tier.
      dom13: 'guide tones plus both colors: shell 3–13–♭7–9 (G13 → B–E–F–A) — the classic rootless jazz voicing.',
      // F/G = ♭7-9-11 (the 9sus sound); Fmaj7/G adds E = 13 (the 13sus sound).
      dom7sus4: 'a major triad on the ♭7 over the root: G7sus4 → F/G (♭7–9–11, the 9sus sound); make it Fmaj7/G and the added 13 gives you 13sus.',
      // E-A-D = two stacked perfect 4ths = 3-6-9 of C.
      '69': 'root and 5th below two stacked 4ths from the 3rd: C69 → E–A–D on top (3–6–9).'
    };

    /**
     * Voice Leading System (pitch-aware)
     *
     * Voicings are realized as actual pitches (MIDI numbers), not just pitch
     * classes. Voicing choice and octave placement for the whole progression
     * are optimized together with a small dynamic program that minimizes:
     *   - real voice movement between consecutive right-hand voicings
     *   - drift away from the practical comping register (around middle C)
     *
     * Type A / Type B alternation is not enforced with bonuses; it emerges
     * naturally from minimizing movement in real pitch space, which is why
     * jazz pianists alternate voicing types around the circle of fifths.
     */

    // ============================================
    // RENDERING FUNCTIONS
    // ============================================

    /**
     * Build the chord boxes. Called only when the progression itself changes
     * (buildProgressionFromSource, applySubstitution, the empty-state path, and
     * a Beats/Chord change that alters the dot count). Every box carries its
     * full beat-indicator (beatsPerChord dots) and its sub-badge up front, so
     * per-beat playback updates never add or remove nodes — they only toggle
     * classes (see updatePlaybackState). Click handling is delegated once on
     * the container in setupEventListeners(), so no per-node listeners here.
     */
    function renderChordStructure() {
      const { progression, beatsPerChord } = state;

      if (progression.length === 0) {
        elements.chordContainer.innerHTML =
          '<div class="chord-cell"><div class="chord-box chord-box--static"><div class="chord-symbol">—</div></div></div>';
        updatePlaybackState();
        return;
      }

      let html = '';
      progression.forEach((chord, index) => {
        const symbol = formatChordSymbol(chord.root, chord.quality);

        let dots = '';
        for (let b = 0; b < beatsPerChord; b++) dots += '<div class="beat-dot"></div>';

        // Compute the sub badge once here, not per beat. It's hidden during
        // playback via the container's .is-playing class rather than by
        // re-rendering, so the expensive getChordSubstitutions call happens
        // only on structural changes.
        let badge = '';
        const subs = getChordSubstitutions(chord.root, chord.quality);
        if (subs.length > 0) {
          badge = `<button class="sub-badge" type="button" data-chord-index="${index}" title="Substitute this chord" aria-label="Show substitutions for chord ${index + 1}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 1l4 4-4 4"/>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <path d="M7 23l-4-4 4-4"/>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
                <span>Sub</span>
              </button>`;
        }

        const marker = chord.substituted ? '<span class="sub-marker" title="Substituted">sub</span>' : '';

        html += `
          <div class="chord-cell${chord.borrowed ? ' borrowed' : ''}" data-index="${index}">
            <button class="chord-box" type="button" data-index="${index}" aria-label="Chord ${index + 1}, ${escapeHtml(symbol)}. Activate to view its voicing.">
              <div class="chord-numeral">${escapeHtml(chord.degree)}${marker}</div>
              <div class="chord-symbol">${escapeHtml(symbol)}</div>
              <div class="beat-indicator">${dots}</div>
            </button>
            <div class="sub-badge-container">${badge}</div>
          </div>
        `;
      });

      elements.chordContainer.innerHTML = html;
      renderPadGrid();
      updatePlaybackState();
      scrollActiveChordIntoView();
    }

    /**
     * Performance pads (tap-to-play): one big pad per chord filling the panel,
     * numeral + symbol, no piano. Rebuilt only on structural change (mirrors
     * renderChordStructure); press/release is delegated once in
     * setupEventListeners. The grid auto-fits its column count to the chord
     * count so 8 bars land on a phone without scrolling (see CSS).
     */
    function renderPadGrid() {
      const grid = elements.padGrid;
      if (!grid) return;
      const { progression } = state;
      if (!progression.length) { grid.innerHTML = ''; return; }
      grid.dataset.count = progression.length;
      grid.innerHTML = progression.map((chord, index) => {
        const symbol = formatChordSymbol(chord.root, chord.quality);
        const marker = chord.substituted ? '<span class="sub-marker" title="Substituted">sub</span>' : '';
        return `<button class="pad${chord.borrowed ? ' borrowed' : ''}" type="button" data-index="${index}"
                  aria-label="Play chord ${index + 1}, ${escapeHtml(chord.root)} ${escapeHtml(chord.quality)}">
            <span class="pad-numeral">${escapeHtml(chord.degree)}${marker}</span>
            <span class="pad-symbol">${escapeHtml(symbol)}</span>
          </button>`;
      }).join('');
      updatePadPlaybackState();
    }

    /** Mirror playback/selection onto the pads (class toggles only). */
    function updatePadPlaybackState() {
      const grid = elements.padGrid;
      if (!grid) return;
      const { currentChordIndex, isPlaying } = state;
      const selectedIdx = state.selectedChordIndex !== null ? state.selectedChordIndex : currentChordIndex;
      grid.querySelectorAll('.pad').forEach(pad => {
        const index = parseInt(pad.dataset.index);
        pad.classList.toggle('playing', isPlaying && index === currentChordIndex);
        pad.classList.toggle('selected', !isPlaying && index === selectedIdx);
      });
    }

    /**
     * Update only the transient playback/selection state by toggling classes on
     * the existing chord nodes — no innerHTML writes. Because the nodes persist,
     * the .chord-box.active CSS transition actually animates, and an open
     * substitution menu inside the container is never destroyed mid-interaction.
     */
    function updatePlaybackState() {
      const { progression, currentChordIndex, currentBeat, isPlaying, showVoicing } = state;
      elements.chordContainer.classList.toggle('is-playing', isPlaying);
      if (progression.length === 0) return;

      const selectedIdx = state.selectedChordIndex !== null ? state.selectedChordIndex : currentChordIndex;

      elements.chordContainer.querySelectorAll('.chord-cell').forEach(cell => {
        const index = parseInt(cell.dataset.index);
        const box = cell.querySelector('.chord-box');
        if (!box) return;

        const isActive = isPlaying && index === currentChordIndex;
        box.classList.toggle('active', isActive);
        box.classList.toggle('past', isPlaying && index < currentChordIndex);
        box.classList.toggle('future', isPlaying && index > currentChordIndex);
        box.classList.toggle('selected', index === selectedIdx && showVoicing);

        const dots = box.querySelectorAll('.beat-dot');
        if (isActive) {
          dots.forEach((d, b) => d.classList.toggle('active', b <= currentBeat));
        } else {
          dots.forEach(d => d.classList.remove('active'));
        }
      });

      updatePadPlaybackState();
    }
    
    function selectChord(index) {
      // If clicking the same chord again, cycle to a new voicing
      if (state.selectedChordIndex === index) {
        // Cycle to the next voicing for this chord
        const chord = state.progression[index];
        // Cycle only within the voicings the current tier actually offers
        const tierVoicings = voicingsFor(chord.quality, state.complexity);
        if (tierVoicings.length > 1) {
          const currentIdx = state.voicingIndices[index] || 0;
          const nextIdx = (currentIdx + 1) % tierVoicings.length;
          state.voicingIndices[index] = nextIdx;
          // Re-anchor the new voicing: connect smoothly from the previous chord
          let prevRh = null;
          if (index > 0 && state.voicingIndices[index - 1] !== undefined) {
            const prevChord = state.progression[index - 1];
            const prevVoicings = voicingsFor(prevChord.quality, state.complexity);
            const pv = prevVoicings[state.voicingIndices[index - 1] % prevVoicings.length];
            const pShift = (state.voicingShifts && state.voicingShifts[index - 1]) || 0;
            prevRh = realizeHand(prevChord.root, pv.right, RH_BASE + pShift).map(n => n.midi);
          }
          state.voicingShifts[index] = bestShiftForVoicing(chord.root, tierVoicings[nextIdx], prevRh, activeRangeWindow());
        }
        renderVoicing();
        // Hear the voicing you just cycled to (stopped only — during playback
        // the loop itself is the audition).
        if (!state.isPlaying) auditionChord(index);
      } else {
        state.selectedChordIndex = index;
        state.armedSub = null; // new chord, stale arm
      }
      
      // Show voicing panel if not visible
      if (!state.showVoicing) {
        toggleVoicingPanel(true);
      } else {
        renderVoicing();
      }

      updatePlaybackState();
      scrollActiveChordIntoView();
    }
    
    // ============================================
    // SUBSTITUTIONS — apply / revert / undo. The UI is the sub tray inside
    // the voicing panel (renderSubTray + subTrayTap below); the old
    // sub-badge popover is gone (the badge now just selects the chord).
    // ============================================

    function applySubstitution(chordIndex, sub) {
      // Snapshot the pre-substitution chord (once — re-subbing keeps the
      // ORIGINAL base) so revert/undo/audition never need a rebuild.
      if (!state.subBase[chordIndex]) {
        state.subBase[chordIndex] = state.progression[chordIndex];
      }
      // Replace the chord, keeping the original degree label clean and marking
      // the substitution with a structured flag (not a '*' baked into the
      // degree string, which stacked to '**' and broke any re-read of degree).
      state.progression[chordIndex] = {
        root: sub.root,
        quality: sub.quality,
        degree: state.progression[chordIndex].degree,
        substituted: true
      };
      // Remember which substitution rule was applied so it can be re-derived
      // (transposed) if the key or complexity changes.
      state.substitutions[chordIndex] = sub.type;

      // The harmony changed: re-optimize voicings around the new chord
      recomputeProgressionVoicings();

      renderChordStructure();

      // Update voicing if this chord is selected
      if (state.selectedChordIndex === chordIndex || state.currentChordIndex === chordIndex) {
        renderVoicing();
      }
    }

    /**
     * The sub tray: Original first, then every substitution for the BASE
     * (un-substituted) chord, so the option list is stable no matter which
     * sub is currently applied. States: 'current' (what the slot holds now),
     * 'armed' (tapped once, ✓ shows, next tap commits). All model-derived
     * text is escaped (invariant 12).
     */
    function renderSubTray(chordIndex) {
      const subsEl = document.getElementById('voicingSubs');
      if (!subsEl) return;
      const applied = state.substitutions[chordIndex] || null;
      const base = state.subBase[chordIndex] || state.progression[chordIndex];
      let subs = getChordSubstitutions(base.root, base.quality);
      // With the flavor dial on, the borrowed/mediant colors surface right
      // after Original; at Off the functional subs keep the front row.
      if (state.flavor !== 'off') {
        subs = subs.slice().sort((a, b) => (b.flavor ? 1 : 0) - (a.flavor ? 1 : 0));
      }
      const armedKey = (state.armedSub && state.armedSub.index === chordIndex)
        ? state.armedSub.key : null;
      const trial = (state.trialSub && state.trialSub.index === chordIndex)
        ? state.trialSub : null;

      const chip = (key, symbol, desc, current) => {
        const armed = armedKey === key;
        const trialing = !!(trial && trial.type === key && key !== 'original');
        const cls = 'sub-chip' + (current ? ' sub-chip--current' : '')
          + (armed ? ' sub-chip--armed' : '') + (trialing ? ' sub-chip--trialing' : '');
        const hint = trialing
          ? `Trying — ${trial.passesLeft} pass${trial.passesLeft === 1 ? '' : 'es'} left. Tap to keep.`
          : (armed ? 'Tap again to apply' : (state.isPlaying
            ? 'Tap to try it in the loop (two passes)'
            : 'Tap to hear it in context'));
        const passes = trialing ? '●'.repeat(Math.max(0, trial.passesLeft)) : '';
        return `<button type="button" class="${cls}" data-chord-index="${chordIndex}"
            data-key="${escapeHtml(key)}" title="${escapeHtml(hint)}"
            aria-label="${escapeHtml(desc)}: ${escapeHtml(hint)}">
            <span class="sub-chip-symbol">${escapeHtml(symbol)}</span>
            <span class="sub-chip-desc">${escapeHtml(desc)}</span>
            <span class="sub-chip-passes" aria-hidden="true">${passes}</span>
            <span class="sub-chip-check" aria-hidden="true">✓</span>
          </button>`;
      };

      let html = chip('original', formatChordSymbol(base.root, base.quality), 'Original', !applied);
      subs.forEach((sub) => {
        html += chip(sub.type, sub.symbol, sub.description, applied === sub.type);
      });
      subsEl.innerHTML = html;
      updateAbButton();
    }

    /**
     * A/B is meaningful only with subs applied and no trial in flight.
     * The button reads as a two-sided switch: the LIT side is what's
     * sounding — A = original changes, B = with your substitutions.
     */
    function updateAbButton() {
      const btn = document.getElementById('abCompareBtn');
      if (!btn) return;
      const hasSubs = state.substitutions.some(t => !!t);
      btn.disabled = !hasSubs || !!state.trialSub;
      btn.setAttribute('aria-pressed', String(state.compareOriginal));
      btn.classList.toggle('active', hasSubs && !state.trialSub);
      btn.title = btn.disabled
        ? 'A/B: apply a substitution first, then compare with/without it'
        : (state.compareOriginal
          ? 'Hearing A (original) — tap for B (with substitutions)'
          : 'Hearing B (with substitutions) — tap for A (original)');
      const sideA = document.getElementById('abSideA');
      const sideB = document.getElementById('abSideB');
      if (sideA) sideA.classList.toggle('on', !btn.disabled && state.compareOriginal);
      if (sideB) sideB.classList.toggle('on', !btn.disabled && !state.compareOriginal);
    }

    /** Restore the un-substituted chord. Cheap and playback-safe: no rebuild. */
    function revertSubstitution(chordIndex) {
      const base = state.subBase[chordIndex];
      if (!base) return;
      state.progression[chordIndex] = { ...base };
      state.substitutions[chordIndex] = null;
      state.subBase[chordIndex] = null;
      recomputeProgressionVoicings();
      renderChordStructure();
      if (state.selectedChordIndex === chordIndex || state.currentChordIndex === chordIndex) {
        renderVoicing();
      }
    }

    /**
     * Sub tray chip tap (delegated from app.js). Hear-first model:
     * STOPPED — first tap auditions the candidate in context and ARMS the
     * chip; a second tap on the armed chip commits (apply / revert).
     * PLAYING — a sub chip tap starts a two-pass TRIAL in the running loop
     * (tapping the trialing chip again keeps it); the Original chip cancels
     * an active trial immediately, or arms-then-reverts a permanent sub.
     */
    function subTrayTap(chordIndex, key) {
      const applied = state.substitutions[chordIndex] || null;
      const base = state.subBase[chordIndex] || state.progression[chordIndex];
      const isArmed = state.armedSub &&
        state.armedSub.index === chordIndex && state.armedSub.key === key;
      const trial = state.trialSub;

      if (key === 'original') {
        if (state.isPlaying && trial && trial.index === chordIndex) {
          revertSubTrial(); // cancel the trial on the spot — no confirm needed
          return;
        }
        if (isArmed && applied) {
          // Confirm tap: revert, with an undo escape hatch.
          exitCompareOriginal();
          const snap = snapshotSubState(chordIndex);
          state.armedSub = null;
          revertSubstitution(chordIndex);
          showUndoChip(`Back to ${formatChordSymbol(base.root, base.quality)}`,
            () => restoreSubState(chordIndex, snap));
          return;
        }
        // Arm only when there's something to revert; audition either way.
        state.armedSub = applied ? { index: chordIndex, key } : null;
        if (!state.isPlaying) auditionSnippet(chordIndex, null);
        renderVoicing();
        return;
      }

      const sub = getChordSubstitutions(base.root, base.quality).find(s => s.type === key);
      if (!sub) return;

      if (state.isPlaying) {
        if (trial && trial.index === chordIndex && trial.type === key) {
          commitSubTrial(); // keep it
        } else {
          beginSubTrial(chordIndex, sub);
        }
        return;
      }

      if (isArmed) {
        exitCompareOriginal();
        const snap = snapshotSubState(chordIndex);
        state.armedSub = null;
        applySubstitution(chordIndex, sub);
        showUndoChip(`Substituted ${formatChordSymbol(sub.root, sub.quality)}`,
          () => restoreSubState(chordIndex, snap));
        return;
      }
      state.armedSub = { index: chordIndex, key };
      if (!state.isPlaying) auditionSnippet(chordIndex, sub);
      renderVoicing();
    }

    // ============================================
    // TRIAL SUBS (playback): the sub takes the slot for two loop passes,
    // then auto-reverts at the seam (handleLoopSeam decrements) unless kept.
    // The trial LIVES in state.substitutions — that's what lets a 12-keys
    // transpose re-derive it in the new key for free — with prevType
    // remembering what the slot held before (null, or a permanent sub's
    // type, re-derived key-safely on restore). Invariant 15.
    // ============================================

    function beginSubTrial(chordIndex, sub) {
      if (state.trialSub) revertSubTrial(); // one trial at a time
      exitCompareOriginal();                // comparing ends when the state changes
      const prevType = state.substitutions[chordIndex] || null;
      state.trialSub = { index: chordIndex, type: sub.type, prevType, passesLeft: 2 };
      state.armedSub = null;
      applySubstitution(chordIndex, sub); // recompute + re-render (shows trialing chip)
    }

    /** End the trial and put back what the slot held before it. */
    function revertSubTrial() {
      const t = state.trialSub;
      if (!t) return;
      state.trialSub = null;
      if (t.index >= state.progression.length) return; // progression shrank under it
      restoreTrialPrev(t);
    }

    /** Keep the trialed sub: it's already applied, just stop counting. */
    function commitSubTrial() {
      const t = state.trialSub;
      if (!t) return;
      state.trialSub = null;
      const kept = state.progression[t.index];
      showUndoChip(`Kept ${formatChordSymbol(kept.root, kept.quality)}`,
        () => restoreTrialPrev(t));
      renderVoicing();
    }

    /**
     * Restore a trial's pre-trial state BY TYPE, not by chord snapshot: the
     * key may have changed mid-trial (12-keys), so a previous permanent sub
     * is re-derived from the current base, same as the rebuild path does.
     */
    function restoreTrialPrev(t) {
      if (t.prevType) {
        const base = state.subBase[t.index] || state.progression[t.index];
        const match = getChordSubstitutions(base.root, base.quality).find(s => s.type === t.prevType);
        if (match) { applySubstitution(t.index, match); return; }
      }
      revertSubstitution(t.index);
    }

    // ============================================
    // A/B COMPARE: hear the whole progression with and without its subs.
    // Per-index swaps via subBase — NEVER a rebuild, which would reset the
    // playback position (invariant 16). substitutions/subBase stay intact
    // while comparing; only progression[] flips between base and derived sub.
    // ============================================

    function toggleCompareOriginal() {
      if (state.trialSub) return; // disabled during a trial (one experiment at a time)
      const on = !state.compareOriginal;
      state.substitutions.forEach((type, i) => {
        if (!type || !state.subBase[i]) return;
        if (on) {
          state.progression[i] = { ...state.subBase[i] };
        } else {
          const base = state.subBase[i];
          const match = getChordSubstitutions(base.root, base.quality).find(s => s.type === type);
          if (match) {
            state.progression[i] = {
              root: match.root,
              quality: match.quality,
              degree: base.degree,
              substituted: true
            };
          }
        }
      });
      state.compareOriginal = on;
      recomputeProgressionVoicings();
      renderChordStructure();
      renderVoicing();
    }

    /** Any real state change (apply/revert/trial) ends a compare first. */
    function exitCompareOriginal() {
      if (state.compareOriginal) toggleCompareOriginal();
    }

    /** Exact per-index restore point for the undo chip. */
    function snapshotSubState(chordIndex) {
      return {
        chord: state.progression[chordIndex],
        subType: state.substitutions[chordIndex] || null,
        base: state.subBase[chordIndex] || null
      };
    }

    function restoreSubState(chordIndex, snap) {
      state.progression[chordIndex] = snap.chord;
      state.substitutions[chordIndex] = snap.subType;
      state.subBase[chordIndex] = snap.base;
      recomputeProgressionVoicings();
      renderChordStructure();
      renderVoicing();
    }

    // ---- Transient undo chip (5s, single instance) ----
    let undoTimer = null;
    let undoAction = null;

    function showUndoChip(label, undoFn) {
      const chip = document.getElementById('undoChip');
      if (!chip) return;
      if (undoTimer) clearTimeout(undoTimer);
      undoAction = undoFn;
      chip.textContent = `${label} · Undo`;
      chip.hidden = false;
      undoTimer = setTimeout(hideUndoChip, 5000);
    }

    function hideUndoChip() {
      const chip = document.getElementById('undoChip');
      if (chip) chip.hidden = true;
      if (undoTimer) clearTimeout(undoTimer);
      undoTimer = null;
      undoAction = null;
    }

    /** Click handler for the chip (wired once in setupEventListeners). */
    function undoChipActivate() {
      const fn = undoAction;
      hideUndoChip();
      if (fn) fn();
    }

    function updateProgress() {
      const { currentChordIndex, progression, loopCount } = state;
      const progress = ((currentChordIndex + 1) / progression.length) * 100;
      elements.progressFill.style.width = `${progress}%`;
      elements.currentMeasure.textContent = `${currentChordIndex + 1}/${progression.length}`;
      elements.loopCount.textContent = `Loop ${loopCount}`;
    }

    function updateStatus() {
      elements.statusDot.className = 'status-dot' + (state.isPlaying ? ' playing' : (state.progression.length ? ' paused' : ''));
      elements.statusText.textContent = state.isPlaying ? 'Playing' : (state.progression.length ? 'Paused' : 'Ready');
    }

    /**
     * Format a note name for display (unicode accidentals).
     */
    /**
     * Render an SVG piano keyboard with the current voicing highlighted.
     * Left-hand notes in coral, right-hand notes in blue. Range spans C2
     * upward, extending by whole octaves if a voicing exceeds C6.
     */
    function renderPianoKeyboard(leftPitches, rightPitches) {
      const container = document.getElementById('pianoKeyboard');
      if (!container) return;

      // Taller keys than the classic 20x96: the voicing panel now gives the
      // piano the leftover vertical space, and the wide aspect ratio meant
      // width always limited the scale — height has to come from the keys.
      const WK_W = 20, WK_H = 132, BK_W = 12, BK_H = 82;
      const WHITE_PCS = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
      const BLACK_LEFT_WHITE = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

      const highlights = new Map();
      (leftPitches || []).forEach(p => highlights.set(p.midi, { hand: 'L', name: p.name }));
      (rightPitches || []).forEach(p => highlights.set(p.midi, { hand: 'R', name: p.name }));

      const LOW = 36; // C2
      // 3-octave mode draws exactly the 37-key C2–C5 window (what a Reface
      // player has under their hands); full mode spans to C6. Either way the
      // range still extends defensively if a highlight escapes it.
      let high = state.range === 'reface' ? 72 : 84;
      for (const m of highlights.keys()) {
        while (m > high) high += 12;
      }

      const whiteX = (m) => {
        const oct = Math.floor((m - LOW) / 12);
        return (oct * 7 + WHITE_PCS[m % 12]) * WK_W;
      };

      let whites = '', blacks = '', labels = '';
      for (let m = LOW; m <= high; m++) {
        const pc = m % 12;
        const h = highlights.get(m);
        if (pc in WHITE_PCS) {
          const x = whiteX(m);
          const fill = h ? (h.hand === 'L' ? 'var(--accent-coral)' : 'var(--accent-blue)') : '#ece9e2';
          whites += `<rect x="${x}" y="0" width="${WK_W}" height="${WK_H}" rx="2" style="fill:${fill}" stroke="#141418" stroke-width="1"/>`;
          if (h) {
            labels += `<text x="${x + WK_W / 2}" y="${WK_H - 8}" text-anchor="middle" font-size="9" font-weight="700" style="fill:#141418">${formatNoteDisplay(h.name)}</text>`;
          } else if (pc === 0) {
            labels += `<text x="${x + WK_W / 2}" y="${WK_H - 6}" text-anchor="middle" font-size="7.5" style="fill:#9a9a9a">C${Math.floor(m / 12) - 1}</text>`;
          }
        } else {
          const oct = Math.floor((m - LOW) / 12);
          const x = (oct * 7 + BLACK_LEFT_WHITE[pc] + 1) * WK_W - BK_W / 2;
          const fill = h ? (h.hand === 'L' ? 'var(--accent-coral)' : 'var(--accent-blue)') : '#222228';
          blacks += `<rect x="${x}" y="0" width="${BK_W}" height="${BK_H}" rx="2" style="fill:${fill}" stroke="#0d0d0f" stroke-width="1"/>`;
          if (h) {
            blacks += `<text x="${x + BK_W / 2}" y="${BK_H - 7}" text-anchor="middle" font-size="8" font-weight="700" style="fill:#f5f5f0">${formatNoteDisplay(h.name)}</text>`;
          }
        }
      }

      const totalW = ((high - LOW) / 12 * 7 + 1) * WK_W;
      container.innerHTML = `<svg viewBox="0 0 ${totalW} ${WK_H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Piano keyboard showing the current voicing">${whites}${blacks}${labels}</svg>`;
    }

    function renderVoicing() {
      const leftHandEl = document.getElementById('leftHandNotes');
      const rightHandEl = document.getElementById('rightHandNotes');
      const chordNameEl = document.getElementById('voicingChordName');
      const subsEl = document.getElementById('voicingSubs');
      
      // Use selected chord if set, otherwise current chord
      const chordIndex = state.selectedChordIndex !== null ? state.selectedChordIndex : state.currentChordIndex;
      
      if (state.progression.length === 0 || chordIndex >= state.progression.length) {
        leftHandEl.textContent = '—';
        rightHandEl.textContent = '—';
        chordNameEl.textContent = '—';
        subsEl.innerHTML = '';
        elements.voicingDescription.textContent = 'No chord selected';
        renderPianoKeyboard([], []);
        return;
      }

      const chord = state.progression[chordIndex];
      
      // Use the pre-computed voicing index if available, otherwise calculate
      let chordData;
      if (state.voicingIndices && state.voicingIndices[chordIndex] !== undefined) {
        const shift = state.voicingShifts ? state.voicingShifts[chordIndex] : undefined;
        const lhIndex = (state.lhVoicingIndices && state.lhVoicingIndices[chordIndex]) || 0;
        chordData = getChordNotesAtIndex(chord.root, chord.quality, state.complexity, state.voicingIndices[chordIndex], shift,
          { leftHandMode: state.leftHand, lhIndex, range: activeRangeWindow() });
      } else {
        chordData = getChordNotes(chord.root, chord.quality, state.complexity,
          { leftHandMode: state.leftHand, range: activeRangeWindow() });
        if (state.voicingIndices) {
          state.voicingIndices[chordIndex] = chordData.voicingIndex || 0;
          if (state.voicingShifts) state.voicingShifts[chordIndex] = chordData.octaveShift || 0;
        }
      }
      
      // Show realized pitches low-to-high with octave numbers (C4 = middle C)
      const formatPitch = (p) => formatNoteDisplay(p.name) + p.octave;
      const leftNotes = chordData.leftHandPitches.map(formatPitch).join('  ');
      const rightNotes = chordData.rightHandPitches.map(formatPitch).join('  ');

      if (state.leftHand === 'rootless') {
        // Rootless over a bassist: YOU comp the voicing with your left hand
        // while the right plays melody — display (and tint) it as the LH.
        leftHandEl.textContent = rightNotes || '—';
        rightHandEl.textContent = '— (melody / solo)';
        renderPianoKeyboard(chordData.rightHandPitches, []);
      } else {
        leftHandEl.textContent = leftNotes || '—';
        // bassonly: the app plays just the root; the voicing is yours to comp.
        rightHandEl.textContent = rightNotes ||
          (state.leftHand === 'bassonly' ? '— (you comp)' : '—');
        renderPianoKeyboard(chordData.leftHandPitches, chordData.rightHandPitches);
      }
      
      // Display chord name
      const chordSymbol = formatChordSymbol(chord.root, chord.quality);
      chordNameEl.textContent = chordSymbol;
      
      // Substitution tray (hear-first: tap = audition in context, tap again
      // = apply). Clicks are delegated once in setupEventListeners.
      renderSubTray(chordIndex);
      
      // The teaching moment for bassist mode: name what the LH is doing when
      // it departs from the written voicing.
      const LH_MODE_NOTES = {
        shells: ' • LH shells: root + guide tones (3 & 7)',
        evans: ' • Two-hand rootless: LH color voicing — the bass stays with the bassist',
        rootless: ' • Rootless: LH comps the voicing over a bassist or track',
        bassonly: ' • Roots only: the app is your bassist — comp the changes yourself'
      };
      const lhNote = LH_MODE_NOTES[state.leftHand] || '';
      const rangeNote = state.range === 'reface' ? ' • 3-octave window' : '';
      elements.voicingDescription.textContent = `${chordData.name} • ${chordData.voicingName}${lhNote}${rangeNote}`;
    }

    // ============================================
    // TAB PANELS — voicing / dictionary / library / settings are mutually
    // exclusive panels in .panel-area, driven by the tab bar.
    // ============================================

    function tabTargets() {
      return {
        pads: [elements.padsToggle, elements.padsPanel],
        voicing: [elements.voicingBtn, elements.voicingPanel],
        dictionary: [elements.dictToggle, elements.chordDictPanel],
        library: [elements.libraryToggle, elements.libraryPanel],
        settings: [elements.settingsToggle, elements.settingsPanel]
      };
    }

    /** Open the named tab (or close all with null). Single writer of activeTab/showVoicing. */
    function showTab(name) {
      const targets = tabTargets();
      state.activeTab = name && targets[name] ? name : null;
      for (const key of Object.keys(targets)) {
        const on = key === state.activeTab;
        const btn = targets[key][0];
        const panel = targets[key][1];
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        panel.classList.toggle('visible', on);
      }
      state.showVoicing = state.activeTab === 'voicing';
      if (state.showVoicing) renderVoicing();
      if (state.activeTab !== 'pads') padReleaseAll(); // silence held pads on leave
      // The pads ARE the progression, one pad per chord — the advancing strip
      // below would just duplicate them, so it steps aside while pads are up.
      document.body.classList.toggle('pads-open', state.activeTab === 'pads');
      updatePlaybackState(); // the 'selected' chord highlight tracks showVoicing
    }

    function toggleTab(name) {
      showTab(state.activeTab === name ? null : name);
    }

    /** Back-compat shim: every existing caller (selectChord, V key, tests)
        keeps working; the voicing panel is now the 'voicing' tab. */
    function toggleVoicingPanel(show) {
      const want = show !== undefined ? show : !state.showVoicing;
      if (!want) state.armedSub = null; // closing the panel disarms the tray
      if (want) showTab('voicing');
      else if (state.activeTab === 'voicing') showTab(null);
    }

    /** Show/hide the "as written" chip from state.asWritten (5.1). */
    function updateAsWrittenChip() {
      const chip = document.getElementById('asWrittenChip');
      if (chip) chip.hidden = !state.asWritten;
    }

    // ============================================
    // MY PROGRESSIONS (5.2) — saved-list rendering
    // ============================================

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /** Rebuild the My Progressions list. Click handling is delegated once in
        setupEventListeners (mirrors libraryGrid/chordContainer). */
    function renderSavedProgressions() {
      const listEl = document.getElementById('savedList');
      const emptyEl = document.getElementById('savedEmpty');
      const unavailableEl = document.getElementById('savedUnavailable');
      const actions = document.querySelector('.my-progressions-actions');
      if (!listEl) return;

      // The section is collapsed by default (the library is the main event);
      // the toggle header always shows how many are saved.
      const countEl = document.getElementById('savedCount');
      if (countEl) {
        const n = storageAvailable() ? readSavedProgressions().length : 0;
        countEl.textContent = n ? `(${n})` : '';
      }

      if (!storageAvailable()) {
        // Degrade gracefully: hide the machinery, say why.
        listEl.innerHTML = '';
        emptyEl.hidden = true;
        unavailableEl.hidden = false;
        if (actions) actions.hidden = true;
        return;
      }
      unavailableEl.hidden = true;
      if (actions) actions.hidden = false;

      const saved = readSavedProgressions();
      emptyEl.hidden = saved.length > 0;
      listEl.innerHTML = saved.map(entry => `
        <div class="saved-item" data-id="${escapeHtml(entry.id)}">
          <button class="saved-load" type="button" data-action="load" data-id="${escapeHtml(entry.id)}"
                  aria-label="Load saved progression ${escapeHtml(entry.name)}">
            <span class="saved-name">${escapeHtml(entry.name)}</span>
            <span class="saved-meta">${escapeHtml(entry.key)} ${escapeHtml(entry.mode)} · ${entry.sourceNumerals.length} chords</span>
          </button>
          <button class="saved-action" type="button" data-action="rename" data-id="${escapeHtml(entry.id)}"
                  aria-label="Rename ${escapeHtml(entry.name)}">Rename</button>
          <button class="saved-action saved-action--danger" type="button" data-action="delete" data-id="${escapeHtml(entry.id)}"
                  aria-label="Delete ${escapeHtml(entry.name)}">Delete</button>
        </div>
      `).join('');
    }

    /**
     * Keep the active (playing) or selected chord visible in the horizontal
     * strip. Feature-checked and try/caught for jsdom, and honoring
     * prefers-reduced-motion by snapping instead of smooth-scrolling.
     */
    function scrollActiveChordIntoView() {
      const idx = state.isPlaying
        ? state.currentChordIndex
        : (state.selectedChordIndex !== null ? state.selectedChordIndex : state.currentChordIndex);
      const cell = elements.chordContainer.querySelector('.chord-cell[data-index="' + idx + '"]');
      if (!cell || typeof cell.scrollIntoView !== 'function') return;
      const reduced = typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      try {
        cell.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      } catch (e) { /* environments without scroll options */ }
    }

    function renderLibrary() {
      let html = '';
      PROGRESSION_LIBRARY.forEach((prog, index) => {
        html += `
          <div class="library-item" data-index="${index}">
            <div class="library-item-name">${prog.name}</div>
            <div class="library-item-chords">${prog.chords.join(' → ')}</div>
            <div class="library-item-style">${prog.style}</div>
          </div>
        `;
      });
      elements.libraryGrid.innerHTML = html;
    }

    // ============================================
    // CHORD DICTIONARY FUNCTIONS
    // ============================================
    
    function renderDictChordGrid() {
      const chords = CHORD_CATEGORIES[state.dictCategory] || [];
      
      let html = '';
      chords.forEach(quality => {
        const isActive = quality === state.dictQuality;
        const chordInfo = getChordTypeInfo(quality);
        const symbol = chordInfo ? chordInfo.symbol : quality;
        
        html += `
          <button class="dict-chord-btn ${isActive ? 'active' : ''}" data-quality="${quality}">
            ${state.dictRoot}${symbol}
          </button>
        `;
      });
      
      elements.dictChordGrid.innerHTML = html;
      
      // Add click handlers
      elements.dictChordGrid.querySelectorAll('.dict-chord-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.dictQuality = btn.dataset.quality;
          renderDictChordGrid();
          renderDictChordInfo();
        });
      });
    }
    
    function getChordTypeInfo(quality) {
      for (const level of ['simple', 'seventh', 'extended', 'altered']) {
        if (CHORD_TYPES[level][quality]) {
          return CHORD_TYPES[level][quality];
        }
      }
      return null;
    }
    
    function renderDictChordInfo() {
      const { dictRoot, dictQuality } = state;
      const chordInfo = getChordTypeInfo(dictQuality);
      
      if (!chordInfo) return;
      
      // Chord name and full name
      const symbol = formatChordSymbol(dictRoot, dictQuality);
      elements.dictChordName.textContent = symbol;
      elements.dictChordFullName.textContent = `${NOTE_DISPLAY[dictRoot] || dictRoot} ${chordInfo.name}`;
      
      // Formula
      elements.dictChordFormula.textContent = CHORD_FORMULAS[dictQuality] || '—';

      // Practical shortcut, when one exists (see CHORD_TIPS)
      const tip = CHORD_TIPS[dictQuality];
      elements.dictChordTip.hidden = !tip;
      elements.dictChordTip.textContent = tip ? 'Think of it as… ' + tip : '';
      
      // Substitutions
      const subs = getChordSubstitutions(dictRoot, dictQuality);
      if (subs.length > 0) {
        elements.dictSubstitutions.innerHTML = subs.map(sub => `
          <button class="voicing-sub-btn" title="${sub.description}">
            ${sub.symbol} <span style="font-size: 0.65rem; opacity: 0.7;">(${sub.description})</span>
          </button>
        `).join('');
        
        // Add click handlers to load that chord
        elements.dictSubstitutions.querySelectorAll('.voicing-sub-btn').forEach((btn, i) => {
          btn.addEventListener('click', () => {
            state.dictRoot = subs[i].root;
            state.dictQuality = subs[i].quality;
            elements.dictRootSelect.value = state.dictRoot;
            
            // Find and activate the right category
            for (const [cat, qualities] of Object.entries(CHORD_CATEGORIES)) {
              if (qualities.includes(state.dictQuality)) {
                state.dictCategory = cat;
                updateDictCategoryButtons();
                break;
              }
            }
            
            renderDictChordGrid();
            renderDictChordInfo();
          });
        });
      } else {
        elements.dictSubstitutions.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No common substitutions</span>';
      }
      
      // Voicings
      renderDictVoicings();
    }
    
    function renderDictVoicings() {
      const { dictRoot, dictQuality } = state;
      const voicingData = KEYBOARD_VOICINGS[dictQuality];
      
      if (!voicingData) {
        elements.dictVoicingList.innerHTML = '<div style="color: var(--text-muted);">No voicings available</div>';
        return;
      }
      
      let html = '';
      voicingData.voicings.forEach((voicing, i) => {
        const leftNotes = voicing.left.map(interval => formatNoteDisplay(spellInterval(dictRoot, interval))).join(' ');
        const rightNotes = voicing.right.map(interval => formatNoteDisplay(spellInterval(dictRoot, interval))).join(' ');

        html += `
          <button type="button" class="dict-voicing-item" data-index="${i}"
            title="Tap to hear this voicing" aria-label="Play ${voicing.name} voicing">
            <div class="dict-voicing-name">${voicing.name}</div>
            <div class="dict-voicing-notes">
              <div class="dict-hand">
                <div class="dict-hand-label">L.H.</div>
                <div class="dict-hand-notes">${leftNotes}</div>
              </div>
              <div class="dict-hand">
                <div class="dict-hand-label">R.H.</div>
                <div class="dict-hand-notes">${rightNotes}</div>
              </div>
            </div>
          </button>
        `;
      });

      elements.dictVoicingList.innerHTML = html;
    }
    
    function updateDictCategoryButtons() {
      elements.dictCategories.querySelectorAll('.dict-category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === state.dictCategory);
      });
    }
    
    function initChordDictionary() {
      // Set up category buttons
      elements.dictCategories.querySelectorAll('.dict-category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.dictCategory = btn.dataset.category;
          // Select first chord in category
          state.dictQuality = CHORD_CATEGORIES[state.dictCategory][0];
          updateDictCategoryButtons();
          renderDictChordGrid();
          renderDictChordInfo();
        });
      });
      
      // Set up root select
      elements.dictRootSelect.addEventListener('change', (e) => {
        state.dictRoot = e.target.value;
        renderDictChordGrid();
        renderDictChordInfo();
      });
      
      // Initial render
      renderDictChordGrid();
      renderDictChordInfo();
    }

