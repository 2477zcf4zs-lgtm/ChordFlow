// state.js — application state, buildProgressionFromSource, generate/load progressions.
    // ============================================
    // APPLICATION STATE
    // ============================================

    const state = {
      isPlaying: false,
      currentChordIndex: 0,
      selectedChordIndex: null, // For click-to-select voicing view
      currentBeat: 0,
      tempo: 120,
      beatsPerChord: 4,
      key: 'C',
      mode: 'major',
      complexity: 'seventh',
      progression: [],
      sourceNumerals: [],   // roman numerals the progression was built from (for transpose)
      substitutions: [],    // per-index applied substitution type, e.g. 'tritone' (for re-derivation)
      progressionName: '',
      progressionStyle: '',
      loopCount: 1,
      showVoicing: false,
      activeTab: null,    // which tab panel is open: 'voicing'|'dictionary'|'library'|'settings'|null
      metronomeOn: false,
      density: 1.0,       // per-progression sparsity character (2.4); rolled on new/load
      voicingIndices: [], // Track which voicing is selected for each chord
      voicingShifts: [], // Octave placement (in semitones) for each chord's right hand
      // Chord dictionary state
      dictRoot: 'C',
      dictCategory: 'triads',
      dictQuality: 'maj'
    };

    // ============================================
    // PROGRESSION GENERATION
    // ============================================

    /**
     * Build state.progression from state.sourceNumerals in the CURRENT key,
     * mode, and complexity, then re-apply any stored substitutions (re-derived
     * so they transpose with the key). This is the single path used by random
     * generation, library loads, and key/complexity changes — so changing the
     * key transposes the same progression instead of replacing it, and applied
     * substitutions survive the change.
     */
    function buildProgressionFromSource() {
      const { key, mode, complexity, density } = state;
      state.progression = state.sourceNumerals.map(n => parseRomanNumeral(n, key, mode, complexity, density));

      // --- Cadential awareness (2.3) ---
      // Per-chord randomness alone produces whiplash (triad -> 13b9 -> triad).
      // We can't see neighbors inside parseRomanNumeral, but here we can: a
      // dominant that resolves to a tonic-function chord (next chord, wrapping
      // the loop) is CADENTIAL and keeps its full color; other chords may relax
      // a tier so the tension is coloured and the stability simplified.
      const n = state.progression.length;
      const isDomFamily = q => /^dom(7|9|13)/.test(q);
      const relaxProb = density < 1.0 ? 0.6 : 0.3;
      for (let i = 0; i < n; i++) {
        if (state.substitutions[i]) continue;          // re-applied below; leave it
        const chord = state.progression[i];
        const next = state.progression[(i + 1) % n];
        const nextIsTonic = next.root === key || /^[Ii]$/.test(next.degree || '');
        if (isDomFamily(chord.quality) && nextIsTonic) continue;  // cadential: keep color
        if (Math.random() < relaxProb) {
          // Re-pick from the same pool with the below-tier weights doubled
          // (halving density doubles downScale), biasing toward simpler colour.
          state.progression[i] = parseRomanNumeral(
            state.sourceNumerals[i], key, mode, complexity, density * 0.5);
        }
      }

      // Re-apply substitutions by re-deriving them from each new base chord, so
      // a tritone sub of E7 becomes the tritone sub of the transposed chord. If
      // a stored substitution no longer applies (e.g. the quality changed with
      // complexity), it's silently dropped back to the base chord.
      state.substitutions.forEach((subType, i) => {
        if (!subType || i >= state.progression.length) return;
        const base = state.progression[i];
        const match = getChordSubstitutions(base.root, base.quality).find(o => o.type === subType);
        if (match) {
          state.progression[i] = {
            root: match.root,
            quality: match.quality,
            degree: base.degree,
            substituted: true
          };
        } else {
          state.substitutions[i] = null;
        }
      });

      state.currentChordIndex = 0;
      state.selectedChordIndex = null;
      state.currentBeat = 0;
      state.loopCount = 1;

      recomputeProgressionVoicings();
      if (state.isPlaying) resetPlaybackClock();

      renderChordStructure();
      updateProgress();
      if (state.showVoicing) {
        renderVoicing();
      }
    }

    function generateRandomProgression() {
      const { mode } = state;
      
      // Common chord progression patterns for random generation
      const patterns = {
        major: [
          ['I', 'IV', 'V', 'I'],
          ['I', 'vi', 'IV', 'V'],
          ['ii', 'V', 'I', 'vi'],
          ['I', 'IV', 'vi', 'V'],
          ['iii', 'vi', 'ii', 'V'],
          ['I', 'iii', 'IV', 'V'],
          ['vi', 'IV', 'I', 'V'],
          ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V']
        ],
        minor: [
          ['i', 'iv', 'V', 'i'],
          ['i', 'VII', 'VI', 'V'],
          ['i', 'iv', 'VII', 'III'],
          ['i', 'VI', 'III', 'VII'],
          ['i', 'iv', 'v', 'i'],
          ['i', 'bVI', 'bVII', 'i']
        ]
      };

      const modePatterns = patterns[mode];
      const pattern = modePatterns[Math.floor(Math.random() * modePatterns.length)];

      state.sourceNumerals = pattern.slice();
      state.substitutions = [];
      // Roll a per-progression density character here (not in the builder), so
      // a later key change transposes the SAME character instead of re-rolling.
      state.density = Math.random() < 0.7 ? 1.0 : 0.45;
      state.progressionName = 'Random Progression';
      state.progressionStyle = mode === 'major' ? 'Major' : 'Minor';

      elements.progressionName.textContent = state.progressionName;
      elements.progressionStyle.textContent = state.progressionStyle;

      buildProgressionFromSource();
    }

    function loadProgression(index) {
      const prog = PROGRESSION_LIBRARY[index];
      
      // Update mode if progression specifies one
      state.mode = prog.mode || 'major';
      elements.modeSelect.value = state.mode;
      
      state.sourceNumerals = prog.chords.slice();
      state.substitutions = [];
      state.density = Math.random() < 0.7 ? 1.0 : 0.45;
      state.progressionName = prog.name;
      state.progressionStyle = prog.style;
      
      elements.progressionName.textContent = state.progressionName;
      elements.progressionStyle.textContent = state.progressionStyle;
      
      buildProgressionFromSource();
      
      // Close library panel
      elements.libraryPanel.classList.remove('visible');
    }

