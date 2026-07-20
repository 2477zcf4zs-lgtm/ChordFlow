# ChordFlow — Invariants

The load-bearing rules of the codebase. **Do not break these** without a
deliberate, documented decision. They were accumulated across specs v2 and v3;
this file is now the single canonical list (the specs point here). When a new
change establishes a rule future work must respect, add it here.

Each invariant names the mechanism and *why* it exists — the "why" is what tells
you whether a new change is allowed to touch it.

---

## Architecture & data flow

1. **Single source of truth for voicing lists.** `voicingsFor()` is the only
   place the filtered voicing list is produced; every consumer
   (`getChordNotesAtIndex`, `selectChord` cycling, `buildVoicingCandidates`)
   must see identical ordering, because `state.voicingIndices` indexes into it.

1a. **A voicing's identity is its interval STACK (v5 Stage A).** `KEYBOARD_VOICINGS`
   entries carry an ordered `stack` and a default distribution `splitAfter`;
   the authored `{ left, right }` form is the default distribution (derived to
   `stack` at load by `toStack`, retired in v5 Stage B-4). The realization
   pipeline reads the stack via `voicingLh(v)` / `voicingRh(v)` (never
   `v.left` / `v.right` directly), so the hand split is a *distribution
   decision*, not part of identity — this is what lets the Stage-B solver pick
   a split other than `splitAfter`. `voicingRh(v)` (the stack above
   `splitAfter`) is the ONLY input the RH voice-leading optimizer reads; this
   restated the old "optimizer reads only `voicing.right`" rule in stack terms.

1b. **Anchored voicings realize once, honoring the ensemble contract (v5 Stage B).**
   A voicing with an `anchor` is a COMPLETE two-hand sonority (e.g. So What);
   `realizeVoicing` renders it as one contiguous stack from the anchor and splits
   it at `splitAfter`. The FULL-texture modes (roots / shells / evans / mixed)
   realize the whole cluster identically; the reduced-ensemble modes still hold:
   **bassonly** plays only the root at `LH_BASE` (the app is the bassist),
   **rootless** drops the cluster's root layer (an external bassist owns it).
   `lhIntervalNamesFor` mirrors this exactly (it is the sounding-name's view of
   the LH). Because a guide-tone-free cluster is structurally at odds with mixed
   comping's "every chord covers the 3rd & 7th" contract (invariant via
   `MIX_INCOMPLETE`), anchored voicings are **manual-only in mixed mode** —
   `computeMixedVoicing` never emits them as candidates (owner decision), though
   they stay eligible in the RH-only optimizer and reachable by manual cycling.

2. **Recompute on every harmonic mutation.** `recomputeProgressionVoicings()`
   runs on every path that mutates progression, key, or complexity.

10. **The realization choke point.** Every consumer of realized pitches —
    `scheduleBeat`, `auditionChord`, `padPress` (audio) and `renderVoicing` /
    `renderPianoKeyboard` (render) — goes through `chordPitchesAt` /
    `getChordNotesAtIndex`. New realization-changing features (LH modes, range
    windows, and future LH-shell voicings) inject there, never per consumer.

11. **Recompute asymmetry.** Left Hand *mode* changes need **no** voicing
    recompute (the RH slice `voicingRh(v)` and its optimizer are untouched);
    Range changes **must** call `recomputeProgressionVoicings()` (the window
    changes what the optimizer picks). Any new setting must be classified as
    one or the other. (Mixed mode is the standing exception — its RH is chosen
    jointly with the LH, so it recomputes; see spec v4 Phase 1b.)

## Rendering

3. **Structure/state render split.** Playback updates never write `innerHTML`,
   only toggle classes. Structural rebuilds go through `renderChordStructure()`.

4. **Event delegation.** Clicks are delegated on `chordContainer` (and other
   rebuilt containers); no per-node listeners on chord boxes/badges/tray chips
   that get re-rendered.

12. **Escape on render.** Any model-derived string interpolated into `innerHTML`
    goes through `escapeHtml` — saved-progression import means `degree`, `root`,
    `quality`, entry names and keys are all untrusted.

## Audio & playback

5. **Session token discipline.** Increment `audioEngine.session` in
   `startPlayback` and `stopPlayback`; re-check it after every `await` so a
   stop/start race can't orphan a `sessionGain` or scheduler interval.

13. **Pads never touch `sessionGain`.** Pad voices live in
    `audioEngine.padVoices` on `master`; a voice captures its trigger mode at
    press time (`padHold`) rather than reading `state.padMode` later.

16. **A/B never rebuilds.** Compare mode swaps per-index via `subBase` and
    recomputes voicings; it must never call `buildProgressionFromSource` (which
    resets playback position).

17. **Auditions share playback's scheduling code.** `auditionSnippet` and
    `scheduleBeat` schedule a chord span through one shared helper
    (`scheduleChordSpan`) — if they drift apart, the audition stops being an
    honest preview.

## Generation & harmony

6. **Density is rolled once.** `state.density` is rolled only in
   `generateRandomProgression` / `loadProgression`, never in
   `buildProgressionFromSource` (so a key change transposes the same character
   instead of re-rolling it).

7. **Function-preserving guardrails run after the weighted picks.** In parsing:
   vii° stays diminished/half-diminished, ii in minor stays half-diminished,
   tonic-only 6/m6 colors, no random sus or altered-fifth on dominants.
   Explicit-suffix numerals (the flavor vocabulary, as-written library) bypass
   the pools by pinning the quality — that is the *designed* path and does not
   violate this rule.

15. **Trial/undo state discipline.** Only `beginSubTrial` / its revert path
    mutate `state.trialSub`; the trial lives *inside* `state.substitutions` (so
    transpose re-derivation works) with `state.subBase` as the restore point.
    `subBase` is maintained everywhere `substitutions` is written.

## Accessibility & input

8. **Accessibility floor.** Interactive elements are buttons; `:focus-visible`
   styles present; `aria-live` on status; `prefers-reduced-motion` respected.

9. **Keyboard shortcuts** (Space/R/V/arrows, `[`/`]`) are guarded against
   INPUT/SELECT targets and meta/ctrl/alt modifiers.

## Testing

14. **Mock-clock ordering.** In tests, zero `ctx.currentTime` *before*
    `startPlayback` — rewinding it afterwards leaves `nextBeatTime` in the future
    and silently stalls the lookahead scheduler.

18. **Characterization snapshots gate voicing changes.** The realized notes of
    the shipped voicings are snapshotted in `test_voice_leading.js` (Test 15).
    Adding a *new* voicing to a chord that has no snapshot is free; changing an
    *existing* realized voicing must update its snapshot in the same commit and
    be justified — the snapshot is what makes an accidental regression to the
    voicing engine visible immediately.
