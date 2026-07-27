# ChordFlow — Claims Ledger

**Generated 2026-07-27. Status: the app's harmonic claims have never been checked against primary sources.**

Every voicing the app can deal, and what the claim that it is *idiomatic* actually
rests on today. This exists because an audit found **0 of 142 voicings cite a
recording, transcription, book, page, or year** — the spec's "provenance comment"
requirement had been satisfied with confident prose written by Claude, then
approved by ear.

The owner is a contemporary-classical percussionist/keyboardist learning jazz, so
the ear gate confirms *playability and taste*, **not** idiom. Nothing below has an
external referee yet.

## Evidence tiers

| Tier | Meaning |
|---|---|
| **A — Cited** | Traceable to a specific named recording or documented artifact |
| **B — Attributed** | Names a player or school, but no specific work |
| **C — Conventional** | Standard material, widely documented — but only in *pedagogy-tier* sources (teaching sites), which simplify and are not performance evidence |
| **D — Inferred** | Extrapolated from a convention by Claude |
| **E — Our design** | A choice we made. No claim to tradition. |

**Tiers C, D and E are all unverified against performance practice.** C is
merely *conventional*, which is not the same as *observed*.

## Distribution

| Tier | Count | Share |
|---|---:|---:|
| A | 2 | 1% |
| B | 11 | 8% |
| C | 59 | 42% |
| D | 21 | 15% |
| E | 49 | 35% |
| **Total** | **142** | |

## Structural claims (not per-voicing — and the least visible)

These are baked into the engine, invisible in the UI, and are mostly tier **E**
described in tier-B language. They are the highest-risk items in the app.

| Claim | Where | Tier | Note |
|---|---|---|---|
| LH comping zone = C3 (`LH_COMP_BASE` 48) | voicings.js | E | Register chosen by us; never checked against where players actually sit |
| Bass roots at C2 (`LH_BASE` 36) | voicings.js | E | Ours |
| Anchored voicings realize mid-register from anchor 48 | voicings.js | E | Mechanism invented for So What, then generalized |
| Mixed comping = joint LH/RH DP over movement cost | voicings.js | E | Our optimization; no claim any player thinks this way |
| Anchored + guide-tone-complete ⇒ mixed-eligible | INVARIANTS 1b | E | Owner *policy* decision, not a musical finding |
| "Shells" LH = three-note R-3-7 | voicings.js | D | Research suggests the bebop LH shell is more often **two-note R7/R3 alternating** — open question |
| Triads/sus/add9 shells include the 5th | guideToneIntervals | **contradicted** | A shell omits the 5th by definition; flagged, unfixed |
| Hand span cap 14 st (a 9th) | Test 17 | E | Owner's measured span — valid for *this player*, not a claim about idiom |
| "Root-Shell-Pretty" tier name | index.html, UI | D | "Pretty notes" is real but comes from the **rootless** context; the RSP compound appears to be ours |
| Octave roots = stride/gospel practice | voicings.js | D | Plausible, unverified |
| Voice-leading = minimize summed semitone motion | voicings.js | E | Our cost function |

## Per-voicing ledger

