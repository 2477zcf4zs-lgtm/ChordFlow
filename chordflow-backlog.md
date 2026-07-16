# ChordFlow — Backlog & Cleanup

The running to-do list. Feature specs live in `chordflow-spec-*.md`; this file is
the lighter-weight list of cleanup, polish, content gaps, and parked ideas that
don't yet warrant a full spec. Check here before starting a "clean up the app"
session.

Status legend: **[ ]** open · **[~]** in progress · **[x]** done · **[paused]**
started then deliberately shelved.

---

## A. Cleanup / polish (do before more feature adds)

- [ ] **Unify the dictionary's substitution buttons with the sub tray.**
  *(Absorbed into `chordflow-spec-v4.md` Phase 4.)* The
  Chord Dictionary still renders substitutions as old-style `.voicing-sub-btn`
  elements (`renderDictVoicings` → `voicingSubs` list in `js/render.js` ~line
  961), which are non-interactive and styled differently from the hear-first
  `.sub-chip` tray the rest of the app now uses. Either restyle them as
  `.sub-chip`s or (nicer) let them audition on tap like the main tray. Removes a
  visual inconsistency and the last consumer of `.voicing-sub-btn` CSS.
- [ ] **Settings menu cleanup — regroup + non-default indicator.**
  *(Absorbed into `chordflow-spec-v4.md` Phase 4 — execute from there.)* The Settings
  panel is a long single scroll with two faint section titles and no sense of
  where you are. Split it into **Song / Sound / Practice** segmented groups
  (each fits a phone without scrolling; the active chip is the "where am I"
  cue), and add a dot on the Settings tab when any setting is off its default.
  Already specced as `chordflow-spec-v3.md` **Phase 4 §4.1 + §4.3** — this entry
  just tracks the *cleanup* half here with the other QoL work; the more
  feature-flavored bits of Phase 4 (the LH cycle chip on the voicing panel,
  §4.2, and pad haptics, §4.4) stay noted under the paused Phase 4 entry in
  section C. Build the whole phase together or pull the settings-IA part
  forward as cleanup — either way, work from the spec.
- [x] **Consolidate the invariants.** Done — all 18 now live in `INVARIANTS.md`
  (the specs point there). Invariant 18 (characterization snapshots gate voicing
  changes) and the `test_voice_leading.js` exit-code fix landed with it.
- [ ] **`test_dom_smoke.js` is one long function.**
  *(Absorbed into `chordflow-spec-v4.md` Phase 4.)* It's grown to cover pads,
  bassist mode, range, flavor, the sub tray, trials/A-B, and the QoL batch.
  Worth sectioning into named sub-routines (it already uses `// ---` comment
  banners as de-facto sections) so a failure points at a feature area.
- [ ] **Re-evaluate the desktop browser UI — it got left behind and feels
  clunky.** The layout has a single `@media (min-width: 900px)` breakpoint
  (`css/styles.css` ~line 1771) that drops the entire mobile UI into a
  two-column grid: chord strip + transport on the left, and the whole tabbed
  panel area crammed into a fixed **480px** right column. Everything tuned for
  the phone lately (CF monogram + status in the tab bar, icon-friendly
  transport, taller piano, wrapping sub tray) was designed for that narrow
  column and just inherited by desktop with no reconsideration. Concrete rough
  edges to address:
  - **One breakpoint, no large-desktop tuning** — a 1440px+ monitor looks the
    same as a 900px one; the 480px panel cap wastes most of a wide screen.
  - **Mobile tab model on a big screen** — desktop shows one panel at a time
    like the phone, when it has room to show two at once (e.g. voicing +
    library, or the piano alongside the dictionary).
  - **Branding vanished** — removing the mobile header left only the tiny CF
    monogram in the tab bar; desktop has the room for a proper title/identity.
  - **Component sizing** — piano, chord boxes, and the sub tray are sized for
    the narrow column, not for desktop's available width/height.
  - Update `scripts/layout_check.js` (probes 390×844 and 1280×800) to assert
    whatever the new desktop intent is. Likely warrants its own spec rather than
    a quick patch — it's a layout rethink, not a tweak.
