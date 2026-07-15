# ChordFlow — Project Spec (v2 development plan)

> **STATUS: COMPLETED.** All five phases below shipped (PRs #1–#2 closed out
> phases 4–5; phases 1–3 landed before the PR workflow). This document is kept
> as the architectural reference and history — the **Invariants** section
> (including the additions at the end) is still binding for new work, but the
> phase checklists are done. For what shipped *after* this spec, see
> "Post-spec development" at the bottom. The current developer-facing overview
> lives in `README.md`.

This spec is written for a fresh session with no prior context. Read all of "Project Overview" and "Invariants" before executing any phase. Execute **one phase per session**: complete its acceptance checklist, run the tests, commit, then stop. Do not start the next phase in the same session.

---

## Project overview

*(As written at planning time — see the status note above and `README.md` for the current state.)*

ChordFlow is a chord-progression practice tool for a jazz/keys player. It generates or loads progressions (roman-numeral source of truth), realizes them as two-hand keyboard voicings, and plays them with a Web Audio synth + metronome. The current implementation is a single ~4,200-line HTML file — being renamed **`index.html`** — now living in a Git repository with two Node test files.

**Repository contents at start:**
- `index.html` — the entire app (CSS + JS inline)
- `test_voice_leading.js` — pure-logic tests (theory, spelling, voicing realization, DP voice leading, cumulative tiers, all 53 library entries)
- `test_dom_smoke.js` — jsdom integration test (loads the app, exercises UI paths, playback, the async race, tier switching)

### Architecture (all inside index.html today)

- **Theory layer:** note spelling by letter+accidental (`spellInterval`, `transposeWithContext`), `INTERVALS` table with degree-aware enharmonics, quality formulas.
- **Parsing:** `parseRomanNumeral` / `parseBasicNumeral` map numerals (including secondary-dominant syntax `V7/x` and explicit quality suffixes like `iiø7`, `V7b9`) to chord objects `{root, quality, degree, substituted?}`. Bare numerals get qualities from **weighted cumulative pools** (`weightedPick`) per complexity tier, scaled by a per-progression `density` character (rolled in `generateRandomProgression`/`loadProgression`, stored on `state`, deliberately *not* re-rolled on key change).
- **Complexity tiers** (UI dropdown): `simple` (triads) → `seventh-strict` → `rsp` (root-shell-pretty) → `seventh` (jazz rootless) → `extended` → `altered`. Tiers are cumulative: each includes lower tiers' qualities at steeply decaying weight, and lower tiers' *voicings* via `VOICING_TIER_COSTS` fed into the optimizer.
- **Voicings:** `KEYBOARD_VOICINGS[quality]` = list of `{name, lh, rh, tiers?}` templates. Seventh-family qualities are fully tier-tagged (`strict`/`rsp`/`jazz`); all other qualities are untagged (native to their tier). `voicingsFor(quality, complexity)` is the **single source of truth** for the filtered list — `state.voicingIndices` indexes into its output.
- **Voice-leading optimizer:** `computeProgressionVoicings` runs DP over (voicing × octave-shift) candidates minimizing movement + register penalty + tier cost + small sparsity cost. `recomputeProgressionVoicings()` must run after any progression/key/complexity mutation.
- **Build pipeline:** `buildProgressionFromSource()` re-derives everything from `state.sourceNumerals` (parse → cadential post-pass that keeps color on dominants resolving to tonic and probabilistically relaxes other chords → re-apply stored substitutions → recompute voicings → `renderChordStructure()`).
- **Rendering:** split into `renderChordStructure()` (rebuilds chord-cell buttons only on structural change; beat dots and sub badges always present) and `updatePlaybackState()` (class toggles only, per beat). Click handling is **delegated once** on `chordContainer`. Chord boxes and sub badges are real `<button>`s.
- **Audio:** lookahead scheduler (`schedulerTick` on `setInterval`, ~120 ms horizon, widened to 1.2 s when `document.hidden`, plus a `visibilitychange` top-up), `visualSync` on rAF consuming a time-stamped queue. `startPlayback` is async (awaits `ctx.resume()`) and guarded by a **session generation token** (`audioEngine.session`) so a stop/start race can't orphan a `sessionGain` or scheduler interval. No non-Web-Audio fallback exists.
- **Substitutions:** `getChordSubstitutions(root, quality)` with degree-aware spelling via `SUB_INTERVAL_NAME`; applied subs stored in `state.substitutions` keyed by index and re-applied on rebuild.

### How to run tests

