# ChordFlow — Project Spec (v3: hear-first subs, flavor, settings IA)

This spec is written for a fresh session with no prior context. Before executing
any phase, read:

1. `README.md` — current feature surface and project layout.
2. `chordflow-spec-v2.md` — **the Invariants section (1–9) and the
   "Invariants added since" section (10–14) are binding for every phase here.**
   The architecture overview there is also the fastest orientation.

Execute **one phase per session**: complete its acceptance checklist, run the
tests, commit, then stop. Run `npm test` before touching anything (confirm a
green baseline) and after every meaningful change.

---

## What this spec delivers

Three user-facing problems, in priority order:

1. **Substitutions are commit-first, hear-later.** Today: tap a chord's
   sub-badge → popover → tap an item → the sub is applied permanently, with no
   audition, no visible way back to the original, and no way to compare. The
   feature is built for *editing*; the actual use case is *listening*.
2. **No harmonic flavor in generation.** The player wants Stevie
   Wonder / Vulfpeck-style color — modal interchange (iv7, v7, ♭VII7, ♭VImaj7),
   the backdoor cadence, chromatic mediants, gospel passing diminisheds — both
   offered per-chord and seeded into random generation.
3. **Settings is a 14-row scroll** with two faint titles, no indication of
   where you are, and mid-practice controls buried next to set-once ones.

### Decisions already made by the owner — do not relitigate

- Sub trial during playback lasts **two loop passes** before auto-revert.
- The sub tray lives **inside the voicing panel** (replacing the current
  `#voicingSubs` button row), not docked elsewhere.
- Snippet auditions **inherit the current groove/swing/tempo** settings.
- **No style-named presets** for flavor — a single Off / Subtle / Bold dial.
- Include: **transient undo chip**, **borrowed-chord tint**, **pad haptics**.
- Excluded from this spec (future work / back burner): loop-region selection,
  tap tempo, and a user guide. These now live in `chordflow-backlog.md`, the
  consolidated to-do / cleanup list — check there for parked items.

### Architecture facts you will need (verified against current code)

- **Sub system today:** `getChordSubstitutions(root, quality)`
  (`js/parsing.js`, ~line 116) returns
  `[{type, root, quality, description, symbol}]` from `SUBSTITUTION_RULES`
  keyed by quality, with roots spelled degree-aware via `SUB_INTERVAL_NAME`
  (`js/parsing.js` ~line 135 — note it currently has **no entry for 8
  semitones**; Phase 3 adds `8: 'b6'`).
  `applySubstitution(chordIndex, sub)` (`js/render.js` ~line 343) replaces
  `state.progression[chordIndex]`, stores `state.substitutions[chordIndex] =
  sub.type`, calls `recomputeProgressionVoicings()` and
  `renderChordStructure()`.
- **Substitution re-derivation:** `buildProgressionFromSource()`
  (`js/state.js`, ~lines 92–110) re-applies each stored `substitutions[i]` by
  re-deriving the rule from the (possibly transposed / re-rolled) base chord.
  This machinery is what makes trial subs survive a 12-keys transpose for
  free (Phase 2 relies on it).
- **Cadential color pass:** in `buildProgressionFromSource()` (~line 72),
  dominant-family chords whose next chord is tonic keep their color. Because
  a backdoor `bVII7` **is** `dom7` quality, `bVII7 → I` keeps its color with
  **no change needed** — verify, don't re-implement.
- **Two sub entry points to replace:** the sub-badge popover
  (`showSubstitutionMenu`, `js/render.js` ~lines 280–341 — per-item listeners
  and inline hover styles; delete it) and the `#voicingSubs` buttons inside
  `renderVoicing` (~lines 489–506 — also per-render listeners). The badge
  click handler is delegated in `js/app.js` (~line 278).
- **Audition machinery:** `auditionChord(index)` (`js/audio.js` ~line 459)
  plays one chord through a dedicated `auditionGain` on `master`, replaced
  per audition so retriggering cuts the previous one. Never touches
  `sessionGain` (session-token discipline, invariant 5).
