// Self-contained regression tests for ChordFlow's voice leading engine.
// Usage: node test_voice_leading.js
// Loads the pure-logic layer (no DOM) by concatenating the split classic
// scripts and evaluating them in a single function scope — the same shared
// global scope the browser gives them, minus the state/render/audio layers
// that touch the DOM.
const fs = require('fs');
const path = require('path');
function loadTheoryCore() {
  // Dependency order for the logic-only layer. render/audio/app are omitted:
  // they reference the DOM and are exercised by test_dom_smoke.js. state.js is
  // included for the pure generation model (buildRandomNumerals); its DOM
  // touches live inside functions this suite never calls.
  const files = ['js/theory.js', 'js/library.js', 'js/voicings.js', 'js/parsing.js', 'js/audio.js', 'js/state.js'];
  const core = files.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  const fn = new Function(core + '\nreturn { spellInterval, INTERVALS, NOTE_TO_SEMITONE, KEYBOARD_VOICINGS, CHORD_TYPES, PROGRESSION_LIBRARY, parseRomanNumeral, realizeHand, realizeVoicing, computeProgressionVoicings, voiceMovementCost, registerPenalty, getChordNotesAtIndex, getChordNotes, voicingsFor, bestShiftForVoicing, RH_BASE, LH_BASE, LH_COMP_BASE, SHELL_TONE_BASE, LH_ROOTLESS_BASE, LH_SOFT_LOW, buildRandomNumerals, SECONDARY_TARGETS, grooveOnsets, guideToneIntervals, realizeShellHand, lhRootlessShapesFor, computeLeftHandVoicings, RANGE_WINDOWS, windowOverflow, buildVoicingCandidates, flavorizeNumerals, isBorrowedNumeral, getChordSubstitutions, computeMixedVoicing, essentialGuideTonePcs, lhMixedCandidateIntervals, realizeMixedCandidate, realizeMixedCandidateBelow, bestMixedLhForRh, formatChordSymbol, soundingChord, computeInversionComp, coreChordTones, inversionShapesFor };');
  return fn();
}
const T = loadTheoryCore();

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.log('  FAIL: ' + msg); }
}

function realizeProgression(chords) {
  // chords: [{root, quality}]
  const { indices, shifts } = T.computeProgressionVoicings(chords, 'seventh');
  return chords.map((c, i) => {
    const d = T.getChordNotesAtIndex(c.root, c.quality, 'seventh', indices[i], shifts[i]);
    return { ...c, data: d };
  });
}

function show(realized) {
  for (const r of realized) {
    const lh = r.data.leftHandPitches.map(p => p.name + p.octave).join(' ');
    const rh = r.data.rightHandPitches.map(p => p.name + p.octave).join(' ');
    console.log(`  ${(r.root + r.quality).padEnd(8)} LH: ${lh.padEnd(8)} RH: ${rh.padEnd(20)} (${r.data.voicingName})`);
  }
}

function maxVoiceMove(a, b) {
  // worst single-voice movement under nearest-neighbor pairing, both directions
  let worst = 0;
  for (const n of b) worst = Math.max(worst, Math.min(...a.map(p => Math.abs(n - p))));
  for (const p of a) worst = Math.max(worst, Math.min(...b.map(n => Math.abs(p - n))));
  return worst;
}

const rh = r => r.data.rightHandPitches.map(p => p.midi);
const rhNames = r => r.data.rightHandPitches.map(p => p.name);

// ---------------------------------------------------------------
console.log('Test 1: ii-V-I in C major (Dm7 -> G7 -> Cmaj7)');
{
  const prog = realizeProgression([
    { root: 'D', quality: 'min7' },
    { root: 'G', quality: 'dom7' },
    { root: 'C', quality: 'maj7' },
  ]);
  show(prog);
  const [dm7, g7, cmaj7] = prog;

  // Guide tones present
  check(rhNames(dm7).includes('F') && rhNames(dm7).includes('C'), 'Dm7 has guide tones F and C');
  check(rhNames(g7).includes('B') && rhNames(g7).includes('F'), 'G7 has guide tones B and F');
  check(rhNames(cmaj7).includes('E') && rhNames(cmaj7).includes('B'), 'Cmaj7 has guide tones E and B');

  // Common-tone F between Dm7 and G7 at the SAME pitch
  const fInDm7 = dm7.data.rightHandPitches.find(p => p.name === 'F');
  const fInG7 = g7.data.rightHandPitches.find(p => p.name === 'F');
  check(fInDm7 && fInG7 && fInDm7.midi === fInG7.midi, 'F held at same pitch from Dm7 to G7');

  // F -> E half-step resolution into Cmaj7
  const eInCmaj7 = cmaj7.data.rightHandPitches.find(p => p.name === 'E');
  check(fInG7 && eInCmaj7 && Math.abs(fInG7.midi - eInCmaj7.midi) === 1, 'F of G7 resolves by half-step to E of Cmaj7');

  // B held from G7 to Cmaj7
  const bInG7 = g7.data.rightHandPitches.find(p => p.name === 'B');
  const bInCmaj7 = cmaj7.data.rightHandPitches.find(p => p.name === 'B');
  check(bInG7 && bInCmaj7 && bInG7.midi === bInCmaj7.midi, 'B held at same pitch from G7 to Cmaj7');

  // No voice moves more than a whole step across either transition
  check(maxVoiceMove(rh(dm7), rh(g7)) <= 2, 'Dm7->G7 worst voice move <= 2 semitones');
  check(maxVoiceMove(rh(g7), rh(cmaj7)) <= 2, 'G7->Cmaj7 worst voice move <= 2 semitones');

  // Type alternation emerged (no bonus in the algorithm)
  const types = prog.map(r => {
    const v = T.voicingsFor(r.quality, 'seventh')[r.data.voicingIndex];
    return v.type;
  });
  check(types[0] !== types[1] && types[1] !== types[2], `A/B types alternate (got ${types.join('-')})`);
}

// ---------------------------------------------------------------
console.log('\nTest 2: ii-V-I in all 12 keys');
{
  const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  for (const key of KEYS) {
    const ii = T.spellInterval(key, '2');
    const V = T.spellInterval(key, '5');
    const prog = realizeProgression([
      { root: ii, quality: 'min7' },
      { root: V, quality: 'dom7' },
      { root: key, quality: 'maj7' },
    ]);
    let ok = true;
    for (const r of prog) {
      for (const p of r.data.rightHandPitches) {
        if (p.midi < 53 || p.midi > 81) { ok = false; check(false, `${key}: ${r.root}${r.quality} note ${p.name}${p.octave} (midi ${p.midi}) out of register`); }
        if (!p.name || p.name.includes('undefined') || !Number.isFinite(p.midi)) { ok = false; check(false, `${key}: bad note in ${r.root}${r.quality}`); }
      }
      // pitches strictly ascending within each hand
      const m = rh(r);
      for (let i = 1; i < m.length; i++) if (m[i] <= m[i - 1]) { ok = false; check(false, `${key}: ${r.root}${r.quality} RH not ascending`); }
    }
    const t1 = maxVoiceMove(rh(prog[0]), rh(prog[1]));
    const t2 = maxVoiceMove(rh(prog[1]), rh(prog[2]));
    check(t1 <= 2 && t2 <= 2, `${key}: worst voice moves (${t1}, ${t2}) <= 2`);
    if (ok && t1 <= 2 && t2 <= 2) console.log(`  ${key.padEnd(3)} ok  (${prog.map(r => rhNames(r).join('-')).join('  |  ')})`);
  }
}

// ---------------------------------------------------------------
console.log('\nTest 3: minor ii-V-i (Dm7b5 -> G7alt -> Cm7)');
{
  const prog = realizeProgression([
    { root: 'D', quality: 'm7b5' },
    { root: 'G', quality: 'dom7alt' },
    { root: 'C', quality: 'min7' },
  ]);
  show(prog);
  const [dm7b5, g7alt, cm7] = prog;
  check(rhNames(dm7b5).includes('F') && rhNames(dm7b5).includes('C'), 'Dm7b5 has guide tones F and C');
  check(rhNames(dm7b5).includes('Ab'), 'Dm7b5 b5 spelled as Ab (not G#)');
  check(rhNames(g7alt).includes('B') && rhNames(g7alt).includes('F'), 'G7alt has guide tones B and F');
  check(rhNames(cm7).includes('Eb') && rhNames(cm7).includes('Bb'), 'Cm7 has guide tones Eb and Bb');
  check(maxVoiceMove(rh(dm7b5), rh(g7alt)) <= 2, 'Dm7b5->G7alt worst voice move <= 2');
  check(maxVoiceMove(rh(g7alt), rh(cm7)) <= 2, 'G7alt->Cm7 worst voice move <= 2');
}

// ---------------------------------------------------------------
console.log('\nTest 4: realization sanity across all voicing tables and awkward roots');
{
  const roots = ['C', 'F#', 'Db', 'B', 'Eb', 'Gb'];
  let bad = 0;
  for (const quality of Object.keys(T.KEYBOARD_VOICINGS)) {
    for (const root of roots) {
      const voicings = T.voicingsFor(quality); // full unfiltered list
      voicings.forEach((v, vi) => {
        const d = T.getChordNotesAtIndex(root, quality, undefined, vi, 0);
        for (const hand of [d.leftHandPitches, d.rightHandPitches]) {
          for (let i = 0; i < hand.length; i++) {
            const p = hand[i];
            if (!Number.isFinite(p.midi) || !p.name || p.name.length > 3) { bad++; check(false, `${root}${quality} v${vi}: bad note ${JSON.stringify(p)}`); }
            if (i > 0 && hand[i].midi <= hand[i - 1].midi) { bad++; check(false, `${root}${quality} v${vi}: hand not ascending`); }
            // name pitch class must match midi pitch class
            if (((T.NOTE_TO_SEMITONE[p.name] ?? -99) - (p.midi % 12) + 12) % 12 !== 0) { bad++; check(false, `${root}${quality} v${vi}: name ${p.name} != midi ${p.midi}`); }
          }
        }
      });
    }
  }
  if (!bad) console.log('  all qualities x roots x voicings realize cleanly');
}

// ---------------------------------------------------------------
console.log('\nTest 5: longer progression stays in register (I-vi-ii-V x2 in C)');
{
  const prog = realizeProgression([
    { root: 'C', quality: 'maj7' }, { root: 'A', quality: 'min7' },
    { root: 'D', quality: 'min7' }, { root: 'G', quality: 'dom7' },
    { root: 'C', quality: 'maj7' }, { root: 'A', quality: 'min7' },
    { root: 'D', quality: 'min7' }, { root: 'G', quality: 'dom7' },
  ]);
  show(prog);
  for (const r of prog) {
    for (const p of r.data.rightHandPitches) {
      check(p.midi >= 53 && p.midi <= 81, `${r.root}${r.quality}: ${p.name}${p.octave} in register`);
    }
  }
  for (let i = 1; i < prog.length; i++) {
    const mv = maxVoiceMove(rh(prog[i - 1]), rh(prog[i]));
    check(mv <= 4, `transition ${i}: worst voice move ${mv} <= 4`);
  }
}

