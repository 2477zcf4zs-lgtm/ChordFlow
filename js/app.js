// app.js — cached DOM element references, event listeners, keyboard shortcuts, and init(). Loaded last.
    // ============================================
    // UI ELEMENTS
    // ============================================

    const elements = {
      playBtn: document.getElementById('playBtn'),
      prevChordBtn: document.getElementById('prevChordBtn'),
      nextChordBtn: document.getElementById('nextChordBtn'),
      stopBtn: document.getElementById('stopBtn'),
      newBtn: document.getElementById('newBtn'),
      voicingBtn: document.getElementById('voicingBtn'),
      metroBtn: document.getElementById('metroBtn'),
      tempoSlider: document.getElementById('tempoSlider'),
      tempoDisplay: document.getElementById('tempoDisplay'),
      tempoBtn: document.getElementById('tempoBtn'),
      tempoBtnValue: document.getElementById('tempoBtnValue'),
      tempoPopover: document.getElementById('tempoPopover'),
      settingsToggle: document.getElementById('settingsToggle'),
      settingsPanel: document.getElementById('settingsPanel'),
      beatsPerChord: document.getElementById('beatsPerChord'),
      keySelect: document.getElementById('keySelect'),
      barsSelect: document.getElementById('barsSelect'),
      grooveSelect: document.getElementById('grooveSelect'),
      leftHandSelect: document.getElementById('leftHandSelect'),
      bassBackingBtn: document.getElementById('bassBackingBtn'),
      rangeSelect: document.getElementById('rangeSelect'),
      voicingSubs: document.getElementById('voicingSubs'),
      undoChip: document.getElementById('undoChip'),
      abCompareBtn: document.getElementById('abCompareBtn'),
      flavorBtn: document.getElementById('flavorBtn'),
      swingBtn: document.getElementById('swingBtn'),
      autoTransposeSelect: document.getElementById('autoTransposeSelect'),
      tempoRampSelect: document.getElementById('tempoRampSelect'),
      hideSymbolsBtn: document.getElementById('hideSymbolsBtn'),
      complexitySelect: document.getElementById('complexitySelect'),
      modeSelect: document.getElementById('modeSelect'),
      chordContainer: document.getElementById('chordContainer'),
      padsToggle: document.getElementById('padsToggle'),
      padsPanel: document.getElementById('padsPanel'),
      padModeBtn: document.getElementById('padModeBtn'),
      padGrid: document.getElementById('padGrid'),
      progressionName: document.getElementById('progressionName'),
      progressionStyle: document.getElementById('progressionStyle'),
      progressFill: document.getElementById('progressFill'),
      currentMeasure: document.getElementById('currentMeasure'),
      loopCount: document.getElementById('loopCount'),
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),
      voicingPanel: document.getElementById('voicingPanel'),
      voicingDescription: document.getElementById('voicingDescription'),
      libraryToggle: document.getElementById('libraryToggle'),
      libraryPanel: document.getElementById('libraryPanel'),
      libraryGrid: document.getElementById('libraryGrid'),
      saveProgressionBtn: document.getElementById('saveProgressionBtn'),
      exportSavedBtn: document.getElementById('exportSavedBtn'),
      importSavedBtn: document.getElementById('importSavedBtn'),
      importSavedInput: document.getElementById('importSavedInput'),
      savedList: document.getElementById('savedList'),
      // Chord dictionary elements
      dictToggle: document.getElementById('dictToggle'),
      chordDictPanel: document.getElementById('chordDictPanel'),
      dictRootSelect: document.getElementById('dictRootSelect'),
      dictCategories: document.getElementById('dictCategories'),
      dictChordGrid: document.getElementById('dictChordGrid'),
      dictChordName: document.getElementById('dictChordName'),
      dictChordFullName: document.getElementById('dictChordFullName'),
      dictChordFormula: document.getElementById('dictChordFormula'),
      dictChordTip: document.getElementById('dictChordTip'),
      dictSubstitutions: document.getElementById('dictSubstitutions'),
      dictVoicingList: document.getElementById('dictVoicingList')
    };

    // ============================================
    // EVENT HANDLERS
    // ============================================

    function setupEventListeners() {
      // Transport controls
      elements.playBtn.addEventListener('click', () => { togglePlayback(); elements.playBtn.blur(); });
      elements.prevChordBtn.addEventListener('click', () => { stepChord(-1); elements.prevChordBtn.blur(); });
      elements.nextChordBtn.addEventListener('click', () => { stepChord(1); elements.nextChordBtn.blur(); });
      elements.stopBtn.addEventListener('click', () => { stopAndReset(); elements.stopBtn.blur(); });
      elements.newBtn.addEventListener('click', () => {
        stopPlayback();
        generateRandomProgression();
        elements.newBtn.blur();
      });
      // Tab bar: one panel open at a time (or none). No blur() here — tabs
      // are keyboard-navigable and focus-visible styles handle the outline.
      elements.padsToggle.addEventListener('click', () => toggleTab('pads'));
      elements.voicingBtn.addEventListener('click', () => toggleTab('voicing'));
      elements.dictToggle.addEventListener('click', () => toggleTab('dictionary'));
      elements.libraryToggle.addEventListener('click', () => toggleTab('library'));
      elements.settingsToggle.addEventListener('click', () => toggleTab('settings'));

      // Tempo popover (opened from the transport bar's BPM readout)
      elements.tempoBtn.addEventListener('click', () => {
        const opening = elements.tempoPopover.hidden;
        elements.tempoPopover.hidden = !opening;
        elements.tempoBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      });
      document.addEventListener('click', (e) => {
        if (elements.tempoPopover.hidden) return;
        if (elements.tempoPopover.contains(e.target) || elements.tempoBtn.contains(e.target)) return;
        elements.tempoPopover.hidden = true;
        elements.tempoBtn.setAttribute('aria-expanded', 'false');
      });

      elements.metroBtn.addEventListener('click', () => {
        state.metronomeOn = !state.metronomeOn;
        const metroLbl = elements.metroBtn.querySelector('.btn-label');
        if (metroLbl) metroLbl.textContent = state.metronomeOn ? 'Click: On' : 'Click: Off';
        elements.metroBtn.classList.toggle('active', state.metronomeOn);
        elements.metroBtn.blur();
      });
      
      // Settings
      elements.tempoSlider.addEventListener('input', (e) => {
        setTempo(parseInt(e.target.value));
      });
      
      elements.beatsPerChord.addEventListener('change', (e) => {
        state.beatsPerChord = parseInt(e.target.value);
        // The beat-dot count changed, so the boxes must be rebuilt.
        renderChordStructure();
        // Re-anchor to the current chord's downbeat in the new meter so the
        // playhead doesn't leap to a chord whose audio never played.
        if (state.isPlaying) {
          audioEngine.beatCounter = state.currentChordIndex * state.beatsPerChord;
          audioEngine.visualQueue = [];
          if (audioEngine.ctx) {
            audioEngine.nextBeatTime = audioEngine.ctx.currentTime + 0.06;
          }
        }
      });
      
      elements.keySelect.addEventListener('change', (e) => {
        state.key = e.target.value;
        // Leaving the original key ends the as-written presentation (5.1).
        state.asWritten = false;
        updateAsWrittenChip();
        // Transpose the SAME progression into the new key (and re-apply its
        // substitutions) rather than replacing it with a different one.
        if (state.sourceNumerals.length > 0) {
          buildProgressionFromSource();
        }
      });

      elements.complexitySelect.addEventListener('change', (e) => {
        state.complexity = e.target.value;
        // Tier logic taking over ends the as-written presentation (5.1).
        state.asWritten = false;
        updateAsWrittenChip();
        // Re-derive the same progression's chord qualities at the new complexity.
        if (state.sourceNumerals.length > 0) {
          buildProgressionFromSource();
        }
      });
      
      elements.modeSelect.addEventListener('change', (e) => {
        state.mode = e.target.value;
        generateRandomProgression();
      });

      // Bars applies to random generation; regenerate immediately (mirrors the
      // mode control). Playback, if running, re-anchors via
      // buildProgressionFromSource -> resetPlaybackClock.
      elements.barsSelect.addEventListener('change', (e) => {
        state.bars = parseInt(e.target.value);
        generateRandomProgression();
      });

      // Comping groove + swing: the scheduler reads these live on each chord,
      // so no rebuild is needed — they take effect from the next chord.
      elements.grooveSelect.addEventListener('change', (e) => {
        state.groove = e.target.value;
      });
      // Left hand (bassist mode): only the LH realization changes — RH shapes
      // and the voice-leading optimizer are untouched, so no rebuild. Audio
      // reads it live via chordPitchesAt on the next chord/pad/audition; the
      // voicing panel just needs a re-render to show the new LH.
      elements.leftHandSelect.addEventListener('change', (e) => {
        state.leftHand = e.target.value;
        renderVoicing();
      });
      // Range (3-octave mode): unlike the Left Hand modes, the window changes
      // which RH voicings/shifts the optimizer picks, so it must recompute.
      // Audio reads the new indices live on the next scheduled chord.
      elements.rangeSelect.addEventListener('change', (e) => {
        state.range = e.target.value;
        recomputeProgressionVoicings();
        renderVoicing();
      });
      // Backing bass: read live by scheduleBeat; only audible when the LH
      // plays no roots (rootless/evans), a no-op otherwise.
      elements.bassBackingBtn.addEventListener('click', () => {
        state.bassBacking = !state.bassBacking;
        const lbl = elements.bassBackingBtn.querySelector('.btn-label');
        if (lbl) lbl.textContent = state.bassBacking ? 'Bass: On' : 'Bass: Off';
        elements.bassBackingBtn.classList.toggle('active', state.bassBacking);
        elements.bassBackingBtn.blur();
      });
      elements.swingBtn.addEventListener('click', () => {
        state.swing = !state.swing;
        const lbl = elements.swingBtn.querySelector('.btn-label');
        if (lbl) lbl.textContent = state.swing ? 'Swing: On' : 'Swing: Off';
        elements.swingBtn.classList.toggle('active', state.swing);
        elements.swingBtn.blur();
      });

      // Practice modes (read at each loop boundary / render)
      elements.autoTransposeSelect.addEventListener('change', (e) => {
        state.autoTranspose = e.target.value;
      });
      elements.tempoRampSelect.addEventListener('change', (e) => {
        state.tempoRamp = parseInt(e.target.value) || 0;
      });
      // Tap-to-play pads. Trigger-mode toggle:
      elements.padModeBtn.addEventListener('click', () => {
        state.padMode = state.padMode === 'hold' ? 'oneshot' : 'hold';
        const lbl = elements.padModeBtn.querySelector('.btn-label');
        if (lbl) lbl.textContent = state.padMode === 'hold' ? 'Trigger: Hold' : 'Trigger: One-shot';
        elements.padModeBtn.classList.toggle('active', state.padMode === 'hold');
        padReleaseAll();
        elements.padModeBtn.blur();
      });

      // Pointer press/release, delegated once, polyphonic (per pointerId so
      // multiple fingers sound multiple pads). Document-level up/cancel so a
      // finger sliding off the pad still releases it.
      const activePads = new Map(); // pointerId -> { index, pad }
      elements.padGrid.addEventListener('pointerdown', (e) => {
        const pad = e.target.closest('.pad');
        if (!pad) return;
        e.preventDefault(); // no focus flicker / text selection / synthetic click
        const index = parseInt(pad.dataset.index);
        activePads.set(e.pointerId, { index, pad });
        pad.classList.add('pressed');
        padPress(index);
      });
      const endPad = (e) => {
        const rec = activePads.get(e.pointerId);
        if (!rec) return;
        activePads.delete(e.pointerId);
        rec.pad.classList.remove('pressed');
        padRelease(rec.index); // one-shot: rings on; hold: damper
      };
      document.addEventListener('pointerup', endPad);
      document.addEventListener('pointercancel', endPad);

      // Keyboard: press-and-hold via keydown/keyup on the focused pad.
      elements.padGrid.addEventListener('keydown', (e) => {
        if (e.repeat || (e.code !== 'Enter' && e.code !== 'Space')) return;
        const pad = e.target.closest('.pad');
        if (!pad) return;
        e.preventDefault();
        pad.classList.add('pressed');
        padPress(parseInt(pad.dataset.index));
      });
      elements.padGrid.addEventListener('keyup', (e) => {
        if (e.code !== 'Enter' && e.code !== 'Space') return;
        const pad = e.target.closest('.pad');
        if (!pad) return;
        pad.classList.remove('pressed');
        padRelease(parseInt(pad.dataset.index));
      });

      elements.hideSymbolsBtn.addEventListener('click', () => {
        state.hideSymbols = !state.hideSymbols;
        elements.chordContainer.classList.toggle('symbols-hidden', state.hideSymbols);
        const lbl = elements.hideSymbolsBtn.querySelector('.btn-label');
        if (lbl) lbl.textContent = state.hideSymbols ? 'Symbols: Hidden' : 'Symbols: Shown';
        elements.hideSymbolsBtn.classList.toggle('active', state.hideSymbols);
        elements.hideSymbolsBtn.blur();
      });
      
      // Chord boxes + sub badges: one delegated listener (mirrors libraryGrid).
      // Nodes are rebuilt only on structural changes, so per-node listeners
      // would be re-attached needlessly; delegation also survives those rebuilds.
      elements.chordContainer.addEventListener('click', (e) => {
        const badge = e.target.closest('.sub-badge');
        if (badge) {
          // The badge is a shortcut to the chord's sub tray: selecting the
          // chord opens the voicing panel, which renders the tray. If the
          // chord is already selected, just surface the panel — re-selecting
          // would cycle its voicing, which a badge tap shouldn't do.
          e.stopPropagation();
          const idx = parseInt(badge.dataset.chordIndex);
          if (state.selectedChordIndex === idx) toggleVoicingPanel(true);
          else selectChord(idx);
          return;
        }
        const box = e.target.closest('.chord-box');
        if (box && box.dataset.index !== undefined) {
          selectChord(parseInt(box.dataset.index));
        }
      });

      // Sub tray: one delegated listener; chips are rebuilt per render.
      elements.voicingSubs.addEventListener('click', (e) => {
        const chip = e.target.closest('.sub-chip');
        if (!chip) return;
        subTrayTap(parseInt(chip.dataset.chordIndex), chip.dataset.key);
      });

      // Transient undo chip (single instance, see showUndoChip).
      elements.undoChip.addEventListener('click', undoChipActivate);

      // A/B compare: whole-progression with/without subs (invariant 16:
      // per-index swaps, never a rebuild — playback position is untouched).
      elements.abCompareBtn.addEventListener('click', toggleCompareOriginal);

      // Flavor dial: a creative input to GENERATION (applies on the next
      // New), not a setting — so it lives beside the generate button. It
      // also reorders the sub tray so the borrowed colors surface first.
      elements.flavorBtn.addEventListener('click', () => {
        const order = ['off', 'subtle', 'bold'];
        state.flavor = order[(order.indexOf(state.flavor) + 1) % order.length];
        const pretty = state.flavor.charAt(0).toUpperCase() + state.flavor.slice(1);
        const lbl = elements.flavorBtn.querySelector('.btn-label');
        if (lbl) lbl.textContent = `Flavor: ${pretty}`;
        elements.flavorBtn.setAttribute('aria-label', `Flavor for new progressions: ${state.flavor}`);
        // Levels must read without the label (mobile hides .btn-label):
        // Subtle = the standard gold outline + one dot; Bold = filled gold
        // (flavor-bold) + two dots.
        elements.flavorBtn.classList.toggle('active', state.flavor !== 'off');
        elements.flavorBtn.classList.toggle('flavor-bold', state.flavor === 'bold');
        const dots = elements.flavorBtn.querySelector('.flavor-dots');
        if (dots) dots.textContent = state.flavor === 'bold' ? '••' : (state.flavor === 'subtle' ? '•' : '');
        if (state.showVoicing) renderVoicing(); // tray reorders with the dial
        elements.flavorBtn.blur();
      });

      // At the moment the tab hides, only ~120ms is buffered and the throttled
      // scheduler interval may not fire for up to ~1s → an audible gap. Force
      // one immediate schedule pass (which now uses the wide hidden lookahead).
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && state.isPlaying && audioEngine.ctx) schedulerTick();
      });

      elements.libraryGrid.addEventListener('click', (e) => {
        const item = e.target.closest('.library-item');
        if (item) {
          loadProgression(parseInt(item.dataset.index));
        }
      });

      // My Progressions (5.2). One delegated listener on the list, mirroring
      // libraryGrid. prompt/confirm are try/caught: jsdom doesn't implement
      // them and a blocked dialog must not take the app down.
      elements.saveProgressionBtn.addEventListener('click', () => {
        let name = null;
        try { name = window.prompt('Name this progression', state.progressionName || 'My progression'); } catch (e) { name = ''; }
        if (name === null) return; // user cancelled
        saveCurrentProgression(name);
      });

      elements.savedList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        if (btn.dataset.action === 'load') {
          loadSavedProgression(id);
        } else if (btn.dataset.action === 'rename') {
          let name = null;
          try { name = window.prompt('New name'); } catch (err) { name = null; }
          if (name) renameSavedProgression(id, name);
        } else if (btn.dataset.action === 'delete') {
          let ok = true;
          try { ok = window.confirm('Delete this saved progression?'); } catch (err) { ok = true; }
          if (ok) deleteSavedProgression(id);
        }
      });

      elements.exportSavedBtn.addEventListener('click', () => {
        try {
          const blob = new Blob([exportSavedProgressionsJson()], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'chordflow-progressions.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
          elements.statusText.textContent = 'Export not supported here';
        }
      });

      elements.importSavedBtn.addEventListener('click', () => elements.importSavedInput.click());
      elements.importSavedInput.addEventListener('change', () => {
        const file = elements.importSavedInput.files && elements.importSavedInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const n = importSavedProgressionsJson(String(reader.result));
          elements.statusText.textContent = n > 0 ? `Imported ${n} progression${n === 1 ? '' : 's'}` : 'Import failed: not a ChordFlow export';
        };
        reader.readAsText(file);
        elements.importSavedInput.value = '';
      });
      
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        // Let browser/OS shortcuts through (Cmd/Ctrl+R reload, Cmd+Arrow, etc.)
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        
        switch (e.code) {
          case 'Space':
            e.preventDefault();
            togglePlayback();
            break;
          case 'KeyR':
            e.preventDefault();
            stopPlayback();
            generateRandomProgression();
            break;
          case 'KeyV':
            e.preventDefault();
            toggleVoicingPanel();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            setTempo(state.tempo - 5);
            break;
          case 'ArrowRight':
            e.preventDefault();
            setTempo(state.tempo + 5);
            break;
          case 'BracketLeft':
            e.preventDefault();
            stepChord(-1);
            break;
          case 'BracketRight':
            e.preventDefault();
            stepChord(1);
            break;
        }
      });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
      renderLibrary();
      renderSavedProgressions();
      initChordDictionary();
      setupEventListeners();
      updateStatus();

      // Load a default progression
      loadProgression(0);
    }

    init();
