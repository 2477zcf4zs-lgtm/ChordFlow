# ChordFlow — Spec v6: the consolidated remainder

One ordered roadmap for everything left across `chordflow-spec-v4.md`,
`chordflow-spec-v5.md`, and `chordflow-backlog.md`, re-specced in the
**post-holistic-model context** (v5 Stage A + the So What work are done and
merged; the stack/`splitAfter` model with anchored voicings is live).

Written for a fresh executor session with no prior context. Before executing
any stage, read:

1. `README.md` — including **Purpose & guiding principles** (the north star:
   practice chart reading; teach standard/traditional voicings; train hands
   and ears on jazz harmony; stay reasonably idiomatic).
2. `INVARIANTS.md` — all invariants bind, especially **1a** (a voicing's
   identity is its interval stack) and **1b** (anchored-voicing distribution
   contract; anchored = manual-only in mixed comping — owner decision).
3. `chordflow-backlog.md` for item-level detail; v4/v5 for history. Where this
   spec and an older spec disagree, **this spec wins** — v4 Phases 2–7 and v5
   Stages B-1/B-2/B-4/C as written are superseded by the stages below.

Execute **one stage per session**: green suites before starting and at every
commit, proof sheet + owner ear approval for anything that changes sound,
commit, stop. PRs titled `v6 Stage N`.

---

## Where the codebase stands (verified 2026-07-21, against main)

**Done and merged:** v4 Phases 1 / 1b / 1c (register doctrine, mixed LH joint
DP, mobile shell); v5 Stage A (stack model, sound-frozen, wrappers in place);
v5 Stage B-3 (the So What anchored quartal cluster on `min7`, split 3/2);
the So What review round (PR #47: mode-aware anchored contracts — bassonly
root-only, rootless drops the root layer; `soundingChord.impliedGuideTones`
honesty; invariant 1b; README principles); and the **anchored truth-costing
fix** (`buildVoicingCandidates` + `bestShiftForVoicing` realize anchored
candidates from the stack and window-check the whole texture — the fresh
RH-slice realization was an octave off at G/A♭/A and escaped the reface
window).

**The lesson that shapes this spec's ordering:** every defect found since
Stage B-3 lived at a **seam** — anchored voicings × the window, × the mixed
DP, × ensemble modes, × the sounding display. None were in the feature
itself. The per-hand model's residue (RH-slice costing, per-hand window
simplification, the mixed DP's phantom LH bookkeeping) is what created those
seams; Stages 1 and 4 exist to delete the seam class, and they run FIRST so
the vocabulary work (Stage 3) lands on the general mechanism instead of
growing new special cases.

## Stage 1 — the distribution solver: window & register at the right altitude
*(supersedes v5 Stage B-1)*