| Quality | Voicing | LH \| RH | Tier | What the claim rests on |
|---|---|---|:--:|---|
| `6` | R \| 3-5-6 | R \| 3, 5, 6 | **E** | Our voicing/register choice — no claim to tradition |
| `6` | 6-9-3-5 (6/9 sound) | R \| 6, 9, 3, 5 | **D** | Extrapolated from convention |
| `6` | R-5 \| 6-3 | R, 5 \| 6, 3 | **E** | Our voicing/register choice — no claim to tradition |
| `69` | R \| 3-6-9 | R \| 3, 6, 9 | **E** | Our voicing/register choice — no claim to tradition |
| `69` | 6-9-3-5 | R \| 6, 9, 3, 5 | **E** | Our voicing/register choice — no claim to tradition |
| `69` | R-5 \| 6-9-3 | R, 5 \| 6, 9, 3 | **E** | Our voicing/register choice — no claim to tradition |
| `maj` | Root position | R \| 3, 5, R | **E** | Our voicing/register choice — no claim to tradition |
| `maj` | Open voicing | R, 5 \| R, 3, 5 | **D** | Extrapolated from convention |
| `maj` | 2nd inversion | R \| 5, R, 3 | **E** | Our voicing/register choice — no claim to tradition |
| `min` | Root position | R \| b3, 5, R | **E** | Our voicing/register choice — no claim to tradition |
| `min` | Open voicing | R, 5 \| R, b3, 5 | **D** | Extrapolated from convention |
| `min` | 2nd inversion | R \| 5, R, b3 | **E** | Our voicing/register choice — no claim to tradition |
| `dim` | Root position | R \| b3, b5, R | **E** | Our voicing/register choice — no claim to tradition |
| `dim` | Open voicing | R, b5 \| R, b3 | **D** | Extrapolated from convention |
| `aug` | Root position | R \| 3, #5, R | **E** | Our voicing/register choice — no claim to tradition |
| `aug` | Open voicing | R, #5 \| R, 3 | **D** | Extrapolated from convention |
| `sus4` | Root position | R \| 4, 5, R | **E** | Our voicing/register choice — no claim to tradition |
| `sus4` | Open voicing | R, 5 \| R, 4 | **D** | Extrapolated from convention |
| `sus2` | Root position | R \| 2, 5, R | **E** | Our voicing/register choice — no claim to tradition |
| `sus2` | Open voicing | R, 5 \| R, 2 | **D** | Extrapolated from convention |
| `maj7` | Strict: R \| 3-5-7 | R \| 3, 5, 7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `maj7` | Strict spread: R-5 \| 7-3 | R, 5 \| 7, 3 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `maj7` | Shell: R \| 3-7 | R \| 3, 7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `maj7` | RSP (9): R \| 3-7-9 | R \| 3, 7, 9 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `maj7` | RSP (13): R \| 3-13-7 | R \| 3, 13, 7 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `maj7` | RSP (#11): R \| 3-7-#11 | R \| 3, 7, #11 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `maj7` | Type A: 3-5-7-9 | R \| 3, 5, 7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `maj7` | Type B: 7-9-3-5 | R \| 7, 9, 3, 5 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `maj7` | 6/9 color: 3-5-6-9 | R \| 3, 5, 6, 9 | **D** | Extrapolated from convention |
| `maj7` | Quartal (Lydian): R \| 7-3-13 in 4ths | R \| 7, 3, 13 | **B** | McCoy Tyner / modal quartal school — no specific recording |
| `maj7` | Powell 13: R-3-7 \| 9-13 | R, 3, 7 \| 9, 13 | **B** | Bud Powell / bebop LH school — no specific recording |
| `maj7` | Powell Lydian: R-3-7 \| 9-#11-13 | R, 3, 7 \| 9, #11, 13 | **B** | Bud Powell / bebop LH school — no specific recording |
| `min7` | Strict: R \| 3-5-7 | R \| b3, 5, b7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `min7` | Strict spread: R-5 \| 7-3 | R, 5 \| b7, b3 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `min7` | Shell: R \| 3-7 | R \| b3, b7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `min7` | RSP (9): R \| 3-7-9 | R \| b3, b7, 9 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `min7` | RSP (11): R \| 3-7-11 | R \| b3, b7, 11 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `min7` | Type A: 3-5-7-9 | R \| b3, 5, b7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `min7` | Type B: 7-9-3-5 | R \| b7, 9, b3, 5 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `min7` | Quartal: R \| 11-7-3 in 4ths | R \| 11, b7, b3 | **B** | McCoy Tyner / modal quartal school — no specific recording |
| `min7` | So What (quartal cluster) | 9, 5, R \| 11, 13 | **A** | Davis, *Kind of Blue* (1959) — the Evans/Davis cluster itself |
| `min7` | Powell 9: R-3-7 \| 9-5 | R, b3, b7 \| 9, 5 | **B** | Bud Powell / bebop LH school — no specific recording |
| `dom7` | Strict: R \| 3-5-7 | R \| 3, 5, b7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `dom7` | Strict spread: R-5 \| 7-3 | R, 5 \| b7, 3 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `dom7` | Shell: R \| 3-7 | R \| 3, b7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `dom7` | RSP (13): R \| 3-13-7 | R \| 3, 13, b7 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `dom7` | RSP (9): R \| 3-7-9 | R \| 3, b7, 9 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `dom7` | Type A: 3-13-7-9 | R \| 3, 13, b7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7` | Type B: 7-9-3-13 | R \| b7, 9, 3, 13 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7` | Powell 13: R-3-7 \| 9-13 | R, 3, b7 \| 9, 13 | **B** | Bud Powell / bebop LH school — no specific recording |
| `dim7` | R \| 3-b5-bb7 | R \| b3, b5, bb7 | **E** | Our voicing/register choice — no claim to tradition |
| `dim7` | R-b5 \| bb7-b3 | R, b5 \| bb7, b3 | **E** | Our voicing/register choice — no claim to tradition |
| `m7b5` | Strict: R \| 3-b5-7 | R \| b3, b5, b7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `m7b5` | Strict spread: R-b5 \| 7-3 | R, b5 \| b7, b3 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `m7b5` | Shell: R \| 3-7 | R \| b3, b7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `m7b5` | RSP (11): R \| 3-7-11 | R \| b3, b7, 11 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `m7b5` | RSP (b13): R \| 3-b13-7 | R \| b3, b13, b7 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `m7b5` | Type A: 3-b5-7-R | R \| b3, b5, b7, R | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `m7b5` | Type B: 7-R-3-b5 | R \| b7, R, b3, b5 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `m7b5` | Modern: 3-b5-7-9 | R \| b3, b5, b7, 9 | **D** | Extrapolated from convention |
| `minMaj7` | Strict: R \| 3-5-7 | R \| b3, 5, 7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `minMaj7` | Strict spread: R-5 \| 7-3 | R, 5 \| 7, b3 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `minMaj7` | Shell: R \| 3-7 | R \| b3, 7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `minMaj7` | RSP (9): R \| 3-7-9 | R \| b3, 7, 9 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `minMaj7` | Type A: 3-5-7-9 | R \| b3, 5, 7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `minMaj7` | Type B: 7-9-3-5 | R \| 7, 9, b3, 5 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7sus4` | Strict: R \| 4-5-7 | R \| 4, 5, b7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `dom7sus4` | Strict spread: R-5 \| 7-4 | R, 5 \| b7, 4 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `dom7sus4` | Shell: R \| 4-7 | R \| 4, b7 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `dom7sus4` | RSP (9): R \| 4-7-9 | R \| 4, b7, 9 | **D** | "Pretty notes" is real; the RSP compound + this note choice is ours |
| `dom7sus4` | Type A: 4-5-7-9 | R \| 4, 5, b7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7sus4` | Type B: 7-9-4-5 | R \| b7, 9, 4, 5 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7sus4` | Slash: bVII/I — Bb-over-C (7-9-11) | R \| b7, 9, 11 | **C** | Triad-over-bass — standard concept, our specific voicing |
| `dom7sus4` | Quartal sus: 9-5-R-4-7 in 4ths | 9, 5, R \| 4, b7 | **B** | McCoy Tyner / modal quartal school — no specific recording |
| `maj9` | Type A: 3-5-7-9 | R \| 3, 5, 7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `maj9` | Type B: 7-9-3-5 | R \| 7, 9, 3, 5 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `maj9` | R-5 \| 7-9-3 | R, 5 \| 7, 9, 3 | **E** | Our voicing/register choice — no claim to tradition |
| `maj9` | Slash: D/C Lydian (II triad) | R \| 9, #11, 13 | **C** | Triad-over-bass — standard concept, our specific voicing |
| `min9` | Type A: 3-5-7-9 | R \| b3, 5, b7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `min9` | Type B: 7-9-3-5 | R \| b7, 9, b3, 5 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `min9` | R-5 \| 7-9-3 | R, 5 \| b7, 9, b3 | **E** | Our voicing/register choice — no claim to tradition |
| `dom9` | Type A: 3-13-7-9 | R \| 3, 13, b7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom9` | Type B: 7-9-3-13 | R \| b7, 9, 3, 13 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom9` | R \| 3-7-9 | R \| 3, b7, 9 | **E** | Our voicing/register choice — no claim to tradition |
| `dom9` | R-5 \| 7-9-3 | R, 5 \| b7, 9, 3 | **E** | Our voicing/register choice — no claim to tradition |
| `dom11` | Slash: bVII/I — F-over-G (7-9-11) | R \| b7, 9, 11 | **C** | Triad-over-bass — standard concept, our specific voicing |
| `dom11` | Sus: 4-7-9 | R \| 4, b7, 9 | **D** | Extrapolated from convention |
| `dom11` | R-5 \| 7-9-11 | R, 5 \| b7, 9, 11 | **E** | Our voicing/register choice — no claim to tradition |
| `min11` | Type A: 3-5-7-11 | R \| b3, 5, b7, 11 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `min11` | Type B: 7-9-3-11 | R \| b7, 9, b3, 11 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `min11` | R-5 \| 7-3-11 | R, 5 \| b7, b3, 11 | **E** | Our voicing/register choice — no claim to tradition |
| `min11` | Quartal: R \| 11-7-3 in 4ths | R \| 11, b7, b3 | **B** | McCoy Tyner / modal quartal school — no specific recording |
| `min11` | Powell 11: R-3-7 \| 9-11 | R, b3, b7 \| 9, 11 | **B** | Bud Powell / bebop LH school — no specific recording |
| `maj13` | Type A: 3-13-7-9 | R \| 3, 13, 7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `maj13` | Type B: 7-9-3-13 | R \| 7, 9, 3, 13 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `maj13` | R \| 7-9-13 | R \| 7, 9, 13 | **E** | Our voicing/register choice — no claim to tradition |
| `maj13` | Powell 13: R-3-7 \| 9-13 | R, 3, 7 \| 9, 13 | **B** | Bud Powell / bebop LH school — no specific recording |
| `dom13` | Type A: 3-13-7-9 | R \| 3, 13, b7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom13` | Type B: 7-9-3-13 | R \| b7, 9, 3, 13 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom13` | R \| 7-9-13 | R \| b7, 9, 13 | **E** | Our voicing/register choice — no claim to tradition |
| `dom13` | Shell: R-7 \| 3-13-9 | R, b7 \| 3, 13, 9 | **C** | Chord tones / R-3-7 shell — standard, pedagogy-tier |
| `dom13` | US II: R-7 \| maj triad (13#11) | R, b7 \| 9, #11, 13 | **C** | Upper-structure triads — standard, pedagogy-tier |
| `min13` | Type A: 3-13-7-9 | R \| b3, 13, b7, 9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `min13` | Type B: 7-9-3-13 | R \| b7, 9, b3, 13 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `min13` | R \| 7-9-13 | R \| b7, 9, 13 | **E** | Our voicing/register choice — no claim to tradition |
| `add9` | R \| 3-5-9 | R \| 3, 5, 9 | **E** | Our voicing/register choice — no claim to tradition |
| `add9` | R-5 \| 9-3 | R, 5 \| 9, 3 | **E** | Our voicing/register choice — no claim to tradition |
| `madd9` | R \| 3-5-9 | R \| b3, 5, 9 | **E** | Our voicing/register choice — no claim to tradition |
| `madd9` | R-5 \| 9-3 | R, 5 \| 9, b3 | **E** | Our voicing/register choice — no claim to tradition |
| `m6` | R \| 3-5-6 | R \| b3, 5, 6 | **E** | Our voicing/register choice — no claim to tradition |
| `m6` | 6-9-3-5 | R \| 6, 9, b3, 5 | **E** | Our voicing/register choice — no claim to tradition |
| `m6` | R-5 \| 6-3 | R, 5 \| 6, b3 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7b9` | Type A: 3-13-7-b9 | R \| 3, 13, b7, b9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7b9` | Type B: 7-b9-3 | R \| b7, b9, 3 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7b9` | R-7 \| b9-3-5 | R, b7 \| b9, 3, 5 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7s9` | Type A: 3-7-#9 | R \| 3, b7, #9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7s9` | Type B: 7-#9-3 | R \| b7, #9, 3 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7s9` | R-7 \| #9-3 (Hendrix) | R, b7 \| #9, 3 | **A** | The 7#9 "Hendrix chord" — named, documented |
| `dom7b5` | R \| 3-b5-7 | R \| 3, b5, b7 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7b5` | R \| 7-3-b5 | R \| b7, 3, b5 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7s5` | R \| 3-#5-7 | R \| 3, #5, b7 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7s5` | R \| 7-3-#5 | R \| b7, 3, #5 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7s11` | 3-7-9-#11 | R \| 3, b7, 9, #11 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7s11` | 7-9-3-#11 | R \| b7, 9, 3, #11 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7s11` | US II: R-7 \| maj triad (9-#11-13) | R, b7 \| 9, #11, 13 | **C** | Upper-structure triads — standard, pedagogy-tier |
| `dom7b13` | 3-b13-7 | R \| 3, b13, b7 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7b13` | 7-3-b13 | R \| b7, 3, b13 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7alt` | Type A: 3-b13-7-#9 | R \| 3, b13, b7, #9 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7alt` | Type B: 7-b9-3-b13 | R \| b7, b9, 3, b13 | **C** | Evans/Garland/Kelly rootless — widely documented, pedagogy-tier |
| `dom7alt` | 7-#9-3-b13 | R \| b7, #9, 3, b13 | **E** | Our voicing/register choice — no claim to tradition |
| `dom7alt` | US bVI: R-7 \| 3 + bVI triad | R, b7 \| 3, b13, R, #9 | **C** | Upper-structure triads — standard, pedagogy-tier |
| `dom7alt` | US bV: R-7 \| 3 + bV triad | R, b7 \| 3, #11, b7, b9 | **C** | Upper-structure triads — standard, pedagogy-tier |
| `dom9b5` | 3-b5-7-9 | R \| 3, b5, b7, 9 | **E** | Our voicing/register choice — no claim to tradition |
| `dom9b5` | 7-9-3-b5 | R \| b7, 9, 3, b5 | **E** | Our voicing/register choice — no claim to tradition |
| `dom9s5` | 3-#5-7-9 | R \| 3, #5, b7, 9 | **E** | Our voicing/register choice — no claim to tradition |
| `dom9s5` | 7-9-3-#5 | R \| b7, 9, 3, #5 | **E** | Our voicing/register choice — no claim to tradition |
| `dom13b9` | 3-13-7-b9 | R \| 3, 13, b7, b9 | **E** | Our voicing/register choice — no claim to tradition |
| `dom13b9` | 7-b9-3-13 | R \| b7, b9, 3, 13 | **E** | Our voicing/register choice — no claim to tradition |
| `dom13b9` | US VI: R-7 \| maj triad (13-b9-3) | R, b7 \| 13, b9, 3 | **C** | Upper-structure triads — standard, pedagogy-tier |
| `dom13s11` | 3-13-7-#11 | R \| 3, 13, b7, #11 | **E** | Our voicing/register choice — no claim to tradition |
| `dom13s11` | 7-3-#11-13 | R \| b7, 3, #11, 13 | **E** | Our voicing/register choice — no claim to tradition |
| `dom13s11` | Basic | R \| R | **B** | Bud Powell / bebop LH school — no specific recording |

## How a row gets promoted

- **→ A** : a named recording (performer, tune, year) where the voicing is played, or a published transcription with a page number.
- **→ B** : a documented association with a player, short of a specific work.
- Nothing is promoted by Claude asserting it more confidently, and nothing is
  promoted by the owner liking the sound. Those are the two mechanisms that
  produced the current state.

## Known blockers

- **PiJAMA** (200+ h, 2,777 performances, 120 pianists) would settle the
  distributional claims — LH note counts, 5th frequency, register, span. Its MIDI
  is on Zenodo, which this environment's proxy blocks. Requires the owner to
  fetch it.
- PiJAMA is **solo** piano: good evidence for `roots`/`shells`/octave-roots,
  poor evidence for the with-a-bassist modes, and auto-transcribed (error-prone
  exactly in dense low voicings).
- `jazznet` is reachable but is **generated patterns, not performances** — using
  it would be circular.
