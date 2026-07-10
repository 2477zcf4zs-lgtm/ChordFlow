// Phase 3 layout acceptance probe — run manually, not part of npm test.
// Requires: npm i --no-save playwright-core, plus a Chromium binary
// (set executablePath below or ensure /opt/pw-browsers/chromium exists).
// Usage: node scripts/layout_check.js
// Phase 3 acceptance probe: real Chromium at 390x844 (and 1280x800 desktop).
// Serves the repo over http, loads the app, opens a panel, and asserts:
//  - the page body does not scroll vertically or horizontally
//  - transport bar, chord strip, and the open panel are all within the viewport
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = require('path').join(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('nope'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

function box(el) { return el ? { top: Math.round(el.top), bottom: Math.round(el.bottom), left: Math.round(el.left), right: Math.round(el.right) } : null; }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let failures = 0;
  const check = (cond, msg) => { console.log((cond ? '  ok: ' : '  FAIL: ') + msg); if (!cond) failures++; };

  for (const [label, vw, vh] of [['MOBILE 390x844', 390, 844], ['DESKTOP 1280x800', 1280, 800]]) {
    console.log('\n=== ' + label + ' ===');
    const page = await browser.newPage({ viewport: { width: vw, height: vh } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.library-item', { state: 'attached' }); // init() done (panel may be hidden)

    // Open the voicing panel by selecting a chord (the flow a player uses)
    await page.click('.chord-box');
    await page.waitForSelector('#voicingPanel.visible');
    await page.waitForTimeout(400); // let smooth scroll settle

    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const r = sel => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect() : null; };
      return {
        innerW: window.innerWidth, innerH: window.innerHeight,
        scrollW: de.scrollWidth, scrollH: de.scrollHeight,
        bodyScrollH: document.body.scrollHeight,
        transport: r('.transport-bar') && { t: r('.transport-bar').top, b: r('.transport-bar').bottom, l: r('.transport-bar').left, rt: r('.transport-bar').right },
        strip: r('#chordContainer') && { t: r('#chordContainer').top, b: r('#chordContainer').bottom },
        panel: r('#voicingPanel.visible') && { t: r('#voicingPanel.visible').top, b: r('#voicingPanel.visible').bottom },
        piano: r('#pianoKeyboard svg') && { w: r('#pianoKeyboard svg').width },
        panelAreaW: r('.panel-area') && r('.panel-area').width,
        tabCount: document.querySelectorAll('.tab-btn').length,
        playVisible: (() => { const b = r('#playBtn'); return b && b.top >= 0 && b.bottom <= window.innerHeight; })()
      };
    });

    check(m.scrollH <= m.innerH + 1, `no vertical page scroll (scrollHeight ${m.scrollH} <= viewport ${m.innerH})`);
    check(m.scrollW <= m.innerW + 1, `no horizontal page scroll (scrollWidth ${m.scrollW} <= viewport ${m.innerW})`);
    check(m.transport && m.transport.b <= m.innerH + 1 && m.transport.t < m.innerH, `transport bar within viewport (bottom ${m.transport && Math.round(m.transport.b)})`);
    check(m.strip && m.strip.b <= m.transport.t + 1, `chord strip sits above transport (${Math.round(m.strip.b)} <= ${Math.round(m.transport.t)})`);
    check(m.panel && m.panel.t >= 0, `open voicing panel starts on screen (top ${Math.round(m.panel.t)})`);
    check(m.playVisible, 'Play button fully visible');
    check(m.piano && m.piano.w > 0 && m.piano.w <= (m.panelAreaW || m.innerW), `piano SVG fits its container (${m.piano && Math.round(m.piano.w)}px)`);
    check(m.tabCount === 4, 'four tab buttons present');
    check(errors.length === 0, 'no page errors' + (errors.length ? ' -> ' + errors.join('; ') : ''));

    // Tab exclusivity + settings reachable without scrolling the page
    await page.click('#settingsToggle');
    const s = await page.evaluate(() => ({
      settingsOpen: document.getElementById('settingsPanel').classList.contains('visible'),
      voicingOpen: document.getElementById('voicingPanel').classList.contains('visible'),
      keyVisible: (() => { const r = document.getElementById('keySelect').getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; })(),
      scrollH: document.documentElement.scrollHeight, innerH: window.innerHeight
    }));
    check(s.settingsOpen && !s.voicingOpen, 'tabs are exclusive (settings open closes voicing)');
    check(s.keyVisible, 'key select reachable in settings without page scroll');
    check(s.scrollH <= s.innerH + 1, 'still no page scroll with settings open');

    await page.screenshot({ path: `shot-${vw}x${vh}.png` });
    await page.close();
  }

  await browser.close();
  server.close();
  console.log('\n' + (failures ? failures + ' LAYOUT FAILURE(S)' : 'LAYOUT CHECKS PASSED'));
  process.exit(failures ? 1 : 0);
})();
