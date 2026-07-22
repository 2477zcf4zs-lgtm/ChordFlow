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
2. Sound is ear-gated: any realized-note change appears on a proof sheet
   first (full-range output should be near-identical; window-active output
   may legitimately improve). `scripts/full_surface.js` before/after diff
   attached to the PR; goldens regenerated only for owner-approved changes.
3. Tests: Test 18's window assertions keep passing; Test 20's DP-matches-
   reality and whole-texture-window checks generalize from So What to a
   sweep over every voicing (they become cheap once candidates carry
   textures).

**Status (2026-07-21, DONE — PR pending):** a shared `realizeCandidateTexture`
helper is the one realization path; `buildVoicingCandidates` and
`bestShiftForVoicing` both read it and window the whole texture; candidates
carry `lhMidis` + `rhMidis`; the anchored special-cases at both sites are
gone; Test 21 sweeps every voicing (candidate texture == roots-mode
realization; reface window holds for the whole texture). Provably
**sound-frozen**: the fixed-index oracle AND the new
`scripts/optimizer_surface.js` (optimizer *selection* under full-range +
reface, ×7 progressions ×5 modes) are both byte-identical before/after — as
predicted, because in full range the window is inert and under reface a
normal voicing's LH already sits inside C2–C5, so whole-texture windowing
rejects nothing new.

**Acceptance:** no per-hand window logic left (met); candidates carry their
full texture (met); proof sheet clean (sound-frozen — no owner ear needed);
both suites + `layout_check.js` green. Commit. Stop.

## Stage 1b — split solver + mixed-LH placement retirement — **NOT BUILT (ear-gate, 2026-07-21)**
*(the v5 payoff; investigated, failed the ear gate — kept here as the record)*

Discovered while executing Stage 1: `mixedLhPlacement`'s base ladder is
**not** window logic — it is RH-aware collision placement (the LH ducks under
a relocated RH). Retiring it needs a *replacement* placer, and the only
candidate is the split solver: realize a voicing as ONE ascending stack and
choose the split index `k` (and octave) so both hands fit with no crossing by
construction. The ladder retirement is coupled to it — you cannot delete the
ladder without the thing that replaces it.

**Why it wasn't built — the split solver is a sound REGRESSION, not a payoff.**
Prototyped and A/B'd on a ii-V-I (2026-07-21). No-crossing-by-construction
requires ONE ascending stack from one base, which forces a **compact
close-position** texture: an LH close triad (R-3-5, *not* the guide-tone
shell) under a thin 2-note RH, everything crammed inside a 9th. That
*replaces* the app's signature **spread two-handed jazz-piano comping** (LH
guide-tone shell low, rootless RH up top) with something thinner and less
idiomatic. Three findings:

1. It is not an improvement — it is a different, less characteristic texture.
   The current spread guide-tone comping is the more standard jazz-piano sound.
2. The ladder it retires is a working, ear-approved mechanism, not debt.
   Retiring it *requires* accepting the regression (no sound-preserving path —
   confirmed in Stage 1).
3. The compact close-position sound it would add is already in the app — that
   is essentially the **LH inversion comp (Stage 3b)**, one hand instead of two.

Architectural elegance (no-crossing by construction) at the cost of the app's
signature comping voice, to gain a texture we already have. **Recommendation
stands: do not build.** If a future owner wants the compact texture as an
*added* choice (not a replacement), add it as a new `close-comp` Ensemble mode
so the signature comping is untouched — but note the Stage-3b overlap first.

**Consequence for Stage 4:** the ladder legitimately stays, so Stage 4's
wrapper retirement has almost nothing to retire (see Stage 4).

## Stage 2 — hand span, both halves — **DEFERRED (owner, 2026-07-21)**
*(merges v5 Stage B-2 mechanics + v4 Phase 2 UI)*

**Why deferred — the feature is inert on today's voicing set.** Measured
2026-07-21 (per-hand spans over every candidate the optimizer deals, both
hands, all shifts, via the Stage-1 `lhMidis`/`rhMidis`): **max RH span 14
st (a 9th), max LH span 10 st — everything is ≤ 14 st.** Only 6 voicings
even reach 14 (the 11/#11 RH stretches: maj7/min7/m7b5 `RSP(11/#11)`,
`min11 Type A`, `dom7s11`, `dom13s11`). v4 Phase 1 already re-stacked every
voicing to ≤ a 9th and Test 17 guards it. So the specced caps **9th (14)
and 10th (16) would filter nothing** — all three `<select>` options
(Unlimited/9th/10th) produce byte-identical output. A cap only bites below
13 st, which would drop standard #11 voicings.

