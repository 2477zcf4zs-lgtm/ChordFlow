// Stamp content hashes onto index.html's CSS/JS references so a deploy can
// never serve fresh HTML against a browser-cached stylesheet or script.
//
// This app has no build step, so the references are hand-written and were
// unversioned: `css/styles.css`, `js/app.js`. GitHub Pages lets browsers cache
// those, while index.html is revalidated far more often — so a deploy whose
// new HTML depends on new CSS/JS could render with the OLD ones. Observed
// on-device 2026-07-28: the Settings group chips appeared (new HTML) as
// unstyled native iOS buttons (stale CSS) that did nothing when tapped (stale
// JS). Three symptoms, one cause.
//
// Usage: node scripts/stamp_assets.js          rewrite index.html in place
//        node scripts/stamp_assets.js --check  exit 1 if any stamp is stale
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repo = path.join(__dirname, '..');
const indexPath = path.join(repo, 'index.html');

const hashOf = (rel) => {
  const file = path.join(repo, rel);
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
};

/** Rewrite every local css/js reference's ?v= to its current content hash. */
function stamp(html) {
  const misses = [];
  const out = html.replace(
    /(href|src)="((?:css|js)\/[A-Za-z0-9._-]+\.(?:css|js))(\?v=[a-f0-9]+)?"/g,
    (full, attr, rel) => {
      const h = hashOf(rel);
      if (!h) { misses.push(rel); return full; }
      return `${attr}="${rel}?v=${h}"`;
    });
  return { out, misses };
}

/**
 * A build id covering everything a browser caches: index.html (with the version
 * placeholder blanked, so the hash cannot depend on itself) plus the contents
 * of every stamped asset. version.json publishes it; the page carries the same
 * string in a meta tag, and compares the two at runtime to notice it is stale.
 */
function buildVersion(stampedHtml) {
  const neutral = stampedHtml.replace(VERSION_RE, `<meta name="app-version" content="">`);
  const assets = [...stampedHtml.matchAll(/(?:href|src)="((?:css|js)\/[A-Za-z0-9._-]+\.(?:css|js))\?v=/g)]
    .map(m => m[1]).sort();
  const h = crypto.createHash('sha256').update(neutral);
  for (const rel of assets) h.update(rel).update(fs.readFileSync(path.join(repo, rel)));
  return h.digest('hex').slice(0, 12);
}

const VERSION_RE = /<meta name="app-version" content="[^"]*">/;

const html = fs.readFileSync(indexPath, 'utf8');
let { out, misses } = stamp(html);
if (!VERSION_RE.test(out)) {
  out = out.replace(/(<link rel="stylesheet")/, `<meta name="app-version" content="">\n  $1`);
}
out = out.replace(VERSION_RE, `<meta name="app-version" content="${buildVersion(out)}">`);
const versionJson = JSON.stringify({ version: buildVersion(out) }) + '\n';
if (misses.length) {
  console.error('referenced but missing on disk: ' + misses.join(', '));
  process.exit(1);
}

if (process.argv.includes('--check')) {
  if (out !== html) {
    console.error('STALE: index.html asset stamps do not match file contents.');
    console.error('Run: node scripts/stamp_assets.js');
    process.exit(1);
  }
  const onDisk = fs.existsSync(path.join(repo, 'version.json'))
    ? fs.readFileSync(path.join(repo, 'version.json'), 'utf8') : '';
  if (onDisk !== versionJson) {
    console.error('STALE: version.json does not match index.html.');
    console.error('Run: node scripts/stamp_assets.js');
    process.exit(1);
  }
  console.log('asset stamps current');
} else {
  fs.writeFileSync(path.join(repo, 'version.json'), versionJson);
  if (out === html) console.log('asset stamps already current');
  else { fs.writeFileSync(indexPath, out); console.log('stamped index.html'); }
}
