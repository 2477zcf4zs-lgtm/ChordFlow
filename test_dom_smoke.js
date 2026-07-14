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
// The page runs under http://localhost/ (see url option below) so jsdom grants
// it a real origin — required for localStorage (5.2); file: URLs get none —
// and this loader maps those localhost URLs back onto the repo files.
const fs = require('fs');
class LocalResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if (url.startsWith('file:')) return super.fetch(url, options);
    const local = /^https?:\/\/localhost\/(.+)$/.exec(url);
    if (local) return fs.promises.readFile(path.join(__dirname, decodeURIComponent(local[1])));
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
    url: 'http://localhost/index.html', // real origin -> working localStorage
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
    // Both hands must be highlighted. Count per hand rather than a total: the
    // quality pool's rare triad floor can legitimately produce 4 total keys
    // (LH root + RH triad), which made a >=5 total check flaky (~3%).
    const lhKeys = (pianoSvg ? pianoSvg.innerHTML.match(/var\(--accent-coral\)/g) : []) || [];
    const rhKeys = (pianoSvg ? pianoSvg.innerHTML.match(/var\(--accent-blue\)/g) : []) || [];
    check(lhKeys.length >= 1 && rhKeys.length >= 3,
      'piano highlights both hands (LH ' + lhKeys.length + ', RH ' + rhKeys.length + ')');
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

    // --- Sub tray: hear-first substitutions (spec v3 phase 1) ---
    window.loadProgression(0); // Dm7 G7 Cmaj7 in C
    window.selectChord(1);     // G7: opens the voicing panel + tray
    const tray = document.getElementById('voicingSubs');
    {
      const chips = tray.querySelectorAll('.sub-chip');
      check(chips.length >= 2 && chips[0].dataset.key === 'original' &&
        chips[0].classList.contains('sub-chip--current'),
        'sub tray renders Original first (current) plus sub chips');
    }
    // First tap = in-context audition (3-chord snippet, groove inherited) + arm
    const trayGroove = document.getElementById('grooveSelect');
    trayGroove.value = 'charleston';
    trayGroove.dispatchEvent(new window.Event('change'));
    window.eval('var __audReal = synthNote; var __audCount = 0; synthNote = function(m,t,d,v,g){ __audCount++; return __audReal(m,t,d,v,g); };');
    tray.querySelector('.sub-chip[data-key="tritone"]').click();
    check(engine().auditionGain !== null, 'chip tap auditions through auditionGain (never sessionGain)');
    // 3 chords x (LH + 2 charleston hits x >=2 RH notes) lands well above 9
    check(window.eval('__audCount') > 9,
      'audition schedules a 3-chord snippet with groove hits (' + window.eval('__audCount') + ' notes)');
    window.eval('synthNote = __audReal;');
    trayGroove.value = 'block';
    trayGroove.dispatchEvent(new window.Event('change'));
    {
      const armed = tray.querySelector('.sub-chip--armed');
      check(!!armed && armed.dataset.key === 'tritone', 'first tap arms the chip (check glyph state)');
      // Second tap on the armed chip = apply
      armed.click();
    }
    check(st().progression[1].root === 'Db' && st().progression[1].substituted === true &&
      st().substitutions[1] === 'tritone' && !!st().subBase[1] && st().subBase[1].root === 'G',
      'second tap applies the sub and snapshots the base chord');
    // Undo chip: appears on apply, one click restores the exact prior state
    const undoChip = document.getElementById('undoChip');
    check(undoChip.hidden === false && undoChip.textContent.indexOf('Undo') !== -1,
      'undo chip appears after applying');
    undoChip.click();
    check(st().progression[1].root === 'G' && !st().substitutions[1] && undoChip.hidden === true,
      'undo restores the pre-apply state and hides the chip');
    // Revert path: re-apply, then Original chip two-tap reverts
    tray.querySelector('.sub-chip[data-key="tritone"]').click();
    tray.querySelector('.sub-chip--armed').click();
    check(st().substitutions[1] === 'tritone', 're-applied for the revert test');
    tray.querySelector('.sub-chip[data-key="original"]').click();
    {
      const armedOrig = tray.querySelector('.sub-chip--armed[data-key="original"]');
      check(!!armedOrig, 'Original arms when a sub is applied');
      armedOrig.click();
    }
    check(st().progression[1].root === 'G' && !st().substitutions[1] && !st().subBase[1],
      'Original second tap reverts to the base chord');
    window.hideUndoChip(); // dismiss the revert's undo chip; auto-hide path shares this fn
    check(undoChip.hidden === true, 'undo chip hide path clears the chip');
    // XSS: tray text is model-derived and must be escaped
    {
      st().progression[0].root = '<img src=x onerror="window.__xss3=1">';
      st().progression[0].quality = 'zz';
      window.selectChord(0);
      check(tray.innerHTML.indexOf('<img') === -1, 'tray escapes malicious chord text');
      window.loadProgression(0); // restore clean state
    }
    // The sub badge is now a shortcut to the tray — no popover, ever
    {
      const badge = document.querySelector('.sub-badge');
      check(!!badge, 'sub badge still renders');
      badge.click();
      check(st().activeTab === 'voicing' &&
        st().selectedChordIndex === parseInt(badge.dataset.chordIndex) &&
        document.querySelector('.sub-menu') === null,
        'badge opens the voicing-panel tray, no popover');
      window.loadProgression(0);
    }

    // --- Trial subs during playback + A/B compare (spec v3 phase 2) ---
    window.loadProgression(0); // Dm7 G7 Cmaj7 in C, 12-beat loop
    window.setTempo(120);      // deterministic seam timing: 12 beats = 6s
    const tray2 = document.getElementById('voicingSubs');
    const abBtn = document.getElementById('abCompareBtn');
    const drive = (secs) => {
      for (let i = 0; i < Math.ceil(secs / 0.05); i++) { engine().ctx.currentTime += 0.05; window.schedulerTick(); }
    };
    engine().ctx.currentTime = 0; // BEFORE startPlayback (invariant 14)
    await window.startPlayback();
    window.selectChord(1);     // G7 — startPlayback clears selection, so select after
    check(abBtn.disabled === true, 'A/B disabled with no subs applied');
    // A sub chip tap while playing starts a two-pass trial
    tray2.querySelector('.sub-chip[data-key="tritone"]').click();
    check(st().progression[1].root === 'Db' && !!st().trialSub && st().trialSub.passesLeft === 2,
      'chip tap during playback starts a two-pass trial');
    check(tray2.querySelector('.sub-chip--trialing') !== null, 'trialing chip is marked with its pass count');
    check(abBtn.disabled === true, 'A/B stays disabled during a trial');
    drive(6.2); // first seam
    check(!!st().trialSub && st().trialSub.passesLeft === 1 && st().progression[1].root === 'Db',
      'first seam decrements the trial (one pass left)');
    drive(6.2); // second seam
    check(st().trialSub === null && st().progression[1].root === 'G' && !st().substitutions[1],
      'trial auto-reverts after two passes');
    // Trial + keep: tapping the trialing chip commits it
    tray2.querySelector('.sub-chip[data-key="tritone"]').click();
    tray2.querySelector('.sub-chip--trialing').click();
    check(st().trialSub === null && st().substitutions[1] === 'tritone' && st().progression[1].root === 'Db',
      'tapping the trialing chip keeps the sub');
    check(document.getElementById('undoChip').hidden === false, 'keeping shows the undo chip');
    window.hideUndoChip();
    drive(6.2);
    check(st().substitutions[1] === 'tritone' && st().progression[1].root === 'Db',
      'kept sub survives later seams');
    // A/B during playback: per-index swap, never a rebuild. Plant non-zero
    // playback position first — a rebuild would zero both counters.
    st().currentChordIndex = 2;
    st().loopCount = 3;
    window.renderVoicing();
    check(abBtn.disabled === false, 'A/B enabled once a sub is applied');
    abBtn.click();
    check(st().progression[1].root === 'G' && st().compareOriginal === true &&
      st().currentChordIndex === 2 && st().loopCount === 3,
      'A/B shows the original without touching the playback position');
    abBtn.click();
    check(st().progression[1].root === 'Db' && st().compareOriginal === false,
      'A/B toggles back to the subbed version');
    // Original's armed revert flow still works during playback
    tray2.querySelector('.sub-chip[data-key="original"]').click();
    tray2.querySelector('.sub-chip--armed[data-key="original"]').click();
    check(!st().substitutions[1] && st().progression[1].root === 'G',
      'Original armed revert works during playback');
    window.hideUndoChip();
    // Stopping reverts an active trial
    tray2.querySelector('.sub-chip[data-key="tritone"]').click();
    check(st().trialSub !== null, 'fresh trial started for the stop test');
    window.stopAndReset();
    check(st().trialSub === null && st().progression[1].root === 'G',
      'stopping playback reverts an active trial');
    // A trial survives a 12-keys seam, re-derived in the new key
    const autoT2 = document.getElementById('autoTransposeSelect');
    autoT2.value = 'fourths';
    autoT2.dispatchEvent(new window.Event('change'));
    engine().ctx.currentTime = 0;
    await window.startPlayback();
    window.selectChord(1); // select after start (startPlayback clears selection)
    document.getElementById('voicingSubs').querySelector('.sub-chip[data-key="tritone"]').click();
    drive(6.2); // seam: trial decrements, then the key transposes C -> F
    check(st().key === 'F' && !!st().trialSub && st().trialSub.passesLeft === 1,
      'trial survives the 12-keys seam (key now F, one pass left)');
    check(st().progression[1].root === 'Gb' && st().progression[1].substituted === true,
      'trialed sub re-derived in the new key (C7 -> Gb7)');
    window.stopAndReset();
    check(!st().substitutions[1] && st().progression[1].root === 'C',
      'post-transpose revert restores the new-key base chord (C7)');
    autoT2.value = 'off';
    autoT2.dispatchEvent(new window.Event('change'));
    window.loadProgression(0); // back to C, clean slate

    // --- Flavor dial + borrowed tint + tray flavor subs (spec v3 phase 3) ---
    const flavorBtn = document.getElementById('flavorBtn');
    check(!!flavorBtn && flavorBtn.closest('.transport-bar') !== null &&
      st().flavor === 'off', 'flavor chip lives beside the generate control, default off');
    // Tray ordering follows the dial
    window.selectChord(1); // G7 tray open
    const trayChips = () => Array.from(document.querySelectorAll('#voicingSubs .sub-chip'));
    check(trayChips().some(c => c.dataset.key === 'flavor_minor_v') &&
      trayChips().some(c => c.dataset.key === 'flavor_backdoor'),
      'tray offers the flavor subs (minor v, backdoor) even at Off');
    check(!trayChips()[1].dataset.key.startsWith('flavor_'),
      'at Off, functional subs keep the front row');
    flavorBtn.click(); // -> subtle
    check(st().flavor === 'subtle' && flavorBtn.classList.contains('active') &&
      flavorBtn.querySelector('.btn-label').textContent === 'Flavor: Subtle',
      'flavor chip cycles to Subtle (label + active state)');
    check(trayChips()[1].dataset.key.startsWith('flavor_'),
      'with flavor on, borrowed colors surface right after Original');
    flavorBtn.click(); // -> bold
    check(st().flavor === 'bold', 'flavor chip cycles to Bold');
    // Generation at Bold schedules cleanly (statistics live in the unit suite)
    window.generateRandomProgression();
    check(st().progression.length >= 2 && st().sourceNumerals.length === st().progression.length,
      'generation with flavor Bold produces a coherent progression');
    flavorBtn.click(); // -> off
    check(st().flavor === 'off' && !flavorBtn.classList.contains('active'),
      'flavor chip cycles back to Off');
    // Borrowed tint: drive the numeral pipeline directly for determinism
    st().sourceNumerals = ['Imaj7', 'iv7', 'bVII7', 'Imaj7'];
    st().substitutions = [];
    window.buildProgressionFromSource();
    check(st().progression[1].root === 'F' && st().progression[1].quality === 'min7' &&
      st().progression[2].root === 'Bb' && st().progression[2].quality === 'dom7',
      'flavor numerals parse pinned through the build pipeline (Fm7, Bb7 in C)');
    check(document.querySelectorAll('.chord-cell.borrowed').length === 2 &&
      document.querySelectorAll('.pad.borrowed').length === 2,
      'borrowed chords are tinted in the strip and the pads (2 each)');
    check(st().progression[0].borrowed === undefined && st().progression[1].borrowed === true,
      'borrowed flag set from source numerals only where deserved');
    window.loadProgression(0); // clean slate
    check(document.querySelectorAll('.chord-cell.borrowed').length === 0,
      'diatonic progressions carry no borrowed tint');

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

    // --- Phase 2: step transport (Prev/Next chord) ---
    const prevBtn = document.getElementById('prevChordBtn');
    const nextBtn = document.getElementById('nextChordBtn');
    check(prevBtn && prevBtn.tagName === 'BUTTON' && prevBtn.getAttribute('aria-label') === 'Previous chord',
      'Prev chord is a <button> with aria-label');
    check(nextBtn && nextBtn.tagName === 'BUTTON' && nextBtn.getAttribute('aria-label') === 'Next chord',
      'Next chord is a <button> with aria-label');

    // Stopped: stepping moves the selection with wraparound and auditions the chord
    window.loadProgression(0); // 3 chords, playback stopped
    nextBtn.click();
    check(st().selectedChordIndex === 1, 'Next while stopped selects chord 1');
    check(engine().auditionGain !== null, 'stepping while stopped auditions through auditionGain');
    check(engine().sessionGain === null, 'audition never touches sessionGain');
    prevBtn.click();
    prevBtn.click();
    check(st().selectedChordIndex === 2, 'Prev wraps around to the last chord');

    // Playing: stepping jumps playback without stopping it or jumping the loop display
    window.stopAndReset();
    await window.startPlayback();
    const idxBefore = st().currentChordIndex;
    const loopBeforeStep = st().loopCount;
    nextBtn.click();
    check(st().isPlaying === true, 'still playing after step during playback');
    check(st().currentChordIndex === (idxBefore + 1) % st().progression.length,
      'step during playback advances currentChordIndex');
    check(st().loopCount === loopBeforeStep, 'loop display does not jump on step');
    check(engine().schedulerId !== null, 'scheduler still alive after step');
    prevBtn.click();
    check(st().currentChordIndex === idxBefore, 'prev during playback steps back');
    window.stopAndReset();

    // --- Phase 2: dictionary tips ---
    st().dictQuality = 'maj9';
    window.renderDictChordInfo();
    const tipEl = document.getElementById('dictChordTip');
    check(tipEl && !tipEl.hidden && tipEl.textContent.startsWith('Think of it as'),
      'dictionary shows a "Think of it as…" tip for maj9');
    check(tipEl.textContent.includes('Em7'), 'maj9 tip names the min7-on-the-3rd shortcut');
    st().dictQuality = 'maj7'; // no tip drafted for maj7
    window.renderDictChordInfo();
    check(tipEl.hidden === true, 'tip line hidden for a quality without a tip');

    // --- Phase 3: tab bar (exclusive panels) ---
    const tabBar = document.querySelector('.tab-bar');
    check(tabBar && tabBar.getAttribute('role') === 'tablist', 'tab bar present with role=tablist');
    check(document.querySelectorAll('.tab-btn').length === 5, 'five tab buttons (pads + voicing + dictionary + library + settings)');
    const libToggle = document.getElementById('libraryToggle');
    const dictToggle = document.getElementById('dictToggle');
    const settingsToggle = document.getElementById('settingsToggle');
    libToggle.click();
    check(document.getElementById('libraryPanel').classList.contains('visible'), 'library tab opens library panel');
    check(libToggle.getAttribute('aria-selected') === 'true', 'library tab aria-selected');
    dictToggle.click();
    check(document.getElementById('chordDictPanel').classList.contains('visible') &&
      !document.getElementById('libraryPanel').classList.contains('visible'),
      'tabs are exclusive (dictionary closes library)');
    settingsToggle.click();
    check(document.getElementById('settingsPanel').classList.contains('visible'), 'settings tab opens settings panel');
    check(document.getElementById('settingsPanel').contains(document.getElementById('keySelect')) &&
      document.getElementById('settingsPanel').contains(document.getElementById('metroBtn')),
      'key select + metronome relocated into settings panel');
    settingsToggle.click();
    check(st().activeTab === null && !document.getElementById('settingsPanel').classList.contains('visible'),
      'clicking the active tab closes it');
    window.toggleVoicingPanel(true);
    check(st().activeTab === 'voicing' && st().showVoicing === true &&
      document.getElementById('voicingBtn').getAttribute('aria-selected') === 'true',
      'toggleVoicingPanel(true) routes through the voicing tab');
    window.toggleVoicingPanel(false);

    // --- Phase 3: tempo popover in the transport bar ---
    const tempoBtn = document.getElementById('tempoBtn');
    const tempoPopover = document.getElementById('tempoPopover');
    check(tempoBtn && tempoBtn.tagName === 'BUTTON' && tempoPopover.hidden === true,
      'tempo readout button present, popover initially hidden');
    tempoBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
    check(tempoPopover.hidden === false && tempoBtn.getAttribute('aria-expanded') === 'true',
      'tempo button opens the popover');
    document.body.dispatchEvent(new window.Event('click', { bubbles: true }));
    check(tempoPopover.hidden === true && tempoBtn.getAttribute('aria-expanded') === 'false',
      'clicking outside closes the popover');
    window.setTempo(140);
    check(document.getElementById('tempoBtnValue').textContent === '140' &&
      document.getElementById('tempoDisplay').textContent === '140',
      'setTempo updates both the transport readout and the popover display');
    window.setTempo(120);

    // --- Phase 3: transport bar structure ---
    const transport = document.querySelector('.transport-bar');
    check(!!transport && ['prevChordBtn', 'playBtn', 'stopBtn', 'nextChordBtn', 'tempoBtn', 'newBtn']
      .every(id => transport.contains(document.getElementById(id))),
      'transport bar holds play/stop/prev/next/tempo/new');

    // --- Phase 4: bars control ---
    const barsSelect = document.getElementById('barsSelect');
    check(!!barsSelect && document.getElementById('settingsPanel').contains(barsSelect),
      'bars select lives in the settings panel');
    const setBars = (v) => { barsSelect.value = String(v); barsSelect.dispatchEvent(new window.Event('change')); };
    setBars(6);
    check(st().bars === 6 && st().progression.length === 6, '6 bars generates 6 chords');
    check(document.querySelectorAll('.beat-dot').length === 6 * st().beatsPerChord,
      'beat dots follow the new length');
    setBars(2);
    check(st().progression.length === 2, '2 bars generates 2 chords');
    // Changing bars during playback keeps playing on the new progression
    await window.startPlayback();
    setBars(8);
    check(st().isPlaying === true && st().progression.length === 8 && engine().schedulerId !== null,
      'bars change during playback: still playing, 8 chords, scheduler alive');
    window.stopAndReset();
    setBars(4);
    check(st().bars === 4 && st().progression.length === 4, 'bars restores to default 4');

    // Any generated secondary dominant reaching the DOM renders with its V7/x
    // numeral and resolves next door (probe a few hundred generations).
    let sawSecondary = false, secondaryOk = true;
    for (let g = 0; g < 300 && !sawSecondary; g++) {
      window.generateRandomProgression();
      const idx = st().sourceNumerals.findIndex(nm => nm.includes('/'));
      if (idx !== -1) {
        sawSecondary = true;
        const target = st().sourceNumerals[idx].split('/')[1];
        // Quality must stay in the dominant pool: dom-family, or the pool's
        // rare deliberate triad floor ('maj' — still dominant function on
        // V/x). The >=90% dom-family distribution is asserted statistically
        // in test_voice_leading.js where N is large enough not to flake.
        const q = st().progression[idx].quality;
        secondaryOk = st().sourceNumerals[idx + 1] === target &&
          (q.startsWith('dom') || q === 'maj') &&
          document.querySelectorAll('.chord-box').length === st().progression.length;
      }
    }
    check(sawSecondary && secondaryOk, 'a generated V7/x parses dominant, resolves next door, and renders');
    window.loadProgression(0);

    // --- Phase 5: as-written library loading ---
    const libIndex = (frag) => window.eval('PROGRESSION_LIBRARY').findIndex(p => p.name.includes(frag));
    const chip = document.getElementById('asWrittenChip');
    const autumnIdx = libIndex('Autumn Leaves');
    window.loadProgression(autumnIdx);
    check(st().key === 'Bb' && document.getElementById('keySelect').value === 'Bb',
      'Autumn Leaves opens in its original key (Bb), key select follows');
    check(st().asWritten === true && chip.hidden === false, 'as-written chip shows on library load');
    check(st().progression.map(c => c.quality).join(',') === 'min7,dom7,maj7,maj7,m7b5,dom7b9,min7',
      'Autumn Leaves qualities reproduce the chart');
    // Leaving the original key resumes normal behavior and clears the chip
    const keySel = document.getElementById('keySelect');
    keySel.value = 'C';
    keySel.dispatchEvent(new window.Event('change'));
    check(st().asWritten === false && chip.hidden === true, 'key change clears as-written');
    check(st().progression.map(c => c.root).join(' ') === 'D G C F B E A',
      'as-written chart transposes like any progression (Bb->C roots: ' + st().progression.map(c => c.root).join(' ') + ')');
    window.loadProgression(autumnIdx);
    const cxSel = document.getElementById('complexitySelect');
    cxSel.value = 'extended';
    cxSel.dispatchEvent(new window.Event('change'));
    check(st().asWritten === false && chip.hidden === true, 'complexity change clears as-written');
    cxSel.value = 'seventh';
    cxSel.dispatchEvent(new window.Event('change'));
    window.loadProgression(0); // ii-V-I exercise: original key C
    check(st().key === 'C' && chip.hidden === false, 'exercises open as written in C');

    // --- Phase 5: saved progressions (localStorage round-trips) ---
    window.localStorage.removeItem('chordflow.savedProgressions.v1');
    window.renderSavedProgressions();
    check(document.getElementById('savedEmpty').hidden === false, 'empty state shows before any save');

    // Save a specific, mutated state: Autumn Leaves + tritone sub + key change
    window.loadProgression(autumnIdx);
    window.applySubstitution(1, window.getChordSubstitutions(st().progression[1].root, st().progression[1].quality)[0]);
    const snapshot = {
      numerals: JSON.stringify(st().sourceNumerals), key: st().key, mode: st().mode,
      complexity: st().complexity, density: st().density,
      subs: JSON.stringify(st().substitutions), bars: st().bars
    };
    const savedEntry = window.saveCurrentProgression('Smoke Test Tune');
    check(!!savedEntry && document.querySelectorAll('.saved-item').length === 1,
      'save persists and renders one saved item');

    // Mutate everything, then load back and compare verbatim
    window.generateRandomProgression();
    keySel.value = 'E'; keySel.dispatchEvent(new window.Event('change'));
    const loadedOk = window.loadSavedProgression(savedEntry.id);
    check(loadedOk === true, 'saved progression loads by id');
    check(JSON.stringify(st().sourceNumerals) === snapshot.numerals &&
      st().key === snapshot.key && st().mode === snapshot.mode &&
      st().complexity === snapshot.complexity && st().density === snapshot.density &&
      JSON.stringify(st().substitutions) === snapshot.subs && st().bars === snapshot.bars,
      'load restores every field verbatim (numerals, key, mode, complexity, density, subs, bars)');
    check(st().progression[1].substituted === true, 'stored substitution re-applies on load');
    check(document.getElementById('keySelect').value === snapshot.key &&
      document.getElementById('complexitySelect').value === snapshot.complexity,
      'selects sync to the restored state');

    // Rename + export + delete + import
    check(window.renameSavedProgression(savedEntry.id, 'Renamed Tune') === true &&
      document.querySelector('.saved-name').textContent === 'Renamed Tune', 'rename persists and re-renders');
    const exported = window.exportSavedProgressionsJson();
    check(JSON.parse(exported).savedProgressions.length === 1, 'export emits valid JSON');
    check(window.deleteSavedProgression(savedEntry.id) === true &&
      document.querySelectorAll('.saved-item').length === 0 &&
      document.getElementById('savedEmpty').hidden === false, 'delete removes the item');
    check(window.importSavedProgressionsJson(exported) === 1 &&
      document.querySelectorAll('.saved-item').length === 1, 'import restores from exported JSON');
    check(window.importSavedProgressionsJson('not json at all') === -1, 'garbage import is rejected');
    window.localStorage.removeItem('chordflow.savedProgressions.v1');

    // Storage-unavailable degradation: force the probe to fail
    window.eval('var __realStorageAvailable = storageAvailable; storageAvailable = function(){ return false; };');
    window.renderSavedProgressions();
    check(document.getElementById('savedUnavailable').hidden === false,
      'blocked storage degrades to "saving unavailable"');
    window.eval('storageAvailable = __realStorageAvailable;');
    window.renderSavedProgressions();
    window.loadProgression(0);

    // --- Comping grooves + swing ---
    const grooveSelect = document.getElementById('grooveSelect');
    const swingBtn = document.getElementById('swingBtn');
    check(!!grooveSelect && document.getElementById('settingsPanel').contains(grooveSelect) &&
      swingBtn && swingBtn.tagName === 'BUTTON', 'comping select + swing toggle live in settings');
    grooveSelect.value = 'charleston';
    grooveSelect.dispatchEvent(new window.Event('change'));
    swingBtn.click();
    check(st().groove === 'charleston' && st().swing === true, 'groove and swing state track the controls');
    window.stopAndReset();
    await window.startPlayback();
    engine().ctx.currentTime = 0;
    for (let i = 0; i < 40; i++) { engine().ctx.currentTime += 0.05; window.schedulerTick(); window.visualSync(); }
    check(st().isPlaying === true && errors.length === 0, 'charleston+swing playback schedules without errors');
    window.stopAndReset();
    swingBtn.click();
    grooveSelect.value = 'block';
    grooveSelect.dispatchEvent(new window.Event('change'));

    // --- Left-hand modes (bassist mode) ---
    const lhSelect = document.getElementById('leftHandSelect');
    check(!!lhSelect && document.getElementById('settingsPanel').contains(lhSelect),
      'left-hand select lives in settings');
    const lhNotesEl = document.getElementById('leftHandNotes');
    const rhNotesEl = document.getElementById('rightHandNotes');
    window.renderVoicing();
    const rootsLhText = lhNotesEl.textContent;
    const rootsRhText = rhNotesEl.textContent;

    lhSelect.value = 'shells';
    lhSelect.dispatchEvent(new window.Event('change')); // listener re-renders the panel
    check(st().leftHand === 'shells', 'left-hand select drives state');
    check(lhNotesEl.textContent !== rootsLhText && /\d/.test(lhNotesEl.textContent),
      'shells re-realize the LH (guide tones shown with octaves)');
    check(rhNotesEl.textContent === rootsRhText, 'RH voicing identical across LH modes');

    lhSelect.value = 'rootless';
    lhSelect.dispatchEvent(new window.Event('change'));
    check(lhNotesEl.textContent.indexOf('bass / backing track') !== -1,
      'rootless LH shows the bassist hint instead of notes');
    const rootlessSvg = document.querySelector('#pianoKeyboard svg');
    check(!!rootlessSvg && (rootlessSvg.innerHTML.match(/var\(--accent-coral\)/g) || []).length === 0 &&
      (rootlessSvg.innerHTML.match(/var\(--accent-blue\)/g) || []).length >= 3,
      'piano renders RH-only highlights in rootless mode');

    // Playback, audition and pads all flow through chordPitchesAt and must
    // schedule cleanly with an empty LH.
    await window.startPlayback();
    engine().ctx.currentTime = 0;
    for (let i = 0; i < 40; i++) { engine().ctx.currentTime += 0.05; window.schedulerTick(); window.visualSync(); }
    check(st().isPlaying === true && errors.length === 0, 'rootless playback schedules without errors');
    window.stopAndReset();
    window.auditionChord(0);
    check(engine().auditionGain !== null, 'audition fires in rootless mode');
    window.padPress(0);
    check(engine().padVoices[0] != null, 'pads fire in rootless mode');
    window.padReleaseAll();

    lhSelect.value = 'roots';
    lhSelect.dispatchEvent(new window.Event('change'));
    check(st().leftHand === 'roots' && lhNotesEl.textContent === rootsLhText,
      'roots mode restores the original LH');

    // --- Two-hand rootless (evans) + backing bass ---
    lhSelect.value = 'evans';
    lhSelect.dispatchEvent(new window.Event('change'));
    check(st().leftHand === 'evans' && Array.isArray(st().lhVoicingIndices),
      'two-hand rootless selectable; LH shape indices computed');
    check(/\d/.test(lhNotesEl.textContent) && lhNotesEl.textContent !== rootsLhText,
      'evans shows a tenor-range LH voicing');
    check(rhNotesEl.textContent === rootsRhText, 'evans leaves the RH unchanged');
    const evansSvg = document.querySelector('#pianoKeyboard svg');
    check(!!evansSvg && (evansSvg.innerHTML.match(/var\(--accent-coral\)/g) || []).length >= 2,
      'piano highlights the evans LH voicing');

    // Backing bass: spy on synthNote midis. Rootless without the bass toggle
    // schedules nothing below C3; with it, the stand-in root lands in C2-B2.
    window.eval('var __synthReal = synthNote; var __schedMidis = []; synthNote = function(m,t,d,v,g){ __schedMidis.push(m); return __synthReal(m,t,d,v,g); };');
    lhSelect.value = 'rootless';
    lhSelect.dispatchEvent(new window.Event('change'));
    const bassBtn = document.getElementById('bassBackingBtn');
    check(!!bassBtn && st().bassBacking === false, 'backing bass starts off');
    // Zero the mock clock BEFORE starting: startPlayback anchors nextBeatTime
    // to the current clock, so rewinding afterwards would stall the scheduler.
    engine().ctx.currentTime = 0;
    await window.startPlayback();
    for (let i = 0; i < 20; i++) { engine().ctx.currentTime += 0.05; window.schedulerTick(); }
    const lowWithoutBass = window.eval('__schedMidis').filter(m => m < 48).length;
    check(lowWithoutBass === 0, 'rootless playback schedules nothing in the bass register');
    bassBtn.click();
    check(st().bassBacking === true && bassBtn.querySelector('.btn-label').textContent === 'Bass: On',
      'backing bass toggles on');
    window.eval('__schedMidis.length = 0;');
    for (let i = 0; i < 40; i++) { engine().ctx.currentTime += 0.05; window.schedulerTick(); }
    const allSched = window.eval('__schedMidis');
    const bassNotes = allSched.filter(m => m >= 36 && m < 48);
    check(bassNotes.length > 0 && errors.length === 0,
      'backing bass sustains a C2-B2 root under rootless playback' +
      (bassNotes.length ? '' : ` [scheduled ${allSched.length} notes, none low; errors: ${errors.join('; ') || 'none'}]`));
    window.stopAndReset();
    window.eval('synthNote = __synthReal;');
    bassBtn.click(); // bass off
    lhSelect.value = 'roots';
    lhSelect.dispatchEvent(new window.Event('change'));
    check(st().bassBacking === false && st().leftHand === 'roots',
      'bass + left hand restored to defaults');

    // --- 3-octave mode (Reface window C2-C5) ---
    const rangeSelect = document.getElementById('rangeSelect');
    check(!!rangeSelect && document.getElementById('settingsPanel').contains(rangeSelect),
      'range select lives in settings');
    const whiteKeys = () => (document.querySelector('#pianoKeyboard svg').innerHTML.match(/height="96"/g) || []).length;
    window.renderVoicing();
    check(whiteKeys() === 29, 'full mode renders the C2-C6 piano (29 white keys)');
    rangeSelect.value = 'reface';
    rangeSelect.dispatchEvent(new window.Event('change')); // listener recomputes + re-renders
    check(st().range === 'reface', 'range select drives state');
    check(whiteKeys() === 22, 'reface mode renders exactly the 37-key C2-C5 window (22 white keys)');
    check(document.getElementById('voicingDescription').textContent.indexOf('3-octave window') !== -1,
      'voicing description names the 3-octave window');
    // Every chord's recomputed voicing fits the window, in every LH mode
    const refaceWin = { low: 36, high: 72 };
    const fitsWindow = () => st().progression.every((c, i) =>
      ['roots', 'shells', 'evans', 'rootless'].every(mode => {
        const d = window.getChordNotesAtIndex(c.root, c.quality, st().complexity,
          st().voicingIndices[i], st().voicingShifts[i],
          { leftHandMode: mode, lhIndex: (st().lhVoicingIndices || [])[i] || 0, range: refaceWin });
        return d.leftHandPitches.concat(d.rightHandPitches)
          .every(p => p.midi >= refaceWin.low && p.midi <= refaceWin.high);
      }));
    check(fitsWindow(), 'recomputed voicings fit C2-C5 in all LH modes');
    // Manual voicing cycling must not escape the window
    window.selectChord(1);
    window.selectChord(1); // second select cycles the voicing + re-anchors its shift
    check(fitsWindow(), 'manually cycled voicing stays inside the window');
    // Playback schedules cleanly under the window
    engine().ctx.currentTime = 0;
    await window.startPlayback();
    for (let i = 0; i < 20; i++) { engine().ctx.currentTime += 0.05; window.schedulerTick(); }
    check(st().isPlaying === true && errors.length === 0, 'reface-mode playback schedules without errors');
    window.stopAndReset();
    rangeSelect.value = 'full';
    rangeSelect.dispatchEvent(new window.Event('change'));
    window.renderVoicing();
    check(st().range === 'full' && whiteKeys() === 29, 'full range restores the C2-C6 piano');

    // --- Flashcard mode: hide chord symbols ---
    const hideBtn = document.getElementById('hideSymbolsBtn');
    hideBtn.click();
    check(st().hideSymbols === true &&
      document.getElementById('chordContainer').classList.contains('symbols-hidden'),
      'hide-symbols toggles the flashcard class');
    check(document.querySelectorAll('.chord-numeral').length > 0, 'numerals stay for flashcard practice');
    hideBtn.click();
    check(st().hideSymbols === false &&
      !document.getElementById('chordContainer').classList.contains('symbols-hidden'),
      'symbols come back');

    // --- Practice loop boundary: 12-keys transposer + tempo ramp ---
    window.stopAndReset();
    window.loadProgression(0); // as-written: key C
    keySel.value = 'C'; keySel.dispatchEvent(new window.Event('change')); // clear as-written, stay in C
    window.setTempo(120);
    const atSel = document.getElementById('autoTransposeSelect');
    const rampSel = document.getElementById('tempoRampSelect');
    atSel.value = 'fourths'; atSel.dispatchEvent(new window.Event('change'));
    rampSel.value = '5'; rampSel.dispatchEvent(new window.Event('change'));
    // Record every scheduled note with the key active at schedule time, to
    // prove the old key never bleeds across the transpose seam (the bug was
    // the wrap beat getting scheduled in the old key ~120ms early, doubling
    // beat one of the new loop).
    window.eval('window.__synthLog = []; var __realSynthNote = synthNote;' +
      'synthNote = function (m, t, d, v, dest, perc) { window.__synthLog.push({ t: t, key: state.key }); };');
    await window.startPlayback();
    engine().ctx.currentTime = 0;
    let g2 = 0;
    while (st().key === 'C' && g2++ < 20000) {
      engine().ctx.currentTime += 0.05;
      window.schedulerTick();
      window.visualSync();
    }
    check(st().key === 'F' && document.getElementById('keySelect').value === 'F',
      '12-keys practice transposes C -> F at the loop boundary');
    check(st().tempo === 125, 'tempo ramp adds +5 BPM at the boundary (120 -> ' + st().tempo + ')');
    check(st().isPlaying === true && engine().schedulerId !== null, 'playback survives the transpose');
    check(st().progression.map(c => c.root).join(' ') === 'G C F',
      'progression re-derived in F: G C F (got ' + st().progression.map(c => c.root).join(' ') + ')');
    // Seam cleanliness: the last C-key note and the first F-key note must be
    // a full chord apart (block groove, 4 beats @120 = 2s). The old bug put a
    // C-key downbeat ~0.06s before the F one.
    {
      const log = window.__synthLog;
      const fTimes = log.filter(e => e.key === 'F').map(e => e.t);
      const cTimes = log.filter(e => e.key === 'C').map(e => e.t);
      const firstF = Math.min.apply(null, fTimes);
      const lastC = Math.max.apply(null, cTimes);
      check(fTimes.length > 0 && cTimes.length > 0 && firstF - lastC > 1.0,
        'clean seam: no old-key audio doubles the new downbeat (gap ' + (firstF - lastC).toFixed(2) + 's)');
    }
    // The loop display lags to audible time by design: drain the queue past
    // the seam and confirm it climbs instead of resetting.
    for (let i = 0; i < 50 && st().loopCount < 2; i++) {
      engine().ctx.currentTime += 0.05;
      window.schedulerTick();
      window.visualSync();
    }
    check(st().loopCount >= 2, 'loop count keeps climbing across the transpose (loop ' + st().loopCount + ')');
    // Second boundary: F -> Bb, +5 more BPM
    let g3 = 0;
    while (st().key === 'F' && g3++ < 20000) {
      engine().ctx.currentTime += 0.05;
      window.schedulerTick();
      window.visualSync();
    }
    check(st().key === 'Bb' && st().tempo === 130, 'second loop: F -> Bb, tempo 130');
    window.eval('synthNote = __realSynthNote;'); // restore the real synth
    window.stopAndReset();
    atSel.value = 'off'; atSel.dispatchEvent(new window.Event('change'));
    rampSel.value = '0'; rampSel.dispatchEvent(new window.Event('change'));
    window.setTempo(120);
    keySel.value = 'C'; keySel.dispatchEvent(new window.Event('change'));
    window.loadProgression(0);

    // --- Tap-to-play pads ---
    const padsToggle = document.getElementById('padsToggle');
    check(!!padsToggle && document.querySelectorAll('.tab-btn').length === 5, 'pads tab present (5 tabs)');
    window.loadProgression(0); // 3-chord progression
    padsToggle.click();
    check(st().activeTab === 'pads' && document.getElementById('padsPanel').classList.contains('visible'),
      'pads tab opens the pads panel');
    check(document.querySelectorAll('.pad').length === 3, 'one pad per chord (3)');
    check(document.querySelector('.pad .pad-symbol').textContent.length > 0, 'pads render the chord symbol');
    // grid column count adapts to the progression length
    check(document.getElementById('padGrid').dataset.count === '3', 'pad grid tags its chord count for layout');

    // XSS regression (review finding #1): a chord degree carrying markup (as an
    // imported saved progression's numeral can) must render as text, not HTML,
    // in both the pad grid and the chord strip.
    {
      const evil = '<img src=x onerror="window.__xss=1">';
      st().progression[0].degree = evil;
      window.renderChordStructure();
      check(!window.eval('window.__xss'), 'chord degree with markup does not execute (escaped)');
      check(document.querySelector('.pad-numeral').innerHTML.indexOf('<img') === -1 &&
        document.querySelector('.chord-numeral').innerHTML.indexOf('<img') === -1,
        'degree markup is escaped in pad grid and chord strip');
      check(document.querySelector('.pad-numeral').textContent.indexOf('<img') === 0,
        'escaped degree still shows as literal text');
      // The same vector reaches ${symbol}: an imported entry's key becomes the
      // chord root on the unknown-numeral fallback, and formatNoteDisplay
      // returns strings without '#'/'b' verbatim. It must be escaped too.
      st().progression[0].root = evil;
      st().progression[0].quality = 'zz'; // unknown quality -> symbol is just the root
      window.renderChordStructure();
      check(document.querySelector('.pad-symbol').innerHTML.indexOf('<img') === -1 &&
        document.querySelector('.chord-symbol').innerHTML.indexOf('<img') === -1,
        'chord symbol built from a malicious root is escaped in pad grid and chord strip');
      window.loadProgression(0); // restore clean state (also closes the tab)
      padsToggle.click();        // reopen pads for the remaining pad checks
    }

    // One-shot: press opens a voice; a plain finger-up leaves it ringing AND
    // tracked so a re-tap can cut it (rather than stacking a second voice).
    check(st().padMode === 'oneshot', 'default trigger mode is one-shot');
    window.padPress(1);
    check(engine().padVoices[1] != null, 'pad press opens a voice');
    check(engine().sessionGain === null, 'pads never touch the playback sessionGain');
    window.padRelease(1);
    check(engine().padVoices[1] != null, 'one-shot finger-up leaves the voice ringing');
    // Re-tap cuts the previous voice instead of stacking (review finding #2):
    // padPress -> padRelease(_, true) must damp the old gain (cancelScheduledValues)
    // and the slot must hold exactly the new voice.
    const prevVoice = engine().padVoices[1];
    let prevCut = false;
    const origCancel = prevVoice.gain.cancelScheduledValues.bind(prevVoice.gain);
    prevVoice.gain.cancelScheduledValues = (t) => { prevCut = true; return origCancel(t); };
    window.padPress(1);
    check(prevCut === true, 'one-shot re-tap cuts the previous voice (no stacking)');
    check(engine().padVoices[1] !== prevVoice && Object.keys(engine().padVoices).length === 1,
      're-tap keeps a single voice for the pad');
    window.padReleaseAll();
    check(Object.keys(engine().padVoices).length === 0, 'padReleaseAll frees ringing one-shot voices');

    // Ring-out self-cleanup (review finding: this timer path was untested).
    // padRingCleanup is what padPress's timer calls; drive it directly. It must
    // wait for the audio clock (a slow resume() shifts the tail later than the
    // wall-clock timer), free the slot + disconnect once the tail is over, and
    // never touch a newer voice that superseded the one it was armed with.
    window.padPress(1);
    const ringVoice = engine().padVoices[1];
    let ringDisconnected = false;
    ringVoice.disconnect = () => { ringDisconnected = true; };
    window.padRingCleanup(1, ringVoice, engine().ctx.currentTime + 5); // audio clock hasn't reached the tail's end
    check(engine().padVoices[1] === ringVoice && !ringDisconnected,
      'ring cleanup re-arms instead of clipping a tail the audio clock says is still sounding');
    window.padRingCleanup(1, ringVoice, engine().ctx.currentTime); // tail is over
    check(engine().padVoices[1] == null && ringDisconnected,
      'ring-out cleanup frees the slot and disconnects the voice');
    window.padPress(1);
    const staleVoice = engine().padVoices[1];
    window.padPress(1); // retrigger: staleVoice was cut, the slot holds the new voice
    window.padRingCleanup(1, staleVoice, 0);
    check(engine().padVoices[1] != null && engine().padVoices[1] !== staleVoice,
      'a stale ring cleanup leaves the newer voice untouched');
    window.padReleaseAll();

    // Hold: voice stays while held, damped on release.
    document.getElementById('padModeBtn').click();
    check(st().padMode === 'hold' && document.querySelector('#padModeBtn .btn-label').textContent === 'Trigger: Hold',
      'trigger toggles to hold');
    window.padPress(0);
    check(engine().padVoices[0] != null, 'held pad sounds while pressed');
    window.padPress(2); // polyphony: a second pad without releasing the first
    check(engine().padVoices[0] != null && engine().padVoices[2] != null, 'pads are polyphonic (two held at once)');
    window.padRelease(0);
    window.padRelease(2);
    check(engine().padVoices[0] == null && engine().padVoices[2] == null, 'hold release damps and frees both');

    // A voice follows the mode it was STRUCK in (captured as g.padHold), not
    // whatever state.padMode reads at release time: a hold-struck voice whose
    // release arrives after a mode change must still damp and free its slot.
    window.padPress(0);
    st().padMode = 'oneshot'; // change mode out from under the held voice
    window.padRelease(0);
    check(engine().padVoices[0] == null, 'hold-struck voice damps on release even after a mode change');
    st().padMode = 'hold'; // restore for the remaining hold checks

    // Retrigger the same pad doesn't leak a voice
    window.padPress(1); window.padPress(1);
    check(Object.keys(engine().padVoices).length === 1, 'retrigger reuses one slot (no voice leak)');
    // Leaving the pads tab silences everything
    padsToggle.click();
    check(st().activeTab === null && Object.keys(engine().padVoices).length === 0,
      'leaving the pads tab releases all pads');
    document.getElementById('padModeBtn').click(); // back to one-shot
    window.loadProgression(0);

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