Today the window logic is a per-hand patchwork: candidates carry only RH
midis; the reface fix taught the mixed LH to duck under a relocated RH
(`mixedLhPlacement`'s base ladder + `MIX_LH_DROP_COST`); and the anchored
truth-costing fix special-cased "realize the whole stack" into two call
sites. Stage 1 generalizes: **every candidate carries its full realized
texture**, and the window constrains the texture, not a hand.

1. Candidate shape: `buildVoicingCandidates` realizes the whole texture per
   (voicing, shift) — for normal voicings the default-split stack at its
   bases, for anchored voicings the anchored stack (this absorbs the
   truth-costing special case into the general path). Window-check the whole
   texture for everyone (documented today as an RH-only simplification —
   that simplification is *wrong* for mid-register textures; delete it).
2. The solver owns placement: the mixed DP consumes textures instead of
   re-deriving LH placement per RH candidate; `mixedLhPlacement`'s base
   ladder retires in favor of solver placement. Split choice beyond
   `splitAfter` (the v5 payoff) may land here or be deferred to a later
   stage — but the *representation* (texture-carrying candidates) must land
   now.
3. Sound is ear-gated: any realized-note change appears on a proof sheet
   first (full-range output should be near-identical; window-active output
   may legitimately improve). `scripts/full_surface.js` before/after diff
   attached to the PR; goldens regenerated only for owner-approved changes.
4. Tests: Test 18's window assertions keep passing; Test 20's DP-matches-
   reality and whole-texture-window checks generalize from So What to a
   sweep over every voicing (they become cheap once candidates carry
   textures).

**Acceptance:** no per-hand window logic left; `mixedLhPlacement` ladder
retired; proof sheet approved for any sound change; both suites +
`layout_check.js` green. Commit. Stop.

## Stage 2 — hand span, both halves
*(merges v5 Stage B-2 mechanics + v4 Phase 2 UI)*

1. Mechanics: `state.handSpan: 'unlimited' | 14 | 16` as a per-hand reach
   cap in the Stage-1 solver — a hard candidate filter with least-violating
   fallback (mirror the window's pattern). With textures in candidates,
   per-hand span is directly measurable; no RH-only proxy.
2. UI: Settings `<select>` "Hand span" (Unlimited / 9th / 10th) next to
   Range; classified like Range per invariant 11 — changes **must** call
   `recomputeProgressionVoicings()`.
3. Explicit user choices bypass the cap (dictionary taps, manual cycling
   still play what was asked — the cap governs what the app *deals*).
4. Tests: cap 14 sweep never selects a >14 st hand; 'unlimited' output
   byte-identical (regression); fallback never empties a layer; smoke test
   for the select + recompute + restore-default. Test 17's span guard keeps
   its role as the template-level cap; note in the PR how the two relate.

**Acceptance:** v4 Phase 2's acceptance verbatim, plus per-hand (not
RH-only) enforcement. Commit. Stop.

## Stage 3 — vocabulary completion (traditional canon only, as stack data)
*(supersedes v4 Phase 3's remainder; the lhBase/rhBase mechanism is dead —
anchored stacks replaced it)*

Backlog section B's open families. Every entry: provenance comment, proof
sheet in ≥4 keys, owner ear gate, pitch-class unit test (Test 16 pattern),
snapshot same-commit, append-only ordering (invariant 1), Test 17 span
compliance. Sounding display: any guide-tone-free entry must show
`impliedGuideTones` honestly (assert it, as Test 20 does for So What).

1. **Powell-hand shells (maj/min):** `maj7`/`maj13` LH `['R','7']` or
   `['R','3']` two-note shells + RH guide-tone/color stacks; `min7`/`min11`
   LH `['R','b7']` + RH `['b3','5','9']`-style color. Two-note LH is the
   Powell idiom — no three-note stretches.
2. **Slash-chord family:** `maj9` D/C Lydian slash (check near-duplication
   with the maj7 quartal first); `dom11` naming reframed as F-over-G
   (naming-only). Frame in the tray/dictionary as triad-over-bass — the
   pedagogy is the point.
3. **Quartal completion:** `dom7sus4` quartal if a traditional citation
   supports it; skip `m7b5` unless cited (no inventions). If any new entry
   wants to sit mid-register as one cluster, it is an **anchored stack** —
   the mechanism So What proved out; no new machinery.
4. Anchored entries added here inherit invariant 1b automatically
   (manual-only in mixed) — if the owner wants a different mixed policy for
   a guide-tone-carrying anchored voicing, that is an owner decision to ask
   for, not to assume.

**Acceptance:** per-family ear approval; provenance present; Tests 15/16/17
green; both suites green. Commit per family or per stage. Stop.

## Stage 4 — retire the wrappers and the authored `{left,right}` form
*(supersedes v5 Stage B-4)*

Once Stages 1–3 leave nothing calling them: delete `realizeShellHand` /
`lhMixedCandidateIntervals` / `realizeMixedCandidateBelow` (and kin) as
separate code paths; migrate their tests to stack calls **check-for-check
(name each in the commit)**; optionally migrate `KEYBOARD_VOICINGS` authored
`{left,right}` to authored `{stack, splitAfter}` (mechanical; `toStack`
then becomes a no-op to delete). `scripts/full_surface.js` before/after diff
must be EMPTY — this stage is Stage-A-style sound-frozen.

**Acceptance:** empty oracle diff; zero test-check loss (inventory the
`ok:`/`check` lines before/after); both suites green. Commit. Stop.

## Stage 5 — language & surfaces (Ensemble)
*(v5 Stage C, unchanged in intent)*

1. The "Left hand" select becomes **Ensemble** (or keeps its label with
   reframed options) — **owner picks on a mock before wiring**: Full /
   Shells / With bassist / App bass / Duo. Same state machinery; smoke
   default assertions updated by name.
2. Voicing panel + dictionary show the stack with its live split; the
   "LH mixed → …" label becomes a distribution label. The sounding-chord
   line (with its implied-tones honesty) is unchanged.
3. README adopts the sonority-first language.

**Acceptance:** owner-approved mock; suites + layout check green. Commit.
Stop.

## Stage 6 — cleanup batch *(v4 Phase 4; interleave any time)*

As v4 Phase 4, verbatim, with two updates: the **LH cycle chip** (§4.2)
waits for Stage 5's naming; and the **smoke de-flake** work (mock-clock the
sub-tray/trial sections; captured instances and instrumentation are in the
backlog entry) is explicitly part of item 4's sectioning. Items: Settings IA
(Song/Sound/Practice + non-default dot), LH cycle chip + pad haptics,
dictionary sub buttons → auditioning `.sub-chip`s (delete `.voicing-sub-btn`
CSS), smoke sectioning with proven check-parity, small naming leftovers.

