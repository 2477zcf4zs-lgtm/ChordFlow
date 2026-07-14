# ChordFlow — Backlog & Cleanup

The running to-do list. Feature specs live in `chordflow-spec-*.md`; this file is
the lighter-weight list of cleanup, polish, content gaps, and parked ideas that
don't yet warrant a full spec. Check here before starting a "clean up the app"
session.

Status legend: **[ ]** open · **[~]** in progress · **[x]** done · **[paused]**
started then deliberately shelved.

---

## A. Cleanup / polish (do before more feature adds)

- [ ] **Unify the dictionary's substitution buttons with the sub tray.** The
  Chord Dictionary still renders substitutions as old-style `.voicing-sub-btn`
  elements (`renderDictVoicings` → `voicingSubs` list in `js/render.js` ~line
  961), which are non-interactive and styled differently from the hear-first
  `.sub-chip` tray the rest of the app now uses. Either restyle them as
  `.sub-chip`s or (nicer) let them audition on tap like the main tray. Removes a
  visual inconsistency and the last consumer of `.voicing-sub-btn` CSS.
- [ ] **Consolidate the invariants.** Binding invariants are currently split
  across `chordflow-spec-v2.md` (1–14) and `chordflow-spec-v3.md` (15–17). A
  single canonical `INVARIANTS` section (or its own file) would be easier to
  cite from future work than chasing two specs.
- [ ] **`test_dom_smoke.js` is one long function.** It's grown to cover pads,
  bassist mode, range, flavor, the sub tray, trials/A-B, and the QoL batch.
  Worth sectioning into named sub-routines (it already uses `// ---` comment
  banners as de-facto sections) so a failure points at a feature area.
- [ ] *(owner: add your own UI rough-edges here as you hit them.)*

## B. Voicing content gaps

- [ ] **Left-hand shell + right-hand triad / upper-structure voicings.** Today
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

## C. Parked features (deferred, owner-confirmed)

Consolidated here from the note that was inside `chordflow-spec-v3.md`.

- [paused] **Spec v3 Phase 4** — settings IA (Song/Sound/Practice segmented
  groups), the LH cycle chip on the voicing panel, the non-default settings dot,
  and pad haptics. Fully specced in `chordflow-spec-v3.md`; execution was paused
  after Phase 3 to do the QoL batch. Resume from the spec when ready.
- [ ] **Loop-region selection** — drag / two-tap on the chord strip to loop just
  bars 3–4. The scheduler is span-generic, so this is mostly index math + strip
  UI.
- [ ] **Tap tempo** in the tempo popover.
- [ ] **User guide** — in-app or doc; scope undecided. (Owner asked to keep this
  on the back burner.)
