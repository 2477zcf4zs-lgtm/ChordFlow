// DOM smoke test: loads the app in jsdom and exercises the main UI paths.
// Usage: node test_dom_smoke.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'chord_generator.html'), 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true, // requestAnimationFrame support
});
dom.window.addEventListener('error', (e) => errors.push('window error: ' + e.message));

const { window } = dom;
const { document } = window;

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

setTimeout(async () => {
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

    check(errors.length === 0, 'no script errors during interaction' + (errors.length ? ' -> ' + errors.join('; ') : ''));
  } catch (e) {
    failures++;
    console.log('  EXCEPTION: ' + e.stack);
  }

  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'DOM SMOKE PASSED'));
  process.exit(failures ? 1 : 0);
}, 60);
