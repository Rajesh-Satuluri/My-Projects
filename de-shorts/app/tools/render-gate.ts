/* DE Shorts — 360x800 render gate (spec §8/§11).
 * Builds + serves the app, then renders every AUTHORED concept card at each target
 * width and asserts, per the spec's zero-tolerance UI rule:
 *   - no horizontal page scroll (documentElement.scrollWidth <= innerWidth)
 *   - collapsed card is not clipped (card scrollHeight <= clientHeight)
 *   - no visible text below 13px
 * Checks both collapsed and expanded states (expanded may scroll INSIDE the
 * disclosure region, but never the page, and never with tiny text).
 * Exits non-zero on any failure so it gates CI.
 */
import { spawn, execSync } from "node:child_process";
import { chromium, type Browser } from "playwright";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = resolve(__dirname, "..");
const CONCEPTS = resolve(APP, "../content/data/concepts");
const WIDTHS = [360, 375, 390, 412];
const HEIGHT = 800;
const PORT = 4173;
const MIN_FONT = 13;

const authoredIds = (): string[] => {
  const ids: string[] = [];
  for (const f of readdirSync(CONCEPTS).filter((f) => f.endsWith(".json"))) {
    for (const c of JSON.parse(readFileSync(resolve(CONCEPTS, f), "utf-8")))
      if (c.authoringStatus && c.authoringStatus !== "stub") ids.push(c.id);
  }
  return ids;
};

async function checkPage(page: import("playwright").Page, id: string, width: number, state: string, fails: string[]) {
  const r = await page.evaluate((min) => {
    const out: string[] = [];
    const de = document.documentElement;
    if (de.scrollWidth > window.innerWidth + 1)
      out.push(`horizontal page scroll (${de.scrollWidth} > ${window.innerWidth})`);
    const card = document.querySelector<HTMLElement>(".card");
    if (card && card.scrollHeight > card.clientHeight + 1)
      out.push(`card clipped (content ${card.scrollHeight} > ${card.clientHeight})`);
    // Two floors (spec): HTML body text >= 13px; SVG diagram labels >= 12px (§6).
    for (const el of Array.from(document.querySelectorAll<Element>(".card *"))) {
      const t = el.textContent?.trim();
      if (!t || el.children.length) continue; // leaf text nodes only
      const isSvg = el.closest("svg") != null;
      const floor = isSvg ? 12 : min;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs && fs < floor) { out.push(`${isSvg ? "svg label" : "text"} ${fs}px < ${floor}px: "${t.slice(0, 30)}"`); break; }
    }
    return out;
  }, MIN_FONT);
  for (const msg of r) fails.push(`${id} @${width} [${state}] ${msg}`);
}

async function main() {
  console.log("building app…");
  execSync("npm run build", { cwd: APP, stdio: "inherit" });
  const server = spawn("npm", ["run", "preview"], { cwd: APP, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 2500));

  const ids = authoredIds();
  console.log(`gate: ${ids.length} authored cards × ${WIDTHS.length} widths\n`);
  let browser: Browser | undefined;
  const fails: string[] = [];
  try {
    // Use the preinstalled Chromium (env override), avoiding a version-pinned download.
    const executablePath = process.env.PW_CHROMIUM || undefined;
    browser = await chromium.launch(executablePath ? { executablePath } : {});
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: HEIGHT }, deviceScaleFactor: 3 });
      for (const id of ids) {
        await page.goto(`http://localhost:${PORT}/?probe=${encodeURIComponent(id)}`, { waitUntil: "networkidle" });
        await checkPage(page, id, width, "collapsed", fails);
        await page.locator(".card").click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(60);
        await checkPage(page, id, width, "expanded", fails);
      }
      await page.close();
    }
  } finally {
    await browser?.close();
    server.kill();
  }

  if (fails.length) {
    console.log(`RENDER GATE FAILED — ${fails.length} issue(s):`);
    for (const f of fails.slice(0, 60)) console.log(`  ✗ ${f}`);
    if (fails.length > 60) console.log(`  … +${fails.length - 60} more`);
    process.exit(1);
  }
  console.log(`RENDER GATE PASSED — ${ids.length} cards fit at ${WIDTHS.join("/")} px, no clipping, no sub-${MIN_FONT}px text.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