```bash
npm install          # jsdom is the only dependency
node test_voice_leading.js
node test_dom_smoke.js
```

Both must exit 0 at the end of every phase. Update the tests when a phase intentionally changes behavior; never delete a check to make it pass — replace it with one that tests the new intended behavior.

## Invariants — do not break these in any phase

> **Canonical list: see `INVARIANTS.md`.** All 18 invariants (this section's
> 1–9, the 10–14 added later, and spec v3's 15–18) now live there as the single
> source of truth. The copy below is kept for historical context.


1. `voicingsFor()` stays the single source of truth for voicing lists; every consumer (`getChordNotesAtIndex`, `selectChord` cycling, `buildVoicingCandidates`) must see identical ordering.
2. `recomputeProgressionVoicings()` runs on every path that mutates progression, key, or complexity.
3. The structure/state render split: playback updates never write innerHTML, only toggle classes. Structural rebuilds go through `renderChordStructure()`.
4. Event delegation on `chordContainer`; no per-node listeners on chord boxes/badges.
5. The `audioEngine.session` token discipline: increment in `startPlayback` and `stopPlayback`; re-check after every `await`.
6. `state.density` is rolled only in `generateRandomProgression`/`loadProgression`, never in `buildProgressionFromSource`.
7. Function-preserving guardrails in parsing run *after* weighted quality picks: vii° stays diminished/half-diminished, ii in minor stays half-diminished, tonic-only 6/m6 colors, no random sus or altered-fifth on dominants.
8. Accessibility floor: interactive elements are buttons, `:focus-visible` styles present, `aria-live` on status, `prefers-reduced-motion` respected.
9. Keyboard shortcuts: Space/R/V/arrows, guarded against INPUT/SELECT targets and meta/ctrl/alt modifiers.

---

## Phase 1 — Repo split, tooling, deploy (no behavior change) ✅ shipped

Goal: break the single file into maintainable pieces without changing any behavior, and stand up CI + hosting.

1. **Rename** the app file to `index.html` if not already done.
2. **Split** into classic scripts loaded in dependency order (NOT ES modules — no build step, and jsdom must keep working without a bundler):
   ```
   index.html          (markup + script/link tags only)
   css/styles.css
   js/theory.js        (notes, INTERVALS, spellInterval, transposeWithContext, formatters)
   js/voicings.js      (KEYBOARD_VOICINGS, voicingsFor, VOICING_TIER_COSTS, realizeHand, optimizer)
   js/parsing.js       (weightedPick, parseRomanNumeral/parseBasicNumeral, substitutions)
   js/library.js       (PROGRESSION_LIBRARY data)
   js/audio.js         (audioEngine, synthNote, clickAt, scheduler, visualSync, start/stop)
   js/state.js         (state object, buildProgressionFromSource, generate/load)
   js/render.js        (renderChordStructure, updatePlaybackState, voicing panel, piano SVG, dictionary, sub menu)
   js/app.js           (elements, setupEventListeners, init)
   ```
   Keep everything on shared global scope exactly as it is now (the code already assumes it). Exact file boundaries may flex where functions are interdependent; the constraint is load order with no forward references at load time.
3. **Update `test_dom_smoke.js`**: jsdom must load external resources — construct with `JSDOM.fromFile('index.html', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true })` and await a load event (or poll for `window.state`) before the checks. All existing checks stay.
4. **Add `package.json` scripts:** `"test": "node test_voice_leading.js && node test_dom_smoke.js"`, plus `npm start` using a tiny static server (`npx serve .` or equivalent) for local dev.
5. **GitHub Action** (`.github/workflows/test.yml`): on push/PR, Node 22, `npm ci`, `npm test`.
6. **GitHub Pages** deploy from the repo root (static; `index.html` at root makes this automatic). Add a README with run/test/deploy instructions.
7. **Bug fix (carried over from review):** the loop counter resets on pause/resume because it derives from `chordStep`, which restarts from the resume position. Fix: in `startPlayback` (after the token guard) set `audioEngine.loopBase = state.loopCount - 1`; in `stopAndReset` set `audioEngine.loopBase = 0`; in `visualSync` compute `state.loopCount = audioEngine.loopBase + Math.floor(ev.chordStep / state.progression.length) + 1`. Add a smoke-test check: play past one full loop (or simulate via the mock clock), pause, resume, assert `loopCount` did not decrease.

**Acceptance:** app works served locally and from Pages identically to before; both tests pass locally and in CI; loop counter survives pause/resume. Commit. Stop.

## Phase 2 — Quick wins: step transport + dictionary tips ✅ shipped

1. **Prev/Next chord buttons** in the transport bar (◀ ▶, between/beside Play and Stop, real buttons with aria-labels "Previous chord"/"Next chord"). Behavior:
   - When **not playing**: `selectChord((selectedIdx ± 1 + n) % n)` with wraparound, where `selectedIdx` defaults to `currentChordIndex` if no manual selection. The voicing panel already follows selection.
   - **Sound the chord on step** when not playing: a one-shot audition through a short-lived gain node (reuse `chordPitchesAt` + `synthNote`; create the AudioContext on demand via `ensureAudioContext`; no scheduler involvement, respect the session token by *not* touching `sessionGain` — use a dedicated `auditionGain` connected to `master`, replaced per audition so retriggering cuts the previous one).
   - When **playing**: buttons jump playback to the previous/next chord — set `state.currentChordIndex`, reset `audioEngine.beatCounter` to `newIndex * beatsPerChord`, clear `visualQueue`, resync `nextBeatTime` to `ctx.currentTime + 0.06`, and adjust `loopBase` so the loop display doesn't jump.
   - Keyboard: `[` and `]` (or Shift+Arrow) map to prev/next; plain arrows stay on tempo.
2. **Chord dictionary tips.** Add an optional `tip` string per quality in the dictionary data, rendered as a "Think of it as…" line in the dictionary panel. Draft tips for at least: dom13 ("♭7 major triad over the root covers 3-13-♭7… no wait —" use: "upper structure: major triad on the ♭7 gives ♭7-9-11 → that's 13**sus**; with the 3rd, think ♭7 maj7#5 or 3-13-♭7-9 shell"), 13sus/9sus ("maj7 built on the ♭7 over the root: G13sus = Fmaj7/G"), min11 ("maj triad a whole step below over the root"), dom7alt ("melodic minor a half step up"), dom7#11 ("maj triad on the 2 over the ♭7 shell"), m7♭5 ("minor triad a minor 3rd up over the root"), 69 ("stacked: root + two 4ths + …" only if accurate), maj9 ("min7 from the 3rd over the root"). **Every tip is a music-theory claim: verify each against the quality's interval formula in `INTERVALS`/`CHORD_FORMULAS` before shipping, and mark the whole set with a code comment `// TIPS: drafted for review — Anthony to veto/edit wording`.** Skip any quality where no honest shortcut exists rather than inventing one.

**Acceptance:** stepping works stopped and during playback with correct audio resync; audition sounds when stopped; tips render, each verified against the formula tables; both tests pass (add smoke checks for the new buttons: step changes `selectedChordIndex`, step during mocked playback changes `currentChordIndex` without errors). Commit. Stop.

## Phase 3 — Mobile-first compact UI ✅ shipped

Goal: no vertical scrolling to reach vital controls on a ~390×844 viewport. Favor mobile; desktop remains fully functional.

Target layout (adapt as needed, but the constraints below are firm):
- **Persistent bottom transport bar** (safe-area aware, `env(safe-area-inset-bottom)`): Play/Pause, Stop, Prev/Next, tempo readout that opens a tempo popover (slider + tap-BPM optional).
- **Chord strip**: horizontally scrollable row (scroll-snap) directly above the transport; the active/selected chord auto-scrolls into view (`scrollIntoView({inline:'center', behavior: reduced-motion aware})`).
- **Everything else moves into tabs or bottom sheets** instead of stacking downward: Voicing (piano + hands), Dictionary, Library, Settings (key, mode, complexity, beats/chord, metronome, bars — the Phase 4 control lands here). Pick ONE pattern — a tab bar above the chord strip, or sheets triggered from a compact header — and apply it consistently. Sub-menus (substitutions) become a bottom sheet on narrow viewports instead of an absolutely positioned popover.
- The piano SVG scales to container width; hand-note text wraps cleanly at 320 px.
- Keep desktop (≥ 900 px) as a two-column layout using the same components (CSS grid + media queries), not a separate code path.

Constraints: preserve every invariant (delegation, structure/state split, buttons, focus-visible, reduced-motion). No framework, no build step — vanilla CSS/JS. Do not regress the dictionary or substitution flows; they relocate, they don't shrink in capability.

**Acceptance:** on a 390 px viewport (test via jsdom is insufficient here — include a manual checklist in the PR/commit message), transport + chord strip + one open panel fit without page scroll; all smoke checks updated for the new DOM and passing; keyboard/focus order sensible. Commit. Stop.

## Phase 4 — Generation upgrades: variable length + secondary dominants ✅ shipped (PR #1)

1. **Variable progression length.** A "Bars" control (Settings sheet), integer 2–8, default 4; `state.bars`. One chord per bar (beats/chord = bar length as today). Generation builds `bars` chords using a light phrase model instead of fixed pools:
   - Last chord: cadential — tonic, or dominant-function for a turnaround feel (weighted).
   - First chord: tonic function most often; allow ii/IV openings at lower weight.
   - Interior: current degree-pool logic, avoiding immediate literal repeats.
   - Everything downstream (scheduler, dots, progress, DP optimizer) is already length-generic — verify, don't rewrite.
2. **Secondary dominants in generation.** The parser already understands `V7/x`; this is a generation-side rule set. During random generation, with probability scaled by density (rarer in sparse progressions), insert or convert to a secondary dominant when idiomatic:
   - Only tonicize ii, IV, V, or vi (never a diminished target; vii°/x excluded).
   - A secondary dominant must be immediately followed by its target (resolution down a fifth) — insert as a *pair* or convert the chord *before* an existing ii/IV/V/vi into `V7/x`.
   - Prefer phrase-interior positions; never the final chord; at most one per 4 bars, two in 7–8 bar progressions.
   - The numeral written into `sourceNumerals` is the `V7/x` form, so transposition/complexity re-derivation work for free.
   - Interaction with the cadential post-pass: a secondary dominant is cadential *to its target* — it keeps its color (extend the existing `nextIsTonic` check to "next chord is my tonicization target").
   - Quality of the secondary dominant follows the complexity tier's dominant pool (already handled by the parser's secondary path — verify the cumulative pools apply there too).
