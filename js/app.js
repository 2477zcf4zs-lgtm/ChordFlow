// app.js — cached DOM element references, event listeners, keyboard shortcuts, and init(). Loaded last.
    // ============================================
    // UI ELEMENTS
    // ============================================

    const elements = {
      playBtn: document.getElementById('playBtn'),
      stopBtn: document.getElementById('stopBtn'),
      newBtn: document.getElementById('newBtn'),
      voicingBtn: document.getElementById('voicingBtn'),
      metroBtn: document.getElementById('metroBtn'),
      tempoSlider: document.getElementById('tempoSlider'),
      tempoDisplay: document.getElementById('tempoDisplay'),
      beatsPerChord: document.getElementById('beatsPerChord'),
      keySelect: document.getElementById('keySelect'),
      complexitySelect: document.getElementById('complexitySelect'),
      modeSelect: document.getElementById('modeSelect'),
      chordContainer: document.getElementById('chordContainer'),
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
      // Chord dictionary elements
      dictToggle: document.getElementById('dictToggle'),
      chordDictPanel: document.getElementById('chordDictPanel'),
      dictRootSelect: document.getElementById('dictRootSelect'),
      dictCategories: document.getElementById('dictCategories'),
      dictChordGrid: document.getElementById('dictChordGrid'),
      dictChordName: document.getElementById('dictChordName'),
      dictChordFullName: document.getElementById('dictChordFullName'),
      dictChordFormula: document.getElementById('dictChordFormula'),
      dictSubstitutions: document.getElementById('dictSubstitutions'),
      dictVoicingList: document.getElementById('dictVoicingList')
    };

    // ============================================
    // EVENT HANDLERS
    // ============================================

    function setupEventListeners() {
      // Transport controls
      elements.playBtn.addEventListener('click', () => { togglePlayback(); elements.playBtn.blur(); });
      elements.stopBtn.addEventListener('click', () => { stopAndReset(); elements.stopBtn.blur(); });
      elements.newBtn.addEventListener('click', () => {
        stopPlayback();
        generateRandomProgression();
        elements.newBtn.blur();
      });
      elements.voicingBtn.addEventListener('click', () => { toggleVoicingPanel(); elements.voicingBtn.blur(); });
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
        // Transpose the SAME progression into the new key (and re-apply its
        // substitutions) rather than replacing it with a different one.
        if (state.sourceNumerals.length > 0) {
          buildProgressionFromSource();
        }
      });
      
      elements.complexitySelect.addEventListener('change', (e) => {
        state.complexity = e.target.value;
        // Re-derive the same progression's chord qualities at the new complexity.
        if (state.sourceNumerals.length > 0) {
          buildProgressionFromSource();
        }
      });
      
      elements.modeSelect.addEventListener('change', (e) => {
        state.mode = e.target.value;
        generateRandomProgression();
      });
      
      // Library
      elements.libraryToggle.addEventListener('click', () => {
        elements.libraryPanel.classList.toggle('visible');
        elements.chordDictPanel.classList.remove('visible'); // Close dict if open
      });
      
      // Chord boxes + sub badges: one delegated listener (mirrors libraryGrid).
      // Nodes are rebuilt only on structural changes, so per-node listeners
      // would be re-attached needlessly; delegation also survives those rebuilds.
      elements.chordContainer.addEventListener('click', (e) => {
        const badge = e.target.closest('.sub-badge');
        if (badge) {
          e.stopPropagation();
          showSubstitutionMenu(parseInt(badge.dataset.chordIndex), badge);
          return;
        }
        const box = e.target.closest('.chord-box');
        if (box && box.dataset.index !== undefined) {
          selectChord(parseInt(box.dataset.index));
        }
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
      
      // Chord Dictionary
      elements.dictToggle.addEventListener('click', () => {
        elements.chordDictPanel.classList.toggle('visible');
        elements.libraryPanel.classList.remove('visible'); // Close library if open
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
        }
      });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
      renderLibrary();
      initChordDictionary();
      setupEventListeners();
      updateStatus();
      
      // Load a default progression
      loadProgression(0);
    }

    init();
