// Self-contained regression tests for ChordFlow's voice leading engine.
// Usage: node test_voice_leading.js
// Loads the pure-logic layer (no DOM) by concatenating the split classic
// scripts and evaluating them in a single function scope — the same shared
// global scope the browser gives them, minus the state/render/audio layers
// that touch the DOM.
const fs = require('fs');
const path = require('path');
function loadTheoryCore() {
  // Dependency order for the logic-only layer. render/state/audio/app are
  // omitted: they reference the DOM and are exercised by test_dom_smoke.js.
  const files = ['js/theory.js', 'js/library.js', 'js/voicings.js', 'js/parsing.js'];
  const core = files.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  const fn = new Function(core + '\nreturn { spellInterval, INTERVALS, NOTE_TO_SEMITONE, KEYBOARD_VOICINGS, CHORD_TYPES, PROGRESSION_LIBRARY, parseRomanNumeral, realizeHand, realizeVoicing, computeProgressionVoicings, voiceMovementCost, registerPenalty, getChordNotesAtIndex, getChordNotes, voicingsFor, bestShiftForVoicing, RH_BASE };');
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

console.log('\n' + (failures ? `${failures} FAILURE(S)` : 'ALL TESTS PASSED'));
