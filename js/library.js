// library.js — PROGRESSION_LIBRARY data (53 entries).
    // ============================================
    // PROGRESSION LIBRARY
    //
    // Phase 5 audit: every entry carries `originalKey` (the key the tune is
    // documented/most commonly lead-sheeted in; the entry's `mode` is the mode
    // of that key). Generic exercises and style patterns have no original key;
    // they default to C (A minor-mode exercises use C minor) — didactic
    // convention, not a claim about a source tune. Real tunes additionally
    // carry explicit quality suffixes (Imaj7, ii7, V7b9…) so the parser
    // reproduces the chart as written instead of rolling tier pools; generic
    // patterns deliberately keep bare numerals so the pools provide variety.
    // ============================================

    const PROGRESSION_LIBRARY = [
      // ============================================
      // JAZZ ESSENTIALS
      // The core progressions every jazz player must know.
      // (Cross-checked against Learn Jazz Standards' "9 Important
      // Jazz Chord Progressions".)
      // Exercises, not tunes: originalKey C by convention.
      // ============================================
      { name: 'ii-V-I (Major)', chords: ['ii', 'V', 'I'], style: 'Jazz', mode: 'major', originalKey: 'C' },
      { name: 'Minor ii-V-i', chords: ['iiø7', 'V7b9', 'i'], style: 'Jazz', mode: 'minor', originalKey: 'C' },
      { name: 'I-vi-ii-V (Rhythm Changes A)', chords: ['I', 'vi', 'ii', 'V'], style: 'Jazz', mode: 'major', originalKey: 'Bb' }, // Rhythm changes convention: Bb
      { name: 'I-VI7-ii-V (Turnaround)', chords: ['I', 'VI7', 'ii', 'V'], style: 'Jazz', mode: 'major', originalKey: 'C' },
      { name: 'Minor i-vi-ii-V', chords: ['i', '#viø', 'iiø', 'V'], style: 'Jazz', mode: 'minor', originalKey: 'C' },
      { name: 'iii-VI-ii-V (iii for I)', chords: ['iii', 'VI', 'ii', 'V'], style: 'Jazz', mode: 'major', originalKey: 'C' },
      { name: 'I-#i°-ii-V (Diminished Sub)', chords: ['I', '#i°', 'ii', 'V'], style: 'Jazz', mode: 'major', originalKey: 'C' },
      { name: 'I-IV7-iii-VI7 (Cycle)', chords: ['I', 'IV7', 'iii', 'VI', 'ii', 'V', 'I'], style: 'Jazz', mode: 'major', originalKey: 'C' },
      { name: 'Chromatic ii-V into I', chords: ['biii', 'bVI7', 'ii', 'V', 'I'], style: 'Jazz', mode: 'major', originalKey: 'C' },
      { name: 'Tritone Sub ii-V-I', chords: ['ii', 'bII7', 'I'], style: 'Jazz', mode: 'major', originalKey: 'C' },
      { name: 'Diminished Walk-Up', chords: ['I', '#i°', 'ii', '#ii°', 'iii', 'VI', 'ii', 'V'], style: 'Jazz', mode: 'major', originalKey: 'C' },

      // ============================================
      // JAZZ STANDARDS
      // Changes verified against the actual tunes. Entries marked
      // "style" or "simplified" are inspired-by, not exact charts.
      // ============================================
      // Autumn Leaves: G minor / Bb major reading — this entry is the major reading.
      { name: 'Autumn Leaves (A Section)', chords: ['ii7', 'V7', 'Imaj7', 'IVmaj7', 'viiø7', 'III7b9', 'vi7'], style: 'Jazz Standard', mode: 'major', originalKey: 'Bb' },
      { name: 'All The Things You Are (First 5)', chords: ['vi7', 'ii7', 'V7', 'Imaj7', 'IVmaj7'], style: 'Jazz Standard', mode: 'major', originalKey: 'Ab' },
      { name: 'Take The A Train (A)', chords: ['I6', 'II7', 'ii7', 'V7', 'I6'], style: 'Jazz Standard', mode: 'major', originalKey: 'C' },
      { name: 'Misty (First 3 Bars)', chords: ['Imaj7', 'v7', 'V/IV', 'IVmaj7'], style: 'Jazz Ballad', mode: 'major', originalKey: 'Eb' },
      { name: 'Stella By Starlight (First 8)', chords: ['#ivø7', 'VII7b9', 'ii7', 'V7', 'v7', 'V/IV', 'IVmaj7', 'bVII7', 'Imaj7'], style: 'Jazz Standard', mode: 'major', originalKey: 'Bb' },
      { name: 'There Will Never Be Another You', chords: ['Imaj7', 'viiø7', 'III7b9', 'vi7', 'v7', 'V/IV', 'IVmaj7', 'bVII7'], style: 'Jazz Standard', mode: 'major', originalKey: 'Eb' },
      // QUALITY: Dameron's original resolves bVI/bII as maj7 (Abmaj7/Dbmaj7);
      // the all-dominant version kept here is the common blowing sub —
      // Anthony to review which reading he wants.
      { name: 'Ladybird Turnaround', chords: ['I', 'bIII7', 'bVI7', 'bII7'], style: 'Bebop', mode: 'major', originalKey: 'C' },
      { name: 'Blue Bossa', chords: ['i', 'iv7', 'iiø7', 'V7b9', 'i', 'iii7', 'V/bII', 'bIImaj7', 'iiø7', 'V7b9', 'i'], style: 'Latin Jazz', mode: 'minor', originalKey: 'C' },
      { name: 'Black Orpheus', chords: ['i', 'iiø7', 'V7b9', 'i', 'iv7', 'VII7', 'IIImaj7', 'VImaj7'], style: 'Bossa Nova', mode: 'minor', originalKey: 'A' },
      // So What is D dorian; treated as D minor here. Bare numerals kept on
      // purpose: the minor pool's m7/m9/m11 colors ARE the modal sound.
      { name: 'So What / Impressions', chords: ['i', 'i', 'i', 'i', 'bii', 'bii', 'i', 'i'], style: 'Modal Jazz', mode: 'minor', originalKey: 'D' },
      { name: 'ii-V Chains (Satin Doll style)', chords: ['ii', 'V', 'ii', 'V', 'iii', 'VI', 'ii', 'V', 'I'], style: 'Jazz', mode: 'major', originalKey: 'C' }, // Satin Doll's key

      // ============================================
      // BLUES
      // ============================================
      // KEY: best guess — Anthony to review (generic blues; F is the common jazz teaching key)
      { name: '12-Bar Blues', chords: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], style: 'Blues', mode: 'major', originalKey: 'F' },
      // KEY: best guess — Anthony to review (Bb is the canonical jazz-blues key)
      { name: 'Jazz Blues (12-Bar)', chords: ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'VI7', 'ii7', 'V7', 'I7', 'VI7'], style: 'Blues', mode: 'major', originalKey: 'Bb' },
      { name: 'Blues For Alice (First 5 Bars)', chords: ['Imaj7', 'viiø7', 'III7', 'vi7', 'II7', 'v7', 'I7', 'IV7'], style: 'Bebop', mode: 'major', originalKey: 'F' },
      // KEY: best guess — Anthony to review (C minor per the Mr. P.C. convention)
      { name: 'Minor Blues (12-Bar)', chords: ['i', 'i', 'i', 'i', 'iv', 'iv', 'i', 'i', 'VI7', 'V', 'i', 'i'], style: 'Blues', mode: 'minor', originalKey: 'C' },
      { name: 'Freddie Freeloader', chords: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'bVII7', 'bVII7'], style: 'Blues', mode: 'major', originalKey: 'Bb' },

      // ============================================
      // SOUL & MOTOWN
      // ============================================
      { name: 'Dock of the Bay (Verse)', chords: ['I', 'III', 'IV', 'II'], style: 'Soul', mode: 'major', originalKey: 'G' },
      { name: 'Sir Duke (Verse)', chords: ['I', 'vi', 'bVI', 'V'], style: 'Soul', mode: 'major', originalKey: 'B' },
      { name: 'Isn\'t She Lovely', chords: ['vi7', 'II7', 'V7', 'I'], style: 'Soul', mode: 'major', originalKey: 'E' },
      { name: 'I Wish', chords: ['i', 'IV7', 'i', 'IV7'], style: 'Funk Soul', mode: 'minor', originalKey: 'Eb' },
      // KEY: best guess — Anthony to review (Eb minor reading of the clav riff)
      { name: 'Higher Ground', chords: ['i', 'III', 'IV', 'i'], style: 'Funk Soul', mode: 'minor', originalKey: 'Eb' },

      // ============================================
      // R&B & NEO-SOUL
      // Style patterns, not tunes: originalKey C by convention.
      // ============================================
      { name: 'R&B Ballad', chords: ['I', 'iii', 'vi', 'IV', 'V'], style: 'R&B', mode: 'major', originalKey: 'C' },
      { name: 'R&B Minor Groove', chords: ['i', 'iv', 'VII', 'III'], style: 'R&B', mode: 'minor', originalKey: 'C' },
      { name: 'J Dilla Feel', chords: ['ii', 'V', 'I', 'vi'], style: 'Hip-Hop Jazz', mode: 'major', originalKey: 'C' },
      { name: 'Nujabes Style', chords: ['ii', 'V', 'iii', 'vi'], style: 'Hip-Hop Jazz', mode: 'major', originalKey: 'C' },

      // ============================================
      // GOSPEL
      // Style patterns, not tunes: originalKey C by convention.
      // ============================================
      { name: 'Gospel Shout', chords: ['IV', 'V', 'iii', 'vi', 'ii', 'V', 'I'], style: 'Gospel', mode: 'major', originalKey: 'C' },
      { name: 'Gospel Tag (Backdoor)', chords: ['IV', 'iv', 'I', 'V', 'I'], style: 'Gospel', mode: 'major', originalKey: 'C' },
      { name: 'Gospel Walk-Up', chords: ['I', 'ii', 'iii', 'IV', 'V', 'I'], style: 'Gospel', mode: 'major', originalKey: 'C' },
      { name: 'Gospel Turnaround', chords: ['I', 'iii', 'vi', 'IV', 'ii', 'V', 'I'], style: 'Gospel', mode: 'major', originalKey: 'C' },

      // ============================================
      // FUNK
      // ============================================
      // KEY: best guess — Anthony to review (Brown vamps commonly sit on D)
      { name: 'James Brown Style', chords: ['I7', 'I7', 'I7', 'IV7'], style: 'Funk', mode: 'major', originalKey: 'D' },
      { name: 'Chameleon', chords: ['i', 'IV7', 'i', 'IV7'], style: 'Jazz Funk', mode: 'minor', originalKey: 'Bb' },
      { name: 'Get Lucky', chords: ['vi', 'I', 'iii', 'II'], style: 'Disco Funk', mode: 'major', originalKey: 'D' }, // sounding Bm = vi of D

      // ============================================
      // SMOOTH JAZZ & FUSION
      // ============================================
      { name: 'Just The Two Of Us', chords: ['IVmaj7', 'III7', 'vi7', 'v7', 'I7'], style: 'Smooth Jazz', mode: 'major', originalKey: 'Ab' },
      { name: 'Spain (B Section)', chords: ['IVmaj7', 'III7', 'ii7', 'V7', 'Imaj7', 'IVmaj7', 'VII7', 'III7', 'vi7'], style: 'Fusion', mode: 'major', originalKey: 'D' },
      { name: 'Cantaloupe Island', chords: ['i7', 'VI7', '#vi7', 'i7'], style: 'Hard Bop', mode: 'minor', originalKey: 'F' },
      { name: 'Footprints (simplified)', chords: ['i', 'i', 'i', 'i', 'iv', 'iv', 'i', 'i', 'ii°', 'V', 'i', 'i'], style: 'Modal Jazz', mode: 'minor', originalKey: 'C' },

      // ============================================
      // LATIN & BOSSA NOVA
      // ============================================
      { name: 'Girl From Ipanema (A)', chords: ['Imaj7', 'II7', 'ii7', 'bII7', 'Imaj7'], style: 'Bossa Nova', mode: 'major', originalKey: 'F' },
      { name: 'Andalusian Cadence', chords: ['i', 'VII', 'VI', 'V'], style: 'Latin', mode: 'minor', originalKey: 'A' }, // textbook key

      // ============================================
      // POP ESSENTIALS
      // Patterns, not tunes (except Canon): originalKey C by convention.
      // ============================================
      { name: 'Axis (I-V-vi-IV)', chords: ['I', 'V', 'vi', 'IV'], style: 'Pop', mode: 'major', originalKey: 'C' },
      { name: '50s Progression', chords: ['I', 'vi', 'IV', 'V'], style: 'Pop', mode: 'major', originalKey: 'C' },
      { name: 'Sensitive (vi-IV-I-V)', chords: ['vi', 'IV', 'I', 'V'], style: 'Pop', mode: 'major', originalKey: 'C' },
      { name: 'Canon Progression', chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], style: 'Pop', mode: 'major', originalKey: 'D' }, // Pachelbel's Canon in D
    ];

