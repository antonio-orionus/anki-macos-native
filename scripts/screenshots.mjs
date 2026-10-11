#!/usr/bin/env node
// Regenerate docs/screenshots/*.png from a live Anki on macOS.
//
//   node scripts/screenshots.mjs [--deck "Name"] [--size 999x570] [--yes] [--keep-debug]
//
// Quits Anki and relaunches it in the background with web-inspector debugging,
// walks the deck list, overview and reviewer (it reveals an answer but never
// grades a card), renders Deck Options in a hidden off-screen view, captures
// each screen in light and dark, then relaunches Anki normally. Dark captures
// toggle Anki's own night-mode classes in each page, so your theme setting is
// never changed. Anki is never brought to the front.
//
// Needs: Node 22+, Xcode command-line tools (swift), and Screen Recording
// permission for the terminal you run it from. Window sizing also needs
// Accessibility permission; without it the current size is used.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "screenshots");
const ANKI = process.env.ANKI_APP || "/Applications/Anki.app";
const PORT = 9229;
const WIDTH_PX = 1600; // README images are downscaled to this width

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const deckName = option("--deck", null);
const [winW, winH] = option("--size", "999x570").split("x").map(Number);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, argv, opts = {}) => execFileSync(cmd, argv, { encoding: "utf8", ...opts }).trim();
const osa = (script) => run("osascript", ["-e", script], { stdio: ["ignore", "pipe", "ignore"] });
const nonEmpty = (file) => { try { return statSync(file).size > 0; } catch { return false; } };
const ankiRunning = () => {
  try { run("pgrep", ["-x", "Anki"]); return true; } catch { return false; }
};

// --- Chrome DevTools Protocol -----------------------------------------------

async function pages() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json`);
  return res.json();
}

async function evaluate(title, expression) {
  const page = (await pages()).find((p) => p.title === title);
  if (!page) throw new Error(`no webview titled "${title}"`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const reply = new Promise((resolve) => {
    ws.onmessage = (e) => resolve(JSON.parse(e.data));
  });
  ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, returnByValue: true, awaitPromise: true } }));
  const msg = await reply;
  ws.close();
  if (msg.result?.exceptionDetails) throw new Error(msg.result.exceptionDetails.text);
  return msg.result?.result?.value;
}

const main = (js) => evaluate("main webview", js);
const toolbar = (js) => evaluate("top toolbar", js);
const bottom = (js) => evaluate("bottom toolbar", js);

async function waitFor(expression, what, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { if (await main(expression)) return true; } catch { /* page swapping */ }
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${what}`);
}

async function setDark(dark) {
  const js = `(() => {
    document.documentElement.classList.toggle("night-mode", ${dark});
    for (const c of ["nightMode", "night_mode"]) document.body.classList.toggle(c, ${dark});
    return true;
  })()`;
  for (const t of ["top toolbar", "main webview", "bottom toolbar"]) await evaluate(t, js).catch(() => {});
  await sleep(350);
}

// --- Anki lifecycle -----------------------------------------------------------

async function quitAnki() {
  if (!ankiRunning()) return;
  try { osa('quit app "Anki"'); } catch { /* AppleScript reports a cancel even on success */ }
  for (let i = 0; i < 60 && ankiRunning(); i++) await sleep(500);
  if (ankiRunning()) throw new Error("Anki did not quit (is a dialog open?)");
}

async function launchWithDebugging() {
  // -g: launch in the background so Anki never takes focus. Chromium stops
  // painting covered windows, so the flags keep frames fresh for capture.
  const flags = "--disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling";
  run("open", [
    "-g", "-a", ANKI,
    "--env", `QTWEBENGINE_REMOTE_DEBUGGING=${PORT}`,
    "--env", "MX_DEV=1",
    "--env", `QTWEBENGINE_CHROMIUM_FLAGS=${flags}`,
  ]);
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    try {
      const titles = (await pages()).map((p) => p.title);
      if (["main webview", "top toolbar", "bottom toolbar"].every((t) => titles.includes(t))) break;
    } catch { /* not listening yet */ }
    await sleep(500);
  }
  await waitFor("!!document.querySelector('tr.deck') || !!document.querySelector('.callout')", "the deck list", 30000);
  await sleep(800);
}

function sizeWindow() {
  try {
    osa(`tell application "System Events" to tell process "Anki" to set size of (first window whose name ends with "Anki") to {${winW}, ${winH}}`);
    return true;
  } catch {
    console.warn(`! could not resize the window (Accessibility permission?); keeping its current size`);
    return false;
  }
}

// --- Capture ------------------------------------------------------------------

let windowId = null;
const written = [];
const scratch = mkdtempSync(join(tmpdir(), "anki-shots-"));