The owner (who "can barely do a 9th") is already served by the built-in
9th ceiling, so the setting only helps *smaller-handed* players and only if
its options go tighter than a 9th. Deferred until there is width to cap —
i.e. after **Stage 1b** (the split solver can place hands wider) or **Stage
3** (new vocabulary may exceed a 9th). Revisit then; if built, its options
must be tighter than the current ceiling (e.g. Octave 12 st / 7th 10 st) to
do anything, and it should be re-measured first (stale-facts trap).

The mechanics remain sound and cheap when revived: `state.handSpan` cap
threaded like `range` into `buildVoicingCandidates`, a hard filter on the
now-measurable per-hand span with the window's least-violating fallback;
UI mirrors the Range `<select>`; recompute on change (invariant 11);
explicit user picks bypass the cap. Tests: cap sweep never selects a hand
past the cap; 'unlimited' byte-identical; fallback never empties a layer.

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
5. **LH octave roots** *(owner request, 2026-07-21)*. A Sound setting
   (default **off**): when the LH deals a **lone root** — roots mode's
   single-note LH and the mixed DP's "lone root" candidate — realize it as
   an octave (`['R','R']`; `realizeHand`'s stack-above semantics make the
   doubling free). This is standard solo/stride/gospel practice: the octave
   fills the texture when no bassist owns the low end. Contracts:
   **bassonly and the backing bass stay single notes** (they emulate a
   bassist, and bassists play single notes); rootless/evans unaffected (no
   root dealt); multi-note shell LHs unaffected (they already carry width).
   Span is 12 st — inside every hand-span cap. Invariant-11 classification:
   LH-only, **no recompute** today; under Stage 1's whole-texture windowing
   the octave participates in the window check (account for it there —
   e.g. C2+C3 sits inside the reface window with no headroom below).
   Ear gate: proof sheet picks the register (root octave C2–C3 vs the
   comping-zone C3–C4) before wiring. Default-off keeps the snapshot
   untouched; add Test 11-style mode assertions for the on-state and a
   smoke check for the toggle.

**Acceptance:** per-family ear approval; provenance present; Tests 15/16/17
green; both suites green. Commit per family or per stage. Stop.

**Status (2026-07-22).** Item 1 (Powell shells) — `maj7`/`min7`/`dom7`
landed in PR #53; the extended qualities `maj13` (Powell 13) and `min11`
(Powell 11) landed here, same anchored guide-tone-complete pattern.
Item 3 (`dom7sus4` quartal, McCoy) landed here as an anchored quartal-sus
cluster (`9-5-R-4-7`), guide-tone-complete → mixed-eligible. `m7b5` quartal
skipped (no citation, per the "no inventions" clause). Item 2 slash family:
`dom11` reframed as the F-over-G (bVII/I) triad-over-bass (naming only, no
pitch change). Item 5 (LH octave roots) landed in PR #59.
**Held for the ear gate:** the `maj9` D/C Lydian slash (`R | 9-#11-13`).
Unlike every other Stage-3 addition it is guide-tone-**free** *and*
**non-anchored**, so — with no `manual-only` mechanism for non-anchored
voicings — the RH-only optimizer could **auto-deal** it (a maj9 chart
sounding with no 3rd/7th). That is the first auto-dealable guide-tone-free
voicing in the library and a genuine sound change with no precedent; it
needs an owner ear decision (wire as-is / anchor it like So What to force
manual-only / skip) before shipping.

## Stage 3b — LH-only comping through inversions
*(owner request, 2026-07-21)*

A new ensemble texture: the LH alone comps **close-position four-note
voicings voice-led through inversions** — root present but rarely in the
bass — while the RH stays free (the player solos or plays the melody).
Owner's example in D: Dmaj7 `F#-A-C#-D` (3-5-7-R), Bmin7 `F#-A-B-D`,
Gmaj7 `F#-G-B-D`, A7 `G-A-C#-E` — three common tones per change, nothing
moving more than a step. Provenance: swing/pre-bop LH comping, classical
keyboard-style four-part writing, Barry Harris close-position practice —
squarely standard keyboard playing.

Mechanics (verified 2026-07-21: a scratch DP over rotation × octave using
the existing `realizeHand` + `voiceMovementCost` already finds a minimal-
movement inversion path for the example progression — no new machinery):