- [ ] **Intermittent `npm test` flake under CPU contention.** Observed twice
  (2026-07-17) while heavy parallel work ran on the same machine; 20
  consecutive runs green afterwards, and both suites green in isolation.
  Suspect the smoke test's wall-clock-dependent sections (the pause/resume
  loop-counter check polls real timers). Next occurrence: capture the failing
  check's output, then de-flake that section (mock-clock it or widen its
  timeout).
- [ ] *(owner: add your own UI rough-edges here as you hit them.)*

## B. Voicing content gaps

- [ ] **Left-hand shell + right-hand triad / upper-structure voicings.**
  *(Remaining families specced: `chordflow-spec-v4.md` Phase 3.)* Today
  every entry in `KEYBOARD_VOICINGS` puts the root (occasionally + 5th) alone in
  the LH and stacks everything else in the RH — great for the rootless-voicing
  pedagogy it was built around, but it omits the *other* half of real comping:
  the LH holds the guide tones (3 and/or ♭7) while the RH plays a triad or
  upper-structure triad. This maps cleanly onto the existing
  `{left:[...], right:[...]}` shape — it's data, not architecture. Verified
  starter set (C-rooted; transpose the intervals):

  - **Upper-structure triads over dominants** (the richest vein — clean RH
    triads over a dominant want an alteration or the #11, which is *why* USTs
    are taught on dominants):
    - `dom13` (Lydian): `left:['R','b7']`, `right:['9','#11','13']` — RH D major
      over C = C13#11.
    - `dom7alt`: `left:['R','3','b7']`, `right:['b13','R','#9']` — RH A♭ major
      = C7#9♭13 (the guide tones in the LH are mandatory here; the triad alone
      has neither 3 nor 7).
    - `dom13b9`: `left:['R','3','b7']`, `right:['13','b9','3']` — RH A major.
  - **Slash-chord / triad-over-root** (gospel / soul / Stevie–Vulf — ties to
    the flavor work):
    - `dom11`: `left:['R']`, `right:['b7','9','11']` — F/G = G11. (Present as an
      RH shape today but never framed as a triad-over-bass.)
    - `maj9` #11: `left:['R']`, `right:['9','#11','13']` — D/C = Cmaj9#11.
    - `dom7sus4`/13sus: `left:['R']`, `right:['b7','9','11']` — B♭/C.
    - `min11`: `left:['R']`, `right:['b7','9','11']` — B♭/C = Cm11 ("no-3rd"
      minor-11 color).
  - **LH shell + RH triad for major/minor** (the Powell/bebop hand):
    - `maj7`/`maj13`: `left:['R','3','7']`, `right:['9','#11','13']` — RH D major
      over Cmaj7 = Lydian. (Note: the II major triad is a shared RH shape over
      both Cmaj7 → Lydian *and* C7 → 13#11.)
    - `min11`: `left:['R','b3','b7']` + an RH upper (e.g. `['11','R','9']`).
  - Design notes for whoever builds this: tag these into the right complexity
    tiers (most are `jazz`/`rsp`, not `strict`); decide whether they're new
    voicings on existing qualities or warrant a distinct presentation; and make
    sure the DP optimizer's register/movement costs treat the LH-shell shapes
    sensibly (the LH is no longer always a single low root). Bassist mode's
    `shells`/`bassonly` LH already lives near this idea — check for overlap
    before duplicating.
  - **Status:** the **dominant family is DONE** (PRs #28–#29): `dom7s11` US II,
    `dom13` shell + 13♯11, `dom13b9` US VI, `dom7sus4` slash, and both `dom7alt`
    USTs (US ♭VI/♭V, shell reordered `R-b7-3` to float the 3rd out of the mud).
    Each has pitch-class tests (Test 16) + snapshot coverage (Test 15).
    **Still open — the major/minor "Powell hand" shells** (`maj7`/`maj13`
    `left:['R','3','7']` + RH triad; `min11` `left:['R','b3','b7']` + RH upper)
    and the **slash-chord family for major/minor** (`maj9#11` D/C,
    `dom11` F/G — some overlap with what shipped). Proof-sheet + build these
    next when picking the initiative back up.

- [~] **Quartal voicings** (the So What / McCoy Tyner sound).
  *(Completion specced: `chordflow-spec-v4.md` Phase 3, incl. the lhBase/rhBase
  register-override mechanism for the So What cluster.)* **Started**
  (PR #28): the "LH root + RH 4th-stack" shapes shipped for `min7`/`min11`
  (`R | F-Bb-Eb` = 11-♭7-♭3) and `maj7` (`R | B-E-A` = Lydian quartal).
  **Still open:** the tight 5-note **"So What" cluster** (Dm7 = `E–A–D–G–B` =
  9-5-R-11-13) can't be faithfully expressed in the current LH-low / RH-mid
  realization split — all five notes want to sit close together in the middle
  register, which needs register special-casing (a `voicing.lhBase`-style
  override or a dedicated quartal realizer). Also open: quartal for `dom7sus`
  and modal/`m7b5`. Note the quartal stack is deliberately quality-ambiguous
  (one shape reads over several chords), which the display should tolerate.

- [ ] **Hand-span playability audit — several voicings exceed a physical
  single-hand stretch** *(Specced: `chordflow-spec-v4.md` Phase 1 fixes the
  templates + register doctrine; Phase 2 adds the Hand span setting.)* (owner report: "required my hand to stretch to
  something like a 13th… I can barely do a 9th"). Verified by audit
  (2026-07-17, spans in semitones; a 9th = 14, a 10th = 16):
  - **Worst, bassist-mode `shells` LH: 22–23 st (a 13th/14th)** — root at
    C2 + guide tones at C3+ (`C2 E3 Bb3`) is physically a two-hand spread.
    Cause: `realizeShellHand` splits root (LH_BASE) and tones
    (SHELL_TONE_BASE). Likely fix: realize the whole shell in one zone
    (root ~C3, tones close above → ~10 st) — changes bassist-mode register,
    needs Test 11 + smoke updates.
  - **The two `dom7alt` UST left hands: 16 st (a major 10th)** — the mud fix
    floated the 3rd a tenth up, trading mud for stretch. Likely fix: LH
    `['R','b7']` (10 st) with the 3rd moved to the bottom of the RH
    (`['3', …triad]`, ≤ 11 st) — all tones kept, both hands ≤ a 7th/9th.
  - **Nine pre-existing RH shapes at 16–18 st (10th–12th)**: `RSP (13)` on
    maj7/dom7 (17), `RSP (b13)` m7b5 (17), `Type A: 3-7-9-13` on
    maj13/dom13/min13 (17–18), `dom7b13` (16), `dom13b9` (17), `dom13s11`
    (17). Cause: `realizeHand` octave-jumps when a lower pitch class follows
    a higher one (13 below 7 → up an octave).
  - **Proposed mechanism** (owner to choose): a **Hand span setting** (e.g.
    9th / 10th / unlimited) enforced like the reface Range window — filter
    candidates in `buildVoicingCandidates` + `bestShiftForVoicing` on
    *realized per-hand span*, so unplayable voicings never get picked for a
    player who can't reach them — vs. just fixing the worst templates.
    Test 15 snapshot + goldens will move for any template fix (use
    `scripts/gen_voicing_snapshot.js`).

## C. Parked features (deferred, owner-confirmed)

Consolidated here from the note that was inside `chordflow-spec-v3.md`.

- [paused] **Spec v3 Phase 4.** *(Now absorbed into `chordflow-spec-v4.md`
  Phase 4 — execute from v4.)* Fully specced in `chordflow-spec-v3.md`;
  execution was paused after Phase 3 to do the QoL batch. Its **settings-IA
  cleanup half (§4.1 regroup + §4.3 non-default dot) is tracked in section A**
  with the other QoL work — see that entry. The remaining, more
  feature-flavored bits stay here: the **LH cycle chip on the voicing panel**
  (§4.2) and **pad haptics** (§4.4). Resume from the spec when ready, whole or
  in parts.
- [ ] **Loop-region selection** — drag / two-tap on the chord strip to loop just
  bars 3–4. The scheduler is span-generic, so this is mostly index math + strip
  UI.
- [ ] **Tap tempo** in the tempo popover.
- [ ] **User guide** — in-app or doc; scope undecided. (Owner asked to keep this
  on the back burner.)
