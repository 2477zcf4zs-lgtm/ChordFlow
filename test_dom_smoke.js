// DOM smoke test: loads the app in jsdom and exercises the main UI paths.
// Usage: node test_dom_smoke.js
//
// The app is now split into external classic scripts (css/, js/*.js) loaded by
// index.html, so jsdom must actually fetch and run those resources. We load the
// real file with JSDOM.fromFile({ resources: 'usable', runScripts: 'dangerously' })
// and wait until init() has run (the library has rendered) before the checks.
const path = require('path');
const { JSDOM, ResourceLoader } = require('jsdom');

// Load local resources (css/*, js/*) but skip remote ones (the Google Fonts
// stylesheet) so the test stays hermetic and doesn't depend on the network.
class LocalResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if (url.startsWith('file:')) return super.fetch(url, options);
    return Promise.resolve(Buffer.from(''));
  }
}

const errors = [];

let failures = 0;
function check(cond, msg) {
  if (cond) console.log('  ok: ' + msg);
  else { failures++; console.log('  FAIL: ' + msg); }
}

// jsdom has no Web Audio; install a minimal mock so playback (which no longer
// has a visual-only fallback) can actually start and be exercised.
function installAudioMock(window) {
  class P {
    constructor(v) { this.value = v; }
    setValueAtTime() { return this; }
    exponentialRampToValueAtTime() { return this; }
    linearRampToValueAtTime() { return this; }
    setTargetAtTime() { return this; }
    cancelScheduledValues() { return this; }
  }
  class Node {
    constructor() {
      this.gain = new P(1); this.frequency = new P(440); this.detune = new P(0);
      this.Q = new P(1); this.threshold = new P(0); this.ratio = new P(1);
      this.knee = new P(0); this.attack = new P(0); this.release = new P(0);
      this.type = 'sine';
    }
    connect() { return this; }
    disconnect() {}
    start() {}
    stop() {}
  }
  class Ctx {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = new Node(); }
    createGain() { return new Node(); }
    createOscillator() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    createDynamicsCompressor() { return new Node(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
  window.AudioContext = Ctx;
  window.webkitAudioContext = Ctx;
}

// Poll until a predicate holds or we time out (used to wait for the external
// scripts to load and init() to run before exercising the app).
function waitFor(pred, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function poll() {
      let ok = false;
      try { ok = pred(); } catch (e) { /* not ready yet */ }
      if (ok) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout waiting for app init'));
      setTimeout(poll, 15);
    })();
  });
}

let window, document;

