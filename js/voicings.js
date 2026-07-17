// voicings.js — KEYBOARD_VOICINGS templates, realizeHand/realizeVoicing, voicingsFor,
// VOICING_TIER_COSTS, the DP voice-leading optimizer, and chord/note formatters.
    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    // Keyboard voicings using interval names for correct spelling
    // Format: { left: [intervals], right: [intervals], name: 'description', type: 'A'|'B'|null }
    // Type A = 3rd on bottom of RH (3-5-7-9), Type B = 7th on bottom of RH (7-9-3-5)
    // These are the classic "Bill Evans" rootless voicings that provide smooth voice leading
    const KEYBOARD_VOICINGS = {
      // ============================================
      // TRIADS (No rootless option - use standard voicings)
      // ============================================
      maj: {
        voicings: [
          { left: ['R'], right: ['3', '5', 'R'], name: 'Root position', type: null },
          { left: ['R', '5'], right: ['R', '3', '5'], name: 'Open voicing', type: null },
          { left: ['R'], right: ['5', 'R', '3'], name: '2nd inversion', type: null }
        ]
      },
      min: {
        voicings: [
          { left: ['R'], right: ['b3', '5', 'R'], name: 'Root position', type: null },
          { left: ['R', '5'], right: ['R', 'b3', '5'], name: 'Open voicing', type: null },
          { left: ['R'], right: ['5', 'R', 'b3'], name: '2nd inversion', type: null }
        ]
      },
      dim: {
        voicings: [
          { left: ['R'], right: ['b3', 'b5', 'R'], name: 'Root position', type: null },
          { left: ['R', 'b5'], right: ['R', 'b3'], name: 'Open voicing', type: null }
        ]
      },
      aug: {
        voicings: [
          { left: ['R'], right: ['3', '#5', 'R'], name: 'Root position', type: null },
          { left: ['R', '#5'], right: ['R', '3'], name: 'Open voicing', type: null }
        ]
      },
      sus4: {
        voicings: [
          { left: ['R'], right: ['4', '5', 'R'], name: 'Root position', type: null },
          { left: ['R', '5'], right: ['R', '4'], name: 'Open voicing', type: null }
        ]
      },
      sus2: {
        voicings: [
          { left: ['R'], right: ['2', '5', 'R'], name: 'Root position', type: null },
          { left: ['R', '5'], right: ['R', '2'], name: 'Open voicing', type: null }
        ]
      },
      
      // ============================================
      // 7TH CHORDS - Bill Evans Rootless Voicings
      // ============================================
      
      // Major 7 - Imaj7 chord
      // Type A: 3-5-7-9 (E-G-B-D for Cmaj7)
      // Type B: 7-9-3-5 (B-D-E-G for Cmaj7)
      maj7: {
        voicings: [
          // Strict: chord tones only (R-3-5-7)
          { left: ['R'], right: ['3', '5', '7'], name: 'Strict: R | 3-5-7', type: null, tiers: ['strict'] },
          { left: ['R', '5'], right: ['7', '3'], name: 'Strict spread: R-5 | 7-3', type: null, tiers: ['strict'] },
          { left: ['R'], right: ['3', '7'], name: 'Shell: R | 3-7', type: null, tiers: ['strict'] },
          // Root-Shell-Pretty: root + shell (3,7) + one color note
          { left: ['R'], right: ['3', '7', '9'], name: 'RSP (9): R | 3-7-9', type: null, tiers: ['rsp'] },
          { left: ['R'], right: ['3', '13', '7'], name: 'RSP (13): R | 3-13-7', type: null, tiers: ['rsp'] },
          { left: ['R'], right: ['3', '7', '#11'], name: 'RSP (#11): R | 3-7-#11', type: null, tiers: ['rsp'] },
          // Jazz rootless (Bill Evans A/B)
          { left: ['R'], right: ['3', '5', '7', '9'], name: 'Type A: 3-5-7-9', type: 'A', tiers: ['jazz'] },
          { left: ['R'], right: ['7', '9', '3', '5'], name: 'Type B: 7-9-3-5', type: 'B', tiers: ['jazz'] },
          { left: ['R'], right: ['3', '5', '6', '9'], name: '6/9 color: 3-5-6-9', type: 'A', tiers: ['jazz'] },
          // Quartal (Lydian): RH stacked in 4ths — C + B-E-A = maj13 color
          { left: ['R'], right: ['7', '3', '13'], name: 'Quartal (Lydian): R | 7-3-13 in 4ths', type: null, tiers: ['jazz'] }
        ]
      },
      
      // Minor 7 - iim7 chord (most common as ii in ii-V-I)
      // Type A: 3-5-7-9 (F-A-C-E for Dm7)
      // Type B: 7-9-3-5 (C-E-F-A for Dm7)
      min7: {
        voicings: [
          // Strict: chord tones only (R-b3-5-b7)
          { left: ['R'], right: ['b3', '5', 'b7'], name: 'Strict: R | 3-5-7', type: null, tiers: ['strict'] },
          { left: ['R', '5'], right: ['b7', 'b3'], name: 'Strict spread: R-5 | 7-3', type: null, tiers: ['strict'] },
          { left: ['R'], right: ['b3', 'b7'], name: 'Shell: R | 3-7', type: null, tiers: ['strict'] },
          // Root-Shell-Pretty: pretty note = 9 or 11
          { left: ['R'], right: ['b3', 'b7', '9'], name: 'RSP (9): R | 3-7-9', type: null, tiers: ['rsp'] },
          { left: ['R'], right: ['b3', 'b7', '11'], name: 'RSP (11): R | 3-7-11', type: null, tiers: ['rsp'] },
          // Jazz rootless (Bill Evans A/B)
          { left: ['R'], right: ['b3', '5', 'b7', '9'], name: 'Type A: 3-5-7-9', type: 'A', tiers: ['jazz'] },
          { left: ['R'], right: ['b7', '9', 'b3', '5'], name: 'Type B: 7-9-3-5', type: 'B', tiers: ['jazz'] },
          // Quartal (So What / McCoy): RH stacked in 4ths — C + F-Bb-Eb, keeps guide tones
          { left: ['R'], right: ['11', 'b7', 'b3'], name: 'Quartal: R | 11-7-3 in 4ths', type: null, tiers: ['jazz'] }
        ]
      },
      
      // Dominant 7 - V7 chord
      // Type A: 3-13-7-9 (B-E-F-A for G7) - uses 13 instead of 5
      // Type B: 7-9-3-13 (F-A-B-E for G7)
      dom7: {
        voicings: [
          // Strict: chord tones only (R-3-5-b7) -- no 9 or 13
          { left: ['R'], right: ['3', '5', 'b7'], name: 'Strict: R | 3-5-7', type: null, tiers: ['strict'] },
          { left: ['R', '5'], right: ['b7', '3'], name: 'Strict spread: R-5 | 7-3', type: null, tiers: ['strict'] },
          { left: ['R'], right: ['3', 'b7'], name: 'Shell: R | 3-7', type: null, tiers: ['strict'] },
          // Root-Shell-Pretty: pretty note = 13 or 9
          { left: ['R'], right: ['3', '13', 'b7'], name: 'RSP (13): R | 3-13-7', type: null, tiers: ['rsp'] },
          { left: ['R'], right: ['3', 'b7', '9'], name: 'RSP (9): R | 3-7-9', type: null, tiers: ['rsp'] },
          // Jazz rootless (Bill Evans A/B -- 13 replaces the 5)
          { left: ['R'], right: ['3', '13', 'b7', '9'], name: 'Type A: 3-13-7-9', type: 'A', tiers: ['jazz'] },
          { left: ['R'], right: ['b7', '9', '3', '13'], name: 'Type B: 7-9-3-13', type: 'B', tiers: ['jazz'] }
        ]
      },
      
      // Diminished 7
      dim7: {
        voicings: [
          // Symmetric chord -- chord-tone voicings serve every tier
          { left: ['R'], right: ['b3', 'b5', 'bb7'], name: 'R | 3-b5-bb7', type: null, tiers: ['strict', 'rsp', 'jazz'] },
          { left: ['R', 'b5'], right: ['bb7', 'b3'], name: 'R-b5 | bb7-b3', type: null, tiers: ['strict', 'rsp', 'jazz'] }
        ]
      },
      
      // Half-diminished (m7b5) - iiø7 in minor ii-V-i
      m7b5: {
        voicings: [
          // Strict: chord tones only (R-b3-b5-b7)
          { left: ['R'], right: ['b3', 'b5', 'b7'], name: 'Strict: R | 3-b5-7', type: null, tiers: ['strict'] },
          { left: ['R', 'b5'], right: ['b7', 'b3'], name: 'Strict spread: R-b5 | 7-3', type: null, tiers: ['strict'] },
          { left: ['R'], right: ['b3', 'b7'], name: 'Shell: R | 3-7', type: null, tiers: ['strict'] },
          // Root-Shell-Pretty: pretty note = 11 or b13
          { left: ['R'], right: ['b3', 'b7', '11'], name: 'RSP (11): R | 3-7-11', type: null, tiers: ['rsp'] },
          { left: ['R'], right: ['b3', 'b13', 'b7'], name: 'RSP (b13): R | 3-b13-7', type: null, tiers: ['rsp'] },
          // Jazz rootless (the "m6 shape" and modern 9 color)
          { left: ['R'], right: ['b3', 'b5', 'b7', 'R'], name: 'Type A: 3-b5-7-R', type: 'A', tiers: ['jazz'] },
          { left: ['R'], right: ['b7', 'R', 'b3', 'b5'], name: 'Type B: 7-R-3-b5', type: 'B', tiers: ['jazz'] },
          { left: ['R'], right: ['b3', 'b5', 'b7', '9'], name: 'Modern: 3-b5-7-9', type: 'A', tiers: ['jazz'] }
        ]
      },
      
      // Minor-Major 7
      minMaj7: {
        voicings: [
          // Strict: chord tones only (R-b3-5-7)
          { left: ['R'], right: ['b3', '5', '7'], name: 'Strict: R | 3-5-7', type: null, tiers: ['strict'] },
          { left: ['R', '5'], right: ['7', 'b3'], name: 'Strict spread: R-5 | 7-3', type: null, tiers: ['strict'] },
          { left: ['R'], right: ['b3', '7'], name: 'Shell: R | 3-7', type: null, tiers: ['strict'] },
          // Root-Shell-Pretty: pretty note = 9
          { left: ['R'], right: ['b3', '7', '9'], name: 'RSP (9): R | 3-7-9', type: null, tiers: ['rsp'] },
          // Jazz rootless (Bill Evans A/B)
          { left: ['R'], right: ['b3', '5', '7', '9'], name: 'Type A: 3-5-7-9', type: 'A', tiers: ['jazz'] },
          { left: ['R'], right: ['7', '9', 'b3', '5'], name: 'Type B: 7-9-3-5', type: 'B', tiers: ['jazz'] }
        ]
      },
      
      // Dominant 7 sus4
      dom7sus4: {
        voicings: [
          // Strict: chord tones only (R-4-5-b7)
          { left: ['R'], right: ['4', '5', 'b7'], name: 'Strict: R | 4-5-7', type: null, tiers: ['strict'] },
          { left: ['R', '5'], right: ['b7', '4'], name: 'Strict spread: R-5 | 7-4', type: null, tiers: ['strict'] },
          { left: ['R'], right: ['4', 'b7'], name: 'Shell: R | 4-7', type: null, tiers: ['strict'] },
          // Root-Shell-Pretty: pretty note = 9
          { left: ['R'], right: ['4', 'b7', '9'], name: 'RSP (9): R | 4-7-9', type: null, tiers: ['rsp'] },
          // Jazz rootless (Bill Evans A/B)
          { left: ['R'], right: ['4', '5', 'b7', '9'], name: 'Type A: 4-5-7-9', type: 'A', tiers: ['jazz'] },
          { left: ['R'], right: ['b7', '9', '4', '5'], name: 'Type B: 7-9-4-5', type: 'B', tiers: ['jazz'] },
          // Slash 13sus: bVII major triad in root position over the root (Bb/C) —
          // same tones as RSP(9) but voiced as a recognizable triad-over-bass
          { left: ['R'], right: ['b7', '9', '11'], name: 'Slash: R | bVII triad (13sus)', type: null, tiers: ['jazz'] }
        ]
      },
      
      // ============================================
      // EXTENDED CHORDS - 9ths, 11ths, 13ths
      // ============================================
      
      // Major 9
      maj9: {
        voicings: [
          { left: ['R'], right: ['3', '5', '7', '9'], name: 'Type A: 3-5-7-9', type: 'A' },
          { left: ['R'], right: ['7', '9', '3', '5'], name: 'Type B: 7-9-3-5', type: 'B' },
          { left: ['R', '5'], right: ['7', '9', '3'], name: 'R-5 | 7-9-3', type: null }
        ]
      },
      
      // Minor 9
      min9: {
        voicings: [
          { left: ['R'], right: ['b3', '5', 'b7', '9'], name: 'Type A: 3-5-7-9', type: 'A' },
          { left: ['R'], right: ['b7', '9', 'b3', '5'], name: 'Type B: 7-9-3-5', type: 'B' },
          { left: ['R', '5'], right: ['b7', '9', 'b3'], name: 'R-5 | 7-9-3', type: null }
        ]
      },
      
      // Dominant 9
      dom9: {
        voicings: [
          { left: ['R'], right: ['3', '13', 'b7', '9'], name: 'Type A: 3-13-7-9', type: 'A' },
          { left: ['R'], right: ['b7', '9', '3', '13'], name: 'Type B: 7-9-3-13', type: 'B' },
          { left: ['R'], right: ['3', 'b7', '9'], name: 'R | 3-7-9', type: null },
          { left: ['R', '5'], right: ['b7', '9', '3'], name: 'R-5 | 7-9-3', type: null }
        ]
      },
      
      // Dominant 11
      dom11: {
        voicings: [
          { left: ['R'], right: ['b7', '9', '11'], name: 'Sus: 7-9-11 (bVII triad)', type: 'B' },
          { left: ['R'], right: ['4', 'b7', '9'], name: 'Sus: 4-7-9', type: 'A' },
          { left: ['R', '5'], right: ['b7', '9', '11'], name: 'R-5 | 7-9-11', type: null }
        ]
      },
      
      // Minor 11
      min11: {
        voicings: [
          { left: ['R'], right: ['b3', '5', 'b7', '11'], name: 'Type A: 3-5-7-11', type: 'A' },
          { left: ['R'], right: ['b7', '9', 'b3', '11'], name: 'Type B: 7-9-3-11', type: 'B' },
          { left: ['R', '5'], right: ['b7', 'b3', '11'], name: 'R-5 | 7-3-11', type: null },
          // Quartal (McCoy): RH stacked in 4ths — its natural home
          { left: ['R'], right: ['11', 'b7', 'b3'], name: 'Quartal: R | 11-7-3 in 4ths', type: null }
        ]
      },
      
      // Major 13
      maj13: {
        voicings: [
          { left: ['R'], right: ['3', '13', '7', '9'], name: 'Type A: 3-13-7-9', type: 'A' },
          { left: ['R'], right: ['7', '9', '3', '13'], name: 'Type B: 7-9-3-13', type: 'B' },
          { left: ['R'], right: ['7', '9', '13'], name: 'R | 7-9-13', type: null }
        ]
      },
      
      // Dominant 13
      dom13: {
        voicings: [
          { left: ['R'], right: ['3', '13', 'b7', '9'], name: 'Type A: 3-13-7-9', type: 'A' },
          { left: ['R'], right: ['b7', '9', '3', '13'], name: 'Type B: 7-9-3-13', type: 'B' },
          { left: ['R'], right: ['b7', '9', '13'], name: 'R | 7-9-13', type: null },
          // LH shell + RH: the guide tones drop to the LH, RH plays the color
          { left: ['R', 'b7'], right: ['3', '13', '9'], name: 'Shell: R-7 | 3-13-9', type: null },
          // US II upper structure: RH major triad on the 9 = voices the 13 as 13#11
          { left: ['R', 'b7'], right: ['9', '#11', '13'], name: 'US II: R-7 | maj triad (13#11)', type: null }
        ]
      },

      // Minor 13
      min13: {
        voicings: [
          { left: ['R'], right: ['b3', '13', 'b7', '9'], name: 'Type A: 3-13-7-9', type: 'A' },
          { left: ['R'], right: ['b7', '9', 'b3', '13'], name: 'Type B: 7-9-3-13', type: 'B' },
          { left: ['R'], right: ['b7', '9', '13'], name: 'R | 7-9-13', type: null }
        ]
      },
      
      // Add9 (no 7th)
      add9: {
        voicings: [
          { left: ['R'], right: ['3', '5', '9'], name: 'R | 3-5-9', type: 'A' },
          { left: ['R', '5'], right: ['9', '3'], name: 'R-5 | 9-3', type: null }
        ]
      },
      
      // Minor add9
      madd9: {
        voicings: [
          { left: ['R'], right: ['b3', '5', '9'], name: 'R | 3-5-9', type: 'A' },
          { left: ['R', '5'], right: ['9', 'b3'], name: 'R-5 | 9-3', type: null }
        ]
      },
      
      // 6 chord
      '6': {
        voicings: [
          { left: ['R'], right: ['3', '5', '6'], name: 'R | 3-5-6', type: 'A' },
          { left: ['R'], right: ['6', '9', '3', '5'], name: '6-9-3-5 (6/9 sound)', type: 'B' },
          { left: ['R', '5'], right: ['6', '3'], name: 'R-5 | 6-3', type: null }
        ]
      },
      
      // Minor 6
      'm6': {
        voicings: [
          { left: ['R'], right: ['b3', '5', '6'], name: 'R | 3-5-6', type: 'A' },
          { left: ['R'], right: ['6', '9', 'b3', '5'], name: '6-9-3-5', type: 'B' },
          { left: ['R', '5'], right: ['6', 'b3'], name: 'R-5 | 6-3', type: null }
        ]
      },
      
      // 6/9 chord
      '69': {
        voicings: [
          { left: ['R'], right: ['3', '6', '9'], name: 'R | 3-6-9', type: 'A' },
          { left: ['R'], right: ['6', '9', '3', '5'], name: '6-9-3-5', type: 'B' },
          { left: ['R', '5'], right: ['6', '9', '3'], name: 'R-5 | 6-9-3', type: null }
        ]
      },
      
      // ============================================
      // ALTERED DOMINANTS
      // ============================================
      
      // Dom7b9
      dom7b9: {
        voicings: [
          { left: ['R'], right: ['3', '13', 'b7', 'b9'], name: 'Type A: 3-13-7-b9', type: 'A' },
          { left: ['R'], right: ['b7', 'b9', '3'], name: 'Type B: 7-b9-3', type: 'B' },
          { left: ['R', 'b7'], right: ['b9', '3', '5'], name: 'R-7 | b9-3-5', type: null }
        ]
      },
      
      // Dom7#9 (Hendrix chord)
      dom7s9: {
        voicings: [
          { left: ['R'], right: ['3', 'b7', '#9'], name: 'Type A: 3-7-#9', type: 'A' },
          { left: ['R'], right: ['b7', '#9', '3'], name: 'Type B: 7-#9-3', type: 'B' },
          { left: ['R', 'b7'], right: ['#9', '3'], name: 'R-7 | #9-3 (Hendrix)', type: null }
        ]
      },
      
      // Dom7b5
      dom7b5: {
        voicings: [
          { left: ['R'], right: ['3', 'b5', 'b7'], name: 'R | 3-b5-7', type: 'A' },
          { left: ['R'], right: ['b7', '3', 'b5'], name: 'R | 7-3-b5', type: 'B' }
        ]
      },
      
      // Dom7#5
      dom7s5: {
        voicings: [
          { left: ['R'], right: ['3', '#5', 'b7'], name: 'R | 3-#5-7', type: 'A' },
          { left: ['R'], right: ['b7', '3', '#5'], name: 'R | 7-3-#5', type: 'B' }
        ]
      },
      
      // Dom7#11 (Lydian dominant)
      dom7s11: {
        voicings: [
          { left: ['R'], right: ['3', 'b7', '9', '#11'], name: '3-7-9-#11', type: 'A' },
          { left: ['R'], right: ['b7', '9', '3', '#11'], name: '7-9-3-#11', type: 'B' },
          // US II upper structure: LH shell (R-7), RH major triad on the 9 =
          // 9-#11-13, the textbook Lydian-dominant upper structure
          { left: ['R', 'b7'], right: ['9', '#11', '13'], name: 'US II: R-7 | maj triad (9-#11-13)', type: null }
        ]
      },

      // Dom7b13
      dom7b13: {
        voicings: [
          { left: ['R'], right: ['3', 'b13', 'b7'], name: '3-b13-7', type: 'A' },
          { left: ['R'], right: ['b7', '3', 'b13'], name: '7-3-b13', type: 'B' }
        ]
      },
      
      // Dom7alt (altered dominant - b9, #9, b5/#11, b13)
      dom7alt: {
        voicings: [
          { left: ['R'], right: ['3', 'b13', 'b7', '#9'], name: 'Type A: 3-b13-7-#9', type: 'A' },
          { left: ['R'], right: ['b7', 'b9', '3', 'b13'], name: 'Type B: 7-b9-3-b13', type: 'B' },
          { left: ['R'], right: ['b7', '#9', '3', 'b13'], name: '7-#9-3-b13', type: 'B' },
          // Upper structures: LH plays the two-note shell (R-b7, ~10 st,
          // blockable), and the 3rd floats up to become the BOTTOM of the RH
          // (above the b7), so the altered triad sits on a guide-tone anchor
          // with no muddy low third and no major-10th LH stretch. RH = 3 + the
          // altered triad: US bVI = Ab maj (b13-1-#9); US bV = Gb maj (#11-7-b9).
          { left: ['R', 'b7'], right: ['3', 'b13', 'R', '#9'], name: 'US bVI: R-7 | 3 + bVI triad', type: null },
          { left: ['R', 'b7'], right: ['3', '#11', 'b7', 'b9'], name: 'US bV: R-7 | 3 + bV triad', type: null }
        ]
      },
      
      // Dom9b5
      dom9b5: {
        voicings: [
          { left: ['R'], right: ['3', 'b5', 'b7', '9'], name: '3-b5-7-9', type: 'A' },
          { left: ['R'], right: ['b7', '9', '3', 'b5'], name: '7-9-3-b5', type: 'B' }
        ]
      },
      
      // Dom9#5
      dom9s5: {
        voicings: [
          { left: ['R'], right: ['3', '#5', 'b7', '9'], name: '3-#5-7-9', type: 'A' },
          { left: ['R'], right: ['b7', '9', '3', '#5'], name: '7-9-3-#5', type: 'B' }
        ]
      },
      
      // Dom13b9
      dom13b9: {
        voicings: [
          { left: ['R'], right: ['3', '13', 'b7', 'b9'], name: '3-13-7-b9', type: 'A' },
          { left: ['R'], right: ['b7', 'b9', '3', '13'], name: '7-b9-3-13', type: 'B' },
          // US VI upper structure: LH shell (R-7), RH triad = 13-b9-3 (VI major sound)
          { left: ['R', 'b7'], right: ['13', 'b9', '3'], name: 'US VI: R-7 | maj triad (13-b9-3)', type: null }
        ]
      },

      // Dom13#11
      dom13s11: {
        voicings: [
          { left: ['R'], right: ['3', '13', 'b7', '#11'], name: '3-13-7-#11', type: 'A' },
          { left: ['R'], right: ['b7', '3', '#11', '13'], name: '7-3-#11-13', type: 'B' }
        ]
      }
    };

    // Register constants (MIDI note numbers; C4 = 60)
    const RH_BASE = 60;          // Base placement for right-hand voicings
    const RH_TARGET_CENTER = 65; // F4: ideal center of gravity for the RH
    const RH_SOFT_LOW = 55;      // G3: soft lower bound for RH notes
    const RH_SOFT_HIGH = 79;     // G5: soft upper bound for RH notes
    const LH_BASE = 36;          // C2: the BASSIST register — bassonly mode and
                                 // the backing bass live here (a detached low root).
    const LH_COMP_BASE = 48;     // C3: the PIANIST's comping register — a roots-mode
                                 // LONE root sits here (spec v4 register doctrine), so
                                 // it no longer floats ~2 octaves below the RH.
                                 // (Multi-note shell lefts stay at LH_BASE; see below.)

    // Keyboard range windows (3-octave mode): 'reface' constrains every
    // realized note to one C-to-C 37-key span so voicings fit a Yamaha
    // Reface or other mini keyboard (its octave slider makes the absolute
    // anchor cosmetic — C2 matches LH_BASE). null = unconstrained.
    const RANGE_WINDOWS = {
      full: null,
      reface: { low: 36, high: 72 } // C2–C5
    };

    /** Semitones by which a set of midis escapes a window (0 = fits). */
    function windowOverflow(midis, range) {
      if (!range) return 0;
      let o = 0;
      for (const m of midis) {
        if (m < range.low) o += range.low - m;
        if (m > range.high) o += m - range.high;
      }
      return o;
    }

    const ACCIDENTAL_OFFSET = { '': 0, '#': 1, '##': 2, 'b': -1, 'bb': -2 };

    /**
     * Written octave per scientific pitch notation: the octave follows the
     * LETTER, not the sounding pitch (Cb4 sounds as B3 but is written Cb4).
     */
    function writtenOctave(name, midi) {
      const offset = ACCIDENTAL_OFFSET[name.slice(1)] ?? 0;
      return Math.floor((midi - offset) / 12) - 1;
    }

    /**
     * Realize one hand of a voicing as actual pitches.
     * Interval names are stacked in ascending order: the first lands at or
     * above baseMidi, and each subsequent note is placed in the lowest octave
     * strictly above the previous note. Returns [{name, midi, octave}].
     */
    function realizeHand(rootNote, intervalNames, baseMidi) {
      const rootPc = NOTE_TO_SEMITONE[rootNote] ?? 0;
      const out = [];
      let prev = -Infinity;
      for (const iv of intervalNames) {
        const name = spellInterval(rootNote, iv);
        const ivDef = INTERVALS[iv];
        const pc = (rootPc + (ivDef ? ivDef.semitones : 0)) % 12;
        let midi = baseMidi + ((pc - (baseMidi % 12) + 12) % 12);
        while (midi <= prev) midi += 12;
        out.push({ name, midi, octave: writtenOctave(name, midi) });
        prev = midi;
      }
      return out;
    }

    /**
     * Guide tones for a chord quality: the root plus the 3rd and 7th (the
     * tones that define the harmony). Reads the quality's semitone set from
     * CHORD_TYPES and names each tone by its function:
     *   - 3rd slot: 3 or b3; sus chords substitute their 4 (or 2).
     *   - 7th slot: 7, b7, or bb7 (dim7's 9 semitones alongside a b5+b3);
     *     6th chords get their 6; plain triads fall back to the 5th.
     * Only degrees the chord actually contains are included, so a triad-only
     * "strict" progression yields R-3(-5) rather than inventing a 7th.
     */
    function guideToneIntervals(quality) {
      let chordInfo;
      for (const level of ['simple', 'seventh', 'extended', 'altered']) {
        if (CHORD_TYPES[level][quality]) {
          chordInfo = CHORD_TYPES[level][quality];
          break;
        }
      }
      if (!chordInfo) chordInfo = CHORD_TYPES.simple.maj;
      const has = (s) => chordInfo.intervals.includes(s);

      const out = ['R'];
      if (has(4)) out.push('3');
      else if (has(3)) out.push('b3');
      else if (has(5)) out.push('4');
      else if (has(2)) out.push('2');

      if (has(11)) out.push('7');
      else if (has(10)) out.push('b7');
      else if (has(9)) out.push(has(6) && has(3) ? 'bb7' : '6');
      else if (has(7)) out.push('5');
      return out;
    }

    /**
     * Shell left hand: root anchored in the bass (C2–B2, like roots mode)
     * in ONE zone around C3 — the pianist's comping register. The old
     * split (root at C2, tones at C3) spanned a 13th/14th: physically
     * unplayable by one hand (span-audit item #1, spec v4). One zone keeps
     * the whole shell ≤ ~10 st and clear of the low-third mud.
     */
    const SHELL_TONE_BASE = LH_BASE + 12; // C3: the shell's home zone

    function realizeShellHand(rootNote, quality) {
      return realizeHand(rootNote, guideToneIntervals(quality), SHELL_TONE_BASE);
    }

    // Two-hand rootless (Evans texture): the LH plays its own rootless color
    // voicing in the tenor range below the RH. Shapes are the quality's
    // jazz-tier rootless forms (Type A/B); choosing between them per chord is
    // what LH voice-leading is, so a small DP pass mirrors the RH optimizer.
    const LH_ROOTLESS_BASE = 48;   // C3: LH rootless voicings live in the tenor range
    const LH_TARGET_CENTER = 53;   // F3: ideal center of gravity for the LH
    const LH_SOFT_LOW = 45;        // A2: below this the color turns to mud
    const LH_SOFT_HIGH = 64;       // E4: above this the LH crowds the RH

    /**
     * Candidate LH shapes for two-hand rootless: the quality's jazz-tier
     * rootless right-hand forms. Qualities without a jazz tier (triads, sus)
     * fall back to their guide tones sans root — the honest rootless color
     * a duo pianist would play.
     */
    function lhRootlessShapesFor(quality) {
      const vd = KEYBOARD_VOICINGS[quality];
      // The evans LH pool is the CLASSIC rootless canon: jazz-tier AND typed
      // (A/B forms). The type guard deliberately excludes other jazz-tagged
      // shapes (quartal, slash, upper structures — type: null): those are RH
      // colors, and letting them leak into the two-hand-rootless left hand
      // was an unreviewed side effect of adding them (severed by owner call).
      const jazz = vd && vd.voicings
        ? vd.voicings.filter(v => v.tiers && v.tiers.indexOf('jazz') !== -1 && v.type)
        : [];
      if (jazz.length) return jazz.map(v => v.right);
      return [guideToneIntervals(quality).slice(1)];
    }

    /** Register penalty for an LH rootless voicing (mirrors registerPenalty). */
    function lhRegisterPenalty(midis) {
      if (!midis.length) return 0;
      let p = 0;
      for (const m of midis) {
        if (m < LH_SOFT_LOW) p += (LH_SOFT_LOW - m) * 1.5;
        if (m > LH_SOFT_HIGH) p += (m - LH_SOFT_HIGH) * 1.5;
      }
      const mean = midis.reduce((a, b) => a + b, 0) / midis.length;
      p += Math.abs(mean - LH_TARGET_CENTER) * 0.2;
      return p;
    }

    /**
     * Choose an LH rootless shape for every chord at once (two-hand rootless
     * mode), minimizing LH voice movement + register cost — the same DP as
     * computeProgressionVoicings, over the LH shape sets. No octave shifts:
     * realizeHand already pins each shape inside the tenor octave, and the
     * A/B choice is the classic source of smooth rootless voice leading.
     * Returns { indices: [...] }.
     */
    function computeLeftHandVoicings(progression) {
      const indices = [];
      if (!progression || !progression.length) return { indices };

      const layers = progression.map(chord =>
        lhRootlessShapesFor(chord.quality).map((ivs, vIndex) => {
          const midis = realizeHand(chord.root, ivs, LH_ROOTLESS_BASE).map(n => n.midi);
          return { vIndex, midis, localCost: lhRegisterPenalty(midis) };
        }));

      let costs = layers[0].map(c => c.localCost);
      const back = [layers[0].map(() => -1)];
      for (let i = 1; i < layers.length; i++) {
        const nextCosts = [];
        const pointers = [];
        for (let j = 0; j < layers[i].length; j++) {
          let best = Infinity;
          let bestK = 0;
          for (let k = 0; k < layers[i - 1].length; k++) {
            const c = costs[k] + voiceMovementCost(layers[i - 1][k].midis, layers[i][j].midis);
            if (c < best) { best = c; bestK = k; }
          }
          nextCosts.push(best + layers[i][j].localCost);
          pointers.push(bestK);
        }
        costs = nextCosts;
        back.push(pointers);
      }

      let j = 0;
      for (let k = 1; k < costs.length; k++) {
        if (costs[k] < costs[j]) j = k;
      }
      for (let i = layers.length - 1; i >= 0; i--) {
        indices[i] = layers[i][j].vIndex;
        j = back[i][j];
      }
      return { indices };
    }

    // ================= Mixed left hand (voice-led comping) =================
    // The app default: instead of one fixed LH formula, choose each chord's
    // left hand — lone root, full shell, or a half shell — by voice leading,
    // the way a comper actually mixes them. A DP (mirroring the evans LH
    // optimizer above) trades movement against harmonic "thinness" so shells
    // are the home texture but the hand drops to a lighter shape when a full
    // shell would lurch or crowd the RH. All candidates sit in the C3 zone.

    const MIX_LH_CENTER = 52; // E3: soft center of gravity for the comping LH
    // Plain triads (no 7th, no added color): a full R-3-5 shell just doubles
    // the RH triad, so it's mildly discouraged there (nudged toward root/half).
    const MIX_PLAIN_TRIADS = ['maj', 'min', 'aug', 'dim', 'sus2', 'sus4'];

    /**
     * Mixed-mode LH candidates for a quality, as interval arrays in a STABLE
     * order (the chosen index is persisted in lhVoicingIndices — never
     * reorder): 0 lone root, 1 full shell (R + guide tones), 2 half shell
     * R+3rd, 3 half shell R+7th. Defensive if a quality lacks guide tones.
     */
    function lhMixedCandidateIntervals(quality) {
      const gt = guideToneIntervals(quality); // ['R', <3rd>, <7th-or-fallback>]
      const cands = [['R']];                   // 0: lone root (always available)
      if (gt.length >= 3) {
        cands.push(gt.slice());                // 1: full shell (R-3-7)
        cands.push(['R', gt[1]]);              // 2: half shell (R + 3rd)
        cands.push(['R', gt[2]]);              // 3: half shell (R + 7th)
      } else if (gt.length === 2) {
        cands.push(['R', gt[1]]);              // only one shell tone exists
      }
      return cands;
    }

    /** Realize mixed candidate `candIndex` for a chord (wraps out-of-range). */
    function realizeMixedCandidate(rootNote, quality, candIndex) {
      const cands = lhMixedCandidateIntervals(quality);
      const safe = ((candIndex || 0) % cands.length + cands.length) % cands.length;
      // Candidate 1 is the full shell: realize via realizeShellHand so it is
      // byte-identical to what shells mode plays (SHELL_TONE_BASE ===
      // LH_COMP_BASE today; stay robust should they ever diverge).
      if (safe === 1) return realizeShellHand(rootNote, quality);
      return realizeHand(rootNote, cands[safe], LH_COMP_BASE);
    }

    /**
     * Local (per-chord) cost of a mixed candidate. Gentle, movement-dominant:
     * a soft register pull toward E3, a "thinness" cost so a bare root under a
     * seventh chord isn't free (this is what produces genuine mixing rather
     * than an all-roots comp), a mild redundancy nudge off full shells on
     * plain triads, and a HARD collision guard if the LH would reach the RH.
     * Weights are the ear-calibration knob (spec v4 Phase 1b, tuned by owner).
     */
    function mixedLocalCost(quality, candIndex, midis, rhBottom) {
      let c = 0;
      const mean = midis.reduce((a, b) => a + b, 0) / midis.length;
      c += Math.abs(mean - MIX_LH_CENTER) * 0.1;               // soft centering
      const nGuide = Math.max(0, midis.length - 1);            // shell tones held
      c += (2 - Math.min(2, nGuide)) * 0.7;                    // thinness: root=1.4, half=0.7, full=0
      if (candIndex === 1 && MIX_PLAIN_TRIADS.indexOf(quality) !== -1) c += 1.0; // triad shell = RH double
      if (rhBottom !== undefined && rhBottom !== null && Math.max(...midis) >= rhBottom) c += 1000; // collision
      return c;
    }

    /**
     * Choose a mixed LH candidate for every chord at once, minimizing LH voice
     * movement + local cost — the same DP shape as computeLeftHandVoicings,
     * over the mixed candidate sets. `rhBottoms[i]` (optional) is the realized
     * RH bottom midi for chord i, so the collision guard sees the real RH.
     * Returns { indices, totalCost } (totalCost lets tests verify optimality).
     */
    function computeMixedLeftHand(progression, rhBottoms) {
      const indices = [];
      if (!progression || !progression.length) return { indices, totalCost: 0 };
      const rb = rhBottoms || [];

      const layers = progression.map((chord, i) =>
        lhMixedCandidateIntervals(chord.quality).map((ivs, vIndex) => {
          const midis = realizeMixedCandidate(chord.root, chord.quality, vIndex).map(n => n.midi);
          return { vIndex, midis, localCost: mixedLocalCost(chord.quality, vIndex, midis, rb[i]) };
        }));

      let costs = layers[0].map(c => c.localCost);
      const back = [layers[0].map(() => -1)];
      for (let i = 1; i < layers.length; i++) {
        const nextCosts = [];
        const pointers = [];
        for (let j = 0; j < layers[i].length; j++) {
          let best = Infinity;
          let bestK = 0;
          for (let k = 0; k < layers[i - 1].length; k++) {
            const c = costs[k] + voiceMovementCost(layers[i - 1][k].midis, layers[i][j].midis);
            if (c < best) { best = c; bestK = k; }
          }
          nextCosts.push(best + layers[i][j].localCost);
          pointers.push(bestK);
        }
        costs = nextCosts;
        back.push(pointers);
      }

      let j = 0;
      for (let k = 1; k < costs.length; k++) if (costs[k] < costs[j]) j = k;
      const totalCost = costs[j];
      for (let i = layers.length - 1; i >= 0; i--) {
        indices[i] = layers[i][j].vIndex;
        j = back[i][j];
      }
      return { indices, totalCost };
    }

    /**
     * Realized RH bottom midi per chord for an already-chosen RH (voicing
     * indices + shifts) — the collision input for the mixed LH DP. Kept next to
     * its consumers (recompute + the sub preview) so both build it identically.
     */
    function rhBottomsFor(progression, indices, shifts, complexity) {
      return progression.map((c, i) => {
        const vs = voicingsFor(c.quality, complexity);
        const v = vs[((indices[i] || 0) % vs.length + vs.length) % vs.length];
        const rh = realizeHand(c.root, v.right, RH_BASE + (shifts && shifts[i] || 0)).map(n => n.midi);
        return rh.length ? Math.min(...rh) : null;
      });
    }

    /**
     * Per-chord LH shape indices for a progression under a given LH mode: the
     * mixed DP (collision-aware) for 'mixed', the evans DP otherwise. Single
     * entry point so recompute and the sub preview stay in step.
     */
    function computeLhModeIndices(progression, mode, indices, shifts, complexity) {
      if (mode !== 'mixed') return computeLeftHandVoicings(progression).indices;
      return computeMixedLeftHand(progression, rhBottomsFor(progression, indices, shifts, complexity)).indices;
    }

    /**
     * Realize a full voicing. octaveShift (in semitones, multiples of 12)
     * moves the right hand up/down; the left hand stays anchored low.
     * leftHandMode swaps what the LH plays — the RH (and therefore the
     * voice-leading optimizer, which only reads voicing.right) is untouched:
     *   'mixed'    — voice-led comping: lhIndex selects a per-chord candidate
     *                (lone root / full shell / half shell) chosen by the DP in
     *                computeMixedLeftHand; the APP default (engine default
     *                stays 'roots' so the snapshot is stable)
     *   'roots'    — the template's written LH; a lone root comps at C3
     *                (LH_COMP_BASE), a multi-note shell stays low at C2
     *                (LH_BASE) to clear the RH; engine default mode
     *   'shells'   — root + guide tones (3rd & 7th) for the quality
     *   'evans'    — a second rootless voicing in the tenor range; lhIndex
     *                picks the shape (DP-chosen via computeLeftHandVoicings)
     *   'rootless' — nothing; a bassist or backing track owns the low end
     *   'bassonly' — ONLY the root sounds (the app is your bassist); the
     *                voicing itself is yours to comp on a real instrument
     */
    function realizeVoicing(rootNote, voicing, octaveShift = 0, leftHandMode = 'roots', quality = null, lhIndex = 0) {
      let left;
      if (leftHandMode === 'rootless') left = [];
      else if (leftHandMode === 'mixed') left = realizeMixedCandidate(rootNote, quality, lhIndex);
      else if (leftHandMode === 'shells') left = realizeShellHand(rootNote, quality);
      else if (leftHandMode === 'evans') {
        const shapes = lhRootlessShapesFor(quality);
        const safe = ((lhIndex || 0) % shapes.length + shapes.length) % shapes.length;
        left = realizeHand(rootNote, shapes[safe], LH_ROOTLESS_BASE);
      } else if (leftHandMode === 'bassonly') left = realizeHand(rootNote, ['R'], LH_BASE);
      else {
        // Roots mode: a LONE root comps in the pianist's C3 register (fixes the
        // old ~2-octave LH/RH gap). A multi-note LEFT (a two-note shell like
        // R-b7 or R-5, from the US/shell vocabulary) stays in the low C2 zone:
        // raised to C3 its top note crosses into the RH at high roots. Those
        // shells were designed and verified low — keep them there. (Lifting the
        // RH with the shell to comp both at C3 is Phase 3's per-voicing override.)
        const base = voicing.left.length > 1 ? LH_BASE : LH_COMP_BASE;
        left = realizeHand(rootNote, voicing.left, base);
      }
      return {
        left,
        right: leftHandMode === 'bassonly' ? [] : realizeHand(rootNote, voicing.right, RH_BASE + octaveShift)
      };
    }

    /**
     * Penalty for a right-hand voicing sitting outside the practical register.
     */
    function registerPenalty(midis) {
      if (!midis.length) return 0;
      let p = 0;
      for (const m of midis) {
        if (m < RH_SOFT_LOW) p += (RH_SOFT_LOW - m) * 1.5;
        if (m > RH_SOFT_HIGH) p += (m - RH_SOFT_HIGH) * 1.5;
      }
      const mean = midis.reduce((a, b) => a + b, 0) / midis.length;
      p += Math.abs(mean - RH_TARGET_CENTER) * 0.2;
      return p;
    }

    /**
     * Voice movement between two realized right hands, in real pitch space.
     * Symmetric nearest-neighbor distance: every note in each voicing must be
     * "explained" by a nearby note in the other, so common tones cost 0,
     * half-step resolutions cost little, and leaps or abandoned voices cost a
     * lot. Handles voicings of different sizes (shells vs 4-note) gracefully.
     */
    function voiceMovementCost(prevMidis, nextMidis) {
      if (!prevMidis || !prevMidis.length || !nextMidis.length) return 0;
      let cost = 0;
      for (const n of nextMidis) {
        let best = Infinity;
        for (const p of prevMidis) best = Math.min(best, Math.abs(n - p));
        cost += best;
      }
      for (const p of prevMidis) {
        let best = Infinity;
        for (const n of nextMidis) best = Math.min(best, Math.abs(p - n));
        cost += best;
      }
      return cost / 2;
    }

    const FALLBACK_VOICING = { left: ['R'], right: ['R'], name: 'Basic', type: null };

    // The three seventh-family tiers share the same chord QUALITIES and differ
    // only in which voicings they offer. This maps a complexity setting to the
    // voicing tier tag it should filter on; tiers not listed here (simple,
    // extended, altered) do no filtering and see every voicing for the quality.
    const COMPLEXITY_TO_TIER = {
      'seventh-strict': 'strict',  // R-3-5-7 chord tones only, no color
      'rsp': 'rsp',                // root + shell (3,7) + one "pretty" note
      'seventh': 'jazz'            // Bill Evans rootless voicings (9/13 color)
    };

    // Selected complexity → allowed voicing tiers with preference costs.
    // Lower tiers are always available but cost a little, so the DP optimizer
    // reaches down only when it buys smoother voice leading or register fit.
    const VOICING_TIER_COSTS = {
      'seventh-strict': { strict: 0 },
      'rsp':            { rsp: 0, strict: 0.8 },
      'seventh':        { jazz: 0, rsp: 0.8, strict: 1.6 }
    };

    /**
     * Cumulative voicing filter — the single source of truth for which voicings
     * a complexity offers. Returns every voicing whose `tiers` intersects the
     * allowed set for the complexity; untagged voicings (triads, extended and
     * altered qualities) are native to the selected tier and always included.
     * Called from getChordNotesAtIndex, selectChord's cycling, and
     * buildVoicingCandidates — the returned order defines voicingIndices, so it
     * must stay identical across those call sites.
     */
    function voicingsFor(quality, complexity) {
      const vd = KEYBOARD_VOICINGS[quality];
      const all = vd && vd.voicings && vd.voicings.length ? vd.voicings : [FALLBACK_VOICING];
      const costs = VOICING_TIER_COSTS[complexity];
      if (!costs) return all; // simple/extended/altered: no tier filtering
      const allowed = Object.keys(costs);
      const filtered = all.filter(v => !v.tiers || v.tiers.some(t => allowed.indexOf(t) !== -1));
      // Fall back to the full list if a quality has no matching tagged voicings.
      return filtered.length ? filtered : all;
    }

    /**
     * All candidate realizations of a chord: every voicing at three octave
     * placements. Local cost favors staying in register and (mildly) fuller
     * voicings, so shells remain available for manual selection but aren't
     * the automatic default.
     */
    function buildVoicingCandidates(chord, complexity, range = null) {
      const cands = [];
      const spill = []; // out-of-window candidates, kept only if nothing fits
      // extended/altered reuse the 'seventh' cost table so their native
      // (untagged → 0) voicings coexist with any reached-down seventh-family
      // voicings that quality mixing produces.
      const tierCosts = VOICING_TIER_COSTS[complexity]
        || ((complexity === 'extended' || complexity === 'altered') ? VOICING_TIER_COSTS['seventh'] : null);
      // With a window, an extra -24 shift gives wide voicings on high roots
      // a way to duck under the ceiling; without one it would just be a
      // register-penalty loser, so it isn't offered.
      const shifts = range ? [-24, -12, 0, 12] : [-12, 0, 12];
      voicingsFor(chord.quality, complexity).forEach((voicing, vIndex) => {
        // Untagged voicings are native to the selected tier (cost 0). The tier
        // cost now carries the "prefer fuller voicings" preference, so the raw
        // sparsity weight is small (0.4) rather than the old 1.0.
        const tierCost = (tierCosts && voicing.tiers)
          ? Math.min(...voicing.tiers.map(t => tierCosts[t] ?? Infinity))
          : 0;
        for (const shift of shifts) {
          const rhMidis = realizeHand(chord.root, voicing.right, RH_BASE + shift).map(n => n.midi);
          const sparsity = Math.max(0, 4 - rhMidis.length);
          const localCost = registerPenalty(rhMidis) + sparsity * 0.4 + tierCost;
          const overflow = windowOverflow(rhMidis, range);
          if (overflow > 0) {
            spill.push({ overflow, cand: { vIndex, shift, rhMidis, localCost } });
            continue;
          }
          cands.push({ vIndex, shift, rhMidis, localCost });
        }
      });
      // Hard window, safe DP: if no candidate fits at all, keep the least-
      // violating one so the chord's layer never empties.
      if (!cands.length && spill.length) {
        spill.sort((a, b) => a.overflow - b.overflow);
        cands.push(spill[0].cand);
      }
      return cands;
    }

    /**
     * Choose voicing + octave placement for every chord in the progression at
     * once, minimizing total (voice movement + register cost) via dynamic
     * programming over the sequence. Global optimization means an early greedy
     * choice can't paint the progression into a corner.
     * Returns { indices: [...], shifts: [...] }.
     */
    function computeProgressionVoicings(progression, complexity, range = null) {
      const indices = [];
      const shifts = [];
      if (!progression || !progression.length) return { indices, shifts };

      const layers = progression.map(chord => buildVoicingCandidates(chord, complexity, range));

      // Forward pass
      let costs = layers[0].map(c => c.localCost);
      const back = [layers[0].map(() => -1)];

      for (let i = 1; i < layers.length; i++) {
        const nextCosts = [];
        const pointers = [];
        for (let j = 0; j < layers[i].length; j++) {
          let best = Infinity;
          let bestK = 0;
          for (let k = 0; k < layers[i - 1].length; k++) {
            const c = costs[k] + voiceMovementCost(layers[i - 1][k].rhMidis, layers[i][j].rhMidis);
            if (c < best) { best = c; bestK = k; }
          }
          nextCosts.push(best + layers[i][j].localCost);
          pointers.push(bestK);
        }
        costs = nextCosts;
        back.push(pointers);
      }

      // Backtrack from the cheapest final state
      let j = 0;
      for (let k = 1; k < costs.length; k++) {
        if (costs[k] < costs[j]) j = k;
      }
      for (let i = layers.length - 1; i >= 0; i--) {
        indices[i] = layers[i][j].vIndex;
        shifts[i] = layers[i][j].shift;
        j = back[i][j];
      }

      return { indices, shifts };
    }

    /**
     * Recompute and store optimal voicings for the current progression.
     */
    /** The window for state.range ('full' → null = unconstrained). */
    function activeRangeWindow() {
      return RANGE_WINDOWS[state.range] || null;
    }

    function recomputeProgressionVoicings() {
      const result = computeProgressionVoicings(state.progression, state.complexity, activeRangeWindow());
      state.voicingIndices = result.indices;
      state.voicingShifts = result.shifts;
      // LH shapes for two-hand rootless: cheap (few shapes, no shifts), so
      // always kept in step with the progression rather than invalidated
      // lazily when the LH mode changes.
      state.lhVoicingIndices = computeLeftHandVoicings(state.progression).indices;
    }

    /**
     * Best octave placement for a manually chosen voicing: closest fit in
     * register and, if given, smoothest connection from the previous chord.
     */
    function bestShiftForVoicing(rootNote, voicing, prevRhMidis, range = null) {
      let best = 0;
      let bestCost = Infinity;
      const shifts = range ? [-24, -12, 0, 12] : [-12, 0, 12];
      for (const shift of shifts) {
        const rhMidis = realizeHand(rootNote, voicing.right, RH_BASE + shift).map(n => n.midi);
        // Out-of-window placements only win when nothing fits at all.
        const c = registerPenalty(rhMidis) + voiceMovementCost(prevRhMidis, rhMidis)
          + windowOverflow(rhMidis, range) * 1000;
        if (c < bestCost) { bestCost = c; best = shift; }
      }
      return best;
    }

    /**
     * Get a specific voicing by index, realized in register.
     * Pure function: no hidden state, safe to call from any UI path.
     * opts: { leftHandMode: 'roots'|'shells'|'evans'|'rootless',
     *         lhIndex: evans LH shape index,
     *         range: keyboard window ({low, high} midi) or null }
     * The range only steers the DEFAULT octave placement (when octaveShift
     * is not supplied) — a stored shift was already chosen window-aware.
     */
    function getChordNotesAtIndex(rootNote, quality, complexity, index, octaveShift, opts = {}) {
      const { leftHandMode = 'roots', lhIndex = 0, range = null } = opts;
      let chordInfo;
      for (const level of ['simple', 'seventh', 'extended', 'altered']) {
        if (CHORD_TYPES[level][quality]) {
          chordInfo = CHORD_TYPES[level][quality];
          break;
        }
      }
      if (!chordInfo) chordInfo = CHORD_TYPES.simple.maj;

      const voicings = voicingsFor(quality, complexity);
      const safeIndex = ((index || 0) % voicings.length + voicings.length) % voicings.length;
      const voicing = voicings[safeIndex];

      // If no placement was provided, pick the one that best fits the register
      let shift = octaveShift;
      if (shift === undefined || shift === null) {
        shift = bestShiftForVoicing(rootNote, voicing, null, range);
      }

      const realized = realizeVoicing(rootNote, voicing, shift, leftHandMode, quality, lhIndex);

      return {
        leftHand: realized.left.map(n => n.name),
        rightHand: realized.right.map(n => n.name),
        leftHandPitches: realized.left,
        rightHandPitches: realized.right,
        name: chordInfo.name,
        voicingName: voicing.name,
        voicingIndex: safeIndex,
        octaveShift: shift
      };
    }

    /**
     * Default voicing for a chord in isolation (voicing 0, best register).
     */
    function getChordNotes(rootNote, quality, complexity, opts = {}) {
      return getChordNotesAtIndex(rootNote, quality, complexity, 0, undefined, opts);
    }

    function formatNoteDisplay(n) {
      if (NOTE_DISPLAY[n]) return NOTE_DISPLAY[n];
      if (n.includes('##')) return n.charAt(0) + '\u{1D12A}';
      if (n.includes('bb')) return n.charAt(0) + '\u{1D12B}';
      if (n.includes('#')) return n.charAt(0) + '\u266F';
      if (n.includes('b')) return n.charAt(0) + '\u266D';
      return n;
    }

    function formatChordSymbol(root, quality) {
      // Defensive check for undefined root
      if (!root) {
        console.warn('formatChordSymbol called with undefined root');
        return '?';
      }
      
      let chordInfo;
      for (const level of ['simple', 'seventh', 'extended', 'altered']) {
        if (CHORD_TYPES[level][quality]) {
          chordInfo = CHORD_TYPES[level][quality];
          break;
        }
      }
      
      const symbol = chordInfo ? chordInfo.symbol : '';
      
      // Format root note for display (shared formatter: handles single and
      // double accidentals uniformly)
      return formatNoteDisplay(root) + symbol;
    }

