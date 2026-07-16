# ChordFlow — Project Spec (v4: traditional voicings, playability, vocabulary completion, cleanup)

This spec is written for a fresh session (target executor: **Opus 4.8**) with no
prior context. Before executing any phase, read:

1. `README.md` — current feature surface and project layout.
2. `INVARIANTS.md` — **the canonical list of 18 binding invariants.** Every
   phase here must respect all of them; #18 (characterization snapshots gate
   voicing changes) governs most of this spec.
3. `chordflow-backlog.md` — running to-do list; this spec absorbs several of
   its items (they point here).
4. `chordflow-spec-v3.md` — for Phase 4's inherited sections (§4.1–§4.4).

Execute **one phase per session**: complete its acceptance checklist, run
`npm test` (green before starting, green at every commit), commit, stop.

---

## Design philosophy (owner's direction — this is the north star)

> This app is intended to **communicate standard techniques and jazz
> approaches, not invent anything**. Prioritize **traditional voicings**.
> A low, detached root is a legitimate color but **should not be the norm**
> — that's not how real-world comping sits. Voicing decisions are contextual
> and rest on **idiomatic playing and voice leading**.

Operational consequences, binding for every phase:

- Every voicing template must be a form a jazz pianist would recognize and
  name (cite the provenance in the entry's comment: Powell shell, Evans
  rootless Type A/B, So What, upper structure II, etc.). No invented shapes.
- **Register doctrine:** the C2 octave is the *bassist's* register — used by
  `bassonly` mode and the backing bass. The pianist's comping left hand lives
  around **C3** (shells, evans, and — after Phase 1 — the roots-mode LH).
  Low detached roots remain available as a color, not the default.
- **Playability:** a voicing the player physically cannot block is a bug.
  Single-hand spans in the shipped canon should sit ≤ a 9th (14 semitones),
  with a 10th as the absolute ceiling for explicitly-marked stretch voicings.
- **Ear-check gate:** no voicing template ships without (a) a proof sheet of
  realized notes in ≥4 keys generated through the real engine, and (b) the
  owner approving the sound. Post the proof sheet, wait for approval, then
  wire. This is process, not code — do not skip it to "save a round trip."

## Owner decisions already made — do not relitigate