async function capture(name) {
  windowId ??= run("swift", [join(ROOT, "scripts/lib/window-id.swift")]);
  await sleep(250);
  // screencapture and sips report some failures only on stderr, so check files.
  const raw = join(scratch, `${name}.png`);
  try { run("screencapture", ["-x", "-l", windowId, raw], { stdio: ["ignore", "pipe", "pipe"] }); } catch { /* checked below */ }
  if (!nonEmpty(raw)) {
    throw new Error("screencapture produced no image: grant Screen Recording to this terminal in System Settings → Privacy & Security");
  }
  const file = join(OUT, `${name}.png`);
  rmSync(file, { force: true });
  run("sips", ["-Z", String(WIDTH_PX), raw, "--out", file], { stdio: ["ignore", "pipe", "pipe"] });
  if (!nonEmpty(file)) throw new Error(`could not write ${file}`);
  written.push(file);
  console.log(`  ✓ ${name}.png`);
}

async function pageScreenshot(title, file) {
  const page = (await pages()).find((p) => p.title === title);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const reply = new Promise((resolve) => { ws.onmessage = (e) => resolve(JSON.parse(e.data)); });
  ws.send(JSON.stringify({ id: 1, method: "Page.captureScreenshot", params: { format: "png" } }));
  const msg = await reply;
  ws.close();
  const raw = join(scratch, "page.png");
  writeFileSync(raw, Buffer.from(msg.result.data, "base64"));
  rmSync(file, { force: true });
  run("sips", ["-Z", String(WIDTH_PX), raw, "--out", file], { stdio: ["ignore", "pipe", "pipe"] });
  if (!nonEmpty(file)) throw new Error(`could not write ${file}`);
}

async function deckOptions(deckId) {
  const title = "deck options";
  await main(`pycmd(${JSON.stringify(`mx:preview:deck-options/${deckId}`)}), true`);
  const end = Date.now() + 20000;
  for (;;) {
    try {
      if (await evaluate(title, "!!document.querySelector('.deck-options-page h1') && !!document.getElementById('mx-css')")) break;
    } catch { /* not created yet */ }
    if (Date.now() > end) throw new Error("timed out waiting for the deck options preview");
    await sleep(250);
  }
  for (const dark of [false, true]) {
    await evaluate(title, `(() => { document.documentElement.classList.toggle("night-mode", ${dark}); document.body.classList.toggle("nightMode", ${dark}); scrollTo(0, 0); return true; })()`);
    await sleep(400);
    const name = `deck-options-${dark ? "dark" : "light"}`;
    await pageScreenshot(title, join(OUT, `${name}.png`));
    written.push(join(OUT, `${name}.png`));
    console.log(`  ✓ ${name}.png`);
  }
}

async function both(name, { light = true, dark = true } = {}) {
  if (light) { await setDark(false); await capture(`${name}-light`); }
  if (dark) { await setDark(true); await capture(`${name}-dark`); }
  await setDark(false);
}

// --- Main -----------------------------------------------------------------------

async function confirm() {
  if (flag("--yes") || !ankiRunning()) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("This quits and relaunches Anki. Continue? [y/N] ");
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) process.exit(0);
}

async function shoot() {
  mkdirSync(OUT, { recursive: true });
  await confirm();

  console.log("Relaunching Anki in the background with debugging…");
  await quitAnki();
  await launchWithDebugging();
  sizeWindow();
  await sleep(800);

  console.log("Deck list");
  await toolbar("pycmd('decks'), true");
  await waitFor("!!document.querySelector('tr.deck')", "the deck list");
  await both("decks");

  const deckId = await main(`(() => {
    const rows = [...document.querySelectorAll("tr.deck")];
    const want = ${JSON.stringify(deckName)};
    const row = want ? rows.find((r) => r.querySelector("a.deck")?.textContent.trim() === want) : rows[0];
    return row ? row.id : null;
  })()`);
  if (!deckId) throw new Error(deckName ? `no deck named "${deckName}"` : "the collection has no decks");

  console.log("Deck options (hidden preview)");
  await deckOptions(deckId);

  console.log("Overview");
  await main(`pycmd(${JSON.stringify(`open:${deckId}`)}), true`);
  await waitFor("!!document.getElementById('study')", "the overview");
  await both("overview");

  console.log("Reviewer");
  await main("pycmd('study'), true");
  try {
    await waitFor("!!document.getElementById('qa')", "the first card", 8000);
  } catch {
    console.warn("! nothing to study in this deck; skipping reviewer screenshots (use --deck)");
    return;
  }
  await sleep(500);
  await both("question");
  await bottom("pycmd('ans'), true");
  await sleep(900);
  await both("answer");
}

let failed = false;
try {
  await shoot();
} catch (err) {
  failed = true;
  console.error(`✗ ${err.message}`);
} finally {
  try { await toolbar("pycmd('decks'), true"); } catch { /* Anki may be gone */ }
  if (!flag("--keep-debug") && ankiRunning()) {
    console.log("Relaunching Anki normally…");
    await quitAnki().catch(() => {});
    run("open", ["-g", "-a", ANKI]);
  }
}

rmSync(scratch, { recursive: true, force: true });
if (written.length) {
  console.log(`\nWrote ${written.length} screenshot(s) to docs/screenshots/. Review with: git diff --stat docs/`);
}
process.exit(failed ? 1 : 0);
