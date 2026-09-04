/* ============================================================
   verify.mjs — headless verification sweep.

   For each theme × viewport, navigates to EVERY screen and asserts:
     • no pageerror, no console.error (known external noise ignored)
     • each screen renders non-trivial content
     • no horizontal overflow (scrollWidth <= clientWidth)
   Screens are discovered from the live nav so the list never drifts.

   Usage: node scripts/verify.mjs
   Requires: npm install (playwright), Chromium at PLAYWRIGHT_BROWSERS_PATH.
   ============================================================ */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Prefer the environment's pre-installed Chromium (its build may differ from
// the one Playwright expects). Falls back to Playwright's bundled browser.
function resolveChromium() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  return undefined;
}
const EXEC = resolveChromium();

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

// Console noise we don't care about (blocked external CDNs, favicon 404 before it exists).
const IGNORE = [
  /favicon/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /manifest/i,
];

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(req.url.split('?')[0]);
        if (p === '/' || p === '') p = '/index.html';
        const file = join(ROOT, p);
        if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404); res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const VIEWPORTS = [
  { name: 'desktop',          width: 1440, height: 900 },
  { name: 'tablet-landscape', width: 1080, height: 810 },
  { name: 'tablet-portrait',  width: 810,  height: 1080 },
];
const THEMES = ['dark', 'light'];

async function main() {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
  const failures = [];
  let checks = 0;

  // Discover screen ids once.
  const disco = await browser.newPage();
  await disco.goto(base + '/#home', { waitUntil: 'networkidle' });
  const ids = await disco.$$eval('a.nav-item[data-nav-id]', els => els.map(e => e.dataset.navId));
  await disco.close();
  console.log(`Discovered ${ids.length} screens.\n`);

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

      for (const id of ids) {
        errors.length = 0;
        await page.goto(`${base}/#${id}`, { waitUntil: 'networkidle' });
        await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
        await page.waitForTimeout(120);

        const r = await page.evaluate(() => {
          const c = document.getElementById('module-container');
          const de = document.documentElement;
          return {
            text: (c?.innerText || '').trim().length,
            overflowDoc: de.scrollWidth - de.clientWidth,
            overflowMod: c ? c.scrollWidth - c.clientWidth : 0,
          };
        });

        const ctx = `[${theme}/${vp.name}] #${id}`;
        checks++;
        if (errors.length) failures.push(`${ctx} — ${errors.join(' | ')}`);
        if (r.text < 20) failures.push(`${ctx} — empty/near-empty content (${r.text} chars)`);
        if (r.overflowDoc > 2) failures.push(`${ctx} — document h-overflow ${r.overflowDoc}px`);
        if (r.overflowMod > 2) failures.push(`${ctx} — module h-overflow ${r.overflowMod}px`);
      }
      await page.close();
    }
  }

  // ── Drawer behavior at tablet width ──────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 810, height: 1080 } });
    await page.goto(base + '/#home', { waitUntil: 'networkidle' });
    const togVisible = await page.isVisible('#nav-toggle');
    if (!togVisible) failures.push('[drawer] hamburger not visible at 810px');
    await page.click('#nav-toggle');
    await page.waitForTimeout(200);
    let open = await page.evaluate(() => document.getElementById('sidebar').classList.contains('drawer-open')
      && document.getElementById('nav-backdrop').classList.contains('visible'));
    if (!open) failures.push('[drawer] did not open on hamburger click');
    await page.click('#nav-backdrop', { position: { x: 700, y: 500 } });
    await page.waitForTimeout(200);
    const closed = await page.evaluate(() => !document.getElementById('sidebar').classList.contains('drawer-open'));
    if (!closed) failures.push('[drawer] backdrop click did not close drawer');
    checks += 3;
    await page.close();
  }

  // Hamburger must be hidden on desktop.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/#home', { waitUntil: 'networkidle' });
    if (await page.isVisible('#nav-toggle')) failures.push('[drawer] hamburger visible on desktop (should be hidden)');
    checks++;
    await page.close();
  }

  // ── Event bus + deep links + resume ──────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/#home', { waitUntil: 'networkidle' });

    // Event bus fires on navigation.
    const busId = await page.evaluate(() => new Promise(res => {
      document.addEventListener('app:navigate', e => res(e.detail.id), { once: true });
      location.hash = '#architecture';
      setTimeout(() => res('(none)'), 1000);
    }));
    if (busId !== 'architecture') failures.push(`[bus] app:navigate detail was "${busId}", expected "architecture"`);

    // Find an animated screen and deep-link to a step.
    let deepOk = false;
    for (const id of ['insert', 'read-path', 'write-path', 'create-table', 'architecture']) {
      await page.goto(`${base}/#${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);
      const total = await page.evaluate(() => (window.IcebergViz.AnimationControls._engine || {}).totalSteps || 0);
      if (total > 2) {
        await page.goto(`${base}/#${id}/2`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(250);
        const cur = await page.evaluate(() => (window.IcebergViz.AnimationControls._engine || {}).currentStep);
        if (cur === 2) deepOk = true;
        else failures.push(`[deep-link] #${id}/2 → currentStep ${cur}, expected 2`);
        break;
      }
    }
    if (!deepOk) failures.push('[deep-link] could not verify step seek on any animated screen');

    // Resume: last screen restored when hash is empty.
    await page.evaluate(() => { try { localStorage.setItem('iv-last-screen', 'quiz'); } catch (e) {} });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const resumed = await page.evaluate(() => location.hash);
    if (resumed !== '#quiz') failures.push(`[resume] expected #quiz, got "${resumed}"`);

    checks += 3;
    await page.close();
  }

  await browser.close();
  server.close();

  console.log(`Ran ${checks} screen-checks across ${THEMES.length} themes × ${VIEWPORTS.length} viewports.`);
  if (failures.length) {
    console.error(`\n✗ ${failures.length} issue(s):`);
    for (const f of failures) console.error('  • ' + f);
    process.exit(1);
  }
  console.log('✓ All checks passed — no errors, no overflow, all screens render.');
}

main().catch(e => { console.error(e); process.exit(1); });