async function main() {
  const dom = await JSDOM.fromFile(path.join(__dirname, 'index.html'), {
    runScripts: 'dangerously',
    resources: new LocalResourceLoader(),
    pretendToBeVisual: true, // requestAnimationFrame support
  });
  window = dom.window;
  window.addEventListener('error', (e) => errors.push('window error: ' + e.message));
  document = window.document;

  // Wait for the split scripts to load and init() to finish: renderLibrary()
  // populates 53 .library-item nodes and loadProgression(0) fills state.
  await waitFor(() =>
    document.querySelectorAll('.library-item').length === 53 &&
    typeof window.loadProgression === 'function', 8000);

  try {
    check(errors.length === 0, 'no script errors on load' + (errors.length ? ' -> ' + errors.join('; ') : ''));

    // Library renders
    check(document.querySelectorAll('.library-item').length === 53, 'library shows 53 entries');

    // Load ii-V-I
    window.loadProgression(0);
    const st = () => window.eval('state');
    const engine = () => window.eval('audioEngine');
    check(st().progression.length === 3, 'ii-V-I loads 3 chords');
    check(st().voicingIndices.length === 3 && st().voicingShifts.length === 3, 'voicing indices + shifts computed');

    // --- Structure (1.2 / 1.3) ---
    const box = document.querySelector('.chord-box');
    check(box && box.tagName === 'BUTTON', 'chord boxes are <button> (keyboard accessible)');
    check(document.querySelectorAll('.chord-cell').length === 3, 'one chord-cell per chord');
    const dotCount = document.querySelectorAll('.beat-dot').length;
    check(dotCount === 3 * st().beatsPerChord, 'beat dots always present (' + dotCount + ' = 3 x ' + st().beatsPerChord + ')');
    const anyBadge = document.querySelector('.sub-badge');
    if (anyBadge) check(anyBadge.tagName === 'BUTTON', 'sub badges are <button>');

    // Delegated click selects a chord (no per-node listeners)
    document.querySelectorAll('.chord-box')[1].dispatchEvent(new window.Event('click', { bubbles: true }));
    check(st().selectedChordIndex === 1, 'delegated click selects the chord');

    // Voicing panel + piano
    window.toggleVoicingPanel(true);
    const pianoSvg = document.querySelector('#pianoKeyboard svg');
    check(!!pianoSvg, 'piano keyboard SVG rendered');
    const highlighted = pianoSvg ? pianoSvg.innerHTML.match(/var\(--accent-(coral|blue)\)/g) : [];
    check(highlighted && highlighted.length >= 5, 'piano highlights LH+RH keys (' + (highlighted ? highlighted.length : 0) + ')');
    check(/\d/.test(document.getElementById('rightHandNotes').textContent), 'right hand shows octave numbers');

    // Voicing cycling
    window.selectChord(1);
    window.selectChord(1);
    check(document.querySelector('#pianoKeyboard svg') !== null, 'piano re-renders after voicing cycle');

    // --- Playback + session token (1.1 / 1.5) ---
    installAudioMock(window);
    await window.startPlayback();
    check(st().isPlaying === true, 'playback starts');
    check(engine().schedulerId !== null, 'scheduler interval running');
    check(document.getElementById('chordContainer').classList.contains('is-playing'), 'container marked is-playing');

    // Rapid Stop -> Play -> Stop -> Play must not orphan a scheduler/sessionGain
    window.stopPlayback();
    const p1 = window.startPlayback();
    window.stopPlayback();
    const p2 = window.startPlayback();
    await Promise.all([p1, p2]);
    check(st().isPlaying === true, 'after rapid stop/start still playing');
    check(engine().schedulerId !== null, 'one scheduler alive after the race');
    window.stopPlayback();
    check(st().isPlaying === false && engine().schedulerId === null && engine().sessionGain === null,
      'stop clears scheduler + sessionGain (no doubled/unstoppable audio)');
    check(!document.getElementById('chordContainer').classList.contains('is-playing'), 'is-playing cleared on stop');

    // Metronome toggle
    const metroBtn = document.getElementById('metroBtn');
    metroBtn.click();
    check(st().metronomeOn === true && metroBtn.textContent.includes('Click: On'), 'metronome toggles on');
    metroBtn.click();
    check(st().metronomeOn === false, 'metronome toggles off');

    // Substitution keeps voicing arrays consistent + rebuilds structure
    window.loadProgression(0);
    const subs = window.getChordSubstitutions('G', 'dom7');
    if (subs.length) {
      window.applySubstitution(1, subs.find(s => s.type === 'tritone') || subs[0]);
      check(st().voicingIndices.length === st().progression.length, 'substitution keeps voicing arrays consistent');
    }

    // Complexity tiers via dropdown
    const complexitySelect = document.getElementById('complexitySelect');
    const setTier = (val) => { complexitySelect.value = val; complexitySelect.dispatchEvent(new window.Event('change')); };
    window.loadProgression(0);
    setTier('seventh-strict');
    check(st().complexity === 'seventh-strict', 'dropdown switches to strict tier');
    check(document.querySelectorAll('.chord-box').length > 0, 'chords render in strict tier');
    setTier('rsp');
    check(st().complexity === 'rsp', 'dropdown switches to RSP tier');
    setTier('extended');
    check(st().complexity === 'extended', 'dropdown switches to extended tier');
    setTier('seventh');
    check(st().complexity === 'seventh', 'dropdown switches back to jazz tier');
    check(errors.length === 0, 'no errors switching tiers' + (errors.length ? ' -> ' + errors.join('; ') : ''));

    // Beats/Chord change rebuilds the beat-dot structure
    const bpc = document.getElementById('beatsPerChord');
    bpc.value = '8';
    bpc.dispatchEvent(new window.Event('change'));
    check(document.querySelectorAll('.beat-dot').length === st().progression.length * 8,
      'Beats/Chord change rebuilds beat dots');
    bpc.value = '4';
    bpc.dispatchEvent(new window.Event('change'));

    // #5: key change transposes the SAME progression (roots are deterministic)
    const keySelect = document.getElementById('keySelect');
    window.loadProgression(0);
    const numeralsBefore = JSON.stringify(st().sourceNumerals);
    keySelect.value = 'Eb';
    keySelect.dispatchEvent(new window.Event('change'));
    check(JSON.stringify(st().sourceNumerals) === numeralsBefore, '#5 transposed in place (source numerals unchanged)');
    check(st().progression.map(c => c.root).join(' ') === 'F Bb Eb', '#5 ii-V-I roots transposed to Eb: ' + st().progression.map(c => c.root).join(' '));

    // #7: structured substitution flag + marker
    keySelect.value = 'C';
    keySelect.dispatchEvent(new window.Event('change'));
    window.loadProgression(0);
    window.applySubstitution(1, window.getChordSubstitutions('G', 'dom7').find(s => s.type === 'tritone'));
    const subChord = st().progression[1];
    check(subChord.substituted === true && !String(subChord.degree).includes('*'), '#7 structured flag, clean degree');
    check(document.querySelector('.sub-marker') !== null, '#7 substitution marker renders');

    // Density persists across a transpose (2.4)
    window.generateRandomProgression();
    const d0 = st().density;
    keySelect.value = 'G';
    keySelect.dispatchEvent(new window.Event('change'));
    check(st().density === d0, '#2.4 density character preserved across key change');

    // --- Loop counter survives pause/resume (Phase 1 bug fix, item 7) ---
    // Drive the mock audio clock past a full loop, pause, resume, and assert the
    // loop count doesn't reset (it used to derive from chordStep, which restarts
    // from the resume position). Uses schedulerTick + visualSync directly with a
    // hand-advanced ctx.currentTime for determinism.
    window.stopAndReset();
    window.loadProgression(0);              // 3-chord progression
    const ctx = engine().ctx;               // mock AudioContext; currentTime is writable
    ctx.currentTime = 0;
    await window.startPlayback();
    let guard = 0;
    while (st().loopCount < 2 && guard++ < 20000) {
      ctx.currentTime += 0.05;
      window.schedulerTick();
      window.visualSync();
    }
    const loopBeforePause = st().loopCount;
    check(loopBeforePause >= 2, 'played past at least one full loop before pause (loop ' + loopBeforePause + ')');
    // Pause (stop, no reset) then resume from the same spot.
    window.stopPlayback();
    await window.startPlayback();
    // Let the freshly scheduled beat become audible so visualSync recomputes loopCount.
    ctx.currentTime += 0.3;
    window.schedulerTick();
    window.visualSync();
    check(st().loopCount >= loopBeforePause,
      'loop counter survives pause/resume (' + loopBeforePause + ' -> ' + st().loopCount + ')');
    window.stopAndReset();

    check(errors.length === 0, 'no script errors during interaction' + (errors.length ? ' -> ' + errors.join('; ') : ''));
  } catch (e) {
    failures++;
    console.log('  EXCEPTION: ' + e.stack);
  }

  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'DOM SMOKE PASSED'));
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.log('  EXCEPTION: ' + (e && e.stack ? e.stack : e));
  console.log('\n1 FAILURE(S)');
  process.exit(1);
});