// ---------------------------------------------------------------
console.log('\nTest 6: cumulative quality pools + function guardrails + library');
{
  const N = 400;
  const tally = (num, key, mode, cx, density = 1.0) => {
    const c = {};
    for (let t = 0; t < N; t++) { const q = T.parseRomanNumeral(num, key, mode, cx, density).quality; c[q] = (c[q] || 0) + 1; }
    return c;
  };

  // Simple tier: pure triads only, every degree
  let simpleBad = 0;
  for (const num of ['I', 'ii', 'iii', 'IV', 'V', 'vi']) {
    for (const q of Object.keys(tally(num, 'C', 'major', 'simple'))) {
      if (!['maj', 'min', 'dim', 'aug'].includes(q)) { simpleBad++; check(false, `simple ${num} produced non-triad ${q}`); }
    }
  }
  if (!simpleBad) console.log('  simple tier: only triads');

  // Dominant keeps its 7th at 'seventh' (>=90%), never becomes minor/half-dim
  {
    const c = tally('V', 'C', 'major', 'seventh');
    check((c['dom7'] || 0) / N >= 0.9, `V@seventh keeps its 7th >=90% (dom7 ${(((c['dom7'] || 0) / N) * 100).toFixed(0)}%)`);
    check(!Object.keys(c).some(q => q.startsWith('min') || q === 'm7b5'), 'V never becomes minor/half-dim');
  }

  // Non-dominant reaches DOWN (maj7 majority, triad floor present at low density),
  // and NEVER pulls a tonic-only color (6/69/add9) onto IV
  {
    const c = tally('IV', 'C', 'major', 'seventh');
    check((c['maj7'] || 0) > (c['maj'] || 0), 'IV@seventh mostly maj7');
    check(!('6' in c) && !('69' in c) && !('add9' in c), 'IV never gets tonic 6/69/add9 color');
    check((tally('IV', 'C', 'major', 'seventh', 0.45)['maj'] || 0) > 0,
      'IV can relax to a triad at low density (cumulative reach-down)');
  }

  // Function-preserving branches never downgraded by the weighted pools
  {
    let g = 0;
    for (let t = 0; t < 300; t++) {
      if (T.parseRomanNumeral('vii\u00b0', 'C', 'major', 'seventh').quality !== 'm7b5') g++;
      if (T.parseRomanNumeral('ii\u00b0', 'C', 'minor', 'seventh').quality !== 'm7b5') g++;
      if (T.parseRomanNumeral('Vsus', 'C', 'major', 'seventh').quality !== 'dom7sus4') g++;
      if (T.parseRomanNumeral('vii', 'C', 'major', 'seventh').quality !== 'm7b5') g++;
      if (T.parseRomanNumeral('ii', 'C', 'minor', 'seventh').quality !== 'm7b5') g++;
    }
    check(g === 0, 'dim / half-dim / sus function branches survive the pools intact');
  }

  // seventh-strict tonic never a 6/m6 color chord
  {
    let sc = 0;
    for (let t = 0; t < 300; t++) {
      if (T.parseRomanNumeral('I', 'C', 'major', 'seventh-strict').quality === '6') sc++;
      if (T.parseRomanNumeral('i', 'C', 'minor', 'seventh-strict').quality === 'm6') sc++;
    }
    check(sc === 0, 'strict tonic never 6/m6');
  }

  // Ladybird: roots deterministic; qualities stay dominant-family (or triad floor)
  {
    const lb = T.PROGRESSION_LIBRARY.find(p => p.name.includes('Ladybird'));
    let rootsOk = true, qualOk = true;
    for (let t = 0; t < 60; t++) {
      const c = lb.chords.map(n => T.parseRomanNumeral(n, 'C', 'major', 'seventh'));
      if (!(c[1].root === 'Eb' && c[2].root === 'Ab' && c[3].root === 'Db')) rootsOk = false;
      if (!c.slice(1).every(x => x.quality.startsWith('dom') || x.quality === 'maj')) qualOk = false;
    }
    check(rootsOk, 'Ladybird roots Eb-Ab-Db in C');
    check(qualOk, 'Ladybird bIII/bVI/bII stay dominant-family (never minor/dim)');
  }

  // Library integrity: parse + realize across tiers in two keys, no bad pitches
  let libBad = 0;
  for (const prog of T.PROGRESSION_LIBRARY) {
    for (const key of ['C', 'Eb']) {
      for (const cx of ['simple', 'seventh', 'rsp', 'extended', 'altered']) {
        const chords = prog.chords.map(n => T.parseRomanNumeral(n, key, prog.mode, cx));
        for (const c of chords) if (T.NOTE_TO_SEMITONE[c.root] === undefined) { libBad++; check(false, `${prog.name}: bad root ${c.root}`); }
        const { indices, shifts } = T.computeProgressionVoicings(chords, cx);
        chords.forEach((c, i) => {
          const d = T.getChordNotesAtIndex(c.root, c.quality, cx, indices[i], shifts[i]);
          for (const p of [...d.leftHandPitches, ...d.rightHandPitches]) {
            if (!Number.isFinite(p.midi) || !p.name) { libBad++; check(false, `${prog.name}: bad pitch ${c.root}${c.quality}`); }
          }
        });
      }
    }
  }
  check(T.PROGRESSION_LIBRARY.length === 53, `library holds 53 entries (got ${T.PROGRESSION_LIBRARY.length})`);
  if (!libBad) console.log('  all 53 library entries parse + realize across tiers in C and Eb');
}

// ---------------------------------------------------------------
console.log('\nTest 7: cumulative voicing tiers');
{
  const ch = (root, quality) => ({ root, quality, degree: '' });
  function chordToneSet(quality) {
    for (const level of ['simple', 'seventh', 'extended', 'altered'])
      if (T.CHORD_TYPES[level] && T.CHORD_TYPES[level][quality])
        return new Set(T.CHORD_TYPES[level][quality].intervals.map(s => ((s % 12) + 12) % 12));
    return null;
  }
  function baseSeventhSet(quality) {
    for (const level of ['simple', 'seventh', 'extended', 'altered'])
      if (T.CHORD_TYPES[level] && T.CHORD_TYPES[level][quality])
        return new Set(T.CHORD_TYPES[level][quality].intervals.slice(0, 4).map(s => ((s % 12) + 12) % 12));
    return null;
  }
  function soundedPcs(root, quality, cx, index, shift) {
    const d = T.getChordNotesAtIndex(root, quality, cx, index, shift);
    const rootPc = T.NOTE_TO_SEMITONE[root];
    const pcs = new Set();
    [...d.leftHandPitches, ...d.rightHandPitches].forEach(p => pcs.add(((p.midi - rootPc) % 12 + 12) % 12));
    return { pcs, name: d.voicingName };
  }
  // Fixed qualities so we test the VOICING filter, not the (now random) pool.
  function realizeFixed(chords, cx) {
    const { indices, shifts } = T.computeProgressionVoicings(chords, cx);
    return chords.map((c, i) => ({ c, ...soundedPcs(c.root, c.quality, cx, indices[i], shifts[i]) }));
  }
  const seventhProg = [ch('D', 'min7'), ch('G', 'dom7'), ch('C', 'maj7'), ch('A', 'min7')];

  // STRICT: only chord tones sound (reaching down to triads is still chord tones)
  let strictBad = 0;
  for (const r of realizeFixed(seventhProg, 'seventh-strict')) {
    const tones = chordToneSet(r.c.quality);
    for (const pc of r.pcs) if (!tones.has(pc)) { strictBad++; check(false, `strict ${r.c.root}${r.c.quality} sounds non-chord-tone ${pc} (${r.name})`); }
  }
  if (!strictBad) console.log('  strict tier: only chord tones sound');

  // RSP is now cumulative (rsp + strict): AT MOST one pretty note per chord,
  // and never a jazz voicing (which stacks two colors, e.g. 9 and 13).
  let rspBad = 0;
  for (const r of realizeFixed(seventhProg, 'rsp')) {
    const base = baseSeventhSet(r.c.quality);
    const extras = [...r.pcs].filter(pc => !base.has(pc));
    if (extras.length > 1) { rspBad++; check(false, `rsp ${r.c.root}${r.c.quality} has ${extras.length} color tones (${r.name})`); }
  }
  if (!rspBad) console.log('  rsp tier: at most one pretty note per chord (no jazz stacking)');

  // JAZZ: an isolated dominant takes the rootless shape with both 13 and 9
  {
    const g = realizeFixed([ch('G', 'dom7')], 'seventh')[0];
    check(g.pcs.has(9) && g.pcs.has(2), 'jazz dom7 sounds the 13 and 9 (Bill Evans rootless)');
  }

  // Jazz tier DOES stack two colors somewhere in a ii-V-I (distinguishes it from RSP)
  {
    const jazz = realizeFixed(seventhProg, 'seventh');
    const anyTwoColor = jazz.some(r => {
      const base = baseSeventhSet(r.c.quality);
      return [...r.pcs].filter(pc => !base.has(pc)).length >= 2;
    });
    check(anyTwoColor, 'jazz tier stacks 2 colors on at least one chord (cumulative, unlike rsp)');
  }

  // The three tiers are distinct for an isolated G7
  {
    const key = set => [...set].sort((a, b) => a - b).join(',');
    const s = key(realizeFixed([ch('G', 'dom7')], 'seventh-strict')[0].pcs);
    const r = key(realizeFixed([ch('G', 'dom7')], 'rsp')[0].pcs);
    const j = key(realizeFixed([ch('G', 'dom7')], 'seventh')[0].pcs);
    check(s !== r && r !== j && s !== j, 'strict / rsp / jazz G7 are three distinct voicings');
  }
}

// ---------------------------------------------------------------
console.log('\nTest 8: variable-length generation + secondary dominants (Phase 4)');
{
  const N = 300;
  const isSecondary = num => num.includes('/');

  for (const mode of ['major', 'minor']) {
    const targets = T.SECONDARY_TARGETS[mode];
    let lengthBad = 0, resolutionBad = 0, finalBad = 0, quotaBad = 0, parseBad = 0;

    for (let bars = 2; bars <= 8; bars++) {
      for (let t = 0; t < N; t++) {
        const density = t % 3 === 0 ? 0.45 : 1.0; // exercise both characters
        const nums = T.buildRandomNumerals(mode, bars, density);

        // Length always matches the requested bars
        if (nums.length !== bars) { lengthBad++; check(false, `${mode}/${bars}: length ${nums.length}`); }

        let count = 0;
        nums.forEach((num, i) => {
          if (!isSecondary(num)) return;
          count++;
          // Never the final chord
          if (i === nums.length - 1) { finalBad++; check(false, `${mode}/${bars}: secondary dominant on final chord`); }
          // Always V7/x with an allowed target, immediately followed by it
          const [prim, target] = num.split('/');
          if (prim !== 'V7' || !targets.includes(target)) { parseBad++; check(false, `${mode}/${bars}: bad secondary form ${num}`); }
          if (nums[i + 1] !== target) { resolutionBad++; check(false, `${mode}/${bars}: ${num} not followed by ${target} (got ${nums[i + 1]})`); }
        });

        // At most one per 4 bars; two allowed at 7-8 bars
        const quota = bars >= 7 ? 2 : 1;
        if (count > quota) { quotaBad++; check(false, `${mode}/${bars}: ${count} secondaries > quota ${quota}`); }
      }
    }
    if (!lengthBad && !resolutionBad && !finalBad && !quotaBad && !parseBad) {
      console.log(`  ${mode}: lengths 2-8 exact; every V7/x interior, well-formed, resolving to its target; quota respected`);
    }
  }

  // Frequency bounds: secondaries present in >5% and <50% of 8-bar
  // generations at full density (the seventh-tier pool question is below).
  {
    const M = 400;
    let withSec = 0;
    for (let t = 0; t < M; t++) {
      if (T.buildRandomNumerals('major', 8, 1.0).some(isSecondary)) withSec++;
    }
    const frac = withSec / M;
    check(frac > 0.05 && frac < 0.5, `8-bar secondary-dominant frequency in (5%, 50%) — got ${(frac * 100).toFixed(1)}%`);
    console.log(`  8-bar full-density presence: ${(frac * 100).toFixed(1)}%`);

    // Density scaling: sparse progressions use them noticeably less often
    let sparse = 0;
    for (let t = 0; t < M; t++) {
      if (T.buildRandomNumerals('major', 8, 0.45).some(isSecondary)) sparse++;
    }
    check(sparse / M < frac, `sparser character uses fewer secondaries (${(sparse / M * 100).toFixed(1)}% < ${(frac * 100).toFixed(1)}%)`);
  }

  // The parser's secondary path draws from the tier's cumulative dominant
  // pool: V7/ii at 'seventh' stays dominant-family (triad floor is rare), and
  // at 'extended' the pool can upgrade it past plain dom7.
  {
    const tallies = { seventh: {}, extended: {} };
    for (const cx of ['seventh', 'extended']) {
      for (let t = 0; t < 300; t++) {
        const q = T.parseRomanNumeral('V7/ii', 'C', 'major', cx).quality;
        tallies[cx][q] = (tallies[cx][q] || 0) + 1;
      }
    }
    const domFrac = Object.entries(tallies.seventh)
      .filter(([q]) => q.startsWith('dom')).reduce((s, [, c]) => s + c, 0) / 300;
    check(domFrac >= 0.9, `V7/ii@seventh dominant-family >=90% (got ${(domFrac * 100).toFixed(0)}%)`);
    check(Object.keys(tallies.extended).some(q => q === 'dom9' || q === 'dom13'),
      'V7/ii@extended reaches the extended dominant pool (dom9/dom13 seen)');
    // And the target root is right: V7/ii in C resolves to D, so its root is A
    const sec = T.parseRomanNumeral('V7/ii', 'C', 'major', 'seventh');
    check(sec.root === 'A', `V7/ii in C is rooted on A (got ${sec.root})`);
  }

  // Whole pipeline stays healthy at every length: parse + optimize + realize
  // a generated progression at 2 and 8 bars across tiers (downstream is
  // length-generic — verify, don't rewrite).
  {
    let bad = 0;
    for (const bars of [2, 8]) {
      for (const cx of ['simple', 'seventh', 'altered']) {
        for (let t = 0; t < 40; t++) {
          const nums = T.buildRandomNumerals('major', bars, 1.0);
          const chords = nums.map(n => T.parseRomanNumeral(n, 'C', 'major', cx));
          const { indices, shifts } = T.computeProgressionVoicings(chords, cx);
          if (indices.length !== bars || shifts.length !== bars) { bad++; check(false, `${bars}/${cx}: optimizer arrays wrong length`); }
          chords.forEach((c, i) => {
            const d = T.getChordNotesAtIndex(c.root, c.quality, cx, indices[i], shifts[i]);
            for (const p of [...d.leftHandPitches, ...d.rightHandPitches]) {
              if (!Number.isFinite(p.midi) || !p.name) { bad++; check(false, `${bars}/${cx}: bad pitch on ${c.root}${c.quality}`); }
            }
          });
        }
      }
    }
    if (!bad) console.log('  2- and 8-bar generations parse, optimize and realize cleanly across tiers');
  }
}

