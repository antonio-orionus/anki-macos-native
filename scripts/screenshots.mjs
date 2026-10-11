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

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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
    "--env", "MX_QUIET=1",
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

// --- Focus ------------------------------------------------------------------------
// Qt activates an app as it finishes launching, even under `open -g`, so any
// relaunch grabs focus for an instant. The watcher hands it straight back and
// logs every activation, so the run can report honestly what happened.

let watcher = null;
const focusLog = [];

async function startFocusWatcher() {
  watcher = spawn("swift", [join(ROOT, "scripts/lib/keep-focus.swift"), "net.ankiweb.anki"], { stdio: ["ignore", "pipe", "ignore"] });
  let ready;
  const isReady = new Promise((r) => { ready = r; });
  watcher.stdout.setEncoding("utf8");
  watcher.stdout.on("data", (chunk) => {
    for (const line of chunk.split("\n").filter(Boolean)) {
      focusLog.push(line);
      if (line.includes(" ready ")) ready(line.split(" ready ")[1]);
    }
  });
  const holder = await Promise.race([isReady, sleep(20000).then(() => null)]);
  if (holder === null) throw new Error("focus watcher did not start (is swift installed?)");
  return holder;
}

function stopFocusWatcher() {
  watcher?.kill();
  watcher = null;
}

// Guard focus only while Anki launches, plus a short settling window, so the
// watcher never fights the user switching to Anki on purpose later.
const GUARD_MS = 6000;
let guarded = false;
async function guardFocus(launch) {
  const holder = await startFocusWatcher();
  guarded = true;
  if (holder === "net.ankiweb.anki") console.warn("! Anki is the app you're in; the relaunch will interrupt you");
  try {
    await launch();
    await sleep(2000);
  } finally {
    stopFocusWatcher();
  }
}

function focusReport() {
  const grabs = focusLog.filter((l) => l.endsWith("activated net.ankiweb.anki")).length;
  const returns = focusLog.filter((l) => l.includes(" returned ")).length;
  return { grabs, returns };
}

async function debuggableAnkiRunning() {
  try {
    const titles = (await pages()).map((p) => p.title);
    return ["main webview", "top toolbar", "bottom toolbar"].every((t) => titles.includes(t));
  } catch {
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

// An offscreen render paints a square window background behind the menu; the
// real popup is translucent. Cut the corners to the menu's 12pt radius (2x).
function roundCorners(src, dest, r = 24) {
  const inside = `lte(pow(max(max(${r}-X\\,X-(W-1-${r}))\\,0)\\,2)+pow(max(max(${r}-Y\\,Y-(H-1-${r}))\\,0)\\,2)\\,${r * r})`;
  try {
    run("ffmpeg", ["-loglevel", "error", "-y", "-i", src, "-vf",
      `format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(${inside},alpha(X,Y),0)'`, dest]);
  } catch {
    run("cp", [src, dest]); // no ffmpeg: keep the square render
  }
}

async function menus() {
  const base = join(scratch, "menu");
  await main(`pycmd(${JSON.stringify(`mx:menushot:${base}`)}), true`);
  for (const theme of ["light", "dark"]) {
    const raw = `${base}-${theme}.png`;
    const end = Date.now() + 5000;
    while (!nonEmpty(raw)) {
      if (Date.now() > end) throw new Error("no menu image was rendered");
      await sleep(150);
    }
    await sleep(150);
    if (theme === "light") {
      const check = JSON.parse(readFileSync(`${base}-check.json`, "utf8"));
      if (!check.stylesheet_attached || !check.translucent) {
        throw new Error(`menus are not being styled: ${JSON.stringify(check)}`);
      }
    }
    const file = join(OUT, `menu-${theme}.png`);
    rmSync(file, { force: true });
    roundCorners(raw, file);
    written.push(file);
    console.log(`  ✓ menu-${theme}.png`);
  }
}

// MX_DEV: evaluate a Python expression inside Anki (see addon/dev.py).
async function pyeval(expression) {
  const out = join(scratch, `eval-${Date.now()}.txt`);
  await main(`pycmd(${JSON.stringify(`mx:pyeval:${out}|${expression}`)}), true`);
  for (let i = 0; i < 50 && !nonEmpty(out); i++) await sleep(100);
  return nonEmpty(out) ? readFileSync(out, "utf8") : null;
}

async function editorPages(dark) {
  for (const page of (await pages()).filter((p) => p.title === "editor")) {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    const done = new Promise((r) => (ws.onmessage = r));
    ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression:
      `document.documentElement.classList.toggle("night-mode", ${dark}); document.body.classList.toggle("nightMode", ${dark}); 1` } }));
    await done;
    ws.close();
  }
}