3. Extend `test_voice_leading.js`: generate a few hundred progressions at each bar length; assert lengths, assert every `V7/x` is followed by its target, assert no secondary dominant on the final chord, assert frequency stays within loose bounds (present in >5% and <50% of 8-bar seventh-tier generations, say).

**Acceptance:** bars control works 2–8 including during playback stop/start; secondary dominants appear, always resolve, sound right at every tier; all tests (including new statistical ones) pass. Commit. Stop.

## Phase 5 — Library: as-written loading + personal saved progressions ✅ shipped (PR #2)

1. **As-written library loads.**
   - Add `originalKey` (and `mode` where it differs) to every `PROGRESSION_LIBRARY` entry. Use well-documented standard keys where known (e.g., Autumn Leaves → G minor / B♭ major reading, So What → D dorian ~ treat as D minor, Blue Bossa → C minor, Giant Steps → B major, etc.). Where the "original key" is genuinely contested or unknown, choose the most common lead-sheet key and mark it `// KEY: best guess — Anthony to review`. Do not invent certainty.
   - Ensure each entry's numerals carry the qualities the tune actually implies (explicit suffixes like `iiø7`, `V7b9`, `Imaj7`) so the parser reproduces the chart rather than rolling pools. Audit all 53; add suffixes where a bare numeral currently under-specifies a canonical quality.
   - Loading a library entry sets key/mode to the original, sets an "as written" presentation: complexity-driven quality re-rolling is bypassed (explicit suffixes already bypass pools — the audit above is what makes this real), and the voicing tier defaults to the current complexity's voicings applied to those literal qualities. The key and complexity selects visually indicate the as-written state (e.g., key select shows the original key; a small "as written" chip near the progression title).
   - The moment the user changes key or complexity, current behavior resumes: transposition and tier logic apply to the loaded numerals (this mostly already works — the change is initialization, not the pipeline).
