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
          { left: ['R'], right: ['11', 'b7', 'b3'], name: 'Quartal: R | 11-7-3 in 4ths', type: null, tiers: ['jazz'] },
          // So What (Evans/Davis): the 5-note quartal cluster (9-5-R-11-13),
          // three 4ths + a 3rd, sitting in ONE mid-register zone. An ANCHORED
          // voicing (v5 holistic model): realized as one contiguous stack and
          // split where the hands fall — inexpressible in the old low-LH/high-RH
          // model without a hack. Manual-select only (a colour you reach for).
          { left: ['9', '5'], right: ['R', '11', '13'], anchor: 48, name: 'So What (quartal cluster)', type: null, tiers: ['jazz'] }
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

    // ============== Holistic voicing model (v5 Stage A) ==============
    // A voicing's IDENTITY is its ordered interval STACK; which notes land in
    // which hand is a distribution DECISION, not part of the identity. The
    // authored { left, right } form is the voicing's DEFAULT DISTRIBUTION — we
    // derive the canonical stack + splitAfter from it once, and the realization
    // pipeline reads the stack (via voicingLh/voicingRh). Because
    // stack.slice(0, splitAfter) === left exactly, this is byte-identical to
    // the old per-hand model (Stage A is sound-frozen). Stage B lets the
    // solver pick a split other than splitAfter; Stage B-4 retires the authored
    // left/right. Order still encodes register (realizeHand is unchanged).
    function toStack(v) {
      if (v.stack) return v;
      v.stack = [...(v.left || []), ...(v.right || [])];
      v.splitAfter = (v.left || []).length; // the authored default distribution
      return v;
    }
    for (const q of Object.keys(KEYBOARD_VOICINGS)) {
      const vs = KEYBOARD_VOICINGS[q] && KEYBOARD_VOICINGS[q].voicings;
      if (vs) vs.forEach(toStack);
    }
    // The default hand distribution of a voicing's stack (falls back to the
    // authored fields for any voicing not passed through toStack, e.g. the
    // FALLBACK_VOICING defined later).
    function voicingLh(v) { return v.stack ? v.stack.slice(0, v.splitAfter) : (v.left || []); }
    function voicingRh(v) { return v.stack ? v.stack.slice(v.splitAfter) : (v.right || []); }

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
      if (jazz.length) return jazz.map(v => voicingRh(v));
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

    // ============== Mixed comping (voice-led, JOINT left + right) ==============
    // The app default: instead of one fixed LH formula with a fixed RH, the
    // engine chooses each chord's RH voicing AND its LH shape (lone root / full
    // shell / half shell) TOGETHER, by voice leading. A DP (mirroring the RH
    // and evans optimizers above) minimizes RH movement + LH movement, keeps
    // the 3rd and 7th present across the two hands (completeness), and never
    // lets the hands collide. The payoff: where it voice-leads well the engine
    // sends the RH up to an upper structure and lets the LH take the full
    // shell; elsewhere it comps rootless-RH + a light LH. All LH candidates
    // sit in the C3 zone. (Owner-approved, spec v4 Phase 1b.)

    const MIX_LH_CENTER = 52; // E3: soft center of gravity for the comping LH
    // Plain triads (no 7th, no added color): a full R-3-5 shell just doubles
    // the RH triad, so it's mildly discouraged there (nudged toward root/half).
    const MIX_PLAIN_TRIADS = ['maj', 'min', 'aug', 'dim', 'sus2', 'sus4'];
    // A REAL 7th must be carried by one hand; the 5th/6th fallback that
    // guideToneIntervals emits for triads/6ths is NOT a mandatory guide tone.
    const MIX_SEVENTH_INTERVALS = ['7', 'b7', 'bb7'];
    const MIX_COLLISION = 1000; // LH top reaches the RH bottom (unplayable overlap)
    const MIX_INCOMPLETE = 100; // a real guide tone (3rd/7th) present in neither hand

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

    // LH placement bases, highest (home) first. The octave drops exist for the
    // range-window case: under reface the RH legally shifts down to fit C2-C5,
    // and a C3-pinned LH would CROSS it (the reface hand-crossing bug). When
    // the RH sits low the idiomatic move is "play lower, play less" — never
    // over the top of the RH.
    const MIX_LH_BASES = [LH_COMP_BASE, LH_COMP_BASE - 12, LH_COMP_BASE - 24];

    // Register price per octave the LH is displaced below its home zone. High
    // enough that at full range the DP never trades the C3 comping register
    // for a low texture (the pre-fix behavior stays the ear-approved norm),
    // low enough that under a window a drop always beats MIX_COLLISION.
    const MIX_LH_DROP_COST = 6;

    /**
     * Place mixed candidate `candIndex` in the highest base that keeps the
     * whole LH STRICTLY below rhBottom. A pure function of (root, quality,
     * candIndex, rhBottom): the joint DP, the manual-cycle picker and
     * realizeVoicing all derive the same placement, so no extra register state
     * is stored. Returns { notes, dropOctaves } — dropOctaves prices the
     * displacement (0 at home). With no RH constraint (Infinity) this is the
     * home-zone realization, byte-identical to realizeMixedCandidate. The lone
     * root always clears any real window's RH by the lowest base; if nothing
     * clears (unreachable with real windows) the home realization returns and
     * the caller's collision cost keeps that node from winning.
     */
    function mixedLhPlacement(rootNote, quality, candIndex, rhBottom) {
      const home = realizeMixedCandidate(rootNote, quality, candIndex);
      if (!(rhBottom < Infinity) || Math.max(...home.map(n => n.midi)) < rhBottom)
        return { notes: home, dropOctaves: 0 };
      const cands = lhMixedCandidateIntervals(quality);
      const safe = ((candIndex || 0) % cands.length + cands.length) % cands.length;
      for (let b = 1; b < MIX_LH_BASES.length; b++) {
        const low = realizeHand(rootNote, cands[safe], MIX_LH_BASES[b]);
        if (Math.max(...low.map(n => n.midi)) < rhBottom) return { notes: low, dropOctaves: b };
      }
      return { notes: home, dropOctaves: 0 };
    }

    /** Notes-only view of mixedLhPlacement (realizeVoicing + tests). */
    function realizeMixedCandidateBelow(rootNote, quality, candIndex, rhBottom) {
      return mixedLhPlacement(rootNote, quality, candIndex, rhBottom).notes;
    }

    /**
     * The pitch classes a mixed voicing MUST carry across its two hands: the
     * 3rd (or the sus tone) always, plus a real 7th when the quality has one.
     * The 5th/6th that guideToneIntervals emits as a fallback for triads and
     * 6th chords is deliberately excluded — it is colour, not a guide tone, so
     * a lone-root LH under a triad-in-the-RH is fine.
     */
    function essentialGuideTonePcs(rootNote, quality) {
      const gt = guideToneIntervals(quality);            // ['R', third, seventh-or-fallback]
      const essential = gt[1] ? [gt[1]] : [];            // the 3rd/sus tone defines the chord
      if (gt[2] && MIX_SEVENTH_INTERVALS.indexOf(gt[2]) !== -1) essential.push(gt[2]);
      return essential.length ? realizeHand(rootNote, essential, RH_BASE).map(n => n.midi % 12) : [];
    }

    /**
     * Intrinsic (RH-independent) cost of a mixed LH candidate: a soft pull to
     * E3, a "thinness" cost so a bare root under a seventh chord isn't free
     * (this is what produces mixing rather than an all-roots comp), and a mild
     * nudge off a full shell on a plain triad (where it just doubles the RH).
     */
    function mixedLhIntrinsicCost(quality, candIndex, midis) {
      const mean = midis.reduce((a, b) => a + b, 0) / midis.length;
      let c = Math.abs(mean - MIX_LH_CENTER) * 0.1;             // soft centering
      c += (2 - Math.min(2, midis.length - 1)) * 0.4;          // thinness: root .8, half .4, full 0
      if (candIndex === 1 && MIX_PLAIN_TRIADS.indexOf(quality) !== -1) c += 1.0;
      // Mud: guide tones dropped below A2 (a window-forced low placement) turn
      // to mush — bias low placements toward the lone root ("play lower, play
      // less"). A lone root is exempt: a low bass root is a legitimate color.
      if (midis.length > 1) for (const m of midis) if (m < LH_SOFT_LOW) c += (LH_SOFT_LOW - m) * 0.06;
      return c;
    }

    /**
     * Joint mixed comping: choose RH voicing + shift AND LH shape for every
     * chord at once, minimizing RH movement + LH movement, with a per-node
     * local cost (RH register/tier from buildVoicingCandidates + LH intrinsic +
     * a hard collision guard + a completeness penalty when a guide tone would
     * be dropped). Reuses buildVoicingCandidates for the RH side so the RH's
     * register/window/tier logic is not duplicated. Returns
     * { rhIndices, rhShifts, lhIndices, totalCost }.
     */
    function computeMixedVoicing(progression, complexity, range = null) {
      const rhIndices = [], rhShifts = [], lhIndices = [];
      if (!progression || !progression.length) return { rhIndices, rhShifts, lhIndices, totalCost: 0 };

      const layers = progression.map(chord => {
        const rhCands = buildVoicingCandidates(chord, complexity, range);
        const nLh = lhMixedCandidateIntervals(chord.quality).length;
        const gtPcs = essentialGuideTonePcs(chord.root, chord.quality);
        const nodes = [];
        for (const rc of rhCands) {
          const rhBottom = rc.rhMidis.length ? Math.min(...rc.rhMidis) : Infinity;
          const rhPcs = new Set(rc.rhMidis.map(m => m % 12));
          for (let ci = 0; ci < nLh; ci++) {
            // Placement is RH-dependent: the candidate realizes in the highest
            // octave that clears THIS RH (the reface fix), so lhMidis differ
            // across RH candidates and the DP sees true registers. Drops pay
            // MIX_LH_DROP_COST/octave — home zone stays the full-range norm.
            const placed = mixedLhPlacement(chord.root, chord.quality, ci, rhBottom);
            const midis = placed.notes.map(n => n.midi);
            const lhPcs = new Set(midis.map(m => m % 12));
            let local = rc.localCost + mixedLhIntrinsicCost(chord.quality, ci, midis)
              + placed.dropOctaves * MIX_LH_DROP_COST;
            if (Math.max(...midis) >= rhBottom) local += MIX_COLLISION;
            for (const pc of gtPcs) if (!rhPcs.has(pc) && !lhPcs.has(pc)) local += MIX_INCOMPLETE;
            nodes.push({ rhVIndex: rc.vIndex, rhShift: rc.shift, rhMidis: rc.rhMidis,
              lhCi: ci, lhMidis: midis, localCost: local });
          }
        }
        return nodes;
      });

      let costs = layers[0].map(n => n.localCost);
      const back = [layers[0].map(() => -1)];
      for (let i = 1; i < layers.length; i++) {
        const nextCosts = [], pointers = [];
        for (let j = 0; j < layers[i].length; j++) {
          let best = Infinity, bestK = 0;
          for (let k = 0; k < layers[i - 1].length; k++) {
            const c = costs[k]
              + voiceMovementCost(layers[i - 1][k].rhMidis, layers[i][j].rhMidis)
              + voiceMovementCost(layers[i - 1][k].lhMidis, layers[i][j].lhMidis);
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
        const n = layers[i][j];
        rhIndices[i] = n.rhVIndex; rhShifts[i] = n.rhShift; lhIndices[i] = n.lhCi;
        j = back[i][j];
      }
      return { rhIndices, rhShifts, lhIndices, totalCost };
    }

    /**
     * Best mixed LH candidate for a FIXED right hand — used when the user
     * manually cycles the RH voicing in mixed mode: recoordinate the LH to the
     * pinned RH (cover the guide tones, clear the RH, else lightest). Local
     * only; neighbour movement isn't considered because the user chose this RH.
     */
    function bestMixedLhForRh(rootNote, quality, rhMidis) {
      const rhBottom = rhMidis.length ? Math.min(...rhMidis) : Infinity;
      const rhPcs = new Set(rhMidis.map(m => m % 12));
      const gtPcs = essentialGuideTonePcs(rootNote, quality);
      let bestCi = 0, bestCost = Infinity;
      lhMixedCandidateIntervals(quality).forEach((ivs, ci) => {
        // Same RH-aware placement + drop pricing as the DP (the reface fix).
        const placed = mixedLhPlacement(rootNote, quality, ci, rhBottom);
        const midis = placed.notes.map(n => n.midi);
        const lhPcs = new Set(midis.map(m => m % 12));
        let c = mixedLhIntrinsicCost(quality, ci, midis) + placed.dropOctaves * MIX_LH_DROP_COST;
        if (Math.max(...midis) >= rhBottom) c += MIX_COLLISION;
        for (const pc of gtPcs) if (!rhPcs.has(pc) && !lhPcs.has(pc)) c += MIX_INCOMPLETE;
        if (c < bestCost) { bestCost = c; bestCi = ci; }
      });
      return bestCi;
    }

    /**
     * Realize a full voicing. octaveShift (in semitones, multiples of 12)
     * moves the right hand up/down; the left hand stays anchored low.
     * leftHandMode swaps what the LH plays — the RH (and therefore the
     * voice-leading optimizer, which reads only the voicing's RH slice
     * voicingRh(v) = the stack above splitAfter) is untouched:
     *   'mixed'    — voice-led comping: lhIndex selects a per-chord LH
     *                candidate (lone root / full shell / half shell) chosen
     *                JOINTLY with the RH by computeMixedVoicing; the APP default
     *                (engine default stays 'roots' so the snapshot is stable)
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
      // Anchored voicing (v5 holistic model): a COMPLETE two-hand sonority
      // realized as one contiguous stack from a mid `anchor` and split at
      // splitAfter — "one sonority, split where the hands fall" (e.g. So What,
      // which sits entirely in the middle register). It IS both hands, so the
      // LH mode does not override it. Kept out of the auto-optimizer
      // (buildVoicingCandidates), so it appears only on manual selection.
      if (voicing.anchor != null && voicing.stack) {
        const whole = realizeHand(rootNote, voicing.stack, voicing.anchor + octaveShift);
        return { left: whole.slice(0, voicing.splitAfter), right: whole.slice(voicing.splitAfter) };
      }
      // RH first: mixed places its LH strictly below the REALIZED right hand
      // (window shifts can pull the RH low — the LH follows down, never crosses).
      const right = leftHandMode === 'bassonly' ? [] : realizeHand(rootNote, voicingRh(voicing), RH_BASE + octaveShift);
      const rhBottom = right.length ? Math.min(...right.map(n => n.midi)) : Infinity;
      let left;
      if (leftHandMode === 'rootless') left = [];
      else if (leftHandMode === 'mixed') left = realizeMixedCandidateBelow(rootNote, quality, lhIndex, rhBottom);
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
        // shells were designed and verified low — keep them there. (In v5 the
        // window/register handling moves to the distribution solver, Stage B-1.)
        const lh = voicingLh(voicing); // the stack's default LH slice
        const base = lh.length > 1 ? LH_BASE : LH_COMP_BASE;
        left = realizeHand(rootNote, lh, base);
      }
      return { left, right };
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
        // Anchored voicings (So What etc.) are complete two-hand statements a
        // player reaches for deliberately — never auto-comped by the optimizer.
        // Skipping keeps every existing DP choice byte-identical; they remain
        // reachable via manual voicing cycling.
        if (voicing.anchor != null) return;
        // Untagged voicings are native to the selected tier (cost 0). The tier
        // cost now carries the "prefer fuller voicings" preference, so the raw
        // sparsity weight is small (0.4) rather than the old 1.0.
        const tierCost = (tierCosts && voicing.tiers)
          ? Math.min(...voicing.tiers.map(t => tierCosts[t] ?? Infinity))
          : 0;
        for (const shift of shifts) {
          const rhMidis = realizeHand(chord.root, voicingRh(voicing), RH_BASE + shift).map(n => n.midi);
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
      const range = activeRangeWindow();
      if (state.leftHand === 'mixed') {
        // Mixed mode chooses RH voicing + LH shape JOINTLY, so it owns all
        // three arrays (the RH is picked for combined LH+RH voice leading, not
        // by the RH-only optimizer).
        const joint = computeMixedVoicing(state.progression, state.complexity, range);
        state.voicingIndices = joint.rhIndices;
        state.voicingShifts = joint.rhShifts;
        state.lhVoicingIndices = joint.lhIndices;
        return;
      }
      const result = computeProgressionVoicings(state.progression, state.complexity, range);
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
        const rhMidis = realizeHand(rootNote, voicingRh(voicing), RH_BASE + shift).map(n => n.midi);
        // Out-of-window placements only win when nothing fits at all.
        const c = registerPenalty(rhMidis) + voiceMovementCost(prevRhMidis, rhMidis)
          + windowOverflow(rhMidis, range) * 1000;
        if (c < bestCost) { bestCost = c; best = shift; }
      }
      return best;
    }

    // ============== Sounding chord (the chart symbol vs what you play) ==============
    // A chart symbol is a contract, not a transcription: the app (like a real
    // player) may voice an Fmaj7 with the 9 in it. These helpers name what a
    // realized voicing ACTUALLY sounds like ("Fmaj9") so the display can teach
    // the gap between the page and the hands. Display-only — nothing here
    // feeds playback or the optimizers.

    /** Interval names the LH contributes under a given mode (mirrors realizeVoicing). */
    function lhIntervalNamesFor(leftHandMode, quality, voicing, lhIndex) {
      if (leftHandMode === 'rootless') return [];
      if (leftHandMode === 'bassonly') return ['R'];
      if (leftHandMode === 'shells') return guideToneIntervals(quality);
      if (leftHandMode === 'mixed') {
        const cands = lhMixedCandidateIntervals(quality);
        return cands[((lhIndex || 0) % cands.length + cands.length) % cands.length];
      }
      if (leftHandMode === 'evans') {
        const shapes = lhRootlessShapesFor(quality);
        return shapes[((lhIndex || 0) % shapes.length + shapes.length) % shapes.length];
      }
      return voicingLh(voicing); // roots (the stack's default LH slice)
    }

    // Qualities whose symbol conventionally upgrades when a natural extension
    // sounds (a dom7 voiced with the 13 IS a 13th chord). Everything else —
    // altered dominants, m7b5, dim, minMaj — keeps its written symbol and takes
    // the color in parentheses: the conservative, smallest honest name.
    const SOUNDING_LADDERS = {
      maj7: { '9': 'maj9', '13': 'maj13' },
      maj9: { '13': 'maj13' },
      dom7: { '9': '9', '13': '13' },
      dom9: { '13': '13' },
      min7: { '9': 'm9', '11': 'm11', '13': 'm13' },
      min9: { '11': 'm11', '13': 'm13' },
      min11: { '13': 'm13' },
      dom7sus4: { '9': '9sus4', '13': '13sus4' },
      '6': { '9': '6/9' },
      m6: { '9': 'm6/9' },
      maj: { '9': 'add9' },
      min: { '9': 'm(add9)' }
    };
    // Conventional display order inside the parentheses.
    const SOUNDING_COLOR_ORDER = ['b9', '9', '#9', '11', '#11', 'b13', '13', 'b5', '#5', '6', '2', '4'];

    /**
     * Name what a voicing actually sounds like, or null when it carries no
     * pitch class beyond the written chord's degree set (then the page and the
     * hands agree — nothing to teach). Returns { symbol, rootImplied }.
     */
    function soundingChord(rootNote, quality, chordInfo, voicing, leftHandMode, lhIndex) {
      if (leftHandMode === 'bassonly') return null; // only the root sounds
      const names = new Set(
        lhIntervalNamesFor(leftHandMode, quality, voicing, lhIndex).concat(voicingRh(voicing)));
      const writtenPcs = new Set(chordInfo.intervals.map(s => ((s % 12) + 12) % 12));
      let extras = [];
      for (const iv of names) {
        const def = INTERVALS[iv];
        if (def && !writtenPcs.has(((def.semitones % 12) + 12) % 12)) extras.push(iv);
      }
      if (!extras.length) return null;

      let suffix = chordInfo.symbol;
      const ladder = SOUNDING_LADDERS[quality];
      if (ladder) {
        // Highest natural extension the family upgrades on; upgrading to a 13
        // (or 11) consumes the naturals below it, per convention.
        const natural = ['13', '11', '9'].find(n => ladder[n] && extras.indexOf(n) !== -1);
        if (natural) {
          suffix = ladder[natural];
          const consumed = ['9', '11', '13'].slice(0, ['9', '11', '13'].indexOf(natural) + 1);
          extras = extras.filter(iv => consumed.indexOf(iv) === -1);
        }
      }
      if (extras.length) {
        extras.sort((a, b) => SOUNDING_COLOR_ORDER.indexOf(a) - SOUNDING_COLOR_ORDER.indexOf(b));
        suffix += '(' + extras.join(',') + ')';
      }
      return { symbol: formatNoteDisplay(rootNote) + suffix, rootImplied: !names.has('R') };
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
        octaveShift: shift,
        sounding: soundingChord(rootNote, quality, chordInfo, voicing, leftHandMode, lhIndex)
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