async function grabWindow(name, file) {
  const raw = join(scratch, `${name}.png`);
  rmSync(raw, { force: true });
  await main(`pycmd(${JSON.stringify(`mx:grab:${name}:${raw}`)}), true`);
  for (let i = 0; i < 50 && !nonEmpty(raw); i++) await sleep(100);
  if (!nonEmpty(raw)) throw new Error(`could not capture the ${name} window`);
  rmSync(file, { force: true });
  run("sips", ["-Z", String(WIDTH_PX), raw, "--out", file], { stdio: ["ignore", "pipe", "pipe"] });
  written.push(file);
  console.log(`  ✓ ${file.split("/").pop()}`);
}

// Browse and Add open off-screen (addon/dev.py), are captured, and closed;
// dev.py restores the window geometry Anki saves on close.
async function qtWindows() {
  await main("pycmd('mx:open:browser'), pycmd('mx:open:add'), true");
  for (let i = 0; i < 60 && (await pages()).filter((p) => p.title === "editor").length < 2; i++) await sleep(150);
  await sleep(1500);
  try {
    await editorPages(false);
    await grabWindow("browser", join(OUT, "browse-light.png"));
    await grabWindow("add", join(OUT, "add-light.png"));
    // Dark for Add only: simulated dark keeps Browse's light-theme icons.
    await pyeval('(lambda q, qt: windows["add"].setStyleSheet(q.render("add", True, "#0a60ff", "#ffffff")))(__import__("anki_macos_native.qtstyle", fromlist=["x"]), None)');
    await editorPages(true);
    await sleep(500);
    await grabWindow("add", join(OUT, "add-dark.png"));
  } finally {
    await main("pycmd('mx:close:browser'), pycmd('mx:close:add'), true");
    await sleep(2500); // dev.py restores saved geometry again after 2 s

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

  // --launch-only exists to load new add-on code, so it always relaunches.
  if (!flag("--launch-only") && !flag("--fresh") && (await debuggableAnkiRunning())) {
    reused = true;
    console.log("Using the Anki already running with debugging (no relaunch).");
  } else {
    console.log("Relaunching Anki in the background with debugging…");
    await quitAnki();
    await guardFocus(() => launchWithDebugging());
  }
  sizeWindow();
  await sleep(800);
  if (flag("--launch-only")) {
    console.log("Anki is running with debugging (MX_DEV) — stopping here (--launch-only).");
    return;
  }

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
  try {
    await deckOptions(deckId);
  } catch (err) {
    console.warn(`! skipped deck options: ${err.message} (the running Anki needs MX_DEV=1)`);
  }

  console.log("Menus (rendered offscreen)");
  try {
    await menus();
  } catch (err) {
    console.warn(`! skipped menus: ${err.message} (the running Anki needs MX_DEV=1)`);
  }

  console.log("Browse and Add (off-screen)");
  try {
    await qtWindows();
  } catch (err) {
    console.warn(`! skipped Browse/Add: ${err.message} (the running Anki needs MX_DEV=1)`);
  }

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
let reused = false;
try {
  await shoot();
} catch (err) {
  failed = true;
  console.error(`✗ ${err.message}`);
} finally {
  try { await toolbar("pycmd('decks'), true"); } catch { /* Anki may be gone */ }
  if ((!reused || flag("--restore")) && !flag("--keep-debug") && !flag("--launch-only") && ankiRunning()) {
    console.log("Relaunching Anki normally…");
    await quitAnki().catch(() => {});
    await guardFocus(async () => {
      run("open", ["-g", "-a", ANKI, "--env", "MX_QUIET=1"]);
      await sleep(GUARD_MS); // Anki activates while it finishes launching
    });
  }
}

if (guarded) {
  const { grabs, returns } = focusReport();
  console.log(grabs
    ? `Focus: Anki took focus ${grabs} time(s) while launching; it was handed back ${returns} time(s).`
    : "Focus: Anki never took focus while launching.");
}

rmSync(scratch, { recursive: true, force: true });
if (written.length) {
  console.log(`\nWrote ${written.length} screenshot(s) to docs/screenshots/. Review with: git diff --stat docs/`);
}
process.exit(failed ? 1 : 0);
