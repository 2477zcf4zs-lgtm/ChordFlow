// library.js — PROGRESSION_LIBRARY data (53 entries).
    // ============================================
    // PROGRESSION LIBRARY
    // ============================================
    
    const PROGRESSION_LIBRARY = [
      // ============================================
      // JAZZ ESSENTIALS
      // The core progressions every jazz player must know.
      // (Cross-checked against Learn Jazz Standards' "9 Important
      // Jazz Chord Progressions".)
      // ============================================
      { name: 'ii-V-I (Major)', chords: ['ii', 'V', 'I'], style: 'Jazz', mode: 'major' },
      { name: 'Minor ii-V-i', chords: ['ii\u00f8', 'V', 'i'], style: 'Jazz', mode: 'minor' },
      { name: 'I-vi-ii-V (Rhythm Changes A)', chords: ['I', 'vi', 'ii', 'V'], style: 'Jazz', mode: 'major' },
      { name: 'I-VI7-ii-V (Turnaround)', chords: ['I', 'VI', 'ii', 'V'], style: 'Jazz', mode: 'major' },
      { name: 'Minor i-vi-ii-V', chords: ['i', '#vi\u00f8', 'ii\u00f8', 'V'], style: 'Jazz', mode: 'minor' },
      { name: 'iii-VI-ii-V (iii for I)', chords: ['iii', 'VI', 'ii', 'V'], style: 'Jazz', mode: 'major' },
      { name: 'I-#i\u00b0-ii-V (Diminished Sub)', chords: ['I', '#i\u00b0', 'ii', 'V'], style: 'Jazz', mode: 'major' },
      { name: 'I-IV7-iii-VI7 (Cycle)', chords: ['I', 'IV7', 'iii', 'VI', 'ii', 'V', 'I'], style: 'Jazz', mode: 'major' },
      { name: 'Chromatic ii-V into I', chords: ['biii', 'bVI7', 'ii', 'V', 'I'], style: 'Jazz', mode: 'major' },
      { name: 'Tritone Sub ii-V-I', chords: ['ii', 'bII7', 'I'], style: 'Jazz', mode: 'major' },
      { name: 'Diminished Walk-Up', chords: ['I', '#i\u00b0', 'ii', '#ii\u00b0', 'iii', 'VI', 'ii', 'V'], style: 'Jazz', mode: 'major' },

      // ============================================
      // JAZZ STANDARDS
      // Changes verified against the actual tunes. Entries marked
      // "style" or "simplified" are inspired-by, not exact charts.
      // ============================================
      { name: 'Autumn Leaves (A Section)', chords: ['ii', 'V', 'I', 'IV', 'vii\u00b0', 'III', 'vi'], style: 'Jazz Standard', mode: 'major' },
      { name: 'All The Things You Are (First 5)', chords: ['vi', 'ii', 'V', 'I', 'IV'], style: 'Jazz Standard', mode: 'major' },
      { name: 'Take The A Train (A)', chords: ['I', 'II', 'ii', 'V', 'I'], style: 'Jazz Standard', mode: 'major' },
      { name: 'Misty (First 3 Bars)', chords: ['I', 'v', 'V/IV', 'IV'], style: 'Jazz Ballad', mode: 'major' },
      { name: 'Stella By Starlight (First 8)', chords: ['#iv\u00f8', 'VII', 'ii', 'V', 'v', 'V/IV', 'IV', 'bVII', 'I'], style: 'Jazz Standard', mode: 'major' },
      { name: 'There Will Never Be Another You', chords: ['I', 'vii\u00f8', 'III', 'vi', 'v', 'V/IV', 'IV', 'bVII'], style: 'Jazz Standard', mode: 'major' },
      { name: 'Ladybird Turnaround', chords: ['I', 'bIII7', 'bVI7', 'bII7'], style: 'Bebop', mode: 'major' },
      { name: 'Blue Bossa', chords: ['i', 'iv', 'ii\u00f8', 'V', 'i', 'iii', 'V/bII', 'bII', 'ii\u00f8', 'V', 'i'], style: 'Latin Jazz', mode: 'minor' },
      { name: 'Black Orpheus', chords: ['i', 'ii\u00b0', 'V', 'i', 'iv', 'VII', 'III', 'VI'], style: 'Bossa Nova', mode: 'minor' },
      { name: 'So What / Impressions', chords: ['i', 'i', 'i', 'i', 'bii', 'bii', 'i', 'i'], style: 'Modal Jazz', mode: 'minor' },
      { name: 'ii-V Chains (Satin Doll style)', chords: ['ii', 'V', 'ii', 'V', 'iii', 'VI', 'ii', 'V', 'I'], style: 'Jazz', mode: 'major' },

      // ============================================
      // BLUES
      // ============================================
      { name: '12-Bar Blues', chords: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], style: 'Blues', mode: 'major' },
      { name: 'Jazz Blues (12-Bar)', chords: ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'VI', 'ii', 'V', 'I7', 'VI'], style: 'Blues', mode: 'major' },
      { name: 'Blues For Alice (First 5 Bars)', chords: ['I', 'vii\u00f8', 'III', 'vi', 'II', 'v', 'I7', 'IV7'], style: 'Bebop', mode: 'major' },
      { name: 'Minor Blues (12-Bar)', chords: ['i', 'i', 'i', 'i', 'iv', 'iv', 'i', 'i', 'VI7', 'V', 'i', 'i'], style: 'Blues', mode: 'minor' },
      { name: 'Freddie Freeloader', chords: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'bVII', 'bVII'], style: 'Blues', mode: 'major' },

      // ============================================
      // SOUL & MOTOWN
      // ============================================
      { name: 'Dock of the Bay (Verse)', chords: ['I', 'III', 'IV', 'II'], style: 'Soul', mode: 'major' },
      { name: 'Sir Duke (Verse)', chords: ['I', 'vi', 'bVI', 'V'], style: 'Soul', mode: 'major' },
      { name: 'Isn\'t She Lovely', chords: ['vi', 'II', 'V', 'I'], style: 'Soul', mode: 'major' },
      { name: 'I Wish', chords: ['i', 'IV7', 'i', 'IV7'], style: 'Funk Soul', mode: 'minor' },
      { name: 'Higher Ground', chords: ['i', 'III', 'IV', 'i'], style: 'Funk Soul', mode: 'minor' },

      // ============================================
      // R&B & NEO-SOUL
      // ============================================
      { name: 'R&B Ballad', chords: ['I', 'iii', 'vi', 'IV', 'V'], style: 'R&B', mode: 'major' },
      { name: 'R&B Minor Groove', chords: ['i', 'iv', 'VII', 'III'], style: 'R&B', mode: 'minor' },
      { name: 'J Dilla Feel', chords: ['ii', 'V', 'I', 'vi'], style: 'Hip-Hop Jazz', mode: 'major' },
      { name: 'Nujabes Style', chords: ['ii', 'V', 'iii', 'vi'], style: 'Hip-Hop Jazz', mode: 'major' },

      // ============================================
      // GOSPEL
      // ============================================
      { name: 'Gospel Shout', chords: ['IV', 'V', 'iii', 'vi', 'ii', 'V', 'I'], style: 'Gospel', mode: 'major' },
      { name: 'Gospel Tag (Backdoor)', chords: ['IV', 'iv', 'I', 'V', 'I'], style: 'Gospel', mode: 'major' },
      { name: 'Gospel Walk-Up', chords: ['I', 'ii', 'iii', 'IV', 'V', 'I'], style: 'Gospel', mode: 'major' },
      { name: 'Gospel Turnaround', chords: ['I', 'iii', 'vi', 'IV', 'ii', 'V', 'I'], style: 'Gospel', mode: 'major' },

      // ============================================
      // FUNK
      // ============================================
      { name: 'James Brown Style', chords: ['I7', 'I7', 'I7', 'IV7'], style: 'Funk', mode: 'major' },
      { name: 'Chameleon', chords: ['i', 'IV7', 'i', 'IV7'], style: 'Jazz Funk', mode: 'minor' },
      { name: 'Get Lucky', chords: ['vi', 'I', 'iii', 'II'], style: 'Disco Funk', mode: 'major' },

      // ============================================
      // SMOOTH JAZZ & FUSION
      // ============================================
      { name: 'Just The Two Of Us', chords: ['IV', 'III', 'vi', 'v', 'I7'], style: 'Smooth Jazz', mode: 'major' },
      { name: 'Spain (B Section)', chords: ['IV', 'III', 'ii', 'V', 'I', 'IV', 'VII', 'III', 'vi'], style: 'Fusion', mode: 'major' },
      { name: 'Cantaloupe Island', chords: ['i', 'VI7', '#vi', 'i'], style: 'Hard Bop', mode: 'minor' },
      { name: 'Footprints (simplified)', chords: ['i', 'i', 'i', 'i', 'iv', 'iv', 'i', 'i', 'ii\u00b0', 'V', 'i', 'i'], style: 'Modal Jazz', mode: 'minor' },

      // ============================================
      // LATIN & BOSSA NOVA
      // ============================================
      { name: 'Girl From Ipanema (A)', chords: ['I', 'II', 'ii', 'bII7', 'I'], style: 'Bossa Nova', mode: 'major' },
      { name: 'Andalusian Cadence', chords: ['i', 'VII', 'VI', 'V'], style: 'Latin', mode: 'minor' },

      // ============================================
      // POP ESSENTIALS
      // ============================================
      { name: 'Axis (I-V-vi-IV)', chords: ['I', 'V', 'vi', 'IV'], style: 'Pop', mode: 'major' },
      { name: '50s Progression', chords: ['I', 'vi', 'IV', 'V'], style: 'Pop', mode: 'major' },
      { name: 'Sensitive (vi-IV-I-V)', chords: ['vi', 'IV', 'I', 'V'], style: 'Pop', mode: 'major' },
      { name: 'Canon Progression', chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], style: 'Pop', mode: 'major' },
    ];