## Stage 7 — desktop UI re-evaluation *(v4 Phase 5, design-first)*

Unchanged from v4: **design gate first** (2–3 layout directions, owner
picks), then implement with a ≥1280px tier, mobile byte-identical,
`layout_check.js` gains a 1440×900 probe asserting the new intent.

## Stage 8 — practice-flow extras *(v4 Phase 6)*

Loop-region selection + tap tempo, unchanged from v4's spec (interaction
details, clamps, and smoke checks as written there).

## Stage 9 — user guide *(v4 Phase 7; runs after Stage 5)*

Scope-gate an outline with the owner (in-app panel vs `USER_GUIDE.md`),
then write it in the app's teaching voice. Runs after Stage 5 so it
documents the Ensemble language, not the LH-mode language it replaces.

---

## Ordering & interleave rules

Core line: **1 → 2 → 3 → 4 → 5**, then 9. Stages 6–8 are independent of the
core line and may interleave at any point (except 6's LH-cycle-chip item,
which waits for 5). Rationale: 1 deletes the seam class before 3 grows the
vocabulary on top of it; 2 rides on 1's textures; 4 needs 1–3 to strand the
wrappers; 5 renames what 1–4 stabilized.

## Known traps (inherit v4 + v5 lists; these are new since)

1. **Anchored voicings interact with everything.** Window, optimizer, LH
   modes, sounding display — each seam has already had one bug. When
   touching any of those, run Test 20's block and `full_surface.js`, and
   check all six LH modes, not just roots.
2. **Invariant 1b is an owner decision, not a smell.** Do not "helpfully"
   make anchored voicings mixed-DP-eligible again; the pre-review ~22% pick
   rate was an artifact of a costing bug, not a design.
3. **The oracle is the cheap insurance.** `node scripts/full_surface.js`
   before and after any voicings.js change; an unexpected non-empty diff is
   a stop-and-look, even when tests are green (fixed-index dumps miss
   optimizer-choice changes; Tests 13/18 cover those).
4. **`impliedGuideTones` is part of the teaching contract.** New voicings
   that omit the 3rd/7th must surface it; a sounding name that overstates
   the harmony miseducates (core purpose #2).
5. All v4/v5 traps verbatim: flake protocol (rerun failing tests in
   isolation), Pages-deploy check after every merge, `process.exitCode` not
   `process.exit`, golden regeneration via `scripts/gen_voicing_snapshot.js`
   only for approved changes, stale-facts spot-check before relying on a
   spec's "verified facts", no subagents.

## Session protocol

As v4/v5: one stage (or one Stage-3 family) per session; suites green at
every commit; ear gate before wiring sound changes; every invariant
re-wording named in the commit message; PRs titled `v6 Stage N`; verify the
Pages deploy after merging.