- **Groove expansion:** `grooveOnsets(groove, beatsPerChord, swing)`
  (`js/audio.js`) is pure and returns `[{t, d, gate, v}]` in beats.
  `scheduleBeat` uses it for the RH and holds the LH for the chord span;
  it also adds the backing-bass root when
  `state.bassBacking && (leftHand === 'rootless' || 'evans')`.
- **Loop seam hook:** `handleLoopSeam()` (`js/audio.js`) runs at schedule
  time exactly once per loop wrap, *before* the wrap beat is scheduled
  (tempo ramp + 12-keys transpose live there). Phase 2's trial countdown
  hooks in here.
- **Realization choke point (invariant 10):** all audio and render pitch
  consumers go through `chordPitchesAt` / `getChordNotesAtIndex(root,
  quality, complexity, index, shift, { leftHandMode, lhIndex, range })`.
- **Generation:** `buildRandomNumerals` (`js/state.js`) builds the numeral
  array (phrase model + secondary-dominant pass). Flavor (Phase 3) is a
  post-pass over numerals there. Explicit suffixes (`iv7`, `bVII7`,
  `bVImaj7`, `v7`, `#i°7`) pin qualities via `explicitSuffixQuality` /
  the dim branch, bypassing pools and the function guardrails — this is the
  designed path for flavor (invariant 7 stays intact).
- **Generate control:** `#newBtn` (`index.html` ~line 424). The flavor chip
  (Phase 3) sits adjacent to it.
- **Settings panel:** `#settingsPanel` (`index.html` ~lines 215–345): one
  scroll containing Key, Mode, Complexity, Beats/Chord, Metronome, Comping,
  Swing, Left hand, Range, Backing bass, then a "Practice" title with
  12 Keys, Tempo ramp, Symbols, Bars, and the shortcuts hint.
- **Voicing panel header:** `.voicing-panel-header` with `#voicingChordName`
  (`index.html` ~line 76); `#voicingDescription` below. The LH cycle chip
  (Phase 4) and A/B toggle (Phase 2) live in this header.
- **Test harness trap (invariant 14):** in `test_dom_smoke.js`, zero
  `engine().ctx.currentTime` **before** `await window.startPlayback()` —
  rewinding after stalls the lookahead scheduler silently.
- **XSS discipline (invariant 12):** every model-derived string interpolated
  into `innerHTML` goes through `escapeHtml` — sub descriptions/symbols and
  anything derived from `root`/`quality`/`degree` are untrusted
  (saved-progression import). The tray chips must obey this.

---

## Phase 1 — The sub tray: hear-first substitutions

Goal: selecting a chord shows a tray of substitution chips inside the voicing
panel; **one tap = hear it in context; a second tap on the same chip =
apply**; the original is always one tap away; applying shows an undo chip.

### 1.1 Tray UI (replaces both existing sub entry points)

- Rebuild the `#voicingSubs` region in `renderVoicing()` as the **sub tray**:
  a horizontal chip row (wrapping allowed) built for the selected chord:
  - First chip: **Original** — shows the un-substituted chord's symbol
    (derive it: if `state.substitutions[chordIndex]` is set, the base chord
    must be recoverable — see 1.4). Marked active/current when no sub is
    applied.
  - One chip per `getChordSubstitutions(root, quality)` entry: sub symbol
    (mono font) + short description. All text through `escapeHtml`.
  - The chip for the currently applied sub (matching
    `state.substitutions[chordIndex]`) renders in an "applied" state.