// ---------------------------------------------------------------
console.log('\nTest 9: as-written library audit (Phase 5)');
{
  // Every entry carries an original key the UI can select
  const SELECTABLE = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  let keyBad = 0;
  for (const prog of T.PROGRESSION_LIBRARY) {
    if (!prog.originalKey || !SELECTABLE.includes(prog.originalKey)) {
      keyBad++; check(false, `${prog.name}: originalKey missing/unselectable (${prog.originalKey})`);
    }
  }
  if (!keyBad) console.log('  all 53 entries carry a selectable originalKey');

  // Explicit suffixes are deterministic: every SUFFIXED numeral in a tune
  // parses to the same quality on every parse (the pools no longer roll
  // them). Bare numerals (e.g. Blue Bossa's tonic 'i') and secondaries stay
  // pooled by design.
  const isBare = n => /^[b#]?[IViv]+[°ø+]?$/.test(n);
  const deterministic = (entry) => {
    const runs = [];
    for (let t = 0; t < 25; t++) {
      runs.push(entry.chords
        .filter(n => !n.includes('/') && !isBare(n))
        .map(n => T.parseRomanNumeral(n, entry.originalKey, entry.mode, 'seventh', 1.0).quality).join(','));
    }
    return new Set(runs).size === 1;
  };
  const autumn = T.PROGRESSION_LIBRARY.find(p => p.name.includes('Autumn Leaves'));
  const attya = T.PROGRESSION_LIBRARY.find(p => p.name.includes('All The Things'));
  const bossa = T.PROGRESSION_LIBRARY.find(p => p.name.includes('Blue Bossa'));
  check(deterministic(autumn), 'Autumn Leaves parses deterministically (as written)');
  check(deterministic(attya), 'All The Things You Are parses deterministically');
  check(deterministic(bossa), 'Blue Bossa parses deterministically');

  // And to the RIGHT written qualities, spot-checked against the charts
  const al = autumn.chords.map(n => T.parseRomanNumeral(n, 'Bb', 'major', 'seventh'));
  check(al.map(c => c.root).join(' ') === 'C F Bb Eb A D G',
    'Autumn Leaves roots in Bb: C F Bb Eb A D G (got ' + al.map(c => c.root).join(' ') + ')');
  check(al.map(c => c.quality).join(',') === 'min7,dom7,maj7,maj7,m7b5,dom7b9,min7',
    'Autumn Leaves qualities as written (got ' + al.map(c => c.quality).join(',') + ')');

  // Bare-numeral entries still roll pools (variety is the point of patterns)
  {
    const axis = T.PROGRESSION_LIBRARY.find(p => p.name.startsWith('Axis'));
    const seen = new Set();
    for (let t = 0; t < 60; t++) {
      seen.add(axis.chords.map(n => T.parseRomanNumeral(n, 'C', 'major', 'seventh').quality).join(','));
    }
    check(seen.size > 1, 'bare-numeral pattern entries keep pool variety (' + seen.size + ' variants seen)');
  }

  // Suffix pinning fundamentals (incl. the previously-unparseable V7b9 form)
  check(T.parseRomanNumeral('V7b9', 'C', 'major', 'seventh').quality === 'dom7b9' &&
    T.parseRomanNumeral('V7b9', 'C', 'major', 'seventh').root === 'G', 'V7b9 pins dom7b9 on G');
  check(T.parseRomanNumeral('Imaj7', 'C', 'major', 'simple').quality === 'maj',
    'simple tier reduces pinned qualities to triads');
  check(T.parseRomanNumeral('ii7', 'C', 'minor', 'seventh').quality === 'm7b5',
    'invariant 7 guardrail still outranks a pinned ii7 in minor');
}

// ---------------------------------------------------------------
console.log('\nTest 10: comping groove onsets');
{
  const ts = hits => hits.map(h => +h.t.toFixed(4)).join(',');

  // block = one strike held for the whole chord (original behavior)
  check(ts(T.grooveOnsets('block', 4, false)) === '0' && T.grooveOnsets('block', 4, false)[0].d === 4,
    'block@4 is a single whole-span hit');
  check(T.grooveOnsets('block', 8, false)[0].d === 8, 'block@8 holds all 8 beats');

  // charleston: 1 and the and-of-2; repeats per 4-beat cycle
  check(ts(T.grooveOnsets('charleston', 4, false)) === '0,1.5', 'charleston@4 hits 0 and 1.5');
  check(ts(T.grooveOnsets('charleston', 8, false)) === '0,1.5,4,5.5', 'charleston@8 repeats per cycle');
  // swing moves the off-beat eighth to the 2/3 position
  check(ts(T.grooveOnsets('charleston', 4, true)) === '0,' + +(1 + 2 / 3).toFixed(4),
    'swing shifts the and-of-2 to 1+2/3');

  // bossa: 3 hits per cycle; short spans drop late onsets
  check(ts(T.grooveOnsets('bossa', 4, false)) === '0,1.5,3', 'bossa@4 hits 0, 1.5, 3');
  check(ts(T.grooveOnsets('bossa', 2, false)) === '0,1.5', 'bossa@2 drops the beat-3 hit');

  // pulse: straight half notes, never swung (no off-beat eighths)
  check(ts(T.grooveOnsets('pulse', 4, true)) === '0,2', 'pulse@4 hits 0 and 2 (swing no-op)');

  // Articulation: every hit carries a sane gate + velocity; the charleston is
  // long-short (tenuto downbeat, staccato stab); block keeps its historical
  // 0.92 ring so the original behavior is untouched.
  const ch = T.grooveOnsets('charleston', 4, false);
  check(ch[0].gate > ch[1].gate && ch[1].gate <= 0.4, 'charleston articulates long-short (DAAH-dit)');
  check(T.grooveOnsets('block', 4, false)[0].gate === 0.92, 'block gate preserves the original ring');

  // Every onset lands inside the chord span with positive duration/gate/velocity
  let bad = 0;
  for (const g of ['block', 'charleston', 'bossa', 'pulse']) {
    for (const bpc of [2, 4, 8]) {
      for (const h of T.grooveOnsets(g, bpc, true)) {
        if (h.t < 0 || h.t >= bpc || h.d <= 0 || !(h.gate > 0 && h.gate <= 1) || !(h.v > 0)) {
          bad++; check(false, `${g}@${bpc}: bad onset ${JSON.stringify(h)}`);
        }
      }
    }
  }
  if (!bad) console.log('  all groove onsets in-span with positive durations, gates and velocities');
}

console.log('\nTest 11: left-hand modes (bassist mode)');
{
  // guideToneIntervals names the 3rd/7th by function, per quality
  const gt = (q) => T.guideToneIntervals(q).join(',');
  check(gt('min7') === 'R,b3,b7', `min7 guide tones (got ${gt('min7')})`);
  check(gt('maj7') === 'R,3,7', `maj7 guide tones (got ${gt('maj7')})`);
  check(gt('dom7') === 'R,3,b7', `dom7 guide tones (got ${gt('dom7')})`);
  check(gt('m7b5') === 'R,b3,b7', `m7b5 guide tones (got ${gt('m7b5')})`);
  check(gt('dim7') === 'R,b3,bb7', `dim7 gets bb7, not a 6th (got ${gt('dim7')})`);
  check(gt('6') === 'R,3,6' && gt('m6') === 'R,b3,6', '6th chords shell with their 6');
  check(gt('dom7sus4') === 'R,4,b7', `sus dominants shell with the 4 (got ${gt('dom7sus4')})`);
  check(gt('maj') === 'R,3,5', `plain triad falls back to R-3-5 (got ${gt('maj')})`);
  check(gt('dom7alt') === 'R,3,b7', `altered dominants keep 3/b7 (got ${gt('dom7alt')})`);

  // Shells: LH = root in the C2 zone + guide tones an octave up, correct pitch classes
  const pc = (p) => p.midi % 12;
  const shells = T.getChordNotesAtIndex('C', 'min7', 'seventh', 0, 0, { leftHandMode: 'shells' });
  check(shells.leftHandPitches.map(pc).join(',') === '0,3,10',
    'Cm7 shells LH pitch classes = root, b3, b7');
  check(shells.leftHandPitches.every(p => p.midi >= T.SHELL_TONE_BASE) &&
    Math.max(...shells.leftHandPitches.map(p => p.midi)) -
    Math.min(...shells.leftHandPitches.map(p => p.midi)) <= 12,
    'shell sits in ONE zone at/above C3 with a blockable span (<= 12 st)');
  const asc = shells.leftHandPitches.map(p => p.midi);
  check(asc.every((m, i) => i === 0 || m > asc[i - 1]), 'shell LH pitches are ascending');

  // Rootless: LH silent, RH identical to roots mode (optimizer input unchanged)
  const roots = T.getChordNotesAtIndex('C', 'min7', 'seventh', 0, 0);
  const rootless = T.getChordNotesAtIndex('C', 'min7', 'seventh', 0, 0, { leftHandMode: 'rootless' });
  check(rootless.leftHandPitches.length === 0, 'rootless LH is empty');
  check(rootless.rightHandPitches.map(p => p.midi).join(',') === roots.rightHandPitches.map(p => p.midi).join(','),
    'rootless leaves the RH voicing untouched');
  check(shells.rightHandPitches.map(p => p.midi).join(',') === roots.rightHandPitches.map(p => p.midi).join(','),
    'shells leave the RH voicing untouched');

  // Default-mode regression: omitting the argument still realizes the written LH
  const explicit = T.getChordNotesAtIndex('F', 'dom7', 'seventh', 0, 0, { leftHandMode: 'roots' });
  const implicit = T.getChordNotesAtIndex('F', 'dom7', 'seventh', 0, 0);
  check(explicit.leftHandPitches.map(p => p.midi).join(',') === implicit.leftHandPitches.map(p => p.midi).join(','),
    "default leftHandMode is 'roots' (existing calls unchanged)");
  check(implicit.leftHandPitches.length > 0 && implicit.leftHandPitches[0].midi >= T.LH_COMP_BASE &&
    implicit.leftHandPitches[0].midi < T.LH_COMP_BASE + 12,
    'roots mode anchors the written LH in the C3 comping register (LH_COMP_BASE), not the bassist C2');

  // bassonly: the app is your bassist — root only, nothing else
  const bassonly = T.getChordNotesAtIndex('C', 'min7', 'seventh', 0, 0, { leftHandMode: 'bassonly' });
  check(bassonly.rightHandPitches.length === 0 && bassonly.leftHandPitches.length === 1 &&
    bassonly.leftHandPitches[0].midi % 12 === 0 && bassonly.leftHandPitches[0].midi >= T.LH_BASE,
    'bassonly realizes only the root in the bass zone');
}

console.log('\nTest 12: two-hand rootless (evans) LH shapes + DP voice leading');
{
  // Shape sets: jazz-tier rootless forms; triads fall back to guide tones sans root
  check(T.lhRootlessShapesFor('min7').length >= 2, 'min7 has A/B rootless shapes to choose from');
  check(T.lhRootlessShapesFor('maj').length === 1 &&
    T.lhRootlessShapesFor('maj')[0].join(',') === '3,5',
    'triads fall back to guide tones sans root');
  check(T.lhRootlessShapesFor('min7').every(s => s.indexOf('R') === -1),
    'min7 LH shapes carry no bass root');
  // Severed coupling (owner call): jazz-tagged but UNTYPED shapes (quartal,
  // slash, upper structures) are RH colors and must NOT leak into the evans
  // LH pool — only the classic typed A/B rootless forms belong there.
  check(T.lhRootlessShapesFor('min7').length === 2 &&
    !T.lhRootlessShapesFor('min7').some(s => s.join(',') === '11,b7,b3'),
    'evans LH pool excludes the quartal shape (typed A/B forms only)');
  check(T.lhRootlessShapesFor('maj7').every(s => s.join(',') !== '7,3,13') &&
    T.lhRootlessShapesFor('dom7sus4').every(s => s.join(',') !== 'b7,9,11'),
    'evans LH pool excludes the maj7 quartal and dom7sus4 slash shapes');
  // dim7's jazz entries are untyped, so it now falls back to guide tones —
  // pin that so the fallback path is deliberate, not accidental.
  check(T.lhRootlessShapesFor('dim7').length === 1 &&
    T.lhRootlessShapesFor('dim7')[0].join(',') === 'b3,bb7',
    'dim7 evans LH falls back to guide tones (b3, bb7)');

  // Realization: evans LH sits in the tenor range, RH untouched
  const evans = T.getChordNotesAtIndex('D', 'min7', 'seventh', 0, 0, { leftHandMode: 'evans', lhIndex: 0 });
  const roots = T.getChordNotesAtIndex('D', 'min7', 'seventh', 0, 0);
  check(evans.leftHandPitches.length >= 2 &&
    evans.leftHandPitches.every(p => p.midi >= T.LH_SOFT_LOW && p.midi < T.RH_BASE + 12),
    'evans LH lives in the tenor range (A2 up, below the RH ceiling)');
  check(evans.rightHandPitches.map(p => p.midi).join(',') === roots.rightHandPitches.map(p => p.midi).join(','),
    'evans leaves the RH voicing untouched');

  // DP pass: a ii-V-I's LH voice-leads — consecutive chords share common tones
  const iiVI = [
    { root: 'D', quality: 'min7' },
    { root: 'G', quality: 'dom7' },
    { root: 'C', quality: 'maj7' }
  ];
  const { indices } = T.computeLeftHandVoicings(iiVI);
  check(indices.length === 3 && indices.every(i => Number.isInteger(i) && i >= 0),
    'computeLeftHandVoicings picks a shape per chord');
  const lhMidis = iiVI.map((c, i) =>
    T.getChordNotesAtIndex(c.root, c.quality, 'seventh', 0, 0, { leftHandMode: 'evans', lhIndex: indices[i] })
      .leftHandPitches.map(p => p.midi));
  for (let i = 1; i < lhMidis.length; i++) {
    const common = lhMidis[i].filter(m => lhMidis[i - 1].indexOf(m) !== -1).length;
    check(common >= 1,
      `LH voice-leads chord ${i} -> ${i + 1} (${common} common tone(s))`);
  }
  check(T.voiceMovementCost(lhMidis[0], lhMidis[1]) <= 8,
    'ii->V LH movement stays small (A/B alternation)');

  // Empty progression: no crash, empty result
  check(T.computeLeftHandVoicings([]).indices.length === 0, 'empty progression yields no LH indices');
}

console.log('\nTest 13: 3-octave mode (reface window C2-C5)');
{
  const reface = T.RANGE_WINDOWS.reface;
  check(reface && reface.low === 36 && reface.high === 72, 'reface window is C2-C5');

  // Sweep: every quality family x all 12 roots x all four LH modes must
  // realize entirely inside the window when the DP runs window-aware.
  const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const QUALITIES = ['maj7', 'min7', 'dom7', 'm7b5', 'dim7', 'maj9', 'min11', 'dom13',
    'dom7alt', 'dom13s11', '6', 'm6', '69', 'sus4', 'maj', 'min', 'aug', 'dom7sus4'];
  const MODES = ['roots', 'shells', 'evans', 'rootless'];
  let outOfWindow = 0;
  let checkedNotes = 0;
  for (const root of ROOTS) {
    // Chain the qualities into one progression so the DP has to voice-lead
    // through all of them under the window constraint.
    const chords = QUALITIES.map(quality => ({ root, quality }));
    for (const complexity of ['seventh', 'extended']) {
      const { indices, shifts } = T.computeProgressionVoicings(chords, complexity, reface);
      chords.forEach((c, i) => {
        for (const mode of MODES) {
          const d = T.getChordNotesAtIndex(c.root, c.quality, complexity, indices[i], shifts[i],
            { leftHandMode: mode, range: reface });
          for (const p of d.leftHandPitches.concat(d.rightHandPitches)) {
            checkedNotes++;
            if (p.midi < reface.low || p.midi > reface.high) {
              outOfWindow++;
              check(false, `${root}${c.quality} [${complexity}/${mode}]: ${p.name}${p.octave} (midi ${p.midi}) escapes C2-C5`);
            }
          }
        }
      });
    }
  }
  if (!outOfWindow) console.log(`  all ${checkedNotes} realized notes across ${ROOTS.length} roots x ${QUALITIES.length} qualities x 4 LH modes fit C2-C5`);

  // Full-mode regression: range omitted and range null are byte-identical
  const prog = [
    { root: 'D', quality: 'min7' },
    { root: 'G', quality: 'dom7' },
    { root: 'C', quality: 'maj7' }
  ];
  const noArg = T.computeProgressionVoicings(prog, 'seventh');
  const nullArg = T.computeProgressionVoicings(prog, 'seventh', null);
  check(JSON.stringify(noArg) === JSON.stringify(nullArg),
    'full mode (no range) is unchanged by the range plumbing');

  // Windowed ii-V-I still voice-leads: worst single-voice move stays small
  const w = T.computeProgressionVoicings(prog, 'seventh', reface);
  const rhs = prog.map((c, i) =>
    T.getChordNotesAtIndex(c.root, c.quality, 'seventh', w.indices[i], w.shifts[i], { range: reface })
      .rightHandPitches.map(p => p.midi));
  check(maxVoiceMove(rhs[0], rhs[1]) <= 2 && maxVoiceMove(rhs[1], rhs[2]) <= 2,
    'windowed ii-V-I keeps worst voice move <= 2 semitones');

  // bestShiftForVoicing respects the window (manual cycling path)
  for (const root of ROOTS) {
    const voicings = T.voicingsFor('maj7', 'seventh');
    for (const v of voicings) {
      const shift = T.bestShiftForVoicing(root, v, null, reface);
      const midis = T.realizeHand(root, v.right, T.RH_BASE + shift).map(n => n.midi);
      if (T.windowOverflow(midis, reface) > 0) check(false, `${root}maj7 manual shift escapes the window`);
    }
  }
  console.log('  manual voicing cycling stays inside the window for all roots');

  // Fallback: an impossible window still yields a non-empty, least-violating layer
  const impossible = { low: 60, high: 63 };
  const cands = T.buildVoicingCandidates({ root: 'C', quality: 'maj7' }, 'seventh', impossible);
  check(cands.length > 0, 'impossible window falls back to least-violating candidates (DP layer never empties)');
}

console.log('\nTest 14: flavor pass (borrowed vocabulary) + flavor subs + borrowed detection');
{
  // Identity: off level and minor mode change nothing
  const plain = ['I', 'IV', 'V', 'I'];
  check(JSON.stringify(T.flavorizeNumerals(plain, 'major', 'off')) === JSON.stringify(plain),
    "flavor 'off' is an identity pass");
  check(JSON.stringify(T.flavorizeNumerals(plain, 'minor', 'bold')) === JSON.stringify(plain),
    'minor mode is a deliberate no-op');

  // Every vocabulary numeral parses PINNED in C major (roots and qualities)
  const pinned = [
    ['iv7', 'F', 'min7'], ['v7', 'G', 'min7'], ['bVII7', 'Bb', 'dom7'],
    ['bIIImaj7', 'Eb', 'maj7'], ['bVImaj7', 'Ab', 'maj7'], ['#i°7', 'C#', 'dim7']
  ];
  for (const [num, root, quality] of pinned) {
    const c = T.parseRomanNumeral(num, 'C', 'major', 'seventh');
    check(c.root === root && c.quality === quality,
      `${num} parses pinned to ${root} ${quality} (got ${c.root} ${c.quality})`);
  }

  // Statistical sweep: 500 8-bar generations per level
  const RUNS = 500;
  const isBorrowedList = nums => nums.map(s => T.isBorrowedNumeral(s, 'major'));
  const stats = (level) => {
    let withFlavor = 0;
    for (let r = 0; r < RUNS; r++) {
      const nums = T.buildRandomNumerals('major', 8, 1.0, level);
      const b = isBorrowedList(nums);
      const n = nums.length;
      if (b.some(x => x)) withFlavor++;
      // Constraint audit on every run:
      for (let i = 0; i < n; i++) {
        if (nums[i] === 'bVII7' && !(/^I(?![IViv])/.test(String(nums[i + 1] || ''))))
          check(false, `${level}: bVII7 not followed by tonic in ${nums.join(' ')}`);
        if (b[i] && b[i + 1] && !(nums[i] === 'iv7' && nums[i + 1] === 'bVII7'))
          check(false, `${level}: adjacent flavor conversions in ${nums.join(' ')}`);
        if (i === n - 1 && b[i] && nums[i] !== 'bVImaj7')
          check(false, `${level}: final slot flavored as ${nums[i]}`);
        if (level === 'subtle' && ['bIIImaj7', 'bVImaj7', '#i°7'].includes(nums[i]) && i < n - 1)
          check(false, `${level}: bold-only vocabulary (${nums[i]}) at subtle`);
      }
      // Chromatic budget: flavor events (backdoor pair = 1) + secondaries
      const backdoors = nums.filter((s, i) => s === 'iv7' && nums[i + 1] === 'bVII7').length;
      const events = b.filter(x => x).length - backdoors;
      const secondaries = nums.filter(s => String(s).includes('/')).length;
      const cap = (level === 'bold' ? 2 : 1) * 2; // 8 bars = two 4-bar spans
      if (events + secondaries > cap)
        check(false, `${level}: chromatic budget blown (${events}+${secondaries} > ${cap}) in ${nums.join(' ')}`);
    }
    return withFlavor / RUNS;
  };
  const offRate = stats('off');
  const subtleRate = stats('subtle');
  const boldRate = stats('bold');
  check(offRate === 0, `off generates no borrowed chords (${offRate})`);
  check(subtleRate > 0.05 && subtleRate < 0.95,
    `subtle presence in loose bounds (${(subtleRate * 100).toFixed(0)}% of 8-bar runs)`);
  check(boldRate > 0.2 && boldRate > subtleRate,
    `bold is bolder than subtle (${(boldRate * 100).toFixed(0)}% vs ${(subtleRate * 100).toFixed(0)}%)`);

  // Flavor subs offered with correctly spelled roots
  const g7 = T.getChordSubstitutions('G', 'dom7');
  const minorV = g7.find(s => s.type === 'flavor_minor_v');
  const backdoor = g7.find(s => s.type === 'flavor_backdoor');
  check(!!minorV && minorV.root === 'G' && minorV.quality === 'min7' && minorV.flavor === true,
    'G7 offers the borrowed minor v (Gm7)');
  check(!!backdoor && backdoor.root === 'Bb' && backdoor.quality === 'dom7',
    'G7 offers the backdoor Bb7');
  const cmaj7 = T.getChordSubstitutions('C', 'maj7');
  const bvi = cmaj7.find(s => s.type === 'flavor_mediant_bvi');
  const biii = cmaj7.find(s => s.type === 'flavor_mediant_biii');
  check(!!bvi && bvi.root === 'Ab', `Cmaj7 bVI mediant spelled Ab, not G# (got ${bvi && bvi.root})`);
  check(!!biii && biii.root === 'Eb', `Cmaj7 bIII mediant spelled Eb (got ${biii && biii.root})`);
  check(g7.some(s => !s.flavor) && cmaj7.some(s => !s.flavor),
    'functional subs still offered alongside flavor');

  // isBorrowedNumeral truth table
  const bt = [
    ['iv7', 'major', true], ['iv7', 'minor', false],
    ['v7', 'major', true], ['v7', 'minor', false],
    ['vi', 'major', false], ['vii°', 'major', false],
    ['bVII7', 'major', true], ['bVII7', 'minor', false],
    ['bVImaj7', 'major', true], ['#i°7', 'major', true], ['#i°7', 'minor', true],
    ['I', 'major', false], ['ii7', 'major', false], ['V7/ii', 'major', false]
  ];
  for (const [num, mode, want] of bt) {
    check(T.isBorrowedNumeral(num, mode) === want,
      `isBorrowedNumeral(${num}, ${mode}) === ${want}`);
  }
}

console.log('\nTest 15: voicing characterization snapshot (regression guard for the voicing engine)');
{
  // A frozen record of every shipped voicing's REALIZED notes, at two roots
  // (C = clean, F# = spelling stress: double-sharps, E#/B#, bb7). Adding a NEW
  // voicing to a quality changes only that quality's line -> update it here and
  // eyeball the diff. An UNEXPECTED change to any other line means the voicing
  // engine (realizeHand / realizeVoicing / spelling / register defaults) moved
  // under an existing voicing -- exactly the accidental regression this test
  // exists to catch before the LH-shell voicing work (invariant 18).
  const GOLDEN = {
      '6': 'C3 | E4 G4 A4 || C3 | A4 D5 E5 G5 || C2 G2 | A4 E5 || F#3 | A#4 C#5 D#5 || F#3 | D#4 G#4 A#4 C#5 || F#2 C#3 | D#4 A#4',
      '69': 'C3 | E4 A4 D5 || C3 | A4 D5 E5 G5 || C2 G2 | A4 D5 E5 || F#3 | A#4 D#5 G#5 || F#3 | D#4 G#4 A#4 C#5 || F#2 C#3 | D#4 G#4 A#4',
      'maj': 'C3 | E4 G4 C5 || C2 G2 | C4 E4 G4 || C3 | G4 C5 E5 || F#3 | A#4 C#5 F#5 || F#2 C#3 | F#4 A#4 C#5 || F#3 | C#4 F#4 A#4',
      'min': 'C3 | Eb4 G4 C5 || C2 G2 | C4 Eb4 G4 || C3 | G4 C5 Eb5 || F#3 | A4 C#5 F#5 || F#2 C#3 | F#4 A4 C#5 || F#3 | C#4 F#4 A4',
      'dim': 'C3 | Eb4 Gb4 C5 || C2 Gb2 | C4 Eb4 || F#3 | A4 C5 F#5 || F#2 C3 | F#4 A4',
      'aug': 'C3 | E4 G#4 C5 || C2 G#2 | C4 E4 || F#3 | A#4 C##5 F#5 || F#2 C##3 | F#4 A#4',
      'sus4': 'C3 | F4 G4 C5 || C2 G2 | C4 F4 || F#3 | B4 C#5 F#5 || F#2 C#3 | F#4 B4',
      'sus2': 'C3 | D4 G4 C5 || C2 G2 | C4 D4 || F#3 | G#4 C#5 F#5 || F#2 C#3 | F#4 G#4',
      'maj7': 'C3 | E4 G4 B4 || C2 G2 | B4 E5 || C3 | E4 B4 || C3 | E4 B4 D5 || C3 | E4 A4 B4 || C3 | E4 B4 F#5 || C3 | E4 G4 B4 D5 || C3 | B4 D5 E5 G5 || C3 | E4 G4 A4 D5 || C3 | B4 E5 A5 || C3 E3 B3 | D4 A4 || C3 E3 B3 | D4 F#4 A4 || F#3 | A#4 C#5 E#5 || F#2 C#3 | E#4 A#4 || F#3 | A#4 E#5 || F#3 | A#4 E#5 G#5 || F#3 | A#4 D#5 E#5 || F#3 | A#4 E#5 B#5 || F#3 | A#4 C#5 E#5 G#5 || F#3 | E#4 G#4 A#4 C#5 || F#3 | A#4 C#5 D#5 G#5 || F#3 | E#4 A#4 D#5 || F#3 A#3 E#4 | G#4 D#5 || F#3 A#3 E#4 | G#4 B#4 D#5',
      'min7': 'C3 | Eb4 G4 Bb4 || C2 G2 | Bb4 Eb5 || C3 | Eb4 Bb4 || C3 | Eb4 Bb4 D5 || C3 | Eb4 Bb4 F5 || C3 | Eb4 G4 Bb4 D5 || C3 | Bb4 D5 Eb5 G5 || C3 | F4 Bb4 Eb5 || D3 G3 C4 | F4 A4 || C3 Eb3 Bb3 | D4 G4 || F#3 | A4 C#5 E5 || F#2 C#3 | E4 A4 || F#3 | A4 E5 || F#3 | A4 E5 G#5 || F#3 | A4 E5 B5 || F#3 | A4 C#5 E5 G#5 || F#3 | E4 G#4 A4 C#5 || F#3 | B4 E5 A5 || G#3 C#4 F#4 | B4 D#5 || F#3 A3 E4 | G#4 C#5',
      'dom7': 'C3 | E4 G4 Bb4 || C2 G2 | Bb4 E5 || C3 | E4 Bb4 || C3 | E4 A4 Bb4 || C3 | E4 Bb4 D5 || C3 | E4 A4 Bb4 D5 || C3 | Bb4 D5 E5 A5 || C3 E3 Bb3 | D4 A4 || F#3 | A#4 C#5 E5 || F#2 C#3 | E4 A#4 || F#3 | A#4 E5 || F#3 | A#4 D#5 E5 || F#3 | A#4 E5 G#5 || F#3 | A#4 D#5 E5 G#5 || F#3 | E4 G#4 A#4 D#5 || F#3 A#3 E4 | G#4 D#5',
      'dim7': 'C3 | Eb4 Gb4 Bbb4 || C2 Gb2 | Bbb4 Eb5 || F#3 | A4 C5 Eb5 || F#2 C3 | Eb4 A4',
      'm7b5': 'C3 | Eb4 Gb4 Bb4 || C2 Gb2 | Bb4 Eb5 || C3 | Eb4 Bb4 || C3 | Eb4 Bb4 F5 || C3 | Eb4 Ab4 Bb4 || C3 | Eb4 Gb4 Bb4 C5 || C3 | Bb4 C5 Eb5 Gb5 || C3 | Eb4 Gb4 Bb4 D5 || F#3 | A4 C5 E5 || F#2 C3 | E4 A4 || F#3 | A4 E5 || F#3 | A4 E5 B5 || F#3 | A4 D5 E5 || F#3 | A4 C5 E5 F#5 || F#3 | E4 F#4 A4 C5 || F#3 | A4 C5 E5 G#5',
      'minMaj7': 'C3 | Eb4 G4 B4 || C2 G2 | B4 Eb5 || C3 | Eb4 B4 || C3 | Eb4 B4 D5 || C3 | Eb4 G4 B4 D5 || C3 | B4 D5 Eb5 G5 || F#3 | A4 C#5 E#5 || F#2 C#3 | E#4 A4 || F#3 | A4 E#5 || F#3 | A4 E#5 G#5 || F#3 | A4 C#5 E#5 G#5 || F#3 | E#4 G#4 A4 C#5',
      'dom7sus4': 'C3 | F4 G4 Bb4 || C2 G2 | Bb4 F5 || C3 | F4 Bb4 || C3 | F4 Bb4 D5 || C3 | F4 G4 Bb4 D5 || C3 | Bb4 D5 F5 G5 || C3 | Bb4 D5 F5 || D3 G3 C4 | F4 Bb4 || F#3 | B4 C#5 E5 || F#2 C#3 | E4 B4 || F#3 | B4 E5 || F#3 | B4 E5 G#5 || F#3 | B4 C#5 E5 G#5 || F#3 | E4 G#4 B4 C#5 || F#3 | E4 G#4 B4 || G#3 C#4 F#4 | B4 E5',
      'maj9': 'C3 | E4 G4 B4 D5 || C3 | B4 D5 E5 G5 || C2 G2 | B4 D5 E5 || F#3 | A#4 C#5 E#5 G#5 || F#3 | E#4 G#4 A#4 C#5 || F#2 C#3 | E#4 G#4 A#4',
      'min9': 'C3 | Eb4 G4 Bb4 D5 || C3 | Bb4 D5 Eb5 G5 || C2 G2 | Bb4 D5 Eb5 || F#3 | A4 C#5 E5 G#5 || F#3 | E4 G#4 A4 C#5 || F#2 C#3 | E4 G#4 A4',
      'dom9': 'C3 | E4 A4 Bb4 D5 || C3 | Bb4 D5 E5 A5 || C3 | E4 Bb4 D5 || C2 G2 | Bb4 D5 E5 || F#3 | A#4 D#5 E5 G#5 || F#3 | E4 G#4 A#4 D#5 || F#3 | A#4 E5 G#5 || F#2 C#3 | E4 G#4 A#4',
      'dom11': 'C3 | Bb4 D5 F5 || C3 | F4 Bb4 D5 || C2 G2 | Bb4 D5 F5 || F#3 | E4 G#4 B4 || F#3 | B4 E5 G#5 || F#2 C#3 | E4 G#4 B4',
      'min11': 'C3 | Eb4 G4 Bb4 F5 || C3 | Bb4 D5 Eb5 F5 || C2 G2 | Bb4 Eb5 F5 || C3 | F4 Bb4 Eb5 || C3 Eb3 Bb3 | D4 F4 || F#3 | A4 C#5 E5 B5 || F#3 | E4 G#4 A4 B4 || F#2 C#3 | E4 A4 B4 || F#3 | B4 E5 A5 || F#3 A3 E4 | G#4 B4',
      'maj13': 'C3 | E4 A4 B4 D5 || C3 | B4 D5 E5 A5 || C3 | B4 D5 A5 || C3 E3 B3 | D4 A4 || F#3 | A#4 D#5 E#5 G#5 || F#3 | E#4 G#4 A#4 D#5 || F#3 | E#4 G#4 D#5 || F#3 A#3 E#4 | G#4 D#5',
      'dom13': 'C3 | E4 A4 Bb4 D5 || C3 | Bb4 D5 E5 A5 || C3 | Bb4 D5 A5 || C2 Bb2 | E4 A4 D5 || C2 Bb2 | D4 F#4 A4 || F#3 | A#4 D#5 E5 G#5 || F#3 | E4 G#4 A#4 D#5 || F#3 | E4 G#4 D#5 || F#2 E3 | A#4 D#5 G#5 || F#2 E3 | G#4 B#4 D#5',
      'min13': 'C3 | Eb4 A4 Bb4 D5 || C3 | Bb4 D5 Eb5 A5 || C3 | Bb4 D5 A5 || F#3 | A4 D#5 E5 G#5 || F#3 | E4 G#4 A4 D#5 || F#3 | E4 G#4 D#5',
      'add9': 'C3 | E4 G4 D5 || C2 G2 | D4 E4 || F#3 | A#4 C#5 G#5 || F#2 C#3 | G#4 A#4',
      'madd9': 'C3 | Eb4 G4 D5 || C2 G2 | D4 Eb4 || F#3 | A4 C#5 G#5 || F#2 C#3 | G#4 A4',
      'm6': 'C3 | Eb4 G4 A4 || C3 | A4 D5 Eb5 G5 || C2 G2 | A4 Eb5 || F#3 | A4 C#5 D#5 || F#3 | D#4 G#4 A4 C#5 || F#2 C#3 | D#4 A4',
      'dom7b9': 'C3 | E4 A4 Bb4 Db5 || C3 | Bb4 Db5 E5 || C2 Bb2 | Db4 E4 G4 || F#3 | A#4 D#5 E5 G5 || F#3 | E4 G4 A#4 || F#2 E3 | G4 A#4 C#5',
      'dom7s9': 'C3 | E4 Bb4 D#5 || C3 | Bb4 D#5 E5 || C2 Bb2 | D#4 E4 || F#3 | A#4 E5 G##5 || F#3 | E4 G##4 A#4 || F#2 E3 | G##4 A#4',
      'dom7b5': 'C3 | E4 Gb4 Bb4 || C3 | Bb4 E5 Gb5 || F#3 | A#4 C5 E5 || F#3 | E4 A#4 C5',
      'dom7s5': 'C3 | E4 G#4 Bb4 || C3 | Bb4 E5 G#5 || F#3 | A#4 C##5 E5 || F#3 | E4 A#4 C##5',
      'dom7s11': 'C3 | E4 Bb4 D5 F#5 || C3 | Bb4 D5 E5 F#5 || C2 Bb2 | D4 F#4 A4 || F#3 | A#4 E5 G#5 B#5 || F#3 | E4 G#4 A#4 B#4 || F#2 E3 | G#4 B#4 D#5',
      'dom7b13': 'C3 | E4 Ab4 Bb4 || C3 | Bb4 E5 Ab5 || F#3 | A#4 D5 E5 || F#3 | E4 A#4 D5',
      'dom7alt': 'C3 | E4 Ab4 Bb4 D#5 || C3 | Bb4 Db5 E5 Ab5 || C3 | Bb4 D#5 E5 Ab5 || C2 Bb2 | E4 Ab4 C5 D#5 || C2 Bb2 | E4 F#4 Bb4 Db5 || F#3 | A#4 D5 E5 G##5 || F#3 | E4 G4 A#4 D5 || F#3 | E4 G##4 A#4 D5 || F#2 E3 | A#4 D5 F#5 G##5 || F#2 E3 | A#4 B#4 E5 G5',
      'dom9b5': 'C3 | E4 Gb4 Bb4 D5 || C3 | Bb4 D5 E5 Gb5 || F#3 | A#4 C5 E5 G#5 || F#3 | E4 G#4 A#4 C5',
      'dom9s5': 'C3 | E4 G#4 Bb4 D5 || C3 | Bb4 D5 E5 G#5 || F#3 | A#4 C##5 E5 G#5 || F#3 | E4 G#4 A#4 C##5',
      'dom13b9': 'C3 | E4 A4 Bb4 Db5 || C3 | Bb4 Db5 E5 A5 || C2 Bb2 | A4 Db5 E5 || F#3 | A#4 D#5 E5 G5 || F#3 | E4 G4 A#4 D#5 || F#2 E3 | D#4 G4 A#4',
      'dom13s11': 'C3 | E4 A4 Bb4 F#5 || C3 | Bb4 E5 F#5 A5 || F#3 | A#4 D#5 E5 B#5 || F#3 | E4 A#4 B#4 D#5',
  };
  const ROOTS = ['C', 'F#'];
  const sig = (root, quality, i) => {
    const d = T.getChordNotesAtIndex(root, quality, 'seventh', i, 0);
    const lh = d.leftHandPitches.map(p => p.name + p.octave).join(' ');
    const rh = d.rightHandPitches.map(p => p.name + p.octave).join(' ');
    return `${lh} | ${rh}`;
  };
  let drift = 0;
  const qualities = Object.keys(T.KEYBOARD_VOICINGS);
  for (const q of qualities) {
    // Index space MUST match what getChordNotesAtIndex resolves against:
    // voicingsFor(q,'seventh'), not the raw array — they only coincide while
    // every tier tag is allowed under 'seventh' (review finding).
    const n = T.voicingsFor(q, 'seventh').length;
    const lines = [];
    for (const root of ROOTS) for (let i = 0; i < n; i++) lines.push(sig(root, q, i));
    const got = lines.join(' || ');
    if (!Object.hasOwn(GOLDEN, q)) { drift++; check(false, `snapshot: new quality '${q}' has no golden -> add it: '${got}'`); continue; }
    if (got !== GOLDEN[q]) {
      drift++;
      check(false, `snapshot drift on '${q}':\n      golden: ${GOLDEN[q]}\n      got:    ${got}`);
    }
  }
  // Every golden quality must still exist (a removed/renamed quality is drift too)
  for (const q of Object.keys(GOLDEN)) {
    if (qualities.indexOf(q) === -1) { drift++; check(false, `snapshot: golden quality '${q}' no longer in KEYBOARD_VOICINGS`); }
  }
  if (!drift) console.log(`  all ${qualities.length} qualities match the frozen voicing snapshot`);
}

console.log('\nTest 16: LH-shell upper-structure + quartal voicings (new vocabulary)');
{
  // Find a voicing by its name within a quality, realize it at C, return the
  // pitch-class SETS for LH and RH (order-independent — we assert content).
  const pcs = (arr) => arr.map(p => p.midi % 12).sort((a, b) => a - b);
  const find = (quality, nameFrag) => {
    const vs = T.KEYBOARD_VOICINGS[quality].voicings;
    const i = vs.findIndex(v => v.name.indexOf(nameFrag) !== -1);
    check(i !== -1, `${quality}: voicing '${nameFrag}' exists`);
    if (i === -1) return null;
    const d = T.getChordNotesAtIndex('C', quality, 'seventh', i, 0);
    return { lh: pcs(d.leftHandPitches), rh: pcs(d.rightHandPitches), d };
  };
  const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  // --- Dominant upper structures (LH shell + RH triad), C-rooted ---
  // C7#11 US II: LH C-Bb (R,b7) | RH D-F#-A (9,#11,13)
  let v = find('dom7s11', 'US II');
  if (v) check(eq(v.lh, [0, 10]) && eq(v.rh, [2, 6, 9]), 'C7#11 US II = LH {C,Bb} RH {D,F#,A}');
  // C13 shell 3-13-9: LH C-Bb | RH E-A-D (3,13,9)
  v = find('dom13', 'Shell: R-7');
  if (v) check(eq(v.lh, [0, 10]) && eq(v.rh, [2, 4, 9]), 'C13 shell = LH {C,Bb} RH {E,A,D}');
  // C13 US II (13#11): LH C-Bb | RH D-F#-A
  v = find('dom13', 'US II');
  if (v) check(eq(v.lh, [0, 10]) && eq(v.rh, [2, 6, 9]), 'C13#11 US II = LH {C,Bb} RH {D,F#,A}');
  // C13b9 US VI: LH C-Bb | RH A-Db-E (13,b9,3)
  v = find('dom13b9', 'US VI');
  if (v) check(eq(v.lh, [0, 10]) && eq(v.rh, [1, 4, 9]), 'C13b9 US VI = LH {C,Bb} RH {A,Db,E}');
  // C9sus slash bVII: LH C | RH Bb-D-F (b7,9,11)
  v = find('dom7sus4', 'Slash');
  if (v) check(eq(v.lh, [0]) && eq(v.rh, [2, 5, 10]), 'C13sus slash = LH {C} RH {Bb,D,F}');

  // --- Quartal (RH stacked in 4ths) ---
  // Cm7 quartal: LH C | RH F-Bb-Eb (11,b7,b3)
  v = find('min7', 'Quartal');
  if (v) check(eq(v.lh, [0]) && eq(v.rh, [3, 5, 10]), 'Cm7 quartal = LH {C} RH {F,Bb,Eb}');
  v = find('min11', 'Quartal');
  if (v) check(eq(v.rh, [3, 5, 10]), 'Cm11 quartal RH = {F,Bb,Eb}');
  // Cmaj7 Lydian quartal: LH C | RH B-E-A (7,3,13)
  v = find('maj7', 'Quartal');
  if (v) check(eq(v.lh, [0]) && eq(v.rh, [4, 9, 11]), 'Cmaj7 quartal = LH {C} RH {E,A,B}');

  // --- dom7alt upper structures: LH two-note shell R-b7, RH = 3 + altered triad ---
  // US bVI: LH C-Bb (R,b7) | RH E-Ab-C-Eb (3,b13,1,#9) — 3rd floats to RH bottom
  v = find('dom7alt', 'US bVI');
  if (v) check(eq(v.lh, [0, 10]) && eq(v.rh, [0, 3, 4, 8]), 'C7alt US bVI = LH {C,Bb} RH {E,Ab,C,Eb}');
  // US bV: LH C-Bb | RH E-Gb-Bb-Db (3,#11,b7,b9)
  v = find('dom7alt', 'US bV:');
  if (v) check(eq(v.lh, [0, 10]) && eq(v.rh, [1, 4, 6, 10]), 'C7alt US bV = LH {C,Bb} RH {E,Gb,Bb,Db}');
  // Playability (spec v4 Phase 1): the LH is now the two-note shell R-b7 (10 st,
  // blockable), and the 3rd is the BOTTOM of the RH — floated out of the LH so
  // there is neither a muddy low third nor the old 16-st major-10th LH stretch.
  v = find('dom7alt', 'US bVI');
  if (v) {
    const lm = v.d.leftHandPitches.map(p => p.midi);
    const rm = v.d.rightHandPitches.map(p => p.midi);
    check(lm.length === 2 && lm[1] - lm[0] === 10, 'C7alt US shell LH is R-b7 (10 st, no low-third mud)');
    check(rm[0] % 12 === 4, 'C7alt US 3rd is the RH bottom note (floated out of the LH)');
  }

  // The two quartal min voicings realize as genuine stacked 4ths (5 semitones)
  const q = find('min7', 'Quartal');
  if (q) {
    const m = q.d.rightHandPitches.map(p => p.midi);
    check(m[1] - m[0] === 5 && m[2] - m[1] === 5, 'min7 quartal RH is two stacked perfect 4ths');
  }
  // Powell-hand shells (v6 Stage 3): LH guide-tone shell, RH color/upper triad
  // — the inverse distribution of the rootless vocabulary. Anchored (compact
  // C3), guide-tone-COMPLETE (so mixed comping may deal them).
  v = find('maj7', 'Powell 13');
  if (v) check(eq(v.lh, [0, 4, 11]) && eq(v.rh, [2, 9]), 'maj7 Powell 13 = LH {C,E,B} RH {D,A}');
  v = find('maj7', 'Powell Lydian');
  if (v) check(eq(v.lh, [0, 4, 11]) && eq(v.rh, [2, 6, 9]), 'maj7 Powell Lydian = LH {C,E,B} RH {D,F#,A}');
  v = find('dom7', 'Powell 13');
  if (v) check(eq(v.lh, [0, 4, 10]) && eq(v.rh, [2, 9]), 'dom7 Powell 13 = LH {C,E,Bb} RH {D,A}');
  v = find('min7', 'Powell 9');
  if (v) check(eq(v.lh, [0, 3, 10]) && eq(v.rh, [2, 7]), 'min7 Powell 9 = LH {C,Eb,Bb} RH {D,G}');
  // Extended-quality Powell shells (v6 Stage 3 completion): same anchored
  // guide-tone shell + RH color, on the 11th/13th qualities.
  v = find('maj13', 'Powell 13');
  if (v) check(eq(v.lh, [0, 4, 11]) && eq(v.rh, [2, 9]), 'maj13 Powell 13 = LH {C,E,B} RH {D,A}');
  v = find('min11', 'Powell 11');
  if (v) check(eq(v.lh, [0, 3, 10]) && eq(v.rh, [2, 5]), 'min11 Powell 11 = LH {C,Eb,Bb} RH {D,F}');
  // dom7sus4 quartal (McCoy): the whole voicing is stacked 4ths, 9-5-R-4-7,
  // anchored mid-register like So What but guide-tone-COMPLETE for a sus (4 & 7).
  v = find('dom7sus4', 'Quartal sus');
  if (v) check(eq(v.lh, [0, 2, 7]) && eq(v.rh, [5, 10]), 'C sus quartal = LH {C,D,G} RH {F,Bb}');
  // They carry BOTH guide tones (3 & 7) across the two hands — the property
  // that makes them mixed-eligible (unlike the guide-tone-free So What).
  for (const [quality, frag, third, sev] of [['maj7','Powell 13',4,11],['dom7','Powell 13',4,10],['min7','Powell 9',3,10],
      ['maj13','Powell 13',4,11],['min11','Powell 11',3,10]]) {
    const w = find(quality, frag);
    if (w) check(w.lh.concat(w.rh).includes(third) && w.lh.concat(w.rh).includes(sev),
      `${quality} ${frag} carries both guide tones across the hands`);
  }

  // Every new voicing spells cleanly across a spread of roots (no undefined/NaN)
  let bad = 0;
  for (const [quality, frag] of [['dom7s11','US II'],['dom13','US II'],['dom13b9','US VI'],
      ['dom7sus4','Slash'],['min7','Quartal'],['maj7','Quartal'],
      ['dom7alt','US bVI'],['dom7alt','US bV:'],
      ['maj7','Powell 13'],['maj7','Powell Lydian'],['dom7','Powell 13'],['min7','Powell 9'],
      ['maj13','Powell 13'],['min11','Powell 11'],['dom7sus4','Quartal sus']]) {
    // Same filtered index space getChordNotesAtIndex resolves against, and a
    // hard -1 guard: an unmatched fragment must FAIL, not wrap (safeIndex
    // modulo turns -1 into the last voicing) and silently test the wrong one.
    const vs = T.voicingsFor(quality, 'seventh');
    const i = vs.findIndex(x => x.name.indexOf(frag) !== -1);
    if (i === -1) { bad++; check(false, `spell-check: no voicing matching '${frag}' in ${quality}`); continue; }
    for (const root of ['C', 'F', 'Bb', 'Ab', 'E', 'B', 'Gb']) {
      const d = T.getChordNotesAtIndex(root, quality, 'seventh', i, 0);
      for (const p of d.leftHandPitches.concat(d.rightHandPitches))
        if (!p.name || p.name.includes('undefined') || !Number.isFinite(p.midi)) { bad++; }
    }
  }
  check(bad === 0, 'new voicings spell cleanly across all tested roots');
}

console.log('\nTest 17: single-hand span guard (playability tripwire)');
{
  // No voicing the app deals may require an unblockable hand. Cap: 14 st
  // (a 9th). SPAN_DEBT listed the eleven pre-existing offenders measured
  // 2026-07-17; spec v4 Phase 1 re-stacked each into its traditional compact
  // form and drove this list to EMPTY (the exit criterion). It is intentionally
  // left here (empty) as the burn-down ledger: every voicing now clears the
  // 14-st CAP outright. Re-populating it requires owner approval (a new debt
  // means a knowingly-unplayable shape shipped). The single 9th (dom13#11 at
  // exactly 14 st) is owner-approved and clears CAP without an entry.
  const SPAN_DEBT = {};
  const CAP = 14;
  const span = ns => ns.length > 1
    ? Math.max(...ns.map(p => p.midi)) - Math.min(...ns.map(p => p.midi)) : 0;
  const seen = new Set();
  for (const q of Object.keys(T.KEYBOARD_VOICINGS)) {
    const vs = T.voicingsFor(q, 'seventh');
    vs.forEach((v, i) => {
      const key = q + '|' + v.name;
      const debt = SPAN_DEBT[key];
      if (debt !== undefined) seen.add(key);
      // Span from a fixed interval sequence is root-independent (stacking
      // gaps are pc differences), but realize at two roots as a belt.
      for (const root of ['C', 'F#']) {
        const d = T.getChordNotesAtIndex(root, q, 'seventh', i, 0);
        const ls = span(d.leftHandPitches), rs = span(d.rightHandPitches);
        const worst = Math.max(ls, rs);
        const cap = debt !== undefined ? debt : CAP;
        if (worst > cap) {
          check(false, `span guard: ${key} at ${root} spans ${worst} st ` +
            (debt !== undefined ? `(worse than its recorded debt of ${debt})`
              : `(> ${CAP} st cap; add to SPAN_DEBT only with owner approval)`));
        }
      }
    });
  }
  for (const key of Object.keys(SPAN_DEBT)) {
    check(seen.has(key), `span guard: stale SPAN_DEBT entry '${key}' — voicing renamed or fixed; remove it`);
  }
  // Bassist-mode shells: one-zone fix landed — hard playability ceiling.
  for (const q of ['maj7', 'min7', 'dom7', 'm7b5', 'min']) {
    const s = span(T.realizeShellHand('C', q));
    check(s <= 12, `shells LH (${q}) blockable (got ${s} st, cap 12)`);
  }
  console.log('  span guard active: cap 14 st, ' + Object.keys(SPAN_DEBT).length + ' debt entries (Phase 1 emptied the ledger)');
}

console.log('\nTest 18: mixed left hand (joint voice-led comping — the app default)');
{
  const span = ns => ns.length > 1 ? Math.max(...ns.map(p => p.midi)) - Math.min(...ns.map(p => p.midi)) : 0;
  // A varied, DETERMINISTIC stress progression: 13th chords at high roots
  // (collision bait), seventh chords, a triad (completeness edge), altered.
  const prog = [
    { root: 'C', quality: 'maj7' }, { root: 'A', quality: 'dom13b9' }, { root: 'D', quality: 'min7' },
    { root: 'G', quality: 'dom13' }, { root: 'B', quality: 'dom13s11' }, { root: 'E', quality: 'maj' },
    { root: 'Ab', quality: 'min11' }, { root: 'Db', quality: 'dom7alt' }
  ];
  const joint = T.computeMixedVoicing(prog, 'seventh', null);
  check(joint.rhIndices.length === prog.length && joint.lhIndices.length === prog.length &&
    joint.rhShifts.length === prog.length, 'mixed returns RH + shift + LH for every chord');

  const again = T.computeMixedVoicing(prog, 'seventh', null);
  check(JSON.stringify(again.lhIndices) === JSON.stringify(joint.lhIndices) &&
    JSON.stringify(again.rhIndices) === JSON.stringify(joint.rhIndices), 'mixed is deterministic');

  // Realize each chord exactly as the app does; assert the correctness invariants.
  let collided = 0, incomplete = 0, wide = 0;
  const textures = new Set();
  prog.forEach((c, i) => {
    const d = T.getChordNotesAtIndex(c.root, c.quality, 'seventh', joint.rhIndices[i], joint.rhShifts[i],
      { leftHandMode: 'mixed', lhIndex: joint.lhIndices[i] });
    const L = d.leftHandPitches.map(p => p.midi), R = d.rightHandPitches.map(p => p.midi);
    if (R.length && Math.max(...L) >= Math.min(...R)) collided++;
    if (span(d.leftHandPitches) > 12) wide++;
    const have = new Set(L.concat(R).map(m => m % 12));
    for (const pc of T.essentialGuideTonePcs(c.root, c.quality)) if (!have.has(pc)) { incomplete++; break; }
    textures.add(joint.lhIndices[i]);
  });
  check(collided === 0, 'mixed never collides the hands (LH top clears the RH bottom)');
  check(incomplete === 0, 'mixed always covers the 3rd and real 7th across the two hands');
  check(wide === 0, 'mixed LH always blockable (span <= 12 st)');
  check(textures.size >= 2, 'mixed actually MIXES textures (not a degenerate single formula)');

  // Signature behavior: on a dom13 chain the engine sends the RH to an upper
  // structure and takes the FULL shell in the LH (candidate 1).
  const chain = [{ root: 'C', quality: 'dom13' }, { root: 'F', quality: 'dom13' }, { root: 'Bb', quality: 'maj7' }];
  check(T.computeMixedVoicing(chain, 'seventh', null).lhIndices.indexOf(1) !== -1,
    'mixed reaches the LH-shell + RH-upper-structure texture where it voice-leads (dom13 chain)');

  // Manual RH cycling recoordinates the LH: for a fixed RH, the chosen LH
  // clears it (no collision) — the recoordination used by selectChord.
  const fixedRh = T.getChordNotesAtIndex('C', 'dom7', 'seventh', 0, 0, { leftHandMode: 'roots' })
    .rightHandPitches.map(p => p.midi);
  const ci = T.bestMixedLhForRh('C', 'dom7', fixedRh);
  const lhm = T.realizeMixedCandidate('C', 'dom7', ci).map(n => n.midi);
  check(Math.max(...lhm) < Math.min(...fixedRh), 'bestMixedLhForRh clears the fixed RH (manual-cycle recoordination)');

  // The engine default is UNCHANGED ('roots') so the snapshot stays stable —
  // only the APP default (state.leftHand) is mixed.
  const implicit = T.getChordNotesAtIndex('F', 'dom7', 'seventh', 0, 0);
  const rootsExplicit = T.getChordNotesAtIndex('F', 'dom7', 'seventh', 0, 0, { leftHandMode: 'roots' });
  check(implicit.leftHandPitches.map(p => p.midi).join() === rootsExplicit.leftHandPitches.map(p => p.midi).join(),
    "engine default stays 'roots' (mixed is the app default, not the engine default)");

  // --- The reface regression (review finding, 2026-07-18): under the 3-octave
  // window the RH legally shifts down to fit C2-C5; a C3-pinned LH crossed
  // over it (e.g. Bmin13: LH B3 above RH bottom A3). The LH must instead
  // follow the RH down ("play lower, play less"). Deterministic sweep: every
  // root x a 13th-heavy trio — the exact shapes that reproduced the bug.
  {
    const win = T.RANGE_WINDOWS.reface;
    let crossed = 0, wideLh = 0, incompleteW = 0;
    for (const root of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
      const p = [{ root, quality: 'min13' }, { root, quality: 'dom13' }, { root, quality: 'maj13' }];
      const jw = T.computeMixedVoicing(p, 'seventh', win);
      p.forEach((c, i) => {
        const d = T.getChordNotesAtIndex(c.root, c.quality, 'seventh', jw.rhIndices[i], jw.rhShifts[i],
          { leftHandMode: 'mixed', lhIndex: jw.lhIndices[i], range: win });
        const L = d.leftHandPitches.map(x => x.midi), R = d.rightHandPitches.map(x => x.midi);
        if (R.length && Math.max(...L) >= Math.min(...R)) crossed++;
        if (span(d.leftHandPitches) > 12) wideLh++;
        const have = new Set(L.concat(R).map(m => m % 12));
        for (const pc of T.essentialGuideTonePcs(c.root, c.quality)) if (!have.has(pc)) { incompleteW++; break; }
      });
    }
    check(crossed === 0, `reface window: mixed never crosses the hands (got ${crossed} crossings)`);
    check(wideLh === 0, 'reface window: mixed LH stays blockable (span <= 12 st)');
    check(incompleteW === 0, 'reface window: guide tones still covered across the hands');
    // The manual-cycle path shares the fix: for a window-lowered RH the chosen
    // candidate's RH-aware realization clears it (the old code returned a
    // crossed B3-D4-A4 shell here).
    const rhLow = T.realizeHand('B', T.voicingsFor('min13', 'seventh')[0].right, T.RH_BASE - 12).map(n => n.midi);
    const ciLow = T.bestMixedLhForRh('B', 'min13', rhLow);
    const lhLow = T.realizeMixedCandidateBelow('B', 'min13', ciLow, Math.min(...rhLow)).map(n => n.midi);
    check(Math.max(...lhLow) < Math.min(...rhLow), 'manual-cycle recoordination clears a window-lowered RH');
  }
}

console.log('\nTest 19: sounding chord (chart symbol vs what the voicing actually plays)');
{
  // The display teaches the gap between the page (Fmaj7) and the hands
  // (Fmaj9). Assert the naming across the canon, the suppression rule (page
  // and hands agree -> null), and LH-mode sensitivity (evans adds LH color).
  const sounding = (q, nameFrag, opts) => {
    const vs = T.voicingsFor(q, 'seventh');
    const i = vs.findIndex(v => v.name.indexOf(nameFrag) !== -1);
    check(i !== -1, `sounding: voicing '${nameFrag}' exists in ${q}`);
    if (i === -1) return undefined;
    return T.getChordNotesAtIndex('C', q, 'seventh', i, 0, opts || {}).sounding;
  };
  const sym = s => (s ? s.symbol : null);

  // The motivating case: an Fmaj7 chart symbol voiced with the 9 IS a maj9.
  check(sym(sounding('maj7', 'Type A: 3-5-7-9')) === 'Cmaj9', 'maj7 Type A sounds as Cmaj9');
  check(sym(sounding('maj7', 'RSP (13)')) === 'Cmaj13', 'maj7 RSP(13) sounds as Cmaj13');
  check(sym(sounding('maj7', 'RSP (#11)')) === 'Cmaj7(#11)', 'maj7 RSP(#11) keeps base, colors in parens');
  check(sym(sounding('dom7', 'Type A: 3-13-7-9')) === 'C13', 'dom7 voiced with 13+9 sounds as C13 (13 consumes the 9)');
  check(sym(sounding('min7', 'Quartal')) === 'Cm11', 'min7 quartal sounds as Cm11');
  check(sym(sounding('dom7sus4', 'Slash')) === 'C9sus4', 'sus slash sounds as C9sus4');
  // Conservative families keep the written symbol + parens (no fake upgrades).
  check(sym(sounding('m7b5', 'RSP (11)')) === T.formatChordSymbol('C', 'm7b5') + '(11)',
    'm7b5 RSP(11) stays m7b5 with the 11 in parens');
  // Suppression: a strict voicing IS the page — nothing to teach.
  check(sounding('maj7', 'Shell: R | 3-7') === null, 'strict shell shows nothing (page and hands agree)');
  // LH-mode sensitivity: evans' LH rootless shape adds its own color (the 9)
  // and drops the root — the sounding name follows the WHOLE texture.
  const ev = sounding('min7', 'Shell: R | 3-7', { leftHandMode: 'evans', lhIndex: 0 });
  check(ev && ev.symbol === 'Cm9' && ev.rootImplied === true,
    `evans two-hand texture on a m7 shell sounds as Cm9, root implied (got ${ev && ev.symbol})`);
  check(sounding('maj7', 'Type A: 3-5-7-9').rootImplied === false, 'roots mode: root sounds, not implied');

  // Whole-canon sweep: every quality x voicing x LH mode names cleanly or
  // stays silent — never a crash, never an empty/garbage symbol; and every
  // strict-tier voicing in roots mode is silent (strict = chord tones only).
  let bad = 0, strictNoisy = 0;
  for (const q of Object.keys(T.KEYBOARD_VOICINGS)) {
    const vs = T.voicingsFor(q, 'seventh');
    vs.forEach((v, i) => {
      for (const mode of ['roots', 'shells', 'rootless', 'mixed', 'evans']) {
        const s = T.getChordNotesAtIndex('C', q, 'seventh', i, 0, { leftHandMode: mode }).sounding;
        if (s !== null && (!s.symbol || typeof s.symbol !== 'string' || s.symbol.indexOf('undefined') !== -1)) bad++;
      }
      if (v.tiers && v.tiers.indexOf('strict') !== -1) {
        if (T.getChordNotesAtIndex('C', q, 'seventh', i, 0).sounding !== null) strictNoisy++;
      }
    });
  }
  check(bad === 0, `sounding names are always clean strings or null (${bad} bad)`);
  check(strictNoisy === 0, `strict-tier voicings never claim extra color (${strictNoisy} noisy)`);
}

console.log('\nTest 20: So What (anchored quartal cluster — v5 holistic distribution)');
{
  const pcs = arr => arr.map(p => p.midi % 12).sort((a, b) => a - b);
  const eqSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const span = ns => ns.length > 1 ? Math.max(...ns.map(p => p.midi)) - Math.min(...ns.map(p => p.midi)) : 0;
  const vs = T.voicingsFor('min7', 'seventh');
  const i = vs.findIndex(v => v.name.indexOf('So What') !== -1);
  check(i !== -1, 'min7 has the So What voicing');
  check(vs[i].anchor != null, 'So What is an anchored voicing');

  // Pitch content: 9-5-R-11-13. For Dm7 → E A D G B.
  const d = T.getChordNotesAtIndex('D', 'min7', 'seventh', i, 0);
  check(eqSet(pcs(d.leftHandPitches.concat(d.rightHandPitches)), [2, 4, 7, 9, 11]),
    'Dm7 So What sounds D-E-G-A-B (9-5-R-11-13, the quartal cluster)');
  // Split 3/2, contiguous (no hand crossing), both hands playable.
  check(d.leftHandPitches.length === 3 && d.rightHandPitches.length === 2,
    'split 3/2: LH quartal (3), RH (2)');
  check(Math.max(...d.leftHandPitches.map(p => p.midi)) < Math.min(...d.rightHandPitches.map(p => p.midi)),
    'contiguous split — the hands never cross');
  check(span(d.leftHandPitches) <= 14 && span(d.rightHandPitches) <= 14,
    'both hands blockable (LH ' + span(d.leftHandPitches) + ' / RH ' + span(d.rightHandPitches) + ' st)');

  // Anchored: it IS both hands, so the FULL-texture modes realize the same
  // cluster; the reduced-ensemble modes honor their contract (bassonly = the
  // app is the bassist, root only; rootless = an external bassist owns the
  // root, so the cluster comps above it, root dropped).
  const notes = m => {
    const r = T.getChordNotesAtIndex('D', 'min7', 'seventh', i, 0, { leftHandMode: m });
    return r.leftHandPitches.concat(r.rightHandPitches).map(p => p.midi);
  };
  const sortNums = a => a.slice().sort((x, y) => x - y);
  const pcsOf = midis => sortNums([...new Set(midis.map(m => ((m % 12) + 12) % 12))]);
  const full = ['roots', 'shells', 'evans', 'mixed'].map(m => notes(m).join(','));
  check(full.every(x => x === full[0]), 'full-texture modes (roots/shells/evans/mixed) realize the same cluster');
  check(eqSet(notes('bassonly'), [38]), 'bassonly: only the root sounds (D2), the app is your bassist');
  const rl = notes('rootless');
  check(rl.indexOf(62) === -1 && eqSet(pcsOf(rl), [4, 7, 9, 11]),
    'rootless: cluster minus the root layer (E-A-G-B, no D4) — the bassist owns the root');

  // Sounding-chord honesty: the quartal cluster carries color (9/11/13) but no
  // 3rd or 7th, so its name must FLAG those as implied — never silently assert
  // a full m13 the voicing doesn't contain (this is a teaching tool).
  const soundD = T.getChordNotesAtIndex('D', 'min7', 'seventh', i, 0).sounding;
  check(soundD && eqSet(soundD.impliedGuideTones || [], ['3rd', '7th']),
    'So What sounding flags the 3rd & 7th as implied (context supplies them)');
  // rootless drops the root too, so it is additionally root-implied.
  const soundRl = T.getChordNotesAtIndex('D', 'min7', 'seventh', i, 0, { leftHandMode: 'rootless' }).sounding;
  check(soundRl && soundRl.rootImplied === true && eqSet(soundRl.impliedGuideTones || [], ['3rd', '7th']),
    'So What rootless: root + 3rd + 7th all implied');

  // Optimizer reachability + the manual-only-in-mixed contract. So What must
  // stay an ELIGIBLE candidate (the sparsity exemption keeps its 2-note RH
  // slice from pricing it out of candidacy — a future cost change must not
  // silently drop it); but mixed comping guarantees every chord covers the 3rd
  // & 7th, so it must NOT auto-pick a guide-tone-free cluster (owner decision).
  const cand = T.buildVoicingCandidates({ root: 'D', quality: 'min7' }, 'seventh', null);
  check(cand.some(c => c.vIndex === i && c.anchored === true),
    'So What stays an eligible (anchored) optimizer candidate');

  // The optimizer must see anchored voicings where they REALLY sound: the DP's
  // rhMidis must equal the realized RH at that shift for every root (a fresh
  // RH-slice realization at RH_BASE lands an octave off for some roots — G/Ab/A
  // regressed this way), and under the reface window no candidate may survive
  // whose WHOLE texture (LH cluster included) escapes the window.
  let dpMismatch = 0, windowEscapes = 0;
  const reface = T.RANGE_WINDOWS.reface;
  for (const root of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
    for (const c of T.buildVoicingCandidates({ root, quality: 'min7' }, 'seventh', null)) {
      if (c.vIndex !== i) continue;
      const real = T.getChordNotesAtIndex(root, 'min7', 'seventh', i, c.shift).rightHandPitches.map(p => p.midi);
      if (real.join(',') !== c.rhMidis.join(',')) dpMismatch++;
    }
    for (const c of T.buildVoicingCandidates({ root, quality: 'min7' }, 'seventh', reface)) {
      if (c.vIndex !== i) continue;
      const d = T.getChordNotesAtIndex(root, 'min7', 'seventh', i, c.shift);
      const all = d.leftHandPitches.concat(d.rightHandPitches).map(p => p.midi);
      if (T.windowOverflow(all, reface) > 0) windowEscapes++;
    }
  }
  check(dpMismatch === 0, `DP candidates match realized So What RH across 12 roots (${dpMismatch} octave-off)`);
  check(windowEscapes === 0, `reface window holds for the WHOLE So What texture (${windowEscapes} escapes)`);
  const mixVamp = T.computeMixedVoicing(Array.from({ length: 4 }, () => ({ root: 'D', quality: 'min7' })), 'seventh', null);
  check(mixVamp.rhIndices.every(x => x !== i),
    'mixed comping never auto-picks So What (manual-only in mixed — always covers 3 & 7)');

  // Realizes cleanly across roots (no NaN / undefined spelling).
  let clean = true;
  for (const root of ['C', 'Eb', 'F#', 'A', 'Bb']) {
    const r = T.getChordNotesAtIndex(root, 'min7', 'seventh', i, 0);
    for (const p of r.leftHandPitches.concat(r.rightHandPitches))
      if (!p.name || p.name.includes('undefined') || !Number.isFinite(p.midi)) clean = false;
  }
  check(clean, 'So What spells cleanly across roots');
}

console.log('\nTest 21: candidate textures (v6 Stage 1 — one realization path, whole-texture window)');
{
  // Every candidate carries its full realized texture, and it must match what
  // the app actually plays in roots mode (the default distribution) — this is
  // the So What DP-matches-reality check generalized to every voicing, and it
  // also validates the new lhMidis the hand-span solver (Stage 2) will read.
  const reface = T.RANGE_WINDOWS.reface;
  const roots = ['C', 'Eb', 'F#', 'A', 'B'];
  let rhBad = 0, lhBad = 0, escapes = 0, checked = 0;
  for (const q of Object.keys(T.KEYBOARD_VOICINGS)) {
    for (const root of roots) {
      // Full range: candidate rhMidis/lhMidis == roots-mode realization at that shift.
      for (const c of T.buildVoicingCandidates({ root, quality: q }, 'seventh', null)) {
        const d = T.getChordNotesAtIndex(root, q, 'seventh', c.vIndex, c.shift, { leftHandMode: 'roots' });
        if (d.rightHandPitches.map(p => p.midi).join(',') !== (c.rhMidis || []).join(',')) rhBad++;
        if (d.leftHandPitches.map(p => p.midi).join(',') !== (c.lhMidis || []).join(',')) lhBad++;
        checked++;
      }
      // Reface: no SURVIVING candidate's whole texture escapes the window
      // (a candidate only escapes when it is the forced least-violating
      // fallback — i.e. nothing fits at all, so no fitting candidate exists).
      const cands = T.buildVoicingCandidates({ root, quality: q }, 'seventh', reface);
      const over = cands.map(c => {
        const d = T.getChordNotesAtIndex(root, q, 'seventh', c.vIndex, c.shift, { leftHandMode: 'roots' });
        return T.windowOverflow(d.leftHandPitches.concat(d.rightHandPitches).map(p => p.midi), reface);
      });
      const fitting = over.filter(o => o === 0).length;
      const escaping = over.filter(o => o > 0).length;
      if (escaping > 0 && fitting > 0) escapes++; // an escaper survived alongside a fit
    }
  }
  check(checked > 100, `swept a real candidate set (${checked} candidates)`);
  check(rhBad === 0, `every candidate's rhMidis matches roots-mode realization (${rhBad} off)`);
  check(lhBad === 0, `every candidate's lhMidis matches roots-mode realization (${lhBad} off)`);
  check(escapes === 0, `reface window holds for the whole texture of every voicing (${escapes} escaped-but-survived)`);
}

console.log('\nTest 22: anchored voicing optimizer policy (Powell mixed-eligible; So What manual-only)');
{
  const pickedName = (q, idx) => { const v = T.voicingsFor(q, 'seventh')[idx]; return v ? v.name : ''; };

  // Anchored voicings are complete two-hand sonorities — NEVER dealt by the
  // RH-only optimizer (it costs the RH slice alone and would drop the guide
  // tones / roughen voice leading). Sweep progressions that would otherwise
  // favor them; none may appear. The mixed DP, which sees both hands, DOES
  // deal the guide-tone-complete Powell shells (owner: mixed-eligible) but
  // still never the guide-tone-free So What.
  const progs = [
    [['C', 'maj7'], ['A', 'dom7'], ['D', 'min7'], ['G', 'dom7']],
    [['D', 'maj7'], ['B', 'min7'], ['G', 'maj7'], ['A', 'dom7']],
    [['E', 'min7'], ['A', 'dom7'], ['D', 'maj7'], ['D', 'maj7']]
  ].map(p => p.map(([root, quality]) => ({ root, quality })));
  let rhOnlyAnchored = 0, mixedPowell = 0, mixedSoWhat = 0;
  for (const prog of progs) {
    const rh = T.computeProgressionVoicings(prog, 'seventh', null);
    prog.forEach((c, i) => {
      const v = T.voicingsFor(c.quality, 'seventh')[rh.indices[i]];
      if (v && v.anchor != null) rhOnlyAnchored++;
    });
    const mx = T.computeMixedVoicing(prog, 'seventh', null);
    prog.forEach((c, i) => {
      const name = pickedName(c.quality, mx.rhIndices[i]);
      if (/Powell/.test(name)) mixedPowell++;
      if (/So What/.test(name)) mixedSoWhat++;
    });
  }
  check(rhOnlyAnchored === 0, `RH-only optimizer never deals an anchored voicing (${rhOnlyAnchored} dealt)`);
  check(mixedPowell > 0, `mixed comping DOES deal Powell shells (owner: mixed-eligible) — picked ${mixedPowell}x`);
  check(mixedSoWhat === 0, 'mixed comping still never deals So What (guide-tone-free stays manual-only)');
}

console.log('\nTest 23: LH comp — close voicings through inversions (v6 Stage 3b)');
{
  const nm = p => p.name + p.octave;
  // Core derivation: extensions drop to the seventh-chord core (the RH's job).
  check(JSON.stringify(T.coreChordTones('maj7')) === JSON.stringify(['R', '3', '5', '7']), 'maj7 core = R-3-5-7');
  check(JSON.stringify(T.coreChordTones('dom13')) === JSON.stringify(['R', '3', '5', 'b7']), 'dom13 core reduces to R-3-5-b7 (no extensions)');
  check(JSON.stringify(T.coreChordTones('dom7alt')) === JSON.stringify(['R', '3', '#5', 'b7']), 'dom7alt core = R-3-#5-b7');
  check(T.inversionShapesFor('maj7').length === 4, 'a seventh chord has four inversions');
  check(T.inversionShapesFor('maj').length === 3, 'a triad has three inversions');

  // Realization: LH-only (RH silent), full chord tones, one tenor octave.
  let lhOnly = true, oneOctave = true, complete = true;
  for (const root of ['C', 'Eb', 'F#', 'A', 'B']) {
    for (const q of ['maj7', 'min7', 'dom7', 'm7b5', 'dom13', 'min11']) {
      for (let inv = 0; inv < 4; inv++) {
        const d = T.getChordNotesAtIndex(root, q, 'seventh', 0, 0, { leftHandMode: 'lhcomp', lhIndex: inv });
        if (d.rightHandPitches.length !== 0) lhOnly = false;
        const m = d.leftHandPitches.map(p => p.midi);
        if (m.length !== 4) complete = false;                       // all four core tones present
        if (Math.max(...m) - Math.min(...m) >= 12) oneOctave = false; // close position, within an octave
      }
    }
  }
  check(lhOnly, 'LH comp plays the LEFT hand only (RH silent — you play over it)');
  check(complete, 'every inversion carries all four core chord tones');
  check(oneOctave, 'every inversion is close position (spans < an octave)');

  // Economy of motion: on the owner's D-major example, the DP holds common
  // tones and moves the rest by step — no voice jumps more than a whole tone.
  const prog = [['D', 'maj7'], ['B', 'min7'], ['G', 'maj7'], ['A', 'dom7']].map(([root, quality]) => ({ root, quality }));
  const inv = T.computeInversionComp(prog);
  const voiced = prog.map((c, i) => T.getChordNotesAtIndex(c.root, c.quality, 'seventh', 0, 0, { leftHandMode: 'lhcomp', lhIndex: inv.indices[i] }).leftHandPitches.map(p => p.midi));
  let worstMove = 0, minCommon = 4;
  for (let i = 1; i < voiced.length; i++) {
    // nearest-neighbour move for each voice + count exact common tones
    for (const n of voiced[i]) worstMove = Math.max(worstMove, Math.min(...voiced[i - 1].map(p => Math.abs(p - n))));
    minCommon = Math.min(minCommon, voiced[i].filter(n => voiced[i - 1].includes(n)).length);
  }
  check(worstMove <= 2, `economy of motion: no voice moves more than a whole tone (worst ${worstMove} st)`);
  check(minCommon >= 1, `common tones held across every change (min ${minCommon})`);

  // Spells cleanly across all twelve roots (no NaN / undefined).
  let clean = true;
  for (const root of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']) {
    for (let inv = 0; inv < 4; inv++) {
      const d = T.getChordNotesAtIndex(root, 'min7', 'seventh', 0, 0, { leftHandMode: 'lhcomp', lhIndex: inv });
      for (const p of d.leftHandPitches) if (!p.name || p.name.includes('undefined') || !Number.isFinite(p.midi)) clean = false;
    }
  }
  check(clean, 'LH comp inversions spell cleanly across all twelve roots');
}

console.log('\nTest 24: octave roots (v6 Stage 3 — stride/gospel bass octave, opt-in)');
{
  const midis = d => d.leftHandPitches.map(p => p.midi);
  // Roots mode: a lone bass root doubles an octave DOWN — same top note, an
  // added note exactly 12 st below, span a clean octave.
  let doubled = 0, topKept = 0;
  for (const root of ['C', 'F', 'A', 'Eb', 'B']) {
    const off = midis(T.getChordNotesAtIndex(root, 'maj7', 'seventh', 6, 0, { leftHandMode: 'roots' }));
    const on = midis(T.getChordNotesAtIndex(root, 'maj7', 'seventh', 6, 0, { leftHandMode: 'roots', octaveRoots: true }));
    if (on.length === 2 && on[1] - on[0] === 12) doubled++;         // exactly an octave
    if (off.length === 1 && on[on.length - 1] === off[0]) topKept++; // top note unchanged (adds below)
  }
  check(doubled === 5, `roots: lone root doubles to a clean octave in every key (${doubled}/5)`);
  check(topKept === 5, `roots: the octave adds BELOW — the comping-zone root stays on top (${topKept}/5)`);

  // Default OFF changes nothing.
  const offC = midis(T.getChordNotesAtIndex('C', 'maj7', 'seventh', 6, 0, { leftHandMode: 'roots' }));
  check(offC.length === 1, 'default off: lone root stays single');

  // Contract: bassonly (the app is the bassist) stays a single note; multi-note
  // and empty LHs are untouched (only a LONE root doubles).
  check(midis(T.getChordNotesAtIndex('C', 'maj7', 'seventh', 6, 0, { leftHandMode: 'bassonly', octaveRoots: true })).length === 1,
    'bassonly stays a single bass note (emulates a bassist)');
  check(midis(T.getChordNotesAtIndex('C', 'maj7', 'seventh', 6, 0, { leftHandMode: 'shells', octaveRoots: true })).length === 3,
    'shells (multi-note LH) unaffected by octave roots');
  check(midis(T.getChordNotesAtIndex('C', 'maj7', 'seventh', 6, 0, { leftHandMode: 'rootless', octaveRoots: true })).length === 0,
    'rootless (no LH) unaffected by octave roots');

  // The doubled octave is the same pitch class, so the sounding name is unchanged.
  const s = T.getChordNotesAtIndex('C', 'maj7', 'seventh', 6, 0, { leftHandMode: 'roots', octaveRoots: true }).sounding;
  const sOff = T.getChordNotesAtIndex('C', 'maj7', 'seventh', 6, 0, { leftHandMode: 'roots' }).sounding;
  check(JSON.stringify(s) === JSON.stringify(sOff), 'octave root adds no new pitch class — sounding name unchanged');
}

console.log('\n' + (failures ? `${failures} FAILURE(S)` : 'ALL TESTS PASSED'));
// Fail the build on any failure. Without this the process exits 0 even when
// checks fail, so `npm test` and CI would go green on a broken voicing engine.
// exitCode (not process.exit) lets stdout flush fully: a broad snapshot drift
// prints tens of KB of golden-vs-got diagnostics that exit() would truncate
// on piped output (CI). This file is pure logic — no timers — so setting
// exitCode cannot hang the process.
process.exitCode = failures ? 1 : 0;
