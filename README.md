# ChordFlow

A chord-progression practice tool for jazz / keys players. ChordFlow generates or
loads progressions (roman-numeral source of truth), realizes them as two-hand
keyboard voicings with a voice-leading optimizer, and plays them back through a Web
Audio synth and metronome.

It is a **static, no-build web app** — plain HTML, CSS, and classic (non-module)
JavaScript. There is no bundler and no framework.

## Project layout

```
index.html        markup + <link>/<script> tags only
css/styles.css    all styles
js/theory.js      notes, INTERVALS, spellInterval, transposeWithContext, weightedPick, CHORD_TYPES
js/voicings.js    KEYBOARD_VOICINGS, voicingsFor, VOICING_TIER_COSTS, realizeHand, DP optimizer, formatters
js/parsing.js     parseRomanNumeral / parseBasicNumeral, chord substitutions
js/library.js     PROGRESSION_LIBRARY (53 entries)
js/audio.js       audioEngine, synth, click, lookahead scheduler, visualSync, play/stop control
js/state.js       state object, buildProgressionFromSource, generate/load
js/render.js      chord dictionary data + renderChordStructure, updatePlaybackState, piano SVG, sub menu
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
  DP voice leading, cumulative tiers, all 53 library entries). It loads the logic-only
  files (`theory`, `library`, `voicings`, `parsing`) in a single scope.
- `test_dom_smoke.js` — jsdom integration test. It loads `index.html` via
  `JSDOM.fromFile(..., { resources: 'usable', runScripts: 'dangerously' })` so the
  external scripts actually load and run, then exercises the UI, playback, the
  stop/start race, tier switching, and the pause/resume loop counter.

Both suites must exit 0. They also run in CI on every push and pull request
(`.github/workflows/test.yml`, Node 22, `npm ci && npm test`).

## Deploy (GitHub Pages)

The app is static with `index.html` at the repository root, so GitHub Pages can serve
it directly:

1. Repo **Settings → Pages**.
2. **Build and deployment → Source: Deploy from a branch**.
3. Select the default branch and the **`/ (root)`** folder, then save.

The site publishes at `https://<owner>.github.io/<repo>/`. No build step is required;
pushing to the configured branch updates the deployed site.