- **Delegation:** ONE `click` listener on the tray container, registered once
  in `setupEventListeners` (`js/app.js`) — chips carry `data-action="original"`
  or `data-sub-index="i"`. Do NOT attach per-chip listeners in `renderVoicing`
  (this replaces the current per-render listeners; invariant 4's spirit).
- **Delete `showSubstitutionMenu`** and its per-item listeners/inline hover
  styles entirely. Retarget the sub-badge: the delegated badge handler in
  `app.js` now calls `selectChord(index)` (which already opens the voicing
  panel) — the badge becomes a shortcut to the tray. Keep the badge's
  aria-label accurate ("Show substitutions…" still holds). Hover styling for
  chips moves to CSS classes.

### 1.2 Interaction model (stopped)

- **First tap on a chip = audition + arm.** Plays the in-context snippet
  (1.3) with that candidate; the chip gains an `armed` class and shows a
  small ✓ glyph + "tap again to apply" affordance (CSS, no nested buttons —
  the chip itself is a single `<button>`).
- **Second tap on the armed chip = apply** via `applySubstitution`, then show
  the undo chip (1.5). The tray re-renders; the chip becomes "applied".
- **Original chip:** first tap auditions the snippet with the base chord;
  if a sub is currently applied, second tap reverts it (clear
  `state.substitutions[chordIndex]`, restore the base chord, recompute,
  re-render) and shows the undo chip.
- Arming is exclusive (arming one chip disarms others) and clears when the
  selected chord changes or the panel closes. Track as
  `state.armedSub = { index, key } | null` where `key` is the sub `type` or
  `'original'`.
- **While playing (Phase 1 only):** tapping a chip does nothing audible yet —
  render the tray but gate the audition on `!state.isPlaying`. (Trials arrive
  in Phase 2; don't half-build them here.) Applied/Original second-tap
  behavior still works while playing (it's the existing applySubstitution
  path, already safe mid-playback).

### 1.3 In-context snippet audition (`auditionSnippet` in `js/audio.js`)

`auditionSnippet(chordIndex, candidate)` — `candidate` is `null` (original)
or a sub object `{root, quality}`:

- **Window:** `[i-1, i, i+1]` with wraparound (matching loop playback).
  Degenerate cases: progression length 2 → two chords (prev, center);
  length 1 → just the center chord.
- **Chords:** copies of the progression chords; the center replaced by the
  candidate (or the base chord for Original).
- **Voicings:** run the real optimizers on the slice so the audition is
  honest: `computeProgressionVoicings(slice, state.complexity,
  activeRangeWindow())` and, when `state.leftHand === 'evans'`,
  `computeLeftHandVoicings(slice)`. Realize via `getChordNotesAtIndex` with
  the full opts `{ leftHandMode: state.leftHand, lhIndex, range }`.
- **Scheduling:** inherit the groove — for each snippet chord, schedule LH
  (sustained span) + RH per `grooveOnsets(state.groove, snippetBeats,
  state.swing)` at `state.tempo`, where
  `snippetBeats = Math.min(state.beatsPerChord, 4)` (cap keeps 8-beat
  settings from making a 12-second audition). Include the backing-bass root
  under the same condition `scheduleBeat` uses. **Refactor, don't copy:**
  extract `scheduleBeat`'s per-chord scheduling body (LH span + backing bass
  + RH groove hits) into a shared helper (e.g. `scheduleChordSpan(d,
  startTime, secPerBeat, beats, dest)`) used by both `scheduleBeat` and
  `auditionSnippet`. Same notes, different destination gain.
- **Voice management:** route through the existing `auditionGain`
  replace-and-damp pattern so retriggering (tapping chip after chip) cuts the
  previous snippet — exactly the current `auditionChord` behavior.
  `auditionChord` itself stays (step transport still uses it).

### 1.4 Base-chord bookkeeping (needed by Original + Phase 2 A/B)

Reverting and A/B need the *base* (un-substituted) chord per index without a
full rebuild. In `applySubstitution` AND in `buildProgressionFromSource`'s
re-apply block, store the pre-substitution chord:
`state.subBase[chordIndex] = { ...baseChord }` (a new state array, cleared
and rebuilt alongside `state.substitutions` everywhere substitutions are
cleared — generate/load paths). Revert = restore `subBase[i]` into
`progression[i]`, null out `substitutions[i]` and `subBase[i]`, recompute,
re-render. This keeps revert cheap and playback-safe (no
`buildProgressionFromSource`, which resets `currentChordIndex`/`loopCount`).

### 1.5 Transient undo chip

- One reusable element (`#undoChip`), fixed-position just above the transport
  bar, hidden by default. `showUndoChip(label, undoFn)` (js/render.js):
  sets text (e.g. "Substituted G7 → D♭7 — Undo"), shows for **5 s**, then
  hides. A new call replaces the previous (clear the pending timeout).
- The whole chip is one `<button>`; clicking runs `undoFn` and hides it.
  `undoFn` for apply = the revert of 1.2; for revert = re-apply the sub.
- Accessibility: `role="status"` + `aria-live="polite"` on a wrapper so the
  appearance is announced; the button itself keeps a clear label. No
  animation when `prefers-reduced-motion`; otherwise a small fade/slide is
  fine. Safe-area aware (`env(safe-area-inset-bottom)` is already used by
  the transport — position relative to it).

### 1.6 Tests (Phase 1)

Smoke (`test_dom_smoke.js`):
- Selecting a dom7 chord renders the tray: Original chip first + ≥1 sub chip;
  all chip text escaped (reuse the XSS pattern: a malicious root must not
  inject via the tray).
- First tap auditions: `engine().auditionGain !== null` and (with groove set
  to charleston) a `synthNote` spy records >1 RH onset per chord — proving
  groove inheritance. Second tap applies: progression mutated,
  `substituted` flag set, `state.substitutions[i]` set, `subBase[i]` set.
- Original chip two-tap reverts; undo chip appears on apply, clicking it
  restores the previous state; undo chip auto-hides (advance via real
  timeout or expose the hide for tests).
- Sub-badge click selects the chord and opens the voicing panel; no
  `.sub-menu` element is ever created (popover gone).
- Existing checks must stay green — the voicing-panel sub-button checks (if
  any assert the old markup) are updated to the tray equivalents, keeping
  equivalent coverage.

**Acceptance:** one tap hears any sub in context with the current groove;
two taps applies; Original always present; undo works; popover deleted; both
suites green. Commit. Stop.

---

## Phase 2 — Trial-during-playback (two passes) + A/B compare

### 2.1 Trial subs

While playing, **tapping a sub chip starts a trial**: the sub takes the
chord's slot immediately (heard from its next occurrence), runs for **two
full loop passes**, then auto-reverts — unless committed.

- State: `state.trialSub = { index, type, passesLeft } | null`.
- `beginSubTrial(index, sub)` (`js/render.js`, next to `applySubstitution`):
  - If a trial is active (any index), revert it first.
  - Apply exactly like `applySubstitution` (sets `substitutions[index]`,
    `subBase[index]`, recompute, re-render) but ALSO set
    `state.trialSub = { index, type: sub.type, passesLeft: 2 }`.
  - Chip renders in a `trialing` state with a pass-countdown indicator
    (two dots → one dot).
- **Seam hook:** at the top of `handleLoopSeam()` (before tempo ramp and
  12-keys), if a trial is active decrement `passesLeft`; at 0, revert
  (restore `subBase`, clear `substitutions[index]`/`trialSub`, recompute)
  and let the rest of the seam proceed. While `passesLeft > 0` do nothing —
  a 12-keys transpose re-derives the trial sub automatically through the
  existing `substitutions` re-apply machinery (that's why the trial lives IN
  `substitutions`, not beside it).
- **Commit:** tapping the trialing chip again = keep. Clear `trialSub`
  (leaving the sub applied), show the undo chip.
- **Revert triggers** (all restore via `subBase` with no full rebuild):
  passes exhausted; `stopPlayback`/`stopAndReset`; tapping the Original
  chip; starting a different trial; and `generateRandomProgression`/
  `loadProgression`/`loadSavedProgression` clear `trialSub` WITHOUT restore
  (the progression is being replaced wholesale). Guard: if `bars`/length
  changes make `trialSub.index` out of range, clear it.
- Stopped-state behavior from Phase 1 is unchanged (snippet audition).

### 2.2 A/B compare

A single **A/B** toggle button in `.voicing-panel-header`, enabled only when
at least one substitution is applied and no trial is active:

- **Implementation is per-index swapping, NOT a rebuild** (a rebuild resets
  `currentChordIndex`/`loopCount` — unacceptable mid-playback):
  `state.compareOriginal` flag; toggling ON swaps every substituted index's
  `progression[i]` to `subBase[i]`; toggling OFF swaps back to the derived
  sub (re-derive via `getChordSubstitutions(subBase[i].root,
  subBase[i].quality).find(type)`). Each toggle calls
  `recomputeProgressionVoicings()` + `renderChordStructure()`.
  Audio follows live via `chordPitchesAt` — no scheduler surgery needed.
- Applying/reverting a sub or starting a trial while comparing first exits
  compare mode (toggle OFF, restore subs) to keep one source of truth.
- Button shows pressed state (`aria-pressed`), label "A/B".

### 2.3 Tests (Phase 2)

Smoke, using mocked playback (mind invariant 14 — zero the clock BEFORE
`startPlayback`):
- Start playback, begin a trial: chord mutates, `trialing` chip shown. Drive
  the scheduler across two loop wraps (advance the mock clock through
  `span = beatsPerChord × progression.length` beats twice): after the second
  seam the chord reverts and `trialSub` is null.
- Trial + commit: tap trialing chip before passes expire → sub stays applied
  after further seams; undo chip appeared.
- Trial + stop: `stopAndReset` reverts.
- Trial + 12-keys ON: after the transpose seam the trialed slot still holds
  the (re-derived, transposed) sub — assert root moved with the key.
- A/B: apply a sub, toggle A/B during mocked playback → substituted index
  shows the base chord, `currentChordIndex`/`loopCount` unchanged; toggle
  back → sub returns.

**Acceptance:** trials audition in real context for exactly two passes with
seam-accurate revert; commit/stop/original behave; A/B is instant and
playback-safe; suites green. Commit. Stop.

---

## Phase 3 — Flavor dial + tray flavor subs + borrowed tint

### 3.1 The dial

- `state.flavor: 'off' | 'subtle' | 'bold'` (default `'off'`).
- A chip button **next to `#newBtn`** (NOT in Settings — flavor is a creative
  input to generation): label cycles `Flavor: Off → Subtle → Bold`. Class
  `active` when non-off. Changing it does not regenerate by itself; it
  applies to the next generation.

### 3.2 Generation rules (`flavorizeNumerals` — pure, in `js/state.js`)

Post-pass inside `buildRandomNumerals` after the secondary-dominant pass:
`flavorizeNumerals(numerals, mode, level)` returns a new numeral array. All
outputs are **explicit-suffix numerals** so qualities pin and guardrails
stay intact: `iv7`, `v7`, `bVII7`, `bIIImaj7`, `bVImaj7`, `#i°7`.

Major mode rules (probabilities are starting points — mark the table with
`// FLAVOR WEIGHTS: tuned by ear — owner to veto/adjust` and keep them in one
const):

| Rule | Condition | Subtle | Bold |
|---|---|---|---|
| `IV*` → `iv7` (borrowed iv) | interior slot, not final | .12 | .25 |
| `V7*` → `v7` (minor v) | next chord is NOT tonic | .08 | .18 |
| `V7*` → `v7` cadential | next IS tonic | — | .10 |
| Backdoor: the two chords before a final `I*` become `iv7, bVII7` | ≥3 bars; slot before-final isn't already a secondary pair | .10 | .22 |
| Interior `I*` → `bIIImaj7` or `bVImaj7` (mediant) | not first, not final | — | .10 |
| `I*` → `#i°7` when the NEXT numeral is ii-family (passing dim) | interior | — | .08 |
| Final `I*` → `bVImaj7` (deceptive ending) | final slot | — | .05 |

- **Budget:** flavor events and secondary dominants share a combined
  chromatic budget — at most **1 per 4 bars at Subtle, 2 per 4 bars at
  Bold** (count existing `V7/x` numerals against it). Never two flavor
  conversions on adjacent slots.
- **Minor mode: no-op in this phase** (the interchange table above is a
  major-key idiom set). Document that in a comment; don't improvise a minor
  table.
- Cadential color for `bVII7 → I` is already free (dominant-family +
  next-is-tonic check in `buildProgressionFromSource` — verify with a test,
  change nothing).

### 3.3 Tray flavor subs

- New `FLAVOR_SUBS` table beside `SUBSTITUTION_RULES` (`js/parsing.js`),
  same rule shape, offered by `getChordSubstitutions` with a flavor tag:
  - dom7-family: **minor v** `{interval 0, quality 'min7'}`; **backdoor**
    `{interval 3, quality 'dom7'}` (G7 → B♭7).
  - maj7/maj: **parallel minor** `{interval 0, quality 'min7'}`; **mediant
    ♭III** `{interval 3, quality 'maj7'}`; **mediant ♭VI**
    `{interval 8, quality 'maj7'}`.
- **Add `8: 'b6'` to `SUB_INTERVAL_NAME`** so the ♭VI root spells correctly
  (Cmaj7 → A♭maj7, not G♯).
- Tray ordering by flavor level: at Off, functional subs first and flavor
  subs after; at Subtle/Bold, flavor subs surface directly after Original.
  Re-derivation on key/complexity change works through the existing
  `substitutions`-by-type machinery — flavor subs must therefore have
  unique `type` strings.

### 3.4 Borrowed tint

- Pure helper `isBorrowedNumeral(numeral, mode)` (`js/parsing.js`): true for
  flat-prefixed romans (`bIII…`, `bVI…`, `bVII…`), lowercase `iv`/`v` in
  major, and `#…°7` passing dims. Unit-test the truth table.
- `buildProgressionFromSource` sets `chord.borrowed = true` from the source
  numeral. `renderChordStructure` and `renderPadGrid` add a `borrowed` class
  to the cell/pad (class only — text pipeline and `escapeHtml` discipline
  untouched). CSS: a subtle warm tint on the numeral + a thin accent edge,
  clearly distinguishable from the `.substituted` marker and the playing
  highlight.

### 3.5 Tests (Phase 3)

Unit (`test_voice_leading.js`):
- `flavorizeNumerals(x, 'major', 'off')` is identity.
- Statistical (≈500 runs, mirroring the Phase-4 secondary-dominant tests):
  Subtle/Bold event frequencies within loose bounds; every `bVII7` numeral
  followed by a tonic-family numeral; budget respected (count chromatic
  events per 4 bars); no adjacent flavor conversions; final-slot rules only
  produce `bVImaj7`.
- Every vocabulary numeral parses pinned in C major: `iv7`→Fm7, `v7`→Gm7,
  `bVII7`→B♭7, `bIIImaj7`→E♭maj7, `bVImaj7`→A♭maj7, `#i°7`→C♯°7 (verify
  roots AND qualities).
- `getChordSubstitutions('G','dom7')` includes minor-v and backdoor entries
  with correctly spelled roots; `('C','maj7')` includes A♭maj7 (the `b6`
  spelling), E♭maj7.
- `isBorrowedNumeral` truth table.

Smoke: flavor chip cycles state; a progression built directly from flavor
numerals (`['Imaj7','iv7','bVII7','Imaj7']` via the source-numeral path)
renders with `borrowed` classes on the right cells and pads and plays
without errors; tray for a dom7 shows the flavor subs.

**Acceptance:** dial works end-to-end; flavor generation is idiomatic and
statistically bounded; tray offers the vocabulary manually at every level;
borrowed chords are visibly tinted; suites green. Commit. Stop.

---

## Phase 4 — Settings IA + LH chip + settings dot + pad haptics

### 4.1 Grouped settings

- Split `#settingsPanel` rows into three group containers with a segmented
  chip row at the top (three `<button>`s, `aria-pressed`, one delegated
  listener; default **Song**):
  - **Song**: Key, Mode, Complexity, Bars *(moved up from the Practice
    section)*, Beats/Chord.
  - **Sound**: Metronome, Comping, Swing, Left hand, Range, Backing bass.
  - **Practice**: 12 Keys, Tempo ramp, Symbols, shortcuts hint.
- Switching chips toggles `hidden` on the groups — the active chip IS the
  "where am I" indicator. No element IDs change (every existing listener
  and smoke check keeps working).
- Each group must fit a 390×844 viewport with **no scrolling**. Update
  `scripts/layout_check.js` to assert per-group no-scroll.

### 4.2 Left-hand cycle chip (voicing panel)

- A small chip `#lhModeChip` in `.voicing-panel-header`: label shows the
  current mode (Roots / Shells / 2-hand / Rootless); click cycles
  `roots → shells → evans → rootless`, sets `state.leftHand`, syncs
  `#leftHandSelect.value`, calls `renderVoicing()`. **No recompute** —
  that's invariant 11's cheap side, and it's why this control belongs at
  point of use.

### 4.3 Settings dot

- `const SETTINGS_DEFAULTS = { metronomeOn:false, groove:'block',
  swing:false, leftHand:'roots', range:'full', bassBacking:false,
  autoTranspose:'off', tempoRamp:0, hideSymbols:false }` and
  `updateSettingsDot()` toggling a `has-custom` class on `#settingsToggle`
  (CSS badge dot). Call it from every listener that mutates one of those
  keys (wrap or append — keep it one obvious helper, not nine copies of the
  comparison).

### 4.4 Pad haptics

- In the `padGrid` **pointerdown** handler in `js/app.js` (NOT in
  `padPress` — the audio layer stays pure, and keyboard presses shouldn't
  vibrate): after `padPress(index)`, `if (navigator.vibrate)
  navigator.vibrate(8);`. Feature-checked, no setting.

### 4.5 Tests (Phase 4)

Smoke:
- Chips switch groups (assert `hidden` states); every existing
  settings-dependent check still passes unchanged (IDs untouched).
- LH chip cycles all four modes and keeps `#leftHandSelect` in sync;
  cycling does NOT change `state.voicingIndices` (no recompute).
- Dot: toggle swing on → `has-custom` present; restore defaults → absent.
- Haptics: define `navigator.vibrate` as a spy before a pointer pad press →
  called; keyboard pad press (keydown path) → not called.
- `scripts/layout_check.js` gains the per-group assertions (manual run,
  not in `npm test` — same as today).

**Acceptance:** three-group settings with no per-group scroll at 390 px and
a clear active indicator; LH mode is one tap from the voicing panel;
non-default settings visible at a glance; pads buzz on touch devices;
suites green. Commit. Stop.

---

## New invariants introduced by this spec (append to the running list)

> These are consolidated into `INVARIANTS.md` (the canonical list). Kept here
> for the spec's own record.


15. **Trial/undo state discipline:** only `beginSubTrial` / its revert path
    mutate `state.trialSub`; the trial lives inside `state.substitutions`
    (so transpose re-derivation works) with `state.subBase` as the restore
    point; `subBase` is maintained everywhere `substitutions` is written.
16. **A/B never rebuilds:** compare mode swaps per-index via `subBase` and
    recomputes voicings; it must never call `buildProgressionFromSource`
    (which resets playback position).
17. **Auditions share playback's scheduling code:** `auditionSnippet` and
    `scheduleBeat` schedule a chord span through one shared helper — if they
    drift apart, the audition stops being an honest preview.

## Session protocol

- One phase per session, in order (2 depends on 1; 3 and 4 are independent
  of each other but both build on 1's tray).
- `npm test` green before starting and at every commit. Never weaken a test
  to pass it — replace with equivalent-or-better coverage of the intended
  behavior.
- Anything marked "tuned by ear" / "owner to veto" ships behind a code
  comment flag and is listed in the commit message.
- Keep commits at phase granularity; if a session runs long, commit a
  working intermediate state with green tests rather than leaving the tree
  broken.
