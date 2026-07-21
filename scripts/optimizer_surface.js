// Stage 1 guard: dump the OPTIMIZER'S CHOICES (not fixed-index realization,
// which full_surface.js covers) for a battery of progressions x range x mode.
// The RH-only DP (computeProgressionVoicings) and the mixed DP
// (computeMixedVoicing) both pick indices/shifts; realize those and print the
// notes. Run before and after a Stage-1 change; diff must be empty in
// full-range and only-intended under reface. Usage: node scripts/optimizer_surface.js
const fs = require('fs');
const path = require('path');
const repo = path.join(__dirname, '..');
const files = ['js/theory.js', 'js/library.js', 'js/voicings.js', 'js/parsing.js', 'js/audio.js', 'js/state.js'];
const core = files.map(f => fs.readFileSync(path.join(repo, f), 'utf8')).join('\n');
const T = new Function(core + '\nreturn { voicingsFor, getChordNotesAtIndex, computeProgressionVoicings, computeMixedVoicing, RANGE_WINDOWS };')();

const nm = p => p.name + p.octave;
const PROGS = [
  [['C', 'maj7'], ['A', 'dom7'], ['D', 'min7'], ['G', 'dom7']],
  [['D', 'maj7'], ['B', 'min7'], ['G', 'maj7'], ['A', 'dom7']],
  [['F', 'min7'], ['Bb', 'dom13'], ['Eb', 'maj7'], ['C', 'dom7alt']],
  [['E', 'min7'], ['A', 'dom13b9'], ['D', 'maj7'], ['F#', 'min7b5']],
  [['B', 'dom13s11'], ['E', 'maj13'], ['Ab', 'min11'], ['Db', 'dom7sus4']],
  [['G', 'min7'], ['G', 'min7'], ['C', 'dom7'], ['F', 'maj7']],
  [['Bb', 'maj7'], ['G', 'dom7b13'], ['C', 'min7'], ['F', 'dom13']],
];
const out = [];
for (const range of [null, 'reface']) {
  const rw = range ? T.RANGE_WINDOWS[range] : null;
  for (let pi = 0; pi < PROGS.length; pi++) {
    const prog = PROGS[pi].map(([root, quality]) => ({ root, quality }));
    // RH-only DP under three non-mixed modes (LH differs; RH selection is shared).
    const rh = T.computeProgressionVoicings(prog, 'seventh', rw);
    for (const mode of ['roots', 'shells', 'rootless', 'bassonly']) {
      prog.forEach((c, i) => {
        const d = T.getChordNotesAtIndex(c.root, c.quality, 'seventh', rh.indices[i], rh.shifts[i], { leftHandMode: mode, range: rw });
        out.push(`${range || 'full'}|P${pi}|${mode}|${c.root}${c.quality}  v${rh.indices[i]}s${rh.shifts[i]}  L:${d.leftHandPitches.map(nm).join(' ')}  R:${d.rightHandPitches.map(nm).join(' ')}`);
      });
    }
    // Mixed DP.
    const mx = T.computeMixedVoicing(prog, 'seventh', rw);
    prog.forEach((c, i) => {
      const d = T.getChordNotesAtIndex(c.root, c.quality, 'seventh', mx.rhIndices[i], mx.rhShifts[i], { leftHandMode: 'mixed', lhIndex: mx.lhIndices[i], range: rw });
      out.push(`${range || 'full'}|P${pi}|mixed|${c.root}${c.quality}  rh${mx.rhIndices[i]}s${mx.rhShifts[i]}lh${mx.lhIndices[i]}  L:${d.leftHandPitches.map(nm).join(' ')}  R:${d.rightHandPitches.map(nm).join(' ')}`);
    });
  }
}
process.stdout.write(out.join('\n') + '\n');
