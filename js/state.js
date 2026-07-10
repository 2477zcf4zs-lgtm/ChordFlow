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
      bars: 4,            // random-generation length in bars (one chord per bar), 2-8
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
        // A secondary dominant is cadential TO ITS TARGET: V7/x resolving to x
        // keeps its color just like V7 resolving to I (Phase 4).
        const src = state.sourceNumerals[i];
        if (isDomFamily(chord.quality) && typeof src === 'string' && src.includes('/')) {
          const targetRoot = parseBasicNumeral(src.split('/')[1], key, mode, 'simple').root;
          if (next.root === targetRoot) continue;
        }
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

    // ============================================
    // RANDOM GENERATION — light phrase model (Phase 4)
    // ============================================

    /**
     * Degree pools by phrase position. First chord leans tonic (ii/IV openings
     * at lower weight), last chord is cadential (tonic, or dominant-function
     * for a turnaround feel), interior draws from the full degree pool.
     */
    const PHRASE_POOLS = {
      major: {
        first: [['I', 6], ['ii', 1.2], ['IV', 1.2], ['vi', 0.8]],
        interior: [['ii', 3], ['IV', 3], ['V', 3], ['vi', 3], ['I', 2], ['iii', 1.5]],
        last: [['I', 5], ['V', 2]]
      },
      minor: {
        first: [['i', 6], ['iv', 1.2], ['VI', 0.8]],
        interior: [['iv', 3], ['VII', 2.5], ['VI', 2.5], ['III', 2], ['i', 2], ['V', 2], ['v', 1], ['ii', 1]],
        last: [['i', 5], ['V', 2]]
      }
    };

    // Degrees a secondary dominant may tonicize (spec: ii, IV, V, vi — never a
    // diminished target, so minor's ii° is excluded; minor-mode analogues are
    // iv, V and VI).
    const SECONDARY_TARGETS = {
      major: ['ii', 'IV', 'V', 'vi'],
      minor: ['iv', 'V', 'VI']
    };

    /**
     * Build a random progression as roman numerals: `bars` chords (one per
     * bar) from the phrase pools, then a secondary-dominant pass that converts
     * the chord BEFORE a tonicizable degree into `V7/<target>` — conversion
     * (not insertion) keeps the length exactly `bars`. Pure: no state/DOM.
     *
     * Secondary-dominant rules (Phase 4):
     * - probability scales with density (rarer in sparse progressions)
     * - target must immediately follow (guaranteed by conversion)
     * - phrase-interior only (never the opening chord, never the final chord)
     * - at most one per 4 bars; two allowed in 7-8 bar progressions
     */
    function buildRandomNumerals(mode, bars, density) {
      const pools = PHRASE_POOLS[mode] || PHRASE_POOLS.major;
      const n = Math.max(2, Math.min(8, Math.floor(bars) || 4));
      const numerals = new Array(n);

      numerals[0] = weightedPick(pools.first);
      numerals[n - 1] = weightedPick(pools.last);
      // A 2-bar phrase reading I-I (or i-i) says nothing; force motion.
      if (n === 2 && numerals[1] === numerals[0]) {
        numerals[1] = numerals[0] === 'V' ? (mode === 'major' ? 'I' : 'i') : 'V';
      }

      for (let i = 1; i <= n - 2; i++) {
        let pick;
        let guard = 0;
        do {
          pick = weightedPick(pools.interior);
        } while (++guard < 12 &&
          (pick === numerals[i - 1] || (i === n - 2 && pick === numerals[n - 1])));
        numerals[i] = pick;
      }

      // Secondary-dominant pass: convert numerals[t-1] into V7/<numerals[t]>.
      // t-1 ranges over interior positions only (1 .. n-2), so the secondary
      // dominant is never the opening or the final chord, and its target
      // always follows it. Skip 4-6 bar phrases past one conversion, allow a
      // second in 7-8 bar phrases; 2-bar phrases have no interior slot.
      const targets = SECONDARY_TARGETS[mode] || SECONDARY_TARGETS.major;
      const quota = n >= 7 ? 2 : 1;
      let applied = 0;
      for (let t = 2; t <= n - 1 && applied < quota; t++) {
        if (!targets.includes(numerals[t])) continue;
        if (String(numerals[t - 1]).includes('/')) continue;
        // Per-candidate probability tuned so ~1/3 of 8-bar full-density
        // progressions contain a secondary (an 8-bar phrase offers ~5-6
        // candidate positions; the statistical test bounds presence to 5-50%).
        if (Math.random() < 0.09 * density) {
          numerals[t - 1] = 'V7/' + numerals[t];
          applied++;
          t++; // keep converted pairs from chaining back-to-back
        }
      }

      return numerals;
    }

    function generateRandomProgression() {
      const { mode } = state;

      // Roll a per-progression density character here (not in the builder), so
      // a later key change transposes the SAME character instead of re-rolling.
      // Rolled before the numerals so the secondary-dominant probability can
      // scale with it.
      state.density = Math.random() < 0.7 ? 1.0 : 0.45;
      state.sourceNumerals = buildRandomNumerals(mode, state.bars, state.density);
      state.substitutions = [];
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