1. **An inversion is a rotated stack** — the same sonority, redistributed;
   this is the holistic model's native move. Candidates: the 4 rotations of
   the quality's seventh-chord **core** (R-3-5-7 family; extended qualities
   reduce to their core four — close-position 9ths/13ths cluster and are
   not this idiom; triads use their 3 rotations), realized at tenor-zone
   bases. Proof sheet picks the floor (~E3; the owner's example bottoms at
   F#3/G3; close 3rds mud below that) and whether the DP gets an idiom
   prior (e.g. a slight cost against root-in-bass rotations).
2. **DP over rotation × octave** minimizing `voiceMovementCost` + a
   register term — the `computeLeftHandVoicings` (evans) pattern, reused
   not forked. Invariant-11 classification: same as evans.
3. **Mode contract:** LH plays the inversion; **RH silent** (the player
   owns it). Sounding line needs no caveats — root and both guide tones
   are present in every rotation.
4. **Backing bass interplay:** with the backing bass on, the app's low
   root + LH inversions is the fuller duo texture — that's the ensemble
   answer to "the root is never in the bass" (the bass supplies it). Say
   so in the mode's teaching label.
5. **Surfaces:** joins the LH/Ensemble select (Stage 5 names it on the
   mock — e.g. "LH comp (inversions)"); `full_surface.js` gains the mode;
   new mode assertions plus a voice-leading economy test (common tones
   preserved across the owner's D-major progression).

Runs after Stage 3, before Stage 4 (it benefits from Stage 1's solver but
does not require it; its code must use stack calls so wrapper retirement
isn't blocked). Ear gate: proof sheet in ≥4 keys before wiring.

**Acceptance:** owner ear approval on the proof sheet; economy test green;
both suites + layout probe green. Commit. Stop.

## Stage 4 — retire the wrappers and the authored `{left,right}` form — **MOOT (2026-07-21)**
*(supersedes v5 Stage B-4; premise removed by the Stage 1b ear-gate decision)*

Stage 4's premise was "once Stages 1–3 leave nothing calling the wrappers."
They don't. `realizeShellHand` (shells mode + `realizeMixedCandidate`),
`lhMixedCandidateIntervals` (mixed LH vocabulary), `mixedLhPlacement` /
`realizeMixedCandidateBelow` (the LH-placement ladder) are all **live,
legitimate mechanisms** — not dead paths. The only thing that would strand
them is the split solver, and Stage 1b decided (ear gate) not to build it
because it regresses the signature comping. So there is nothing to retire.

What remains is **optional and low-value**: migrating `KEYBOARD_VOICINGS`
authored `{left, right}` → authored `{stack, splitAfter}` so `toStack` (a
five-line load-time adapter) can be deleted. That is a large mechanical
re-authoring of every voicing entry for a tiny cleanup, with snapshot risk if
a hand-typed stack drifts — **not worth doing** unless a future change needs
authored stacks for another reason. Left here as a note, not a task.

**Status:** no action. The "wrappers" are the architecture, not debt to pay down.

## Stage 5 — language & surfaces (Ensemble)
*(v5 Stage C, unchanged in intent)*

1. The "Left hand" select becomes **Ensemble** (or keeps its label with
   reframed options) — **owner picks on a mock before wiring**: Full /
   Shells / With bassist / App bass / Duo / LH comp (Stage 3b's inversion
   texture). Same state machinery; smoke default assertions updated by
   name.
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

Core line: **1 ✅ → ~~2~~ → 3 ✅ → 3b ✅ → ~~4~~ → 5 ✅**, then 9.
Resolved: **Stage 2 deferred** (inert on today's voicings); **Stage 1b NOT
built** (ear gate — the split solver regresses the signature comping);
**Stage 4 moot** (nothing to retire once 1b is off the table — the wrappers
are the architecture). What's LEFT of the core line: **Stage 9** (user guide,
after Stage 5 — done). Independent, still open: **Stage 6** (Settings IA
regroup — the owner flagged this; the LH-cycle-chip item there is now
unblocked by Stage 5), **Stage 7** (desktop UI), **Stage 8** (loop region +
tap tempo), plus the open **Stage 3** vocabulary tail (slash-chord family;
LH octave roots item 5).

## Known traps (inherit v4 + v5 lists; these are new since)

1. **Anchored voicings interact with everything.** Window, optimizer, LH
   modes, sounding display — each seam has already had one bug. When
   touching any of those, run Test 20's block and `full_surface.js`, and
   check all six LH modes, not just roots.
2. **Invariant 1b is an owner decision, not a smell.** Do not "helpfully"
   make anchored voicings mixed-DP-eligible again; the pre-review ~22% pick
   rate was an artifact of a costing bug, not a design.
3. **The oracles are the cheap insurance.** `node scripts/full_surface.js`
   (fixed-index realization) AND `node scripts/optimizer_surface.js`
   (optimizer *selection* under full-range + reface) before and after any
   voicings.js change; an unexpected non-empty diff is a stop-and-look, even
   when tests are green. full_surface misses optimizer-choice changes on its
   own — optimizer_surface (added in Stage 1) is what catches them.
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
