// Regenerates the GOLDEN lines for the voicing characterization snapshot
// (test_voice_leading.js, Test 15). Run after an INTENTIONAL voicing change,
// paste the emitted lines over the GOLDEN object's entries for the qualities
// you changed, and eyeball the diff — an unexpected line changing means the
// engine moved under an existing voicing (INVARIANTS.md #18).
//
// Usage: node scripts/gen_voicing_snapshot.js            (all qualities)
//        node scripts/gen_voicing_snapshot.js dom13 maj7 (just those)
const fs = require('fs');
const path = require('path');
const repo = path.join(__dirname, '..');
const files = ['js/theory.js', 'js/library.js', 'js/voicings.js', 'js/parsing.js', 'js/audio.js', 'js/state.js'];
const core = files.map(f => fs.readFileSync(path.join(repo, f), 'utf8')).join('\n');
const T = new Function(core + '\nreturn { KEYBOARD_VOICINGS, voicingsFor, getChordNotesAtIndex };')();

// Must mirror Test 15 exactly: two roots (C clean, F# spelling stress),
// complexity 'seventh', shift 0, index space = voicingsFor(q, 'seventh').
const ROOTS = ['C', 'F#'];
const sig = (root, quality, i) => {
  const d = T.getChordNotesAtIndex(root, quality, 'seventh', i, 0);
  const lh = d.leftHandPitches.map(p => p.name + p.octave).join(' ');
  const rh = d.rightHandPitches.map(p => p.name + p.octave).join(' ');
  return `${lh} | ${rh}`;
};

const only = process.argv.slice(2);
for (const q of Object.keys(T.KEYBOARD_VOICINGS)) {
  if (only.length && only.indexOf(q) === -1) continue;
  const n = T.voicingsFor(q, 'seventh').length;
  const lines = [];
  for (const root of ROOTS) for (let i = 0; i < n; i++) lines.push(sig(root, q, i));
  console.log(`      '${q}': '${lines.join(' || ')}',`);
}