- The evans-LH/quartal coupling is **severed** (PR #31): `lhRootlessShapesFor`
  takes only jazz-tagged AND typed (A/B) forms. Keep it that way.
- **Hand span setting: approved.** Ship with default `unlimited` (no behavior
  change on release); the owner will set 9th for himself. Single user today —
  keep it simple, no persistence work beyond the existing settings pattern.
- Low-root-as-color, C3-comping-norm register doctrine (above): approved.
- The nine wide RH shapes get **re-stacked to their traditional compact
  forms** (verified recipes in Phase 1) rather than deleted or span-filtered
  away — the span setting is a personal guard, not the fix for wrong data.
- Desktop UI re-evaluation is **out of scope** for this spec (needs its own).
  Also out: loop-region, tap tempo, user guide (back burner).

## Verified facts you will need (measured 2026-07-17, against current main)

### The playability audit (why Phase 1 exists)

Single-hand spans, semitones (9th = 14, 10th = 16). Measured at C via the
real engine:

| Offender | Where | Span | Notes at C |
|---|---|---|---|
| Bassist-mode `shells` LH | `realizeShellHand` (js/voicings.js) | **22–23 st (13th/14th)** | `C2 E3 Bb3` — root at LH_BASE, tones at SHELL_TONE_BASE; physically two hands |
| `dom7alt` US ♭VI / US ♭V LH | the `['R','b7','3']` shells | **16 st (M10)** | `C2 Bb2 E3` |
| `RSP (13)` maj7 / dom7 RH | `['3','7','13']` | **17 st (11th)** | `E4 B4 A5` |
| `RSP (b13)` m7b5 RH | `['b3','b7','b13']` | **17 st** | `Eb4 Bb4 Ab5` |
| `Type A: 3-7-9-13` maj13/dom13/min13 RH | `['3','7','9','13']` | **17–18 st** | `E4 B4 D5 A5` |
| `dom7b13` RH | `['3','b7','b13']` | **16 st** | `E4 Bb4 Ab5` |
| `dom13b9` RH | `['3','b7','b9','13']` | **17 st** | `E4 Bb4 Db5 A5` |
| `dom13s11` RH | `['3','b7','#11','13']` | **17 st** | `E4 Bb4 F#5 A5` |

Root cause: `realizeHand` stacks each interval in the lowest octave strictly
above the previous note, so an interval whose pitch class sits *below* its
predecessor's jumps an octave (13 below 7 → the 13 lands an 11th up).
**Interval ORDER in a template is register intent.** The wide shapes are
simply stacked in the wrong (untraditional) order.

### The verified re-stackings (Phase 1's recipes — measured, ≤ 14 st in C AND B)

| Quality / entry | New `right` order | Span | Realized at C |
|---|---|---|---|
| maj7 `RSP (13)` | `['3','13','7']` | 7 | `E4 A4 B4` |
| dom7 `RSP (13)` | `['3','13','b7']` | 6 | `E4 A4 Bb4` |
| m7b5 `RSP (b13)` | `['b3','b13','b7']` | 7 | `Eb4 Ab4 Bb4` |
| dom13 `Type A` | `['3','13','b7','9']` | 10 | `E4 A4 Bb4 D5` (= dom7's existing Type A form — the 13 *replaces* the 5, textbook) |
| maj13 `Type A` | `['3','13','7','9']` | 10 | `E4 A4 B4 D5` |
| min13 `Type A` | `['b3','13','b7','9']` | 11 | `Eb4 A4 Bb4 D5` |
| dom7b13 | `['3','b13','b7']` | 6 | `E4 Ab4 Bb4` |
| dom13b9 | `['3','13','b7','b9']` | 9 | `E4 A4 Bb4 Db5` |
| dom13s11 | `['3','13','b7','#11']` | 14 | `E4 A4 Bb4 F#5` (a 9th — the ceiling; acceptable) |
| dom7alt `US bVI` | LH `['R','b7']`, RH `['3','b13','R','#9']` | LH 10 / RH 11 | `C2 Bb2 | E4 Ab4 C5 D#5` |
| dom7alt `US bV` | LH `['R','b7']`, RH `['3','#11','b7','b9']` | LH 10 / RH 9 | `C2 Bb2 | E4 F#4 Bb4 Db5` |
| bassist `shells` | one zone at 48 (C3): `realizeHand(root, tones, LH_BASE + 12)` for the WHOLE shell | 10 | `C3 E3 Bb3` |

These are the same pitch classes re-stacked into the traditional voicing —
the "wrong" versions were never idiomatic. Type names (`type: 'A'`) stay.

### Architecture facts

- Voicing schema: `KEYBOARD_VOICINGS[quality].voicings[] = {left, right,
  name, type, tiers?}`. `voicingsFor(q, complexity)` is the single source of
  truth for filtered lists (invariant 1); Tests 15/16 and
  `scripts/gen_voicing_snapshot.js` all derive their index space from
  `voicingsFor(q, 'seventh')` — keep it that way.
- **Snapshot workflow (invariant 18):** after any intentional voicing change,
  run `node scripts/gen_voicing_snapshot.js [qualities…]` and paste the
  emitted lines over the matching `GOLDEN` entries in Test 15 **in the same
  commit**. Eyeball the diff: only the qualities you touched may move.
- Realization: `realizeVoicing(root, voicing, shift, leftHandMode, quality,
  lhIndex)` — LH modes: roots (voicing.left @ `LH_BASE = 36`), shells
  (`realizeShellHand`), evans (`lhRootlessShapesFor` + `LH_ROOTLESS_BASE =
  48`), rootless (empty), bassonly (root @ 36, RH empty).
- The range window (`RANGE_WINDOWS.reface`, C2–C5) filters **RH** candidates
  in `buildVoicingCandidates` (hard drop + least-violating fallback, extra
  −24 shift) and `bestShiftForVoicing` (overflow × 1000 penalty). The hand
  span setting (Phase 2) mirrors this mechanism exactly.
- `state` settings pattern: field in js/state.js, `<select>` in the Settings
  panel (index.html), listener in js/app.js. Range's listener calls
  `recomputeProgressionVoicings()` — invariant 11 says every new setting must
  be classified needs-recompute or not. **Hand span: needs recompute.**
- Tests: `test_voice_leading.js` (pure logic; `process.exitCode` on failure —
  do NOT change to `process.exit`, stdout truncation was a real bug) and
  `test_dom_smoke.js` (jsdom; zero the mock clock BEFORE `startPlayback`,
  invariant 14). CI runs both on every push/PR.

---

## Phase 1 — Traditional register & playability overhaul

Goal: every shipped voicing is the traditional form, blockable by one hand,
and the comping LH sits in the pianist's register.

1. **Re-stack the eleven templates** exactly per the verified table above
   (nine RH re-orders + the two dom7alt entries whose 3rd moves from LH to
   the bottom of the RH). Update each entry's `name` where it encodes the
   old order (e.g. `'Type A: 3-7-9-13'` → `'Type A: 3-13-7-9'`;
   `'US bVI: R-7-3 | bVI maj triad'` → `'US bVI: R-7 | 3 + bVI triad'`).
   Test 16's name fragments and pitch-class/register assertions must be
   updated to the new intent in the same commit (the dom7alt "3rd floats to
   a major 10th" assertion is superseded: the LH is now `R-b7` = 10 st, and
   the 3rd is the RH's bottom note — assert THAT instead).
2. **One-zone shells:** `realizeShellHand` realizes the whole shell with a
   single `realizeHand(rootNote, tones, LH_BASE + 12)` call (root lands
   C3–B3, tones close above; span ≤ 10 st). Delete the split-zone
   `SHELL_TONE_BASE` concat. Update Test 11's shells assertions (root no
   longer "in the bass zone below C3" — assert the one-zone span instead:
   every shell note within `[48, 48+22]` and hand span ≤ 12 st) and the
   smoke test's shells text if it asserts specific notes.
3. **Roots-mode register doctrine:** raise the comping root zone to C3:
   introduce `LH_COMP_BASE = 48` and use it for `leftHandMode: 'roots'`
   realization (i.e. `realizeVoicing`'s default branch anchors
   `voicing.left` at 48). `LH_BASE = 36` **remains** for the bassist-role
   paths: `bassonly` and the backing bass in `scheduleChordSpan`. Grep for
   every `LH_BASE` use and classify each as pianist-comping (→ 48) or
   bassist-role (→ 36) before editing; list the classification in the PR.
   NOTE: multi-note lefts like `['R','5']` at 48 top out ≈ D4 — verify no
   collision with RH bottoms (RH_SOFT_LOW = 55) across roots; if a specific
   template collides, that template may keep a low variant — decide and
   document per case.
4. **Proof sheet + ear gate:** before wiring ANY of the above, generate one
   proof sheet (realized LH|RH in C, F, A♭, E for every changed template plus
   shells and a roots-mode ii-V-I showing the new hand gap) and get owner
   approval. The register change (#3) is the most audible change this spec
   makes — it is explicitly gated.
5. **Snapshot + tests:** regenerate goldens for every touched quality via
   `scripts/gen_voicing_snapshot.js`; only touched qualities may drift.
   Tests 1–3 (voice-leading) read RH only and should be unaffected — if the
   DP's choices change because re-stacked shapes now cost differently,
   investigate before accepting (the re-stacked Type A forms match dom7's
   existing Type A geometry, so movement costs should IMPROVE consistency).
   Add a **span regression test** (new Test 17): for every quality × every
   voicing × roots {C, F#, B, Eb} × LH modes {roots, shells}, realized
   single-hand span ≤ 16 st, and ≤ 14 st except entries on an explicit
   allowlist (currently: `dom13s11` re-stack at 14 — the allowlist should
   start EMPTY of >14 entries; 14 is allowed generally). This is the
   permanent tripwire that prevents this class of bug from shipping again.

**Acceptance:** all eleven re-stacks live and ear-approved; shells one-zone;
roots LH at C3 with bassist paths still at C2; Test 17 green with no
allowlist entries above 14 st; snapshot updated same-commit; both suites
green. Commit. Stop.

## Phase 2 — Hand span setting

A personal playability guard, mirroring the reface Range window mechanically.

1. `state.handSpan: 'unlimited' | 14 | 16` (store the semitone cap or the
   string; pick one and be consistent). Settings `<select>` "Hand span":
   `Unlimited` (default) / `9th` / `10th`, placed next to Range. Listener
   sets state, calls `recomputeProgressionVoicings()`, re-renders the
   voicing panel (same shape as the Range listener).
2. Enforcement at the same three sites as the range window:
   - `buildVoicingCandidates`: compute the realized span of **both** hands
     for each candidate (LH realization depends on leftHandMode — use the
     roots-mode LH for candidate costing, same simplification the window
     uses for RH-only; document this); hard-drop candidates whose RH span
     exceeds the cap, least-violating fallback so a DP layer never empties.
     (LH spans are template-fixed after Phase 1 — ≤ 12 st everywhere — so
     RH-only filtering is sufficient; assert that assumption in a comment.)
   - `bestShiftForVoicing`: span overflow × 1000 penalty (manual cycling
     and default placement respect the cap).
   - `voicingsFor` is NOT touched — the cap must not change list indices
     (invariant 1); it only steers *selection*, exactly like the window.
3. The sub tray, dictionary audition, pads and auditions need no changes
   (they flow through chosen indices / explicit indices — a user tapping a
   specific wide voicing in the dictionary should still hear it; the cap
   governs what the app *deals*, not what the user explicitly requests).
4. Tests: unit — with cap 14, a DP run over a progression stacked with
   13th-chords never selects a >14 st RH (sweep like Test 13's pattern);
   cap 'unlimited' output byte-identical to today (regression); fallback
   never empties a layer. Smoke — select exists, drives state, recompute
   observable, restore default.

**Acceptance:** setting works end-to-end; default changes nothing (proven);
cap 14 provably filters; both suites green. Commit. Stop.

## Phase 3 — Vocabulary completion (traditional canon only)

Finish the backlog's section-B items. Every voicing: provenance comment,
proof sheet in ≥4 keys, ear gate, pitch-class unit test, snapshot
same-commit. Append entries; never reorder existing ones.

1. **Powell-hand shells (maj/min):** `maj7`/`maj13`: LH `['R','7']` or
   `['R','3']` two-note Powell shells (span ≤ 11 st) with RH guide-tone/
   color stacks; `min7`/`min11`: LH `['R','b7']` + RH `['b3','5','9']`-style
   color. Derive exact sets at build time with the proof sheet; the two-note
   LH shell is the Powell idiom — do NOT re-introduce three-note stretches.
2. **Slash-chord family:** `maj9` gains the D/C Lydian slash
   (`left:['R'], right:['9','#11','13']` — verify vs the existing maj7
   quartal for near-duplication first; if the pitch content collides with
   an existing entry, name the inversion distinctly instead of duplicating);
   `dom11`'s existing `['b7','9','11']` gets its name updated to say
   "bVII/F-over-G slash" framing (naming-only change — no snapshot impact
   beyond none; names aren't in the snapshot).
3. **Quartal completion:** the tight 5-note **So What voicing**
   (`E-A-D-G-B` on Dm7 = intervals `9,5,R,11,13` with the whole stack in
   the mid register) cannot be expressed with LH-at-36/RH-at-60 anchors.
   Implement the deep fix the backlog names: optional per-voicing register
   overrides `lhBase`/`rhBase` in the template schema, honored by
   `realizeVoicing` (default to current constants when absent). Then ship
   So What as `min7`/`min11`: `left:['9','5'] lhBase:53`, `right:['R','11',
   '13'] rhBase:62`-style split (derive exact numbers on the proof sheet —
   hands adjacent, each ≤ 7 st). Also add `dom7sus4` quartal if the proof
   sheet supports an idiomatic form; skip `m7b5` unless a traditional
   quartal citation exists (philosophy: no inventions).
4. **Span discipline:** Test 17 (Phase 1) automatically covers every new
   entry — nothing added here may exceed it.

**Acceptance:** each family ear-approved before wiring; provenance comments
present; Test 17 + snapshot green; both suites green. Commit. Stop.

## Phase 4 — Cleanup batch

Absorbs backlog section-A items and completes spec v3 Phase 4. Independent
of Phases 1–3; can run any time.

1. **Settings IA** (spec v3 §4.1 + §4.3): Song / Sound / Practice segmented
   groups (no per-group scroll at 390px; active chip = location indicator);
   non-default settings dot on the Settings tab. Hand span (Phase 2) and
   Range live in Sound.
2. **LH cycle chip + pad haptics** (spec v3 §4.2 + §4.4): as specced there.
3. **Dictionary substitution buttons → sub-chips:** `renderDictChordInfo`'s
   substitution list still renders old-style `.voicing-sub-btn`s; restyle as
   `.sub-chip` AND make them audition on tap (reuse `auditionDictVoicing`'s
   gain pattern with the sub's root/quality realized via `getChordNotes`).
   Removes the last `.voicing-sub-btn` consumer — delete its CSS.
4. **Smoke-test sectioning:** split `test_dom_smoke.js`'s single function
   into named sub-functions matching its `// ---` banners (pure refactor:
   identical checks, identical count — diff the "ok:" line inventory before/
   after to prove no check was lost).
5. **Small review leftovers:** rename dom7sus4's `'Slash: R | bVII triad
   (13sus)'` vs `RSP (9)` so the inversion distinction is visible in the
   tray/dictionary; trim Test 16's cross-root loop if Test 4's automatic
   all-voicings sweep makes it fully redundant (keep the pitch-class
   assertions — they're the part Test 4 can't do).

**Acceptance:** settings grouped with dot; dictionary subs audition as
chips; smoke suite sectioned with proven check-parity; both suites green;
`scripts/layout_check.js` updated for the settings groups. Commit. Stop.

---

## Out of scope (tracked elsewhere)

Desktop UI re-evaluation (needs its own spec — see backlog), loop-region
selection, tap tempo, user guide (back burner), and any voicing without a
traditional citation.

## Open questions to raise with the owner at build time

- Phase 1 #3: if a multi-note comping LH collides with a low RH after the
  C3 raise, keep a low variant or thin the LH? (Decide per case, on the
  proof sheet.)
- Phase 2: cap stored as semitones (14/16) or names ('9th'/'10th')? Cosmetic;
  pick and be consistent.
- Phase 3: exact So What split and whether dom7sus4 quartal makes the cut —
  both decided on the proof sheet by ear.

## Session protocol

- One phase per session, in order (Phase 4 may run any time). `npm test`
  green before starting and at every commit.
- Never weaken a test to pass it; replace with equivalent-or-better coverage
  of the new intent (Phase 1 deliberately changes several assertions — each
  change must be named in the commit message with its rationale).
- The ear-check gate is mandatory for every voicing/register change: proof
  sheet → owner approval → wire. Post the sheet and stop if approval hasn't
  been given in-session.
- Snapshot goldens regenerate via `scripts/gen_voicing_snapshot.js`, same
  commit as the voicing change (invariant 18).
- PRs per phase; commit messages name the phase.
