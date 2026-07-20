// v5 Stage A oracle: dump every quality x voicing x LH-mode's realized notes
// at C and F# — the full behavioral surface the model swap must preserve
// BYTE-IDENTICALLY. Run before and after; `diff` the outputs (must be empty).
// Usage: node scripts/full_surface.js
const fs = require('fs');
const path = require('path');
const repo = path.join(__dirname, '..');
const files = ['js/theory.js', 'js/library.js', 'js/voicings.js', 'js/parsing.js', 'js/audio.js', 'js/state.js'];
const core = files.map(f => fs.readFileSync(path.join(repo, f), 'utf8')).join('\n');
const T = new Function(core + '\nreturn { KEYBOARD_VOICINGS, voicingsFor, getChordNotesAtIndex, computeMixedVoicing };')();

const ROOTS = ['C', 'F#'];
const MODES = ['roots', 'shells', 'evans', 'rootless', 'bassonly', 'mixed'];
const nm = p => p.name + p.octave;
const line = (root, q, i, mode, lhIndex) => {
  const d = T.getChordNotesAtIndex(root, q, 'seventh', i, 0, { leftHandMode: mode, lhIndex });
  return `${q}|${root}|v${i}|${mode}  L:${d.leftHandPitches.map(nm).join(' ')}  R:${d.rightHandPitches.map(nm).join(' ')}`;
};

const out = [];
for (const q of Object.keys(T.KEYBOARD_VOICINGS)) {
  const n = T.voicingsFor(q, 'seventh').length;
  for (const root of ROOTS) {
    for (let i = 0; i < n; i++) {
      for (const mode of MODES) {
        // evans lhIndex sweeps its shapes; others ignore it. Sweep 0..3 to
        // cover multi-shape modes deterministically.
        for (let lh = 0; lh < 4; lh++) out.push(line(root, q, i, mode, lh));
      }
    }
  }
}
// Also the joint mixed optimizer over a fixed reference progression at both
// range settings — locks the DP's choices, not just per-chord realization.
const prog = [
  { root: 'D', quality: 'min7' }, { root: 'G', quality: 'dom7' }, { root: 'C', quality: 'maj7' },
  { root: 'B', quality: 'dom13' }, { root: 'E', quality: 'min11' }, { root: 'A', quality: 'dom7alt' }
];
const { RANGE_WINDOWS } = new Function(core + '\nreturn { RANGE_WINDOWS };')();
for (const [rlabel, range] of [['full', null], ['reface', RANGE_WINDOWS.reface]]) {
  const j = T.computeMixedVoicing(prog, 'seventh', range);
  out.push(`MIXDP|${rlabel}  rh:${j.rhIndices.join(',')}  sh:${j.rhShifts.join(',')}  lh:${j.lhIndices.join(',')}`);
}
console.log(out.join('\n'));
