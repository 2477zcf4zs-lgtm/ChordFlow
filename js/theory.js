// theory.js — notes, INTERVALS, spelling (spellInterval/transposeWithContext), weightedPick, CHORD_TYPES.
// Split out of the former single-file app in Phase 1; loaded as a classic script (shared global scope).
    // ============================================
    // MUSIC THEORY DATA
    // ============================================
    
    // Base chromatic notes (for internal calculations)
    
    // Note name to semitone mapping
    const NOTE_TO_SEMITONE = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4, 'E#': 5,
      'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
      'B': 11, 'Cb': 11, 'B#': 0,
      // Double sharps
      'C##': 2, 'D##': 4, 'E##': 6, 'F##': 7, 'G##': 9, 'A##': 11, 'B##': 1,
      // Double flats
      'Cbb': 10, 'Dbb': 0, 'Ebb': 2, 'Fbb': 3, 'Gbb': 5, 'Abb': 7, 'Bbb': 9
    };
    
    // Letter names for interval calculation
    const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    
    // Keys that prefer sharps vs flats
    
    // For UI display - convert to prettier symbols
    const NOTE_DISPLAY = {
      'C': 'C', 'C#': 'C♯', 'Db': 'D♭', 'D': 'D', 'D#': 'D♯', 'Eb': 'E♭',
      'E': 'E', 'F': 'F', 'F#': 'F♯', 'Gb': 'G♭', 'G': 'G', 'G#': 'G♯',
      'Ab': 'A♭', 'A': 'A', 'A#': 'A♯', 'Bb': 'B♭', 'B': 'B',
      'Cb': 'C♭', 'Fb': 'F♭', 'E#': 'E♯', 'B#': 'B♯'
    };
    
    // Available keys for selection (using standard spellings)
    
    // Interval names to semitones and scale degrees
    // Scale degree is how many letter names up from root (0-indexed)
    const INTERVALS = {
      'R': { semitones: 0, degree: 0 },      // Root
      'b2': { semitones: 1, degree: 1 },     // Minor 2nd
      '2': { semitones: 2, degree: 1 },      // Major 2nd
      'b3': { semitones: 3, degree: 2 },     // Minor 3rd
      '3': { semitones: 4, degree: 2 },      // Major 3rd
      '4': { semitones: 5, degree: 3 },      // Perfect 4th
      '#4': { semitones: 6, degree: 3 },     // Augmented 4th
      'b5': { semitones: 6, degree: 4 },     // Diminished 5th
      '5': { semitones: 7, degree: 4 },      // Perfect 5th
      '#5': { semitones: 8, degree: 4 },     // Augmented 5th
      'b6': { semitones: 8, degree: 5 },     // Minor 6th
      '6': { semitones: 9, degree: 5 },      // Major 6th
      'bb7': { semitones: 9, degree: 6 },    // Diminished 7th
      'b7': { semitones: 10, degree: 6 },    // Minor 7th
      '7': { semitones: 11, degree: 6 },     // Major 7th
      'b9': { semitones: 13, degree: 1 },    // Minor 9th
      '9': { semitones: 14, degree: 1 },     // Major 9th
      '#9': { semitones: 15, degree: 1 },    // Augmented 9th (spelled as #9, not b3)
      '11': { semitones: 17, degree: 3 },    // Perfect 11th
      '#11': { semitones: 18, degree: 3 },   // Augmented 11th
      'b13': { semitones: 20, degree: 5 },   // Minor 13th
      '13': { semitones: 21, degree: 5 }     // Major 13th
    };
    
    /**
     * Get the letter name that is 'degree' steps above the root letter
     */
    function getLetterAtDegree(rootLetter, degree) {
      const rootIndex = LETTERS.indexOf(rootLetter);
      return LETTERS[(rootIndex + degree) % 7];
    }
    
    /**
     * Get the root letter from a note name (strips accidentals)
     */
    function getRootLetter(note) {
      return note.charAt(0);
    }
    
    /**
     * Spell a note correctly given root and interval name
     * This ensures proper enharmonic spelling (e.g., E minor has G natural, not F##)
     */
    function spellInterval(rootNote, intervalName) {
      const interval = INTERVALS[intervalName];
      if (!interval) {
        console.warn(`Unknown interval: ${intervalName}`);
        return rootNote;
      }
      
      const rootLetter = getRootLetter(rootNote);
      const rootSemitone = NOTE_TO_SEMITONE[rootNote];
      
      // Target letter name based on interval degree
      const targetLetter = getLetterAtDegree(rootLetter, interval.degree);
      
      // Target semitone (mod 12)
      const targetSemitone = (rootSemitone + interval.semitones) % 12;
      
      // Find what semitone the natural target letter is
      const naturalSemitone = NOTE_TO_SEMITONE[targetLetter];
      
      // Calculate needed accidental
      let diff = targetSemitone - naturalSemitone;
      if (diff > 6) diff -= 12;
      if (diff < -6) diff += 12;
      
      // Build the note name
      let accidental = '';
      if (diff === 1) accidental = '#';
      else if (diff === 2) accidental = '##';
      else if (diff === -1) accidental = 'b';
      else if (diff === -2) accidental = 'bb';
      
      return targetLetter + accidental;
    }
    
    /**
     * Spell a note at a given semitone interval from root, using key context for preference
     * Used for transposition when we don't have interval context
     */
    function transposeWithContext(rootNote, semitones, preferSharps) {
      const rootSemitone = NOTE_TO_SEMITONE[rootNote];
      const targetSemitone = (rootSemitone + semitones + 12) % 12;
      
      // Sharp and flat spellings for each semitone
      const SHARP_SPELLING = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const FLAT_SPELLING = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
      
      return preferSharps ? SHARP_SPELLING[targetSemitone] : FLAT_SPELLING[targetSemitone];
    }
    
    /**
     * Pick a random element from an array
     */
    /** Weighted random pick from [value, weight] pairs. */
    function weightedPick(pairs) {
      const total = pairs.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * total;
      for (const [v, w] of pairs) if ((r -= w) < 0) return v;
      return pairs[pairs.length - 1][0];
    }

    // Chord quality definitions with intervals from root
    const CHORD_TYPES = {
      simple: {
        maj: { symbol: '', intervals: [0, 4, 7], name: 'Major' },
        min: { symbol: 'm', intervals: [0, 3, 7], name: 'Minor' },
        dim: { symbol: '°', intervals: [0, 3, 6], name: 'Diminished' },
        aug: { symbol: '+', intervals: [0, 4, 8], name: 'Augmented' },
        sus4: { symbol: 'sus4', intervals: [0, 5, 7], name: 'Suspended 4th' },
        sus2: { symbol: 'sus2', intervals: [0, 2, 7], name: 'Suspended 2nd' }
      },
      seventh: {
        maj7: { symbol: 'maj7', intervals: [0, 4, 7, 11], name: 'Major 7th' },
        min7: { symbol: 'm7', intervals: [0, 3, 7, 10], name: 'Minor 7th' },
        dom7: { symbol: '7', intervals: [0, 4, 7, 10], name: 'Dominant 7th' },
        dim7: { symbol: '°7', intervals: [0, 3, 6, 9], name: 'Diminished 7th' },
        m7b5: { symbol: 'm7♭5', intervals: [0, 3, 6, 10], name: 'Half-Diminished' },
        minMaj7: { symbol: 'm(maj7)', intervals: [0, 3, 7, 11], name: 'Minor Major 7th' },
        dom7sus4: { symbol: '7sus4', intervals: [0, 5, 7, 10], name: 'Dominant 7 Sus4' }
      },
      extended: {
        maj9: { symbol: 'maj9', intervals: [0, 4, 7, 11, 14], name: 'Major 9th' },
        min9: { symbol: 'm9', intervals: [0, 3, 7, 10, 14], name: 'Minor 9th' },
        dom9: { symbol: '9', intervals: [0, 4, 7, 10, 14], name: 'Dominant 9th' },
        dom11: { symbol: '11', intervals: [0, 4, 7, 10, 14, 17], name: 'Dominant 11th' },
        min11: { symbol: 'm11', intervals: [0, 3, 7, 10, 14, 17], name: 'Minor 11th' },
        maj13: { symbol: 'maj13', intervals: [0, 4, 7, 11, 14, 21], name: 'Major 13th' },
        dom13: { symbol: '13', intervals: [0, 4, 7, 10, 14, 21], name: 'Dominant 13th' },
        min13: { symbol: 'm13', intervals: [0, 3, 7, 10, 14, 21], name: 'Minor 13th' },
        add9: { symbol: 'add9', intervals: [0, 4, 7, 14], name: 'Add 9' },
        madd9: { symbol: 'm(add9)', intervals: [0, 3, 7, 14], name: 'Minor Add 9' },
        '6': { symbol: '6', intervals: [0, 4, 7, 9], name: 'Major 6th' },
        'm6': { symbol: 'm6', intervals: [0, 3, 7, 9], name: 'Minor 6th' },
        '69': { symbol: '6/9', intervals: [0, 4, 7, 9, 14], name: '6/9' }
      },
      altered: {
        dom7b9: { symbol: '7♭9', intervals: [0, 4, 7, 10, 13], name: 'Dominant 7♭9' },
        dom7s9: { symbol: '7♯9', intervals: [0, 4, 7, 10, 15], name: 'Dominant 7♯9' },
        dom7b5: { symbol: '7♭5', intervals: [0, 4, 6, 10], name: 'Dominant 7♭5' },
        dom7s5: { symbol: '7♯5', intervals: [0, 4, 8, 10], name: 'Dominant 7♯5' },
        dom7s11: { symbol: '7♯11', intervals: [0, 4, 7, 10, 18], name: 'Dominant 7♯11' },
        dom7b13: { symbol: '7♭13', intervals: [0, 4, 7, 10, 20], name: 'Dominant 7♭13' },
        dom7alt: { symbol: '7alt', intervals: [0, 4, 8, 10, 13], name: 'Altered Dominant' },
        dom9b5: { symbol: '9♭5', intervals: [0, 4, 6, 10, 14], name: 'Dominant 9♭5' },
        dom9s5: { symbol: '9♯5', intervals: [0, 4, 8, 10, 14], name: 'Dominant 9♯5' },
        dom13b9: { symbol: '13♭9', intervals: [0, 4, 7, 10, 13, 21], name: 'Dominant 13♭9' },
        dom13s11: { symbol: '13♯11', intervals: [0, 4, 7, 10, 14, 18, 21], name: 'Dominant 13♯11' }
      }
    };

