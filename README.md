# ChordFlow

A chord-progression practice tool for jazz / keys players. ChordFlow generates or
loads progressions (roman-numeral source of truth), realizes them as two-hand
keyboard voicings with a voice-leading optimizer, and plays them back through a Web
Audio piano synth with comping grooves, a metronome, and tap-to-play pads.

It is a **static, no-build web app** — plain HTML, CSS, and classic (non-module)
JavaScript. There is no bundler and no framework.

## Features

- **Generation** — random progressions from weighted, complexity-tiered quality
  pools (triads → strict sevenths → root-shell-pretty → jazz rootless → extended →
  altered), variable length (2–8 bars), idiomatic secondary dominants, and a
  per-progression density character. Chord substitutions (tritone subs etc.) per
  chord.
- **Library** — 53 standards loaded *as written* (original key, explicit chart
  qualities), plus personal saved progressions in `localStorage` with
  rename/delete and JSON export/import.
- **Voicing engine** — two-hand templates per quality; a DP optimizer picks the
  voicing and octave placement for every chord at once, minimizing voice movement
  plus register/tier costs. Tapping a selected chord cycles its voicings manually.
- **Playback** — lookahead Web Audio scheduler, piano-style envelope (hammer
  attack, two-stage decay, pitch-scaled tail), comping grooves (block chords,
  charleston, bossa, half-note pulse) with optional swung eighths, metronome, and
  prev/next step transport with audition.
- **Practice modes** — 12-keys (transpose each loop by fourths or half steps),
  tempo ramp per loop, and flashcard mode (hide chord symbols, comp from
  numerals).
- **Pads** — a tap-to-play performance surface, one pad per chord, one-shot or
  press-and-hold triggering, polyphonic.
- **Bassist mode** — a Left Hand setting: **Roots** (default), **Shells** (root +
  guide tones), **Two-hand rootless** (a second rootless voicing in the tenor
  range with its own voice-leading pass — the Evans-trio texture), or **Rootless**
  (LH silent, for playing over a bassist or backing track), plus an optional
  sustained backing-bass root when the LH plays no roots.
- **3-octave mode** — a Range setting that constrains every realized note to one
  37-key C-to-C window (C2–C5) so everything fits a Yamaha Reface or other mini
  keyboard.
- **Chord dictionary** — every quality with formula, voicings, practical tips,
  and substitutions.

## Project layout

```
index.html        markup + <link>/<script> tags only
css/styles.css    all styles
js/theory.js      notes, INTERVALS, spellInterval, transposeWithContext, weightedPick, CHORD_TYPES
js/voicings.js    KEYBOARD_VOICINGS, voicingsFor, VOICING_TIER_COSTS, realizeHand, DP optimizers
                  (RH + two-hand-rootless LH), guideToneIntervals, range windows, formatters
js/parsing.js     parseRomanNumeral / parseBasicNumeral, chord substitutions
js/library.js     PROGRESSION_LIBRARY (53 entries, original keys + as-written qualities)
js/audio.js       audioEngine, piano synth, click, lookahead scheduler, comping grooves,
                  visualSync, play/stop control, step transport, tap-to-play pads
js/state.js       state object, buildProgressionFromSource, generate/load, saved progressions
js/render.js      chord dictionary data + renderChordStructure, pad grid, updatePlaybackState,
                  voicing panel, piano SVG, sub menu, saved-progressions list
js/app.js         cached DOM elements, event listeners, keyboard shortcuts, init() — loaded last
```

The scripts are classic scripts loaded in dependency order (not ES modules), so they
share a single global scope. `app.js` is loaded last because it calls `init()` once
every other file has defined its data and functions.

## Run locally

Any static file server works. Using the bundled script:

```bash
npm start          # runs `npx serve .`, then open the printed URL
```

Or with anything equivalent, e.g. `python3 -m http.server`. Then open
`index.html` through the server (not via `file://`, so the browser will load the
external `js/` and `css/` files).

## Test

```bash
npm install        # jsdom is the only dependency
npm test           # runs both suites
```

- `test_voice_leading.js` — pure-logic tests (theory, spelling, voicing realization,
  DP voice leading, cumulative tiers, all 53 library entries, generation statistics,
  comping-groove onsets, bassist-mode left-hand realizations, and the 3-octave
  window sweep). It loads the logic-only files (`theory`, `library`, `voicings`,
  `parsing`, `audio`, `state`) in a single scope — the DOM-touching layers stay out.
- `test_dom_smoke.js` — jsdom integration test. It loads `index.html` via
  `JSDOM.fromFile(..., { resources: 'usable', runScripts: 'dangerously' })` so the
  external scripts actually load and run, then exercises the UI, playback, the
  stop/start race, tier switching, practice modes, saved progressions, pads,
  bassist mode, 3-octave mode, and XSS regression checks for rendered chord text.
  Note for new tests using the mock audio clock: zero `ctx.currentTime` *before*
  `startPlayback`, not after — rewinding afterwards stalls the lookahead scheduler.

Both suites must exit 0. They also run in CI on every push and pull request
(`.github/workflows/test.yml`, Node 22, `npm ci && npm test`).

There is also a real-browser layout probe for the mobile/desktop shell
(`scripts/layout_check.js`) that asserts the no-page-scroll acceptance rules at
390×844 and 1280×800. It needs `npm i --no-save playwright-core` and a local
Chromium; it is not part of `npm test`.

## Deploy (GitHub Pages)

The app is static with `index.html` at the repository root, so GitHub Pages can serve
it directly:

1. Repo **Settings → Pages**.
2. **Build and deployment → Source: Deploy from a branch**.
3. Select the default branch and the **`/ (root)`** folder, then save.

The site publishes at `https://<owner>.github.io/<repo>/`. No build step is required;
pushing to the configured branch updates the deployed site.
