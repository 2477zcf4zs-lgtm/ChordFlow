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
  const fn = new Function(core + '\nreturn { spellInterval, INTERVALS, NOTE_TO_SEMITONE, KEYBOARD_VOICINGS, CHORD_TYPES, PROGRESSION_LIBRARY, parseRomanNumeral, realizeHand, realizeVoicing, computeProgressionVoicings, voiceMovementCost, registerPenalty, getChordNotesAtIndex, getChordNotes, voicingsFor, bestShiftForVoicing, RH_BASE, LH_BASE, SHELL_TONE_BASE, LH_ROOTLESS_BASE, LH_SOFT_LOW, buildRandomNumerals, SECONDARY_TARGETS, grooveOnsets, guideToneIntervals, lhRootlessShapesFor, computeLeftHandVoicings };');
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
  const shells = T.getChordNotesAtIndex('C', 'min7', 'seventh', 0, 0, 'shells');
  check(shells.leftHandPitches.map(pc).join(',') === '0,3,10',
    'Cm7 shells LH pitch classes = root, b3, b7');
  check(shells.leftHandPitches[0].midi < T.SHELL_TONE_BASE &&
    shells.leftHandPitches.slice(1).every(p => p.midi >= T.SHELL_TONE_BASE),
    'shell root stays in the bass zone; guide tones sit at/above C3');
  const asc = shells.leftHandPitches.map(p => p.midi);
  check(asc.every((m, i) => i === 0 || m > asc[i - 1]), 'shell LH pitches are ascending');

  // Rootless: LH silent, RH identical to roots mode (optimizer input unchanged)
  const roots = T.getChordNotesAtIndex('C', 'min7', 'seventh', 0, 0);
  const rootless = T.getChordNotesAtIndex('C', 'min7', 'seventh', 0, 0, 'rootless');
  check(rootless.leftHandPitches.length === 0, 'rootless LH is empty');
  check(rootless.rightHandPitches.map(p => p.midi).join(',') === roots.rightHandPitches.map(p => p.midi).join(','),
    'rootless leaves the RH voicing untouched');
  check(shells.rightHandPitches.map(p => p.midi).join(',') === roots.rightHandPitches.map(p => p.midi).join(','),
    'shells leave the RH voicing untouched');

  // Default-mode regression: omitting the argument still realizes the written LH
  const explicit = T.getChordNotesAtIndex('F', 'dom7', 'seventh', 0, 0, 'roots');
  const implicit = T.getChordNotesAtIndex('F', 'dom7', 'seventh', 0, 0);
  check(explicit.leftHandPitches.map(p => p.midi).join(',') === implicit.leftHandPitches.map(p => p.midi).join(','),
    "default leftHandMode is 'roots' (existing calls unchanged)");
  check(implicit.leftHandPitches.length > 0 && implicit.leftHandPitches[0].midi >= T.LH_BASE,
    'roots mode still anchors the written LH at LH_BASE');
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

  // Realization: evans LH sits in the tenor range, RH untouched
  const evans = T.getChordNotesAtIndex('D', 'min7', 'seventh', 0, 0, 'evans', 0);
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
    T.getChordNotesAtIndex(c.root, c.quality, 'seventh', 0, 0, 'evans', indices[i])
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

console.log('\n' + (failures ? `${failures} FAILURE(S)` : 'ALL TESTS PASSED'));
