// parsing.js — chord substitutions (SUBSTITUTION_RULES/getChordSubstitutions) and
// roman-numeral parsing (parseRomanNumeral/parseBasicNumeral, weighted cumulative pools).
    // ============================================
    // CHORD SUBSTITUTIONS
    // ============================================
    
    // Substitution rules based on chord quality
    // Each quality maps to an array of substitution types with their logic
    const SUBSTITUTION_RULES = {
      // Major chords
      maj: [
        { type: 'relative_minor', desc: 'Relative minor', interval: 9, quality: 'min' },
        { type: 'maj7', desc: 'Add maj7', interval: 0, quality: 'maj7' }
      ],
      maj7: [
        { type: 'relative_minor', desc: 'Relative minor', interval: 9, quality: 'min7' },
        { type: 'iii_sub', desc: 'iii chord sub', interval: 4, quality: 'min7' },
        { type: 'add6', desc: 'Use 6/9', interval: 0, quality: '69' }
      ],
      maj9: [
        { type: 'relative_minor', desc: 'Relative minor', interval: 9, quality: 'min9' },
        { type: 'iii_sub', desc: 'iii chord sub', interval: 4, quality: 'min9' }
      ],
      
      // Minor chords
      min: [
        { type: 'relative_major', desc: 'Relative major', interval: 3, quality: 'maj' },
        { type: 'min7', desc: 'Add min7', interval: 0, quality: 'min7' }
      ],
      min7: [
        { type: 'relative_major', desc: 'Relative major', interval: 3, quality: 'maj7' },
        { type: 'dorian_IV', desc: 'Dorian IV', interval: 5, quality: 'dom7' }
      ],
      min9: [
        { type: 'relative_major', desc: 'Relative major', interval: 3, quality: 'maj9' }
      ],
      min11: [
        { type: 'sus_voicing', desc: 'Sus voicing', interval: 5, quality: 'maj7' }
      ],
      
      // Dominant chords - most substitution options
      dom7: [
        { type: 'tritone', desc: 'Tritone sub', interval: 6, quality: 'dom7' },
        { type: 'related_ii', desc: 'Related ii-7', interval: 5, quality: 'min7' },
        { type: 'dim_approach', desc: 'Dim approach', interval: 0, quality: 'dim7' },
        { type: 'alt', desc: 'Altered', interval: 0, quality: 'dom7alt' }
      ],
      dom9: [
        { type: 'tritone', desc: 'Tritone sub', interval: 6, quality: 'dom9' },
        { type: 'related_ii', desc: 'Related ii-9', interval: 5, quality: 'min9' },
        { type: 'alt', desc: 'Altered', interval: 0, quality: 'dom7alt' }
      ],
      dom13: [
        { type: 'tritone', desc: 'Tritone sub', interval: 6, quality: 'dom13' },
        { type: 'related_ii', desc: 'Related ii-9', interval: 5, quality: 'min9' }
      ],
      dom7alt: [
        { type: 'tritone', desc: 'Tritone sub', interval: 6, quality: 'dom7alt' },
        { type: 'straight', desc: 'Straight dom7', interval: 0, quality: 'dom7' }
      ],
      dom7b9: [
        { type: 'tritone', desc: 'Tritone sub', interval: 6, quality: 'dom7b9' },
        { type: 'dim7_sub', desc: 'Dim7 from 3rd', interval: 4, quality: 'dim7' }
      ],
      dom7s9: [
        { type: 'tritone', desc: 'Tritone sub', interval: 6, quality: 'dom7s9' },
        { type: 'straight', desc: 'Straight dom9', interval: 0, quality: 'dom9' }
      ],
      dom11: [
        { type: 'sus', desc: 'Sus4 voicing', interval: 0, quality: 'dom7sus4' },
        { type: 'tritone', desc: 'Tritone sub', interval: 6, quality: 'dom11' }
      ],
      dom7sus4: [
        { type: 'phrygian', desc: 'Phrygian sound', interval: 5, quality: 'maj7' },
        { type: 'straight', desc: 'Resolve to dom7', interval: 0, quality: 'dom7' }
      ],
      
      // Diminished
      dim: [
        { type: 'dom7b9', desc: 'Dom7♭9 (root down half)', interval: 11, quality: 'dom7b9' }
      ],
      dim7: [
        { type: 'dom7b9', desc: 'Dom7♭9 (root down half)', interval: 11, quality: 'dom7b9' },
        { type: 'other_dim', desc: 'Enharmonic dim', interval: 3, quality: 'dim7' }
      ],
      
      // Half-diminished
      m7b5: [
        { type: 'min9_sub', desc: 'Minor 9 (b3 root)', interval: 3, quality: 'min9' },
        { type: 'dom9_sub', desc: 'Dom9 (b7 root)', interval: 10, quality: 'dom9' }
      ],
      
      // Augmented
      aug: [
        { type: 'dom7s5', desc: 'Dom7♯5', interval: 0, quality: 'dom7s5' }
      ],
      
      // 6th chords
      '6': [
        { type: 'min7_sub', desc: 'vi min7', interval: 9, quality: 'min7' }
      ],
      '69': [
        { type: 'min11_sub', desc: 'vi min11', interval: 9, quality: 'min11' }
      ],
      'm6': [
        { type: 'm7b5_sub', desc: 'iiø7 (from 6th)', interval: 9, quality: 'm7b5' }
      ]
    };
    
    /**
     * Get chord substitutions for a given chord
     * @param {string} root - Root note of the chord
     * @param {string} quality - Chord quality
     * @returns {Array} Array of substitution objects with root, quality, and description
     */
    function getChordSubstitutions(root, quality) {
      const rules = SUBSTITUTION_RULES[quality];
      if (!rules || !root) return [];
      
      const subs = [];
      const rootSemitone = NOTE_TO_SEMITONE[root];
      
      // If we can't find the root semitone, return empty
      if (rootSemitone === undefined) {
        console.warn(`Unknown root note for substitutions: ${root}`);
        return [];
      }
      
      // Spell each substitute's root by its interval RELATIONSHIP to the
      // original chord (degree-aware), using the app's spelling engine. The old
      // approach picked sharp/flat from the original chord's own accidental via a
      // fixed mod-12 table, so e.g. the tritone sub of E7 came out as A#7 — and
      // that root then spelled its own third as C double-sharp. spellInterval
      // gives the correct letter name (Bb7) every time.
      const SUB_INTERVAL_NAME = { 0: null, 3: 'b3', 4: '3', 5: '4', 6: 'b5', 9: '6', 10: 'b7', 11: '7' };

      for (const rule of rules) {
        const intervalName = SUB_INTERVAL_NAME[rule.interval];
        let newRoot;
        if (intervalName === null) {
          newRoot = root;                                  // interval 0: same root
        } else if (intervalName) {
          newRoot = spellInterval(root, intervalName);
        } else {
          // Safety net for any interval not in the map (none at present)
          newRoot = transposeWithContext(root, rule.interval, false);
        }
        
        subs.push({
          type: rule.type,
          root: newRoot,
          quality: rule.quality,
          description: rule.desc,
          symbol: formatChordSymbol(newRoot, rule.quality)
        });
      }
      
      return subs;
    }

    function parseRomanNumeral(numeral, key, mode, complexity, density = 1.0) {
      // Handle secondary dominants (e.g., V/ii, V/V, vii°/V)
      if (numeral.includes('/')) {
        const [primary, secondary] = numeral.split('/');
        
        // First, find the root of the secondary target chord
        // Parse the secondary numeral to get its root note
        const secondaryChord = parseBasicNumeral(secondary, key, mode, 'simple');
        const secondaryRoot = secondaryChord.root;
        
        // Now parse the primary numeral relative to the secondary root
        // Secondary dominants are typically in major context regardless of home key mode
        const primaryChord = parseBasicNumeral(primary, secondaryRoot, 'major', complexity, true, density);
        
        // Keep the original degree notation for display
        primaryChord.degree = numeral;
        
        return primaryChord;
      }
      
      return parseBasicNumeral(numeral, key, mode, complexity, false, density);
    }

    // Chart-style suffix -> quality (uppercase / lowercase roman resolve dom vs
    // min families). Returns null for no/unknown suffix so pools take over.
    const EXPLICIT_SUFFIXES = {
      upper: {
        '7': 'dom7', '9': 'dom9', '11': 'dom11', '13': 'dom13',
        'maj7': 'maj7', 'maj9': 'maj9', 'maj13': 'maj13',
        '6': '6', '69': '69', 'add9': 'add9',
        '7b9': 'dom7b9', '7#9': 'dom7s9', '7b5': 'dom7b5', '7#5': 'dom7s5',
        '7#11': 'dom7s11', '7b13': 'dom7b13', '7alt': 'dom7alt',
        '9b5': 'dom9b5', '9#5': 'dom9s5', '13b9': 'dom13b9', '13#11': 'dom13s11'
      },
      lower: {
        '7': 'min7', '9': 'min9', '11': 'min11', '13': 'min13',
        '6': 'm6', 'add9': 'madd9', 'maj7': 'minMaj7'
      }
    };

    function explicitSuffixQuality(workingNumeral, isUpperCase) {
      const m = /^([IViv]+)(.+)$/.exec(workingNumeral);
      if (!m) return null;
      const table = isUpperCase ? EXPLICIT_SUFFIXES.upper : EXPLICIT_SUFFIXES.lower;
      return table[m[2]] || null;
    }

    /** The 'simple' tier reduces a pinned chart quality to its triad. */
    function triadReduction(quality) {
      if (quality.startsWith('min') || quality === 'm6' || quality === 'madd9') return 'min';
      return 'maj';
    }

    function parseBasicNumeral(numeral, key, mode, complexity, isSecondary = false, density = 1.0) {
      // The strict-7th and root-shell-pretty tiers select essentially the same
      // chord QUALITIES as the jazz-rootless seventh tier; they differ mainly
      // in which VOICINGS get offered (see voicingsFor). Normalize for the
      // quality switches, but remember the real tier: the STRICT tier must not
      // pull tonic-color chords (6, m6), since those aren't R-3-5-7 sevenths.
      const requestedComplexity = complexity;
      const isStrictSeventh = complexity === 'seventh-strict';
      if (complexity === 'seventh-strict' || complexity === 'rsp') complexity = 'seventh';
      let workingNumeral = numeral;
      let isFlat = false;
      let isSharp = false;
      let isDiminished = numeral.includes('°');
      let isHalfDiminished = numeral.includes('ø');
      let isAugmented = numeral.includes('+');
      
      // Check for accidentals at start - must check for 'b' followed by uppercase roman numeral
      if (/^b[IViv]/.test(workingNumeral)) {
        isFlat = true;
        workingNumeral = workingNumeral.substring(1);
      } else if (workingNumeral.startsWith('#')) {
        isSharp = true;
        workingNumeral = workingNumeral.substring(1);
      }
      
      // Core numeral = the leading roman-letter run once °/ø/+ symbols are
      // dropped. Taking the prefix (instead of globally stripping known words
      // and digits) survives altered suffixes like 'V7b9' or 'II13#11', whose
      // 'b'/'#' fragments used to corrupt the numeral.
      const coreNumeral = (/^[IViv]+/.exec(workingNumeral.replace(/[°ø+]/g, '')) || [''])[0];
      
      // Determine if major or minor based on case
      const isUpperCase = coreNumeral === coreNumeral.toUpperCase() && coreNumeral.length > 0;
      
      // Map numeral to scale degree (0-indexed)
      const numeralToScaleDegree = {
        'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6
      };
      
      const normalizedNumeral = coreNumeral.toUpperCase();
      const scaleDegree = numeralToScaleDegree[normalizedNumeral];
      
      if (scaleDegree === undefined) {
        console.warn(`Unknown numeral: ${numeral} (core: ${coreNumeral}, normalized: ${normalizedNumeral})`);
        return { root: key, quality: 'maj', degree: numeral };
      }
      
      // Use interval spelling to get the correct root note
      // Scale degree intervals (in semitones) for major and minor scales
      const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
      const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10];
      
      const scaleIntervals = mode === 'major' ? majorScaleIntervals : minorScaleIntervals;
      let semitoneOffset = scaleIntervals[scaleDegree];
      
      // Apply accidentals to the semitone offset
      if (isFlat) semitoneOffset -= 1;
      if (isSharp) semitoneOffset += 1;
      
      // Spell the root note correctly using interval logic
      // The scale degree tells us how many letters up from the key root
      const root = spellScaleDegree(key, scaleDegree, semitoneOffset);
      
      // Determine chord quality based on numeral case and complexity level
      let quality;

      // Cumulative pools: each tier includes the tiers below it at steeply
      // decaying weight. `density` (per-progression, 2.4) scales the reached-down
      // (simpler) weights up when a sparser character was rolled.
      const downScale = 1 / density;
      const scale = (pairs, f) => pairs.map(([v, w]) => [v, w * f]);

      // --- Explicit chart suffixes pin the quality (as-written library, 5.1) ---
      // A numeral like Imaj7, ii7, V7b9 or bIImaj7 reproduces the chart instead
      // of rolling pools. Secondary dominants are exempt: V7/x keeps following
      // the tier's dominant pools (Phase 4). The 'simple' tier reduces pinned
      // qualities to their triad, mirroring how °7 reduces to dim there.
      // °/ø/+/sus stay with their existing branches below.
      const pinned = !isSecondary && !isDiminished && !isHalfDiminished &&
        !isAugmented && !/sus/i.test(numeral)
        ? explicitSuffixQuality(workingNumeral, isUpperCase)
        : null;
      if (pinned) {
        quality = complexity === 'simple' ? triadReduction(pinned) : pinned;
        // The vii°-in-major / ii-in-minor guardrails below intentionally still
        // apply after this (function preservation, invariant 7).
      } else if (isDiminished) {
        if (complexity === 'simple') {
          quality = 'dim';
        } else if (numeral.includes('°7') || isSharp || isSecondary) {
          // Explicit °7, chromatic passing dims (#i°, #ii°), and secondary
          // vii°/X are fully diminished
          quality = 'dim7';
        } else {
          // Diatonic ii° (minor) and vii° (major) are half-diminished in
          // seventh-chord practice: ii°7 in a minor ii-V-i is m7b5
          quality = 'm7b5';
        }
      } else if (isHalfDiminished) {
        quality = 'm7b5';
      } else if (isAugmented) {
        quality = 'aug';
      } else if (isUpperCase) {
        // Major chord - pick from appropriate pool based on complexity
        // V is dominant; so are unaltered uppercase II, III, VI, VII in major
        // mode, which function as secondary dominants (V/V, V/vi, V/ii, V/iii)
        // in jazz convention (e.g. the VI7 in a I-VI-ii-V turnaround)
        const isSecondaryDominantDegree = mode === 'major' && !isFlat && !isSharp &&
          (scaleDegree === 1 || scaleDegree === 2 || scaleDegree === 5 || scaleDegree === 6);
        // bVII in major is the "backdoor" dominant (e.g. Ab7 in Bb);
        // VII in minor is the subtonic seventh, diatonically dominant quality
        const isBackdoorDominant = mode === 'major' && isFlat && scaleDegree === 6;
        const isMinorSubtonicDominant = mode === 'minor' && !isFlat && !isSharp && scaleDegree === 6;
        // An explicit '7' on an uppercase numeral (I7, IV7, bII7...) forces
        // dominant quality per chart convention; 'maj7' stays major
        const wantsExplicitDom = /7/.test(numeral) && !/maj/i.test(numeral) && !/sus/i.test(numeral);
        const isdominant = (scaleDegree === 4 && !isFlat && !isSharp) ||
          isSecondaryDominantDegree || isSecondary ||
          isBackdoorDominant || isMinorSubtonicDominant || wantsExplicitDom;
        
        if (isdominant) {
          // Dominant chord options. Pools stay within dominant FUNCTION (no
          // random sus/altered-fifth). Cumulative: higher tiers can reach down,
          // but the triad floor is ≤0.2 — a bare V triad reads as pop, so the
          // dominant almost always keeps its 7th.
          switch (complexity) {
            case 'simple':
              quality = 'maj';
              break;
            case 'seventh':
              quality = weightedPick([
                ['dom7', 10],
                ...scale([['maj', 0.2]], downScale)
              ]);
              break;
            case 'extended':
              quality = weightedPick([
                ['dom9', 4], ['dom13', 4],
                ...scale([['dom7', 3], ['maj', 0.3]], downScale)
              ]);
              break;
            case 'altered':
              quality = weightedPick([
                ['dom7b9', 1], ['dom7s9', 1], ['dom7b13', 1], ['dom7alt', 1],
                ['dom13b9', 1], ['dom9', 1], ['dom13', 1], ['dom7s11', 1], ['dom13s11', 1],
                ...scale([['dom9', 2], ['dom13', 2], ['dom7', 2], ['maj', 0.2]], downScale)
              ]);
              break;
          }
        } else {
          // Non-dominant major chord. 6 / 6-9 are TONIC colors (I chord only).
          // The triad floor is meaningfully nonzero here — a bare tonic or IV
          // triad is idiomatic gospel/soul restraint, unlike dominants.
          const isTonicMajor = scaleDegree === 0 && !isFlat && !isSharp;
          switch (complexity) {
            case 'simple':
              quality = 'maj';
              break;
            case 'seventh': {
              const pairs = [['maj7', 5], ...scale([['maj', 1]], downScale)];
              if (isTonicMajor && !isStrictSeventh) pairs.push(['6', 2]);
              quality = weightedPick(pairs);
              break;
            }
            case 'extended':
              quality = isTonicMajor
                ? weightedPick([['maj9', 3], ['69', 2], ['add9', 1.5],
                    ...scale([['maj7', 2], ['maj', 0.8]], downScale)])
                : weightedPick([['maj9', 3], ['maj13', 2],
                    ...scale([['maj7', 2], ['maj', 0.8]], downScale)]);
              break;
            case 'altered':
              quality = isTonicMajor
                ? weightedPick([['maj9', 3], ['69', 2], ['maj13', 1.5],
                    ...scale([['maj7', 2], ['maj', 0.8]], downScale)])
                : weightedPick([['maj9', 3], ['maj13', 2],
                    ...scale([['maj7', 2], ['maj', 0.8]], downScale)]);
              break;
          }
        }
      } else {
        // Minor chord (lowercase numeral). m6, madd9 and minMaj7 are
        // TONIC-MINOR colors (melodic minor sounds on the i chord); a ii or
        // vi chord functioning as a predominant should stay in the m7 family.
        // Cumulative and density-scaled, mirroring the major structure.
        const isTonicMinor = scaleDegree === 0 && mode === 'minor' && !isFlat && !isSharp;
        switch (complexity) {
          case 'simple':
            quality = 'min';
            break;
          case 'seventh': {
            const pairs = [['min7', 5], ...scale([['min', 1]], downScale)];
            if (isTonicMinor && !isStrictSeventh) pairs.push(['m6', 2]);
            quality = weightedPick(pairs);
            break;
          }
          case 'extended':
            quality = isTonicMinor
              ? weightedPick([['min9', 3], ['m6', 2], ['madd9', 1.5],
                  ...scale([['min7', 2], ['min', 0.8]], downScale)])
              : weightedPick([['min9', 3], ['min11', 2],
                  ...scale([['min7', 2], ['min', 0.8]], downScale)]);
            break;
          case 'altered':
            quality = isTonicMinor
              ? weightedPick([['min9', 3], ['m6', 2], ['minMaj7', 1.5],
                  ...scale([['min7', 2], ['min', 0.8]], downScale)])
              : weightedPick([['min9', 3], ['min11', 2], ['min13', 1.5],
                  ...scale([['min7', 2], ['min', 0.8]], downScale)]);
            break;
        }
      }
      
      // Explicit sus in the numeral (e.g. 'Vsus') forces suspended quality
      if (/sus/i.test(numeral)) {
        quality = complexity === 'simple' ? 'sus4' : 'dom7sus4';
      }
      
      // Special case: vii in major is diminished
      if (scaleDegree === 6 && mode === 'major' && !isUpperCase && !isDiminished && !isHalfDiminished && !isFlat) {
        if (complexity === 'simple') quality = 'dim';
        else quality = 'm7b5';
      }
      
      // Special case: ii in minor is also diminished/half-dim
      if (scaleDegree === 1 && mode === 'minor' && !isUpperCase && !isDiminished && !isHalfDiminished) {
        if (complexity === 'simple') quality = 'dim';
        else quality = 'm7b5';
      }
      
      return {
        root: root,
        quality: quality,
        degree: numeral
      };
    }
    
    /**
     * Spell a scale degree correctly (e.g., 4th degree of Gb = Cb, not B)
     */
    function spellScaleDegree(keyRoot, scaleDegree, semitones) {
      const keyLetter = getRootLetter(keyRoot);
      const keySemitone = NOTE_TO_SEMITONE[keyRoot];
      
      // Target letter is scaleDegree letters up from key
      const targetLetter = getLetterAtDegree(keyLetter, scaleDegree);
      
      // Target semitone
      const targetSemitone = (keySemitone + semitones + 12) % 12;
      
      // What semitone is the natural target letter?
      const naturalSemitone = NOTE_TO_SEMITONE[targetLetter];
      
      // Calculate needed accidental
      let diff = targetSemitone - naturalSemitone;
      if (diff > 6) diff -= 12;
      if (diff < -6) diff += 12;
      
      let accidental = '';
      if (diff === 1) accidental = '#';
      else if (diff === 2) accidental = '##';
      else if (diff === -1) accidental = 'b';
      else if (diff === -2) accidental = 'bb';
      
      return targetLetter + accidental;
    }