2. **Personal saved progressions.**
   - "Save" button (near the progression title / in the Library tab) prompting for a name. Persist to `localStorage` under a single versioned key, e.g. `chordflow.savedProgressions.v1`: array of `{id, name, createdAt, sourceNumerals, key, mode, complexity, density, substitutions, bars}`.
   - A "My Progressions" section at the top of the Library tab: load, rename, delete (confirm), and Export/Import JSON (download a file / paste-or-upload) for backup and cross-device moves.
   - Loading a saved progression restores every listed field verbatim (no re-roll — including density and substitutions).
   - Guard all storage access in try/catch (private-mode Safari throws); the app must degrade gracefully to "saving unavailable."
3. Smoke-test additions: save → mutate → load restores exact state; delete removes; localStorage mocked or real via jsdom (jsdom supports localStorage natively).

**Acceptance:** every library entry has an original key (reviewed or flagged); loading shows the tune as written; key/complexity changes then behave exactly as today; save/load/rename/delete/export/import all work; tests pass. Commit. Stop.

---

## Session protocol (for whoever executes this)

- One phase per session. Read Overview + Invariants first, then only your phase.
- Run `npm test` before touching anything (confirm a green baseline) and after every meaningful change.
- Never weaken a test to pass it; update tests only to reflect intended behavior changes, keeping equivalent coverage.
- Commit at the end of the phase with a message naming the phase. If the session is running long, commit a working intermediate state with tests green rather than leaving the tree broken.
- Anything marked "Anthony to review/veto" ships behind a code comment flag, listed in the commit message.

