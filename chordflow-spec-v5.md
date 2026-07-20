# ChordFlow — Spec v5: the holistic voicing model (stack + distribution)

This spec is written for a fresh session (target executor: **Opus 4.8**) with
no prior context. Before executing any stage, read:

1. `README.md`, `INVARIANTS.md` (18 binding invariants; this spec includes a
   gated revision protocol for the ones it touches), `chordflow-backlog.md`.
2. `chordflow-spec-v4.md` — v5 **supersedes its Phases 2 and 3 as written**
   (see "Impact on the v4 roadmap" below). v4's completed phases (1, 1b, 1c)
   and its Phases 4–7 are unaffected except where noted.

Execute **one stage per session**: complete its acceptance checklist, run
`npm test` (green before starting, green at every commit), commit, stop.

---

## Why (the owner's insight — this is the mandate)

> "As we've developed the app, we've kind of gone down this road where we
> define 'voicing' by hand rather than holistically. I think that has led to
> a lot of the extra disclaimers, caveats, etc… when a player sees C6, they
> are considering how they will voice it between both hands, not the shape
> of the right and the shape of the left separately."

The owner is right, and the codebase is the evidence. Today a voicing's
IDENTITY includes its hand split (`{left: [...], right: [...]}`), so every
context change requires coordination machinery bolted on after the fact:
the mixed-mode joint DP's collision guard and guide-tone completeness term,
per-hand register bases (`LH_BASE`/`LH_COMP_BASE`/`SHELL_TONE_BASE`/
`RH_BASE`), the reface fix teaching the LH to duck under a relocated RH,
the dom7alt "move the 3rd from LH to RH" re-authoring, per-hand span
budgets, and v4 Phase 3's planned `lhBase`/`rhBase` per-voicing override
(needed only because the So What cluster can't be expressed as two
independently-anchored half-stacks).

The musical truth: a voicing is **one sonority**; which notes land in which
hand is a **decision** made from context (register, reach, ensemble role) —
not part of the chord's identity. The pedagogy the app teaches still speaks
in hand roles ("LH voicings", Powell shells), but those roles come from
**ensemble context** (is there a bassist? is the RH soloing?), and the
vocabulary itself is a set of named *stacks*.

**The model change:** voicing = ordered interval stack (+ register intent).
Hand distribution = computed by a solver under reach/no-crossing
constraints. LH "modes" become **ensemble contexts** that set the hands'
jobs before distribution happens.

## Design philosophy (unchanged, binding)

Everything in v4's philosophy section still governs: traditional voicings
first, provenance-cited vocabulary only, playability (≤ a 9th per hand;
10th ceiling for marked stretches), C3 comping / C2 bassist register
doctrine, and the **ear gate** for anything that changes sound. v5 adds one
process rule above all others:

> **Stage A changes the MODEL and must not change the MUSIC. Stage B
> changes the music and must not happen in Stage A.** The characterization
> snapshot (Test 15) is the police: Stage A's acceptance criterion is
> BYTE-IDENTICAL goldens with ZERO edits.

## The model

1. **Sonority (voicing identity).** A voicing is an ordered interval stack:
   `{ stack: ['R','3','13','b7','9'], name, type, tiers, provenance }`.
   Order still encodes vertical stacking exactly as `realizeHand` does today
   (interval order = register intent — this invariant survives; it is the
   part of the old model that was RIGHT). Optional register intent per entry
   (an anchor marker, e.g. the root anchored low while the tones sit in the
   comping zone) replaces today's implicit "left realizes at a low base"
   convention.

2. **Realization.** `realizeHand` (unchanged in spirit) turns a stack +
   anchor(s) into ascending notes. One realizer, not one-per-hand.

