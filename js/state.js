// state.js — application state, buildProgressionFromSource, generate/load progressions.
    // ============================================
    // APPLICATION STATE
    // ============================================

    const state = {
      isPlaying: false,
      currentChordIndex: 0,
      selectedChordIndex: null, // For click-to-select voicing view
      currentBeat: 0,
      tempo: 120,
      beatsPerChord: 4,
      key: 'C',
      mode: 'major',
      complexity: 'seventh',
      bars: 4,            // random-generation length in bars (one chord per bar), 2-8
      progression: [],
      sourceNumerals: [],   // roman numerals the progression was built from (for transpose)
      substitutions: [],    // per-index applied substitution type, e.g. 'tritone' (for re-derivation)
      subBase: [],          // per-index pre-substitution chord (restore point for revert/undo)
      armedSub: null,       // sub tray: chip awaiting its confirm tap ({index, key} | null)
      trialSub: null,       // playback trial: {index, type, prevType, passesLeft} | null
      compareOriginal: false, // A/B: true = progression shows base chords, subs shelved
      progressionName: '',
      progressionStyle: '',
      loadedSavedId: null, // id of the saved progression on screen, or null.
                           // Only an explicit Update writes back to it.
      asWritten: false,   // library tune shown in its original key/qualities (5.1)
      loopCount: 1,
      showVoicing: false,
      activeTab: null,    // which tab panel is open: 'voicing'|'dictionary'|'library'|'settings'|null
      metronomeOn: false,
      groove: 'block',    // comping pattern: block|charleston|bossa|pulse
      swing: false,       // swing off-beat eighths in the groove
      autoTranspose: 'off', // per-loop 12-keys practice: off|fourths|chromatic
      tempoRamp: 0,       // BPM added per completed loop (0 = off)
      hideSymbols: false, // flashcard mode: hide chord letter symbols
      padMode: 'oneshot', // tap-to-play trigger: 'oneshot' (rings out) | 'hold'
      leftHand: 'mixed',  // LH realization: mixed(default, voice-led)|roots|shells|rootless|evans|bassonly
      bassBacking: false, // rootless playback: sustain a stand-in bass root
      octaveRoots: true,  // Sound setting: double a lone LH bass root an octave down (stride/gospel).
                          // ON by default (owner, 2026-07-28) — the octave is the norm in
                          // solo/stride playing, and a bare single root reads thin under a voicing.
      lhVoicingIndices: [], // per-chord LH index, DP-chosen; meaning depends on
                            // leftHand: evans = rootless shape index, mixed =
                            // candidate id (0 root / 1 shell / 2 R+3 / 3 R+7)
      range: 'full',      // keyboard window: 'full' | 'reface' (3 octaves, C2-C5)
      flavor: 'off',      // generation color: off|subtle|bold (borrowed/mediant vocabulary)
      density: 1.0,       // per-progression sparsity character (2.4); rolled on new/load
      voicingIndices: [], // Track which voicing is selected for each chord
      voicingShifts: [], // Octave placement (in semitones) for each chord's right hand
      // Chord dictionary state
      dictRoot: 'C',
      dictCategory: 'triads',
      dictQuality: 'maj'
    };

    // ============================================
    // PROGRESSION GENERATION
    // ============================================

    /**
     * Build state.progression from state.sourceNumerals in the CURRENT key,
     * mode, and complexity, then re-apply any stored substitutions (re-derived
     * so they transpose with the key). This is the single path used by random
     * generation, library loads, and key/complexity changes — so changing the
     * key transposes the same progression instead of replacing it, and applied
     * substitutions survive the change.
     */
    function buildProgressionFromSource() {
      const { key, mode, complexity, density } = state;
      state.progression = state.sourceNumerals.map(n => parseRomanNumeral(n, key, mode, complexity, density));

      // --- Cadential awareness (2.3) ---
      // Per-chord randomness alone produces whiplash (triad -> 13b9 -> triad).
      // We can't see neighbors inside parseRomanNumeral, but here we can: a
      // dominant that resolves to a tonic-function chord (next chord, wrapping
      // the loop) is CADENTIAL and keeps its full color; other chords may relax
      // a tier so the tension is coloured and the stability simplified.
      const n = state.progression.length;
      const isDomFamily = q => /^dom(7|9|13)/.test(q);
      const relaxProb = density < 1.0 ? 0.6 : 0.3;
      for (let i = 0; i < n; i++) {
        if (state.substitutions[i]) continue;          // re-applied below; leave it
        const chord = state.progression[i];
        const next = state.progression[(i + 1) % n];
        const nextIsTonic = next.root === key || /^[Ii]$/.test(next.degree || '');
        if (isDomFamily(chord.quality) && nextIsTonic) continue;  // cadential: keep color
        // A secondary dominant is cadential TO ITS TARGET: V7/x resolving to x
        // keeps its color just like V7 resolving to I (Phase 4).
        const src = state.sourceNumerals[i];
        if (isDomFamily(chord.quality) && typeof src === 'string' && src.includes('/')) {
          const targetRoot = parseBasicNumeral(src.split('/')[1], key, mode, 'simple').root;
          if (next.root === targetRoot) continue;
        }
        if (Math.random() < relaxProb) {
          // Re-pick from the same pool with the below-tier weights doubled
          // (halving density doubles downScale), biasing toward simpler colour.
          state.progression[i] = parseRomanNumeral(
            state.sourceNumerals[i], key, mode, complexity, density * 0.5);
        }
      }

      // Borrowed-chord tint: chords whose SOURCE numeral sits outside the home
      // mode (iv7, v7, bVII7, mediants, passing dims) get a flag the renderers
      // turn into a class — teaches the color while you play. Substituted
      // chords below intentionally lose it (the sub marker takes over).
      for (let i = 0; i < n; i++) {
        if (isBorrowedNumeral(state.sourceNumerals[i], mode)) {
          state.progression[i].borrowed = true;
        }
      }

      // Re-apply substitutions by re-deriving them from each new base chord, so
      // a tritone sub of E7 becomes the tritone sub of the transposed chord. If
      // a stored substitution no longer applies (e.g. the quality changed with
      // complexity), it's silently dropped back to the base chord. The fresh
      // base is snapshotted into subBase so revert/undo/audition can reach the
      // un-substituted chord without another rebuild (invariant 15).
      state.subBase = [];
      state.armedSub = null; // rebuilt progression invalidates any armed chip
      // A rebuild re-applies the stored subs below (the "B" state), so an
      // active A/B compare must end here or the flag would lie about what's
      // sounding. Trials deliberately SURVIVE rebuilds: a key change or
      // 12-keys seam re-derives the trialed sub via the same re-apply block.
      state.compareOriginal = false;
      state.substitutions.forEach((subType, i) => {
        if (!subType || i >= state.progression.length) return;
        const base = state.progression[i];
        const match = getChordSubstitutions(base.root, base.quality).find(o => o.type === subType);
        if (match) {
          state.subBase[i] = base;
          state.progression[i] = {
            root: match.root,
            quality: match.quality,
            degree: base.degree,
            substituted: true
          };
        } else {
          state.substitutions[i] = null;
        }
      });

      state.currentChordIndex = 0;
      state.selectedChordIndex = null;
      state.currentBeat = 0;
      state.loopCount = 1;

      recomputeProgressionVoicings();
      if (state.isPlaying) resetPlaybackClock();

      renderChordStructure();
      updateProgress();
      if (state.showVoicing) {
        renderVoicing();
      }
      // Every progression change funnels through here — generate, library load,
      // saved load, key/mode/complexity/bars change, the 12-keys seam — so one
      // hook covers them all instead of a call appended to each caller.
      updateSavedControls();
      scheduleSessionSave();
    }

    // ============================================
    // RANDOM GENERATION — light phrase model (Phase 4)
    // ============================================

    /**
     * Degree pools by phrase position. First chord leans tonic (ii/IV openings
     * at lower weight), last chord is cadential (tonic, or dominant-function
     * for a turnaround feel), interior draws from the full degree pool.
     */
    const PHRASE_POOLS = {
      major: {
        first: [['I', 6], ['ii', 1.2], ['IV', 1.2], ['vi', 0.8]],
        interior: [['ii', 3], ['IV', 3], ['V', 3], ['vi', 3], ['I', 2], ['iii', 1.5]],
        last: [['I', 5], ['V', 2]]
      },
      minor: {
        first: [['i', 6], ['iv', 1.2], ['VI', 0.8]],
        interior: [['iv', 3], ['VII', 2.5], ['VI', 2.5], ['III', 2], ['i', 2], ['V', 2], ['v', 1], ['ii', 1]],
        last: [['i', 5], ['V', 2]]
      }
    };

    // Degrees a secondary dominant may tonicize (spec: ii, IV, V, vi — never a
    // diminished target, so minor's ii° is excluded; minor-mode analogues are
    // iv, V and VI).
    const SECONDARY_TARGETS = {
      major: ['ii', 'IV', 'V', 'vi'],
      minor: ['iv', 'V', 'VI']
    };

    /**
     * Build a random progression as roman numerals: `bars` chords (one per
     * bar) from the phrase pools, then a secondary-dominant pass that converts
     * the chord BEFORE a tonicizable degree into `V7/<target>` — conversion
     * (not insertion) keeps the length exactly `bars`. Pure: no state/DOM.
     *
     * Secondary-dominant rules (Phase 4):
     * - probability scales with density (rarer in sparse progressions)
     * - target must immediately follow (guaranteed by conversion)
     * - phrase-interior only (never the opening chord, never the final chord)
     * - at most one per 4 bars; two allowed in 7-8 bar progressions
     */
    // FLAVOR WEIGHTS: tuned by ear — owner to veto/adjust. Per-slot conversion
    // probabilities for the flavor pass; 'subtle' sticks to modal interchange
    // and the backdoor, 'bold' unlocks mediants, passing dims and the
    // deceptive ending.
    // These are CONDITIONAL probabilities — the roll only happens on a slot that
    // already fits the rule (an interior IV for `iv`, a final tonic for
    // `deceptive`, and so on). The original values read like ordinary odds but
    // compounded with how rarely a 4-bar phrase offers an eligible interior
    // slot at all, so Bold delivered a borrowed chord in under a third of
    // progressions and the mediants/passing dims it exists to unlock showed up
    // in ~0%. Measured ceiling (every eligible slot converting) is 92% at 4
    // bars, so there was headroom; these are set against that ceiling.
    //
    // The cadence rules stay deliberately lower than the interior ones. They
    // are decided FIRST and spend from the same budget, so at parity they
    // monopolise it — at the ceiling the deceptive ending alone took 74% of
    // progressions and starved everything else.
    // FLAVOR WEIGHTS: tuned by ear — owner to veto/adjust.
    //
    // These are CONDITIONAL probabilities — the roll only happens on a slot that
    // already fits the rule (an interior IV for `iv`, a final tonic for
    // `deceptive`, and so on). The original values read like ordinary odds but
    // compounded with how rarely a 4-bar phrase offers an eligible interior
    // slot at all, so Bold delivered a borrowed chord in under a third of
    // progressions and the mediants/passing dims it exists to unlock showed up
    // in ~0%. Measured ceiling (every eligible slot converting) is 92% at 4
    // bars, so there was headroom; these are set against that ceiling.
    //
    // The cadence rules stay deliberately lower than the interior ones. They
    // are decided FIRST and spend from the same budget, so at parity they
    // monopolise it — at the ceiling the deceptive ending alone took 74% of
    // progressions and starved everything else.
    const FLAVOR_RULES = {
      major: {
        subtle: { iv: 0.55, minorV: 0.40, minorVCadential: 0.20, backdoor: 0.45, mediant: 0, passingDim: 0, deceptive: 0 },
        bold: { iv: 0.75, minorV: 0.60, minorVCadential: 0.35, backdoor: 0.60, mediant: 0.55, passingDim: 0.50, deceptive: 0.25 }
      },
      // Minor set (owner request). What counts as COLOR here is not the mirror
      // of the major set, because minor's home scale already contains most of
      // what "borrowed" means in major: VI, VII, III, iv and v are all diatonic
      // to aeolian, so converting to them would be a no-op the ear cannot hear.
      // (The bVI->bVII->i "aeolian cadence" is likewise just the pools doing
      // their job in minor — it is not a flavor event, and I had wrongly listed
      // it as a candidate before checking.) What IS chromatic in minor:
      //
      //   IV7      dorian major IV — aeolian's IV is minor, so this raises the
      //            6th. The modal brightening behind every minor-key vamp.
      //   bII7     tritone sub of V, approaching the final i. Standard jazz.
      //   bIImaj7  the Neapolitan as a colour chord rather than a cadence.
      //   #iv°7    passing dim walking iv -> V.
      //   Imaj7    Picardy third. NOTE: this one is a classical device, not a
      //            jazz one — it is bold-only and the rarest rule here, and is
      //            the first thing to veto if it reads wrong.
      minor: {
        subtle: { dorianIV: 0.55, neapolitanCadence: 0.45, neapolitan: 0, passingDim: 0, picardy: 0 },
        bold: { dorianIV: 0.75, neapolitanCadence: 0.60, neapolitan: 0.55, passingDim: 0.50, picardy: 0.25 }
      }
    };

    // Predicates over raw numerals. Minor's pools spell the aeolian degrees
    // unaltered (VI/VII/III), so 'V' must not match 'VI'/'VII'.
    const NUM = {
      majTonic: s => /^I(?![IViv])/.test(String(s)),
      majIV: s => /^IV(?![Ii])/.test(String(s)),
      majV: s => /^V(?![Ii])/.test(String(s)) && !String(s).includes('/'),
      majSupertonic: s => /^ii(?!i)/.test(String(s)),
      minTonic: s => /^i(?![iv])/.test(String(s)),
      minIV: s => /^iv(?!i)/.test(String(s)),
      minDominant: s => /^[Vv](?![Ii])/.test(String(s)) && !String(s).includes('/')
    };
    const isSecondary = s => String(s).includes('/');

    /**
     * Per-mode idiom sets. A CADENCE rule claims slots at the end of the phrase
     * and the first one that fits wins (they compete for the same real estate);
     * an INTERIOR rule converts one slot, tried in order. `fits` may look at
     * neighbours; `p` picks the probability out of the level's table so a rule
     * can price itself differently by context (major's minor-v is rarer when
     * cadential). `apply` returns the slots it consumed.
     *
     * Both modes run through ONE engine below, so the budget, the
     * no-adjacent-conversions rule and the never-touch-the-opening-chord rule
     * exist in exactly one place. A second copy for minor is how the two modes'
     * constraints would quietly drift apart.
     */
    const FLAVOR_IDIOMS = {
      major: {
        cadence: [
          { key: 'deceptive', p: P => P.deceptive,
            fits: (o, n) => NUM.majTonic(o[n - 1]),
            apply: (o, n) => { o[n - 1] = 'bVImaj7'; return [n - 1]; } },
          // The two chords before the final tonic become the backdoor pair:
          // one event, deliberately adjacent.
          { key: 'backdoor', p: P => P.backdoor,
            fits: (o, n) => n >= 3 && NUM.majTonic(o[n - 1]) &&
              !isSecondary(o[n - 2]) && !isSecondary(o[n - 3]),
            apply: (o, n) => { o[n - 3] = 'iv7'; o[n - 2] = 'bVII7'; return [n - 3, n - 2]; } }
        ],
        interior: [
          { key: 'iv', p: P => P.iv, fits: o_i => NUM.majIV(o_i),
            apply: (o, i) => { o[i] = 'iv7'; } },
          { key: 'minorV', p: (P, o, i, n) => NUM.majTonic(o[(i + 1) % n]) ? P.minorVCadential : P.minorV,
            fits: o_i => NUM.majV(o_i), apply: (o, i) => { o[i] = 'v7'; } },
          { key: 'passingDim', p: P => P.passingDim,
            fits: (o_i, o, i) => NUM.majTonic(o_i) && NUM.majSupertonic(o[i + 1]),
            apply: (o, i) => { o[i] = '#i°7'; } }, // I -> #i°7 -> ii, the gospel walk-up
          { key: 'mediant', p: P => P.mediant, fits: o_i => NUM.majTonic(o_i),
            apply: (o, i) => { o[i] = Math.random() < 0.5 ? 'bIIImaj7' : 'bVImaj7'; } }
        ]
      },
      minor: {
        cadence: [
          { key: 'picardy', p: P => P.picardy,
            fits: (o, n) => NUM.minTonic(o[n - 1]),
            apply: (o, n) => { o[n - 1] = 'Imaj7'; return [n - 1]; } },
          // bII7 -> i: the tritone sub standing in for V. One slot, unlike
          // major's two-chord backdoor.
          { key: 'neapolitanCadence', p: P => P.neapolitanCadence,
            fits: (o, n) => n >= 2 && NUM.minTonic(o[n - 1]) && !isSecondary(o[n - 2]),
            apply: (o, n) => { o[n - 2] = 'bII7'; return [n - 2]; } }
        ],
        interior: [
          // Most specific first (as in major, where I->ii precedes any-I):
          // passingDim wants a iv that actually walks up to V, dorianIV takes
          // any iv, so the reverse order would starve the passing dim.
          { key: 'passingDim', p: P => P.passingDim,
            fits: (o_i, o, i) => NUM.minIV(o_i) && NUM.minDominant(o[i + 1]),
            apply: (o, i) => { o[i] = '#iv°7'; } }, // iv -> #iv°7 -> V
          { key: 'dorianIV', p: P => P.dorianIV, fits: o_i => NUM.minIV(o_i),
            apply: (o, i) => { o[i] = 'IV7'; } },
          { key: 'neapolitan', p: P => P.neapolitan, fits: o_i => NUM.minTonic(o_i),
            apply: (o, i) => { o[i] = 'bIImaj7'; } }
        ]
      }
    };

    /**
     * Flavor pass (spec v3 phase 3): convert some numerals to the borrowed /
     * chromatic vocabulary for the key's mode. Pure. Every output carries an
     * explicit suffix so the parser PINS the quality (pools and function
     * guardrails untouched, invariant 7).
     *
     * Constraints, shared by both modes: flavor events share a chromatic budget
     * with the secondary dominants already in `numerals` (1 per 4 bars subtle,
     * 2 bold), no two conversions land on adjacent slots (a multi-slot rule
     * like the backdoor counts as one event), the opening chord is never
     * converted (it states the key), and the final slot is only ever touched by
     * a cadence rule.
     */
    function flavorizeNumerals(numerals, mode, level) {
      const idioms = FLAVOR_IDIOMS[mode];
      const P = idioms && FLAVOR_RULES[mode] && FLAVOR_RULES[mode][level];
      if (!idioms || !P) return numerals.slice();
      const out = numerals.slice();
      const n = out.length;
      const flavored = new Array(n).fill(false);
      let budget = (level === 'bold' ? 2 : 1) * Math.ceil(n / 4) -
        out.filter(isSecondary).length;
      const roll = p => p > 0 && Math.random() < p;
      const clearAround = i => !flavored[i] &&
        !(i > 0 && flavored[i - 1]) && !(i < n - 1 && flavored[i + 1]);

      // Cadence first: these compete for the phrase ending, so they are settled
      // before the interior rules can spend the budget on it.
      for (const rule of idioms.cadence) {
        if (budget <= 0) break;
        if (!rule.fits(out, n) || !roll(rule.p(P))) continue;
        rule.apply(out, n).forEach(i => { flavored[i] = true; });
        budget--;
        break; // one cadence event per phrase
      }

      // Interior conversions (never the first-slot statement of the key).
      for (let i = 1; i < n - 1 && budget > 0; i++) {
        if (!clearAround(i) || isSecondary(out[i])) continue;
        for (const rule of idioms.interior) {
          if (!rule.fits(out[i], out, i)) continue;
          // A declined roll falls through to the next rule for the SAME slot —
          // several rules can fit one slot (major: passingDim and mediant both
          // want a tonic; minor: passingDim and dorianIV both want a iv), and
          // the original else-if chain let the later one try. Breaking here
          // starved them.
          if (!roll(rule.p(P, out, i, n))) continue;
          rule.apply(out, i);
          flavored[i] = true;
          budget--;
          break;
        }
      }
      return out;
    }

    function buildRandomNumerals(mode, bars, density, flavor = 'off') {
      const pools = PHRASE_POOLS[mode] || PHRASE_POOLS.major;
      const n = Math.max(2, Math.min(8, Math.floor(bars) || 4));
      const numerals = new Array(n);

      numerals[0] = weightedPick(pools.first);
      numerals[n - 1] = weightedPick(pools.last);
      // A 2-bar phrase reading I-I (or i-i) says nothing; force motion.
      if (n === 2 && numerals[1] === numerals[0]) {
        numerals[1] = numerals[0] === 'V' ? (mode === 'major' ? 'I' : 'i') : 'V';
      }

      for (let i = 1; i <= n - 2; i++) {
        let pick;
        let guard = 0;
        do {
          pick = weightedPick(pools.interior);
        } while (++guard < 12 &&
          (pick === numerals[i - 1] || (i === n - 2 && pick === numerals[n - 1])));
        numerals[i] = pick;
      }

      // Secondary-dominant pass: convert numerals[t-1] into V7/<numerals[t]>.
      // t-1 ranges over interior positions only (1 .. n-2), so the secondary
      // dominant is never the opening or the final chord, and its target
      // always follows it. Skip 4-6 bar phrases past one conversion, allow a
      // second in 7-8 bar phrases; 2-bar phrases have no interior slot.
      const targets = SECONDARY_TARGETS[mode] || SECONDARY_TARGETS.major;
      const quota = n >= 7 ? 2 : 1;
      let applied = 0;
      for (let t = 2; t <= n - 1 && applied < quota; t++) {
        if (!targets.includes(numerals[t])) continue;
        if (String(numerals[t - 1]).includes('/')) continue;
        // Per-candidate probability tuned so ~1/3 of 8-bar full-density
        // progressions contain a secondary (an 8-bar phrase offers ~5-6
        // candidate positions; the statistical test bounds presence to 5-50%).
        if (Math.random() < 0.09 * density) {
          numerals[t - 1] = 'V7/' + numerals[t];
          applied++;
          t++; // keep converted pairs from chaining back-to-back
        }
      }

      // Flavor pass runs last so it sees (and budgets against) the
      // secondary dominants above.
      return flavorizeNumerals(numerals, mode, flavor);
    }

    function generateRandomProgression() {
      const { mode } = state;

      // Roll a per-progression density character here (not in the builder), so
      // a later key change transposes the SAME character instead of re-rolling.
      // Rolled before the numerals so the secondary-dominant probability can
      // scale with it.
      state.density = Math.random() < 0.7 ? 1.0 : 0.45;
      state.sourceNumerals = buildRandomNumerals(mode, state.bars, state.density, state.flavor);
      state.substitutions = [];
      state.trialSub = null; // new progression: drop any trial without restore
      state.asWritten = false;
      state.progressionName = 'Random Progression';
      state.progressionStyle = mode === 'major' ? 'Major' : 'Minor';
      state.loadedSavedId = null; // a different progression is on screen now

      elements.progressionName.textContent = state.progressionName;
      elements.progressionStyle.textContent = state.progressionStyle;

      buildProgressionFromSource();
      updateAsWrittenChip();
    }

    function loadProgression(index) {
      const prog = PROGRESSION_LIBRARY[index];

      // Update mode if progression specifies one
      state.mode = prog.mode || 'major';
      elements.modeSelect.value = state.mode;

      // As-written (5.1): open the tune in its original key. Explicit quality
      // suffixes in the entry pin the chart's qualities at parse time; the
      // moment the user changes key or complexity, normal transposition/tier
      // behavior resumes (that flips asWritten off in the listeners).
      if (prog.originalKey) {
        state.key = prog.originalKey;
        elements.keySelect.value = prog.originalKey;
      }
      state.asWritten = true;

      state.sourceNumerals = prog.chords.slice();
      state.substitutions = [];
      state.trialSub = null; // new progression: drop any trial without restore
      state.density = Math.random() < 0.7 ? 1.0 : 0.45;
      state.progressionName = prog.name;
      state.progressionStyle = prog.style;
      state.loadedSavedId = null; // a library tune, not one of the user's saves

      elements.progressionName.textContent = state.progressionName;
      elements.progressionStyle.textContent = state.progressionStyle;

      buildProgressionFromSource();
      updateAsWrittenChip();

      // Close library panel
      showTab('voicing'); // land on the piano view (the app's home view)
    }


    // ============================================
    // PERSONAL SAVED PROGRESSIONS (5.2)
    // Persisted to localStorage under one versioned key. Every access is
    // guarded: private-mode Safari (and any storage-less environment) throws,
    // and the app must degrade gracefully to "saving unavailable".
    // ============================================

    const SAVED_STORAGE_KEY = 'chordflow.savedProgressions.v1';
    const SESSION_STORAGE_KEY = 'chordflow.session.v1';

    /**
     * The settings a progression carries with it — how it should SOUND and be
     * practised, as distinct from what its chords are. Saved alongside every
     * progression and restored with it, and reused verbatim by the session
     * snapshot so the two can never capture different sets.
     *
     * Deliberately excludes key/mode/complexity/density/bars: those are stored
     * as first-class fields on the entry because they change the CHORDS, not
     * just their treatment.
     */
    const PROGRESSION_SETTING_KEYS = [
      'tempo', 'beatsPerChord', 'metronomeOn', 'groove', 'swing', 'leftHand',
      'range', 'bassBacking', 'octaveRoots', 'autoTranspose', 'tempoRamp',
      'hideSymbols', 'padMode', 'flavor'
    ];

    // Bumped whenever a stored value's MEANING changes, so applySettings can
    // tell an old bag from a new one. v2: 'shells' was root+3+7 and is now the
    // bare 3rd and 7th; the old sound moved to 'rootguide'.
    const SETTINGS_VERSION = 2;

    function captureSettings() {
      const out = { v: SETTINGS_VERSION };
      for (const k of PROGRESSION_SETTING_KEYS) out[k] = state[k];
      return out;
    }

    /**
     * Apply a stored settings bag. Unknown keys are ignored and MISSING keys
     * are left at their current value rather than reset to a default — entries
     * saved before settings were captured (no `settings` field at all) must not
     * silently rearrange the user's current setup on load.
     */
    function applySettings(settings) {
      if (!settings || typeof settings !== 'object') return;
      // A progression saved before the rename asked for root+3+7 by the name
      // 'shells'. Restoring it as today's 'shells' would silently drop the root
      // out of a sound the user chose and saved, so re-point it at the mode
      // that still plays what they picked.
      if (!(settings.v >= 2) && settings.leftHand === 'shells') {
        settings = Object.assign({}, settings, { leftHand: 'rootguide' });
      }
      for (const k of PROGRESSION_SETTING_KEYS) {
        if (Object.prototype.hasOwnProperty.call(settings, k) && settings[k] != null) {
          state[k] = settings[k];
        }
      }
    }

    function storageAvailable() {
      try {
        const probe = '__chordflow_probe__';
        window.localStorage.setItem(probe, probe);
        window.localStorage.removeItem(probe);
        return true;
      } catch (e) {
        return false;
      }
    }

    function readSavedProgressions() {
      try {
        const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
      } catch (e) {
        return [];
      }
    }

    function writeSavedProgressions(list) {
      try {
        window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(list));
        return true;
      } catch (e) {
        return false;
      }
    }

    /** Snapshot the current progression under `name`. Returns the entry or null. */
    function saveCurrentProgression(name) {
      if (!state.sourceNumerals.length) return null;
      const entry = {
        id: 'sp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
        name: String(name || state.progressionName || 'Untitled').trim() || 'Untitled',
        createdAt: new Date().toISOString(),
        sourceNumerals: state.sourceNumerals.slice(),
        key: state.key,
        mode: state.mode,
        complexity: state.complexity,
        density: state.density,
        substitutions: state.substitutions.slice(),
        bars: state.bars,
        settings: captureSettings()
      };
      const list = readSavedProgressions();
      list.push(entry);
      if (!writeSavedProgressions(list)) return null;
      // The new entry becomes the one an Update targets — saving then tweaking
      // then updating is the obvious flow, and it would be odd if Update still
      // pointed at whatever was loaded before.
      state.loadedSavedId = entry.id;
      renderSavedProgressions();
      scheduleSessionSave();
      return entry;
    }

    /**
     * Overwrite an existing saved entry with the current progression+settings.
     * This is the ONLY path that mutates a saved progression's content: loading
     * one and then editing never writes back (owner: "any change would not
     * overwrite the saved progression unless user chooses to update it"), so
     * a saved progression is a snapshot until explicitly told otherwise.
     * Keeps the entry's id, name and createdAt — it is the same progression.
     */
    function updateSavedProgression(id) {
      const list = readSavedProgressions();
      const entry = list.find(e => e.id === id);
      if (!entry || !state.sourceNumerals.length) return false;
      entry.sourceNumerals = state.sourceNumerals.slice();
      entry.key = state.key;
      entry.mode = state.mode;
      entry.complexity = state.complexity;
      entry.density = state.density;
      entry.substitutions = state.substitutions.slice();
      entry.bars = state.bars;
      entry.settings = captureSettings();
      entry.updatedAt = new Date().toISOString();
      if (!writeSavedProgressions(list)) return false;
      renderSavedProgressions();
      return true;
    }

    /** Restore every stored field verbatim — no re-rolls (density included). */
    function loadSavedProgression(id) {
      const entry = readSavedProgressions().find(e => e.id === id);
      if (!entry) return false;

      state.key = entry.key;
      state.mode = entry.mode;
      state.complexity = entry.complexity;
      state.density = entry.density;
      state.bars = entry.bars || state.bars;
      state.sourceNumerals = entry.sourceNumerals.slice();
      state.substitutions = (entry.substitutions || []).slice();
      state.trialSub = null; // new progression: drop any trial without restore
      state.asWritten = false;
      state.progressionName = entry.name;
      state.progressionStyle = 'Saved';
      // Settings ride along with the progression (owner request). Entries saved
      // before this existed have no `settings` field; applySettings leaves the
      // current setup alone for those rather than snapping it to defaults.
      applySettings(entry.settings);
      state.loadedSavedId = id;

      elements.keySelect.value = state.key;
      elements.modeSelect.value = state.mode;
      elements.complexitySelect.value = state.complexity;
      if (elements.barsSelect) elements.barsSelect.value = String(state.bars);
      elements.progressionName.textContent = state.progressionName;
      elements.progressionStyle.textContent = state.progressionStyle;
      syncSettingsControls();

      buildProgressionFromSource();
      updateAsWrittenChip();
      showTab('voicing'); // land on the piano view (the app's home view)
      return true;
    }

    function renameSavedProgression(id, newName) {
      const list = readSavedProgressions();
      const entry = list.find(e => e.id === id);
      if (!entry) return false;
      const name = String(newName || '').trim();
      if (!name) return false;
      entry.name = name;
      if (!writeSavedProgressions(list)) return false;
      renderSavedProgressions();
      return true;
    }

    function deleteSavedProgression(id) {
      const list = readSavedProgressions();
      const next = list.filter(e => e.id !== id);
      if (next.length === list.length) return false;
      if (!writeSavedProgressions(next)) return false;
      // Update has nothing to target once its entry is gone.
      if (state.loadedSavedId === id) state.loadedSavedId = null;
      renderSavedProgressions();
      return true;
    }

    // ============================================
    // SESSION SNAPSHOT
    // Reopen exactly where you left off. Distinct from saved progressions:
    // this is the scratch desk, not the filing cabinet — it is overwritten
    // constantly and never appears in My Progressions.
    // ============================================

    /**
     * What the session captures beyond the settings bag: everything needed to
     * put the same chords, in the same voicings, on the same screen.
     *
     * Deliberately EXCLUDED — the transport is not part of "where you were":
     * isPlaying/currentChordIndex/loopCount/currentBeat (a reopened app must
     * not start mid-loop, and must never come back playing), and
     * trialSub/armedSub/compareOriginal (half-finished interactions whose
     * restore point lives in memory; restoring them would strand the user in
     * a state they can't reason about).
     */
    function captureSession() {
      return {
        v: 1,
        savedAt: Date.now(),
        sourceNumerals: state.sourceNumerals.slice(),
        substitutions: state.substitutions.slice(),
        key: state.key,
        mode: state.mode,
        complexity: state.complexity,
        density: state.density,
        bars: state.bars,
        asWritten: state.asWritten,
        progressionName: state.progressionName,
        progressionStyle: state.progressionStyle,
        loadedSavedId: state.loadedSavedId,
        // Manual voicing cycling is real work — without these, "exactly where
        // you were" would silently re-optimise every chord on reopen.
        voicingIndices: state.voicingIndices.slice(),
        voicingShifts: state.voicingShifts.slice(),
        lhVoicingIndices: (state.lhVoicingIndices || []).slice(),
        selectedChordIndex: state.selectedChordIndex,
        activeTab: state.activeTab,
        settings: captureSettings()
      };
    }

    function persistSession() {
      if (!state.sourceNumerals.length) return false;
      try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(captureSession()));
        return true;
      } catch (e) {
        return false; // private mode / quota: the app just doesn't remember
      }
    }

    // Coalesce bursts (a key change re-renders many times, playback re-renders
    // constantly) into one write. The pagehide/visibilitychange hook in app.js
    // flushes synchronously, so a debounce can never lose the last edit.
    let sessionSaveTimer = null;
    function scheduleSessionSave() {
      if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
      sessionSaveTimer = setTimeout(() => { sessionSaveTimer = null; persistSession(); }, 600);
    }

    function readSession() {
      try {
        const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        // Anything unrecognisable is treated as absent rather than trusted:
        // a half-written or older snapshot must not be able to brick startup.
        if (!s || s.v !== 1 || !Array.isArray(s.sourceNumerals) || !s.sourceNumerals.length) return null;
        return s;
      } catch (e) {
        return null;
      }
    }

    function clearSession() {
      try { window.localStorage.removeItem(SESSION_STORAGE_KEY); } catch (e) { /* nothing to clear */ }
    }

    /**
     * Restore the previous session. Returns false (having changed nothing that
     * matters) if there is no usable snapshot, so init() can fall back to its
     * normal opening progression.
     */
    function restoreSession() {
      const s = readSession();
      if (!s) return false;
      try {
        state.key = s.key || state.key;
        state.mode = s.mode || state.mode;
        state.complexity = s.complexity || state.complexity;
        state.density = typeof s.density === 'number' ? s.density : state.density;
        state.bars = s.bars || state.bars;
        state.sourceNumerals = s.sourceNumerals.slice();
        state.substitutions = Array.isArray(s.substitutions) ? s.substitutions.slice() : [];
        state.asWritten = !!s.asWritten;
        state.progressionName = s.progressionName || '';
        state.progressionStyle = s.progressionStyle || '';
        state.loadedSavedId = s.loadedSavedId || null;
        applySettings(s.settings);

        elements.keySelect.value = state.key;
        elements.modeSelect.value = state.mode;
        elements.complexitySelect.value = state.complexity;
        if (elements.barsSelect) elements.barsSelect.value = String(state.bars);
        elements.progressionName.textContent = state.progressionName;
        elements.progressionStyle.textContent = state.progressionStyle;
        syncSettingsControls();

        buildProgressionFromSource(); // recomputes voicings for the restored chords

        // Reinstate the stored voicing selection ON TOP of that recompute, but
        // only when it still describes this progression — a snapshot whose
        // length disagrees belongs to different chords and would index into
        // the wrong voicing tables.
        const n = state.progression.length;
        if (Array.isArray(s.voicingIndices) && s.voicingIndices.length === n &&
            Array.isArray(s.voicingShifts) && s.voicingShifts.length === n) {
          state.voicingIndices = s.voicingIndices.slice();
          state.voicingShifts = s.voicingShifts.slice();
          if (Array.isArray(s.lhVoicingIndices) && s.lhVoicingIndices.length === n) {
            state.lhVoicingIndices = s.lhVoicingIndices.slice();
          }
        }
        state.selectedChordIndex =
          (typeof s.selectedChordIndex === 'number' && s.selectedChordIndex < n) ? s.selectedChordIndex : null;

        updateAsWrittenChip();
        showTab(s.activeTab === 'settings' || s.activeTab === 'library' ||
                s.activeTab === 'dictionary' || s.activeTab === 'pads' ? s.activeTab : 'voicing');
        return true;
      } catch (e) {
        // A snapshot that throws halfway leaves state part-written; the caller
        // generates a fresh progression over the top, which fully reinitialises.
        return false;
      }
    }

    /** Export all saved progressions as pretty JSON (for download/backup). */
    function exportSavedProgressionsJson() {
      return JSON.stringify({ version: 1, savedProgressions: readSavedProgressions() }, null, 2);
    }

    /**
     * Import from exported JSON (or a bare array). Entries merge by id —
     * existing ids are replaced, new ones appended. Returns the number
     * imported, or -1 for unparseable/invalid input.
     */
    function importSavedProgressionsJson(text) {
      let incoming;
      try {
        const parsed = JSON.parse(text);
        incoming = Array.isArray(parsed) ? parsed : parsed && parsed.savedProgressions;
      } catch (e) {
        return -1;
      }
      if (!Array.isArray(incoming)) return -1;
      const valid = incoming.filter(e => e && typeof e === 'object' &&
        Array.isArray(e.sourceNumerals) && e.sourceNumerals.length && e.key && e.mode);
      if (!valid.length) return -1;

      const list = readSavedProgressions();
      let count = 0;
      for (const entry of valid) {
        if (!entry.id) entry.id = 'sp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        if (!entry.name) entry.name = 'Imported';
        const at = list.findIndex(e => e.id === entry.id);
        if (at !== -1) list[at] = entry; else list.push(entry);
        count++;
      }
      if (!writeSavedProgressions(list)) return -1;
      renderSavedProgressions();
      return count;
    }

    // The settings whose non-default state earns the dot on the Settings tab.
    // Values mirror `state`'s initial values above — a smoke check asserts the
    // two agree, so adding a setting without listing it here fails loudly
    // instead of silently never lighting the dot.
    const SETTINGS_DEFAULTS = {
      metronomeOn: false,
      groove: 'block',
      swing: false,
      leftHand: 'mixed',   // v3 §4.3 said 'roots'; the default moved to mixed
      range: 'full',
      bassBacking: false,
      octaveRoots: true,   // added after v3 §4.3; default flipped on 2026-07-28
      autoTranspose: 'off',
      tempoRamp: 0,
      hideSymbols: false
    };

    /** Light the Settings tab when any watched setting is off its default. */
    function updateSettingsDot() {
      const el = document.getElementById('settingsToggle');
      if (!el) return;
      const custom = Object.keys(SETTINGS_DEFAULTS).some(k => state[k] !== SETTINGS_DEFAULTS[k]);
      el.classList.toggle('has-custom', custom);
      // This already runs after every settings mutation (delegated on
      // #settingsPanel, plus the ensemble chip), which makes it the one place
      // that sees them all — the same reason the dot lives here.
      scheduleSessionSave();
    }
