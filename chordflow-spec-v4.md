# ChordFlow — Project Spec (v4: traditional voicings, playability, vocabulary completion, cleanup, desktop & practice extras)

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
- **Mixed LH mode approved as the app default (owner, 2026-07-17):** the app
  chooses each chord's left hand by voice leading (root vs shell etc.) instead
  of one fixed formula; the named LH modes remain as pedagogical isolations.
  Specced as Phase 1b.
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
2. **One-zone shells: DONE EARLY** (landed ahead of this phase after the
   owner hit the 13th-span shell live). `realizeShellHand` is now a single
   `realizeHand(root, tones, SHELL_TONE_BASE)` call; Test 11 asserts the
   one-zone ≤ 12 st span and Test 17 hard-caps shells at 12 st across
   qualities. Nothing left to do here — verify green and move on.
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
   **Test 17 (the span guard) is ALREADY LANDED** (pre-built ahead of this
   phase): every quality × voicing × {C, F#} is capped at 14 st per hand,
   with the eleven known offenders pinned in its `SPAN_DEBT` allowlist at
   their measured spans (they may not get worse, and stale entries fail
   loudly). **This phase's exit criterion: `SPAN_DEBT` is EMPTY** — each
   re-stack removes its entry (the renames force it, since debt keys are
   `quality|name`). The shells ceiling check (≤ 23 st) tightens to ≤ 12
   with the one-zone fix. Never add a SPAN_DEBT entry without owner
   approval.

**Acceptance:** all eleven re-stacks live and ear-approved; shells one-zone;
roots LH at C3 with bassist paths still at C2; Test 17 green with no
allowlist entries above 14 st; snapshot updated same-commit; both suites
green. Commit. Stop.

## Phase 1b — Mixed left hand (voice-led comping; the new default)

Owner direction (2026-07-17): the fixed LH modes are pedagogical isolations —
real comping *mixes* them. A new `'mixed'` mode lets the app choose each
chord's left hand by voice leading rather than a strict formulation, and it
becomes the **app default**. Runs after Phase 1 (it composes the C3 register
doctrine); do it before Phase 2.

> **DELIVERED 2026-07-17 (PR #39) — scope expanded to JOINT LH+RH by owner.**
> Mid-build the owner approved letting the RH move to an upper structure "when
> it makes musical sense (voice leading) — the engine decides in context."
> So `'mixed'` is a **joint** optimizer (`computeMixedVoicing`), not the
> LH-only DP first sketched below: it picks the RH voicing (reusing
> `buildVoicingCandidates`) AND the LH shape together, minimizing RH movement +
> LH movement, with a hard collision guard and a **completeness** term (the 3rd
> and a real 7th must appear across the two hands). The payoff — where it
> voice-leads well it sends the RH to an upper structure and takes the full
> shell in the LH (e.g. dom13 runs); elsewhere it comps rootless-RH + a light
> LH. Consequence the owner accepted: in mixed mode the RH is now
> context-dependent (`recomputeProgressionVoicings` owns all three arrays for
> mixed), and manual RH cycling recoordinates the LH (`bestMixedLhForRh`).
> Traditional-first is EMERGENT (a random sweep showed traditional shapes ~96%,
> quartal only ~4% and only when clearly smoothest), so no modernity penalty
> was added. Ear-approved. Tests: Test 18 (unit) + the smoke default-LH block.
> The LH-only description below is kept for provenance; the joint version supersedes it.

**Candidates** (per chord — all built from existing realizers, no new
vocabulary; every one sits in the C3 comping zone and spans ≤ 11 st):

1. **Lone root** — `realizeHand(root, ['R'], LH_COMP_BASE)`.
2. **Full shell** — `realizeShellHand(root, quality)` (root + guide tones,
   one zone, the same shape shells mode plays).
3. **Half shells** — root + one guide tone: `['R', 3rd]` and `['R', 7th]`
   (intervals from `guideToneIntervals`, realized at `LH_COMP_BASE`). The
   in-between color a comper actually reaches for.

**Selection — a DP, not rules:** mirror `computeLeftHandVoicings` (the evans
LH optimizer, the established pattern for exactly this problem). Per-chord
candidate layers; cost =

- LH movement between consecutive choices (`voiceMovementCost` on the LH
  midis) — this is the "voice leading over formulas" the mode exists for;
- register centering (soft, around ~E3);
- **hard collision penalty** if the candidate's top note reaches the realized
  RH bottom for that chord (half/full shells on high roots can climb toward
  the RH — the DP must see the real RH, see plumbing below);
- mild idiom priors, tuned on the proof sheet (e.g. shells favored on
  dominant function, the lone root on resolutions) — keep the weights gentle;
  movement should dominate.

**Plumbing (no new realization API):**

- `realizeVoicing` gains the `'mixed'` branch; it interprets the existing
  `lhIndex` argument as the candidate id. State reuses the evans pattern: a
  per-chord `lhVoicingIndices` array recomputed whenever the progression or
  the RH choices change (same trigger as evans).
- The **RH optimizer is untouched** (it reads only `voicing.right`, invariant).
  Mixed runs AFTER it: extend the LH DP's inputs with the realized RH bottom
  per chord (an optional `rhBottoms` array — evans' DP can take and benefit
  from the same argument, but its current behavior must not change without a
  separately-approved proof sheet).
- **Default swap mechanics (subtle, get this exactly right):** the *app-level*
  default changes — `state.leftHand` defaults to `'mixed'` and the Settings
  select gains "Mixed (auto)" as its first option. The **engine-level default
  parameter stays `'roots'`** (`realizeVoicing` / `getChordNotesAtIndex`):
  Test 15's snapshot and every explicit-mode caller are built on it, and it
  keeps the goldens byte-stable through this phase. Only tests that assert the
  *app* default (`test_dom_smoke.js` — the LH restore-default checks, ~lines
  847/891) change to `'mixed'`, each named in the commit message.
- **Display teaches:** the voicing panel names the per-chord decision (e.g.
  "LH mixed → shell (R-3-7)"), so the mode communicates the *why*, not just
  the notes.

**Ear gate (mandatory — this is the most behavior-visible change in the
spec):** proof sheet through the real engine showing, per chord, the chosen
candidate + realized LH|RH: (a) a ii-V-I in at least two keys, (b) one 8-bar
random progression. Owner approves the *mixing behavior* (not just the
notes) before the default flips.

**Tests:** unit — DP picks deterministic; zero LH/RH collisions across all
12 roots on a 13th-chord stress progression; total consecutive-LH movement
never exceeds the naive all-roots baseline (the mode must *improve* voice
leading, that's its contract); every candidate ≤ 12 st (keeps Phase 2's
RH-only span-filter assumption valid). Smoke — app default is mixed; the LH
select round-trips every mode; each fixed mode's output is byte-identical to
its pre-1b behavior (isolations preserved).

**Acceptance:** mixed mode ear-approved and live as the app default; fixed
modes unchanged; engine defaults (and therefore the snapshot) stable; both
suites green. Commit. Stop. — **MET (joint version, PR #39).**

## Phase 1c — Mobile shell integrity & the vertical budget (regression fix)

Owner report (2026-07-18, on-device): (a) "the top ribbon with the tabs is at
some point jumping up the screen and is blocked by the dynamic island…
negative space is below the progression strip, so the whole thing jumps up —
popped up in the last few commits"; (b) after the sounding-chord line landed,
"one has to scroll to see all of the information in the tray." These are one
coherent problem: a **height regression armed a latent shell bug.** Run this
BEFORE Phase 2 — it's a daily-use regression.

**Verified mechanics (2026-07-18, against main @ `052a41e`):**

1. `index.html:5` declares `viewport-fit=cover` — the app extends into the
   Dynamic Island zone by design — but only the BOTTOM is inset-aware
   (`.transport` consumes `env(safe-area-inset-bottom)`, `styles.css:606`).
   The tab bar (`styles.css:90`) has `padding: 8px 12px 0` with **no
   `env(safe-area-inset-top)`**: any upward shift of the document puts the
   tabs under the island.
2. `body { overflow: hidden }` (`styles.css:48`) is NOT a real scroll lock on
   iOS Safari — the document can still be scrolled programmatically or by
   tap/focus auto-scroll. Once `document.scrollTop > 0`, the whole 100dvh
   `.app` shell rides up (tabs → under the island) and dead space appears
   below the transport. Exactly the reported symptom.
3. The nudge trigger is new: the sounding-chord line + the earlier
   taller-piano change pushed the voicing panel past the height budget on a
   390×844-class phone (report (b)), so clipped content now exists for
   `scrollIntoView` (`render.js:910`, the chord-strip centering) and iOS's
   own tap-scroll to act on. `block: 'nearest'` SHOULD be vertically inert,
   but Safari is known to nudge ancestor scrollers anyway when the target is
   clipped.

**Fix (three parts, all at the shell/budget altitude — no per-feature hacks):**

1. **Top safe-area:** `.tab-bar { padding-top: calc(8px +
   env(safe-area-inset-top, 0px)) }` — with `viewport-fit=cover`, every
   edge-anchored bar must consume its inset, not just the bottom one.
2. **Real scroll lock:** make the document genuinely unscrollable on iOS —
   the robust pattern is `position: fixed; inset: 0` on the app shell (or
   html/body `overscroll-behavior: none` + a belt-and-suspenders scroll
   guard that resets `document.scrollTop` to 0 on any document `scroll`
   event, since the shell must NEVER ride up regardless of what nudges it).
   Replace the strip's `scrollIntoView` with explicit `scrollLeft` math on
   the strip's own horizontal scroller — an ancestor-safe scroll that
   CANNOT bubble to the document (keep the reduced-motion behavior).
3. **Vertical budget:** the voicing panel must again fit a 390×844 viewport
   WITHOUT internal scrolling in its common state (selected chord + wrapped
   sub tray + sounding line visible). Reclaim height at the panel level:
   the piano already flex-shrinks — audit its min-height and the fixed
   margins (`.piano-legend` margin-top 10px, `.sounding-chord` margin-top
   6px, panel paddings) and let the piano give back what the sounding line
   took. Do NOT remove the sounding line or collapse it into the
   description (owner values it where it is); do NOT reintroduce the
   "unused space" gap the earlier piano-growth commit fixed — the budget
   must balance, not seesaw.

**Acceptance:** `scripts/layout_check.js` gains, at the 390×844 probe:
(a) `document.scrollHeight <= window.innerHeight` (no page scroll exists);
(b) after driving `selectChord` on a sub-heavy chord with the sounding line
visible: the voicing panel's `scrollHeight <= clientHeight` (no internal
scroll needed) AND `document.scrollTop === 0` after the interaction;
(c) the stylesheet consumes `env(safe-area-inset-top)` in the tab bar (the
island itself can't be emulated headlessly — assert the mechanism).
Mobile-only changes; desktop probes unchanged. Both suites + layout check
green. Owner verifies on the actual phone (the island can only truly be
tested there) before merge is called done. Commit. Stop.

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
     (LH spans are template-fixed after Phase 1 and candidate-fixed after
     Phase 1b — ≤ 12 st everywhere — so RH-only filtering is sufficient;
     assert that assumption in a comment.)
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

## Phase 5 — Desktop UI re-evaluation (design-first)

The desktop layout got left behind while everything was tuned for the phone
(owner: "it got left behind and feels very clunky"). This is a layout
**rethink**, not a patch — so it runs design-first, mirroring the ear-check
gate: **propose before building.**

Current state (verified against `css/styles.css`):
- One breakpoint: a single `@media (min-width: 900px)` (~line 1771) drops the
  mobile UI into a two-column grid — chord strip + transport left, the whole
  tabbed panel area in a fixed **480px** right column. A 1440px+ monitor looks
  identical to a 900px one.
- The mobile one-panel-at-a-time tab model is kept on desktop, where there's
  room to show two panels at once (voicing + piano, or piano + dictionary).
- Branding is just the tiny CF monogram in the tab bar; desktop has room for a
  proper title/identity.
- Piano, chord boxes, and the sub tray are sized for the narrow column.

Steps:
1. **Design gate:** write up 2–3 concrete layout directions (which panels
   pair up, what the large-desktop tier adds, where identity lives, what
   resizes) and post them for the owner to pick from. **Do not build until a
   direction is approved.**
2. Implement the approved direction. Add at least one large-desktop tier
   (e.g. ≥ 1280px) beyond the 900px breakpoint. Desktop-only changes: the
   sub-900px experience must be untouched (byte-identical mobile CSS, or
   prove no visual change at 390×844).
3. Update `scripts/layout_check.js`: keep the 390×844 and 1280×800 probes,
   add a 1440×900 probe, and assert the *new* desktop intent (e.g. two
   panels visible, no fixed 480px cap).

**Acceptance:** owner-approved direction implemented; `layout_check.js`
green at 390×844, 1280×800, and 1440×900; mobile unchanged; both test
suites green. Commit. Stop.

---

## Phase 6 — Practice-flow extras (loop region + tap tempo)

Two small, independent transport upgrades. No voicing changes — the ear-check
gate does not apply; the smoke suite does.

1. **Loop-region selection.** Loop just bars 3–4 of a progression instead of
   the whole thing.
   - Interaction: two-tap on the chord strip — tap a chord's *region handle*
     (or long-press; pick whichever coexists with the existing tap-to-select /
     tap-again-to-cycle gestures without ambiguity, and say why in the PR) to
     mark the start, tap another to mark the end. Region shows as a highlight
     on the strip plus a small chip ("Bars 3–4 ×") — the × clears it.
   - The scheduler is span-generic, so this is mostly index math + strip UI:
     playback and the loop counter wrap within the region while it's active.
     The Top transport button jumps to the region start while a region is set.
     Changing/regenerating the progression clears the region (keep state
     simple; persistence can come later if the owner asks).
   - Smoke checks: set a region mid-progression → scheduled indices stay
     inside it across a wrap; loop counter increments per region pass; clearing
     restores full-span looping; Top targets region start while set.
2. **Tap tempo.** In the existing tempo popover: a "Tap" button; 3+ taps set
   the BPM from the average inter-tap interval (ignore/reset on gaps > 2s),
   rounded to the nearest integer and clamped to the tempo control's existing
   min/max. Applies live, same code path as the slider (the scheduler already
   reads tempo per tick — verify, don't fork it).
   - Smoke check: simulate 4 taps at a known interval with the mocked clock →
     BPM lands on the expected value; out-of-range taps clamp.

**Acceptance:** both features working with the smoke checks above; both
suites green; no change to default behavior when unused. Commit. Stop.

---

## Phase 7 — User guide (scope-gate first)

Kept on the back burner until the surface stabilized; incorporated now as the
final phase, after the register/vocabulary work has settled what there is to
document.

1. **Scope gate:** propose an outline to the owner before writing. The two
   candidate shapes (pick one, or propose a hybrid):
   - **(a) In-app guide** — a compact panel (natural home: the existing help
     tab / "?" surface): short sections for transport & loop, LH modes (roots /
     shells / evans / rootless / bass only + backing bass), the sub tray with
     trials & A/B, flavor dial & borrowed-chord tint, range & hand span. One
     screen per section, phone-first.
   - **(b) Repo doc** — `USER_GUIDE.md`, longer-form, linked from the README.
2. Write it in the app's voice and the owner's philosophy: it teaches
   **standard techniques and jazz approaches** (what a shell is, why rootless
   voicings exist, what an upper structure is), not just which button does
   what. Short glossary over long prose.
3. Keep it maintainable: one source of truth — if (a), the content lives as a
   simple data structure (title + body per section), not scattered markup.

**Acceptance:** owner-approved outline; guide shipped in the chosen shape;
smoke check that the guide surface renders (if in-app); both suites green.
Commit. Stop.

---

## Out of scope (tracked elsewhere)

Any voicing without a traditional citation. (Everything previously parked —
desktop UI, loop region, tap tempo, user guide — is now Phases 5–7 above.)

## Open questions to raise with the owner at build time

- Phase 1 #3: if a multi-note comping LH collides with a low RH after the
  C3 raise, keep a low variant or thin the LH? (Decide per case, on the
  proof sheet.)
- Phase 2: cap stored as semitones (14/16) or names ('9th'/'10th')? Cosmetic;
  pick and be consistent.
- Phase 3: exact So What split and whether dom7sus4 quartal makes the cut —
  both decided on the proof sheet by ear.

## Known traps — read before your first commit

Operational lessons already paid for in earlier sessions. Each of these
looked like something else when it first happened:

1. **A failing `npm test` under parallel load may be the known flake.** Twice
   observed (2026-07-17): 2 failures while heavy work ran on the same
   machine, then 20 consecutive green runs. Before touching any code, rerun
   the failing suite **in isolation**. If it fails in isolation, it's real.
   If it only fails under load, capture the failing check's output and see
   the backlog's flake entry — do not "fix" code the tests aren't actually
   indicting.
2. **A merged fix can be invisible on the live site for GitHub-side
   reasons.** The "pages build and deployment" workflow once failed three
   merges in a row with GitHub's own outage page, silently freezing the
   deployed site on stale code for a day (the owner saw an already-fixed bug
   "recur"). After merging to main, check that workflow's run is green; if
   it failed, re-run it (`rerun_workflow_run`) — do not diagnose the app.
   Separately, the site has no cache-busting on `js/*.js`, so even a good
   deploy takes ~10 minutes to reach a phone.
3. **Never switch `test_voice_leading.js` to `process.exit()`.** It uses
   `process.exitCode` deliberately: `exit()` truncates piped stdout and eats
   the diagnostic output (empirically proven). The suite is pure logic — it
   cannot hang — so `exitCode` is safe. (`test_dom_smoke.js` keeps
   `process.exit`; it has pending timers.)
4. **If a golden/snapshot test fails after your voicing edit, the test is
   doing its job.** The only legitimate response is: confirm the new output
   is *intended*, regenerate via `scripts/gen_voicing_snapshot.js`, and name
   the change in the commit message. Editing GOLDEN lines by hand, or
   loosening Test 17's cap / adding SPAN_DEBT entries to make a new voicing
   fit, is never acceptable — Phase 1's whole purpose is to *empty*
   SPAN_DEBT.
5. **The "Verified facts" section was measured against main @ `92bf524`
   (2026-07-17).** Later phases land on top of earlier ones, so before
   relying on a measured number or line reference in a later session, spot-
   check it against the code in front of you. If the spec and the code
   disagree, or any instruction is ambiguous in a way that changes the
   music, **stop and ask the owner — post the options, don't pick one
   silently.** The owner strongly prefers a paused session over a confident
   wrong guess.
6. **Do not spawn subagents for searches or reviews.** Background agents
   have repeatedly died mid-task with session-limit errors in this
   environment. Do the work inline.

## Session protocol

- One phase per session. Phases 1 → 1b → 1c → 2 → 3 in order (1c is a
  daily-use regression fix — do it next); Phase 4 may run any
  time;
  Phases 5–7 are independent of each other and of 1–3, but 7 (user guide)
  reads best last, once the feature surface has settled. `npm test`
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