3. **Distribution.** For the common texture (one sonority, two hands), the
   realized notes are ascending, hands don't interleave, and distribution
   reduces to choosing a **split index k**: notes below k → LH, k and above
   → RH. The solver picks k (and the stack's octave placement) minimizing:
   per-hand span over the cap (hard), a register-doctrine cost, split
   stability across the progression (voice leading), and idiom priors.
   No-crossing is true **by construction** — the entire class of collision
   bugs (the reface regression, the mixed-mode guards) becomes impossible
   rather than guarded against.

4. **Texture & ensemble context.** What today's LH modes actually encode:

   | Today | Truth | v5 context |
   |---|---|---|
   | roots / mixed | both hands, one sonority | `full` (default): one stack, solver-split |
   | shells | reduced sonority (guide tones) | `full` with a `shell` stack policy (subset selection is a POLICY on the sonority, not a different hand) |
   | rootless | a bassist owns the low end | `with-bassist`: root omitted from distribution; player comps the stack |
   | bassonly / backing bass | the APP is the bassist | `app-bass`: root realized low (C2, bassist register) as its own layer; remaining stack distributed above |
   | evans | two voicings at once (duo texture) | `layered`: genuinely TWO stacks (the LH rootless color voicing is its own sonority slice) — the model must be honest that this texture is not one stack with a split |

   The `layered` case matters: evans-mode hands can interleave in pitch
   today (this was never guarded). A single split-point model cannot and
   should not represent it — a texture is **one or more stacks with roles**,
   and the two-stack case is musically real (it is literally two voicings).

## What dies, what survives

**Dies** (after Stage A's wrappers are retired): the `{left, right}` split
as identity; `realizeShellHand`/per-hand realizers as separate code paths;
the mixed DP's two-hand coordination bookkeeping (collision + completeness
terms — both become construction-guaranteed or stack-policy concerns); the
per-hand base constants as scattered anchors; **v4 Phase 3's lhBase/rhBase
override mechanism (never build it)**.

**Survives:** `realizeHand`; `voicingsFor` + tiers (invariant 1);
the DP optimizer shape (layers become stack × octave × split candidates);
every voicing NAME and provenance (the pedagogy speaks Type A/B, Powell,
So What — they become named stacks with an authored default distribution);
the sounding-chord feature (gets SIMPLER: the union is just the stack);
the snapshot/span-guard/ear-gate machinery; bassist-register doctrine.

## Stage A — model swap, sound-frozen

Goal: the new representation underneath, byte-identical behavior on top.

1. **Schema + adapter.** Introduce the stack schema. Migrate
   `KEYBOARD_VOICINGS` mechanically: `stack = left ++ right` with an anchor
   marker where `left` was low-realized; store the authored split as the
   voicing's **default distribution** (`splitAfter: left.length`). Do NOT
   hand-edit musical content in this stage.
2. **One realization pipeline.** `realizeVoicing` becomes: realize stack
   (per anchors) → apply texture/context → distribute (Stage A: use the
   stored default split and today's context mappings verbatim, including
   mixed mode's DP decisions re-expressed as split choices). The old
   entry points (`realizeShellHand`, `lhMixedCandidateIntervals`,
   `realizeMixedCandidateBelow`, …) become thin wrappers so every existing
   test passes UNTOUCHED.
3. **Evans honesty.** Model evans as the two-stack `layered` texture from
   day one, reproducing today's output exactly (including any current
   hand-interleaving — do not "fix" it here; register changes are Stage B,
   ear-gated).
4. **Measurements before coding** (trap-#5 discipline): dump every quality ×
   voicing × LH mode's realized notes at C and F# from current main into a
   scratch reference; after the swap, diff — the diff must be EMPTY before
   the commit. This is in addition to Test 15.
5. **Invariant revision, gated:** invariants that say "the optimizer reads
   only `voicing.right`" (and kin) get re-stated in stack terms in
   `INVARIANTS.md`, each edit named in the commit message with its old and
   new wording. No invariant is DELETED in Stage A — only re-expressed.

**Acceptance:** Test 15 goldens byte-identical with zero edits; the scratch
full-surface diff empty; both suites + `layout_check.js` green with zero
test-file changes (wrappers make this possible); no UI change; commit
message lists every wrapper kept for later retirement. Commit. Stop.

## Stage B — distribution capabilities (the payoff; ear-gated per item)

Each item is a separate proof-sheet + owner approval:

1. **Window handling at the right altitude.** The reface window constrains
   the WHOLE realized texture; the solver moves the split/octave instead of
   the Phase-1c per-hand duck-under logic. Phase 1c's layout/scroll fixes
   stay; its LH-relocation logic (`mixedLhPlacement`'s base ladder) retires
   in favor of solver placement. Test 18's window assertions keep passing.
2. **Hand span as a solver constraint** — this ABSORBS v4 Phase 2's
   mechanics: `unlimited | 9th | 10th` becomes the solver's per-hand reach
   cap. v4 Phase 2 shrinks to its Settings-UI half (the `<select>`, state
   field, recompute classification), specced there.
3. **So What, natively.** The 5-note cluster (`9-5-R-11-13` mid-register)
   is just a stack with a mid anchor; the solver splits it 2/3 wherever the
   hands fall. Ship it (plus the rest of v4 Phase 3's vocabulary as pure
   stack data) with proof sheets.
4. **Retire the wrappers** once nothing calls them; delete the dead
   per-hand machinery. Tests migrate from wrapper calls to stack calls in
   the same commit, check-for-check (name each).

**Acceptance per item:** proof sheet → owner ear approval → wire; snapshot
regenerated only for intentionally-changed voicings; span guard (Test 17)
green throughout — its per-hand caps now measure solver output. Commit per
item. Stop per session.

## Stage C — language & surfaces

1. UI reframe: the "Left hand" select becomes **Ensemble** (or keeps its
   label with reframed options — owner picks on a mock): Full (both hands) /
   Shells / With bassist / App bass / Duo (two-hand rootless). Same state
   machinery; smoke default assertions updated by name.
2. Dictionary + voicing panel display the stack with its live split (and
   the sounding-chord line unchanged); the "LH mixed → …" teaching label
   becomes a distribution label ("split: root | 3-13-7-9").
3. Docs: README + (if v4 Phase 7 has run) the user guide adopt the
   sonority-first language.

**Acceptance:** owner approves the naming mock before wiring; both suites +
layout check green; smoke assertions updated by name. Commit. Stop.

## Impact on the v4 roadmap

| v4 phase | Status under v5 |
|---|---|
| 1, 1b, 1c | Done; untouched. (1c's shell/scroll fixes permanent; its LH base-ladder logic retires in Stage B-1.) |
| 2 (hand span) | **Deferred, reduced**: mechanics absorbed by Stage B-2; only the Settings UI half remains in v4. |
| 3 (vocabulary + overrides) | **Superseded**: vocabulary content moves to Stage B-3 as stack data; the lhBase/rhBase mechanism is never built. |
| 4 (cleanup) | Unaffected; may run any time. Its "LH cycle chip" item waits for Stage C naming. |
| 5–7 | Unaffected; 7 (user guide) should follow Stage C so it documents the new language. |

Execution order: **A → B (items 1–4, sessions as needed) → C**, with v4
Phase 4 free to interleave and 5–7 after.

## Known traps (inherit v4's list; these are new)

1. **Do not improve the music in Stage A.** Every tempting fix ("this split
   is odd", "evans overlaps look wrong") is Stage B with an ear gate. If
   Stage A's diff isn't empty, the stage has failed — revert the musical
   change, not the model.
2. **Wrappers before deletion.** Old entry points die only in Stage B-4,
   after their tests migrate check-for-check. A test edited to pass during
   Stage A is a red flag, not a convenience.
3. **The two-stack texture is not a special case to erase.** Evans/duo is
   honestly two sonorities; forcing it into one stack + split will silently
   change its sound and violate Stage A.
4. **`realizeHand`'s order-encodes-register semantics are load-bearing** —
   the stack model builds ON them. Any "cleanup" of realizeHand risks the
   entire snapshot.
5. All v4 traps apply verbatim (flake protocol, pages-deploy check,
   process.exitCode, golden discipline, stale-facts spot-check, no
   subagents).

## Session protocol

As v4's, plus: one STAGE (or one Stage-B item) per session; the Stage A
commit may not touch `test_*.js` or the GOLDEN block at all; every invariant
re-wording named in the commit; PRs titled `v5 Stage X`.