---

## Post-spec development (shipped after phase 5)

Everything below landed after this spec's phases completed, in PR order:

- **PR #3 — Minimalist redesign + comping grooves + practice modes.** All-sans
  typography pass; comping patterns (block / charleston / bossa / half-note
  pulse, `grooveOnsets` in `js/audio.js`) with optional swung eighths; practice
  modes read at each loop seam: 12-keys (transpose per loop by fourths or half
  steps), tempo ramp (+BPM per loop), and flashcard mode (hide chord symbols).
- **PR #4 — 12-keys seam fix + comping articulation.** Loop-seam handling moved
  to schedule time (`handleLoopSeam` before the wrap beat is scheduled) so the
  old key can't bleed into the new loop; per-hit articulation (`gate`/`v`) on
  groove onsets.
- **PR #5 — Piano-style synth envelope.** Hammer attack, two-stage decay,
  pitch-scaled singing tail, damper at key-up (`synthNote`).
- **PR #6 — Tap-to-play pads.** A performance surface with one pad per chord,
  one-shot and press-and-hold triggering, polyphonic per pointer, on dedicated
  `padVoices` gains connected to `master` (never `sessionGain`).
- **PRs #7–#8 — Hardening.** XSS: all model-derived strings rendered via
  `innerHTML` go through `escapeHtml` (chord degree *and* symbol, plus
  attribute interpolations) — the attack vector is imported saved-progression
  data. Pad voice lifecycle: per-voice mode capture (`g.padHold`),
  audio-clock-aware ring cleanup (`padRingCleanup`).
- **PR #9 — Bassist mode.** A Left Hand setting realized at the single
  realization choke point (`getChordNotesAtIndex` → `realizeVoicing`):
  **Roots** (written LH, default) / **Shells** (root in C2–B2 + guide tones
  from C3 via `guideToneIntervals`) / **Two-hand rootless** ("evans": the
  quality's jazz-tier rootless shapes in the tenor range, chosen per chord by
  a dedicated LH DP pass, `computeLeftHandVoicings`) / **Rootless** (LH
  silent). Plus a **backing bass** toggle: a sustained stand-in root during
  playback when the LH plays no roots.
- **PR #10 — 3-octave mode.** A Range setting (`full` / `reface`) that
  constrains every realized note to one 37-key C-to-C window (C2–C5, Yamaha
  Reface). Enforced in candidate generation: `buildVoicingCandidates`
  hard-drops out-of-window candidates (least-violating fallback so a DP layer
  never empties; extra −24 shift offered under a window), and
  `bestShiftForVoicing` is window-aware for manual cycling and default
  placement. `getChordNotesAtIndex`'s trailing params were folded into an
  options object: `(root, quality, complexity, index, shift,
  { leftHandMode, lhIndex, range })`.

### Invariants added since (10–14, as binding as 1–9)

10. **The realization choke point:** every consumer of realized pitches —
    `scheduleBeat`, `auditionChord`, `padPress` (audio) and `renderVoicing` /
    `renderPianoKeyboard` (render) — goes through `chordPitchesAt` /
    `getChordNotesAtIndex`. New realization-changing features (LH modes, range
    windows) inject there, never per consumer.
11. **Recompute asymmetry:** Left Hand mode changes need **no** voicing
    recompute (the RH and its optimizer are untouched); Range changes **must**
    call `recomputeProgressionVoicings()` (the window changes what the
    optimizer picks). Any new setting must be classified as one or the other.
12. **Escape on render:** any model-derived string interpolated into
    `innerHTML` goes through `escapeHtml` — saved-progression import means
    `degree`, `root`, `quality`, entry names and keys are all untrusted.
13. **Pads never touch `sessionGain`:** pad voices live in
    `audioEngine.padVoices` on `master`; a voice captures its trigger mode at
    press time (`padHold`) rather than reading `state.padMode` later.
14. **Mock-clock ordering in tests:** zero `ctx.currentTime` *before*
    `startPlayback` — rewinding it afterwards leaves `nextBeatTime` in the
    future and silently stalls the lookahead scheduler.
