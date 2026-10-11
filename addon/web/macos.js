/* macOS Native — DOM enhancements for Anki's main-window webviews.
   Anki's own nodes are moved or decorated, never recreated, so their
   handlers, ids and drag-and-drop bindings keep working. Every step is
   idempotent because Anki re-renders parts of these pages at will. */
(() => {
  "use strict";
  if (window.mxLoaded) return;
  window.mxLoaded = true;

  const boot = window.mxBoot || {};
  const screen = boot.screen || document.documentElement.dataset.mx;
  const reduceMotion = () =>
    document.body.classList.contains("reduce-motion") ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Lucide icons (ISC licence), 24px grid, stroked. */
  const ICONS = {
    decks: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    add: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    browse: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    stats: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    sync: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    more: '<circle cx="12" cy="12" r="1.25"/><circle cx="19" cy="12" r="1.25"/><circle cx="5" cy="12" r="1.25"/>',
    edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    shared: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    create: '<path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    import: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    opts: '<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>',
    studymore: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    description: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  };

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "mx-icon");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ICONS[name] || "";
    return svg;
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function withIcon(node, name) {
    if (node && ICONS[name] && !node.querySelector(":scope > .mx-icon")) node.prepend(icon(name));
  }

  /* Button kind from its pycmd, e.g. onclick="pycmd('create')". */
  function commandOf(button) {
    const m = (button.getAttribute("onclick") || "").match(/pycmd\(\s*['"]([a-z]+)/i);
    return m ? m[1] : "";
  }

  /* ------------------------------------------------------------- toolbar */

  function toolbar() {
    const bar = document.querySelector(".toolbar");
    if (!bar) return;
    ["decks", "add", "browse", "stats", "sync"].forEach((id) => withIcon(document.getElementById(id), id));

    if (!bar.querySelector(".mx-group")) {
      const main = el("div", "mx-group");
      const anchor = document.getElementById("decks");
      if (anchor) anchor.before(main);
      ["decks", "add", "browse", "stats"].forEach((id) => {
        const a = document.getElementById(id);
        if (a) main.append(a);
      });
      const sync = document.getElementById("sync");
      if (sync) {
        const group = el("div", "mx-group");
        main.after(group);
        group.append(sync);
      }
    }
    setState(boot.state);
    reportRects();
  }

  function setState(state) {
    const decks = document.getElementById("decks");
    if (decks) decks.classList.toggle("mx-current", state === "deckBrowser");
  }
  window.mxSetState = setState;

  /* Clickable areas, so the rest of the toolbar can drag the window. */
  let rectsQueued = false;
  function reportRects() {
    if (rectsQueued) return;
    if (typeof pycmd !== "function") {
      // Anki injects pycmd once the page is ready, sometimes after we start.
      setTimeout(reportRects, 50);
      return;
    }
    rectsQueued = true;
    requestAnimationFrame(() => {
      rectsQueued = false;
      const nodes = document.querySelectorAll(
        ".mx-group, .toolbar > *, .left-tray > *, .right-tray > *, a, button"
      );
      const rects = [...nodes]
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.width && r.height)
        .map((r) => [r.left, r.top, r.width, r.height].map((v) => Math.round(v)));
      pycmd("mx:rects:" + JSON.stringify(rects));
    });
  }

  /* -------------------------------------------------------- deck browser */

  function deckBrowser() {
    const center = document.querySelector("body > center");
    const table = center && center.querySelector("table");
    if (!table) return;

    if (!center.querySelector(".mx-head")) {
      const head = el("div", "mx-head");
      const titles = el("div");
      titles.append(el("h1", "mx-title", boot.decksTitle || "Decks"), el("p", "mx-subtitle"));
      head.append(titles);
      center.prepend(head);
      if (!reduceMotion()) center.classList.add("mx-enter");
    }

    const rows = [...table.querySelectorAll("tr.deck")];
    rows.forEach((row, i) => {
      row.classList.toggle("mx-first", i === 0);
      row.classList.toggle("mx-last", i === rows.length - 1);

      const collapse = row.querySelector(".collapse");
      if (collapse && collapse.tagName === "A") {
        withIcon(collapse, "chevron");
        collapse.classList.toggle("mx-open", ["-", "\u2212"].includes(collapse.textContent.trim()));
      }
      const opts = row.querySelector("td.opts a");
      if (opts) {
        withIcon(opts, "more");
        opts.setAttribute("aria-label", "Deck options");
      }
    });

    // Parent rows already include their children, so sum top-level decks only.
    let total = 0;
    rows.forEach((row) => {
      const name = row.querySelector(".decktd");
      const link = name && name.querySelector("a.deck");
      const lead = link ? name.textContent.slice(0, name.textContent.indexOf(link.textContent)) : "";
      if (lead.includes(" ")) return; // indented: a subdeck
      row.querySelectorAll(".new-count, .learn-count, .review-count").forEach((c) => {
        total += parseInt(c.textContent, 10) || 0;
      });
    });
    const subtitle = center.querySelector(".mx-subtitle");
    if (subtitle) {
      subtitle.textContent = rows.length === 0
        ? "Create a deck or import one to get started."
        : total === 0
          ? "All caught up for today."
          : `${total.toLocaleString()} ${total === 1 ? "card" : "cards"} to study today`;
    }
  }

  /* The whole row opens the deck, as in a native list: Anki only listens on
     the name link, which is a small target inside a 40px row. Clicks on the
     chevron, the options button and shift-clicks keep their own meaning, and
     jQuery UI stops the click itself after a drag, so reordering still works. */
  function openDeckOnRowClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.shiftKey || e.metaKey || e.ctrlKey) return;
    const row = e.target.closest && e.target.closest("tr.deck");
    if (!row || e.target.closest("a, button, .collapse, td.opts")) return;
    const link = row.querySelector("a.deck");
    if (link) link.click();
  }

  /* ------------------------------------------------------------ overview */

  const STATES = [
    ["new-count", "mx-new"],
    ["learn-count", "mx-learn"],
    ["review-count", "mx-review"],
  ];

  function overview() {
    const center = document.querySelector("body > center");
    const study = document.getElementById("study");
    if (!center || !study || center.querySelector(".mx-overview")) return;
    const heading = center.querySelector("h3");

    const wrap = el("div", "mx-overview");
    if (!reduceMotion()) wrap.classList.add("mx-enter");
    wrap.append(el("h1", "mx-title", heading ? heading.textContent : ""));

    const desc = el("div", "mx-desc");
    center.querySelectorAll(".descfont, .description, #shortdesc, #fulldesc").forEach((d) => {
      if (!d.closest(".mx-desc") && d.textContent.trim()) desc.append(d);
    });
    wrap.append(desc);

    const list = el("ul", "mx-list");
    STATES.forEach(([countClass, rowClass]) => {
      const count = center.querySelector("." + countClass);
      const tr = count && count.closest("tr");
      if (!tr) return;
      const value = count.closest("b") || count;
      const row = el("li", "mx-row " + rowClass);
      if ((parseInt(count.textContent, 10) || 0) === 0) row.classList.add("mx-zero");
      const label = (tr.cells[0] ? tr.cells[0].textContent : "").trim().replace(/[:：]\s*$/, "");
      const val = el("span", "mx-value");
      val.append(value);
      row.append(el("span", "mx-dot"), el("span", "mx-label", label), val);
      list.append(row);
    });
    if (list.children.length) wrap.append(list);

    const action = el("div", "mx-action");
    study.classList.add("mx-btn", "mx-prominent");
    action.append(study);
    wrap.append(action);

    [...center.children].forEach((child) => child.remove());
    center.append(wrap);
    study.focus({ preventScroll: true });
  }

  /* ------------------------------------------------- bottom button bars */

  function buttonBar() {
    const cell = document.querySelector("#header td");
    if (!cell || cell.querySelector(".mx-group")) return;
    const buttons = [...cell.querySelectorAll("button")];
    if (!buttons.length) return;
    const group = el("div", "mx-group");
    buttons.forEach((b) => {
      b.classList.add("mx-btn");
      withIcon(b, commandOf(b));
      group.append(b);
    });
    cell.textContent = "";
    cell.append(group);
  }

  /* ---------------------------------------------------- reviewer answers */

  function sideButtons() {
    document.querySelectorAll("td.stat button").forEach((b) => {
      const cmd = commandOf(b);
      if (b.classList.contains("mx-round")) return;
      b.classList.add("mx-btn", "mx-round");
      withIcon(b, cmd === "edit" ? "edit" : "more");
      const label = (b.firstChild && b.firstChild.nodeType === 3 ? b.firstChild.textContent : b.textContent)
        .replace(/[▾\s]+$/, "").trim();
      if (label) b.setAttribute("aria-label", label);
    });
  }

  function capsule() {
    return document.querySelector("#middle .mx-capsule");
  }

  function middle() {
    const host = document.getElementById("middle");
    const table = host && host.querySelector("table");
    if (!table) return;
    table.classList.add("mx-capsule");
    const ans = document.getElementById("ansbut");
    if (ans && !ans.querySelector(".mx-key")) {
      ans.append(el("span", "mx-key", "Space"));
    }
  }

  /* The signature move: the glass capsule morphs between its two states. */
  function morph(fromWidth) {
    const cap = capsule();
    if (!cap || !fromWidth || reduceMotion()) return;
    const toWidth = cap.getBoundingClientRect().width;
    if (Math.abs(toWidth - fromWidth) < 2) return;
    const ease = "cubic-bezier(0.2, 0.9, 0.25, 1)";
    cap.animate([{ width: fromWidth + "px" }, { width: toWidth + "px" }], { duration: 340, easing: ease });
    cap.querySelectorAll("td").forEach((td, i) => {
      td.animate(
        [{ opacity: 0, filter: "blur(4px)", transform: "scale(0.94)" }, { opacity: 1, filter: "none", transform: "none" }],
        { duration: 260, delay: 60 + i * 24, easing: ease, fill: "backwards" }
      );
    });
  }

  function reviewerBottom() {
    sideButtons();
    middle();
    if (typeof window.showAnswer === "function" && !window.showAnswer.mxWrapped) {
      const original = window.showAnswer;
      const wrapped = function (...args) {
        const cap = capsule();
        const before = cap ? cap.getBoundingClientRect().width : 0;
        const result = original.apply(this, args);
        middle();
        morph(before);
        return result;
      };
      wrapped.mxWrapped = true;
      window.showAnswer = wrapped;
    }
  }

  /* --------------------------------------------------------------- boot */

  const RUN = {
    toolbar,
    deckbrowser: deckBrowser,
    overview,
    "deckbrowser-bottom": buttonBar,
    "overview-bottom": buttonBar,
    bottom: buttonBar,
    "reviewer-bottom": reviewerBottom,
  };

  function run() {
    const fn = RUN[screen];
    if (!fn) return;
    try {
      fn();
    } catch (err) {
      console.error("macOS Native:", err);
    }
  }


  function start() {
    run();
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        run();
      });
    }).observe(document.body, { childList: true, subtree: true });
    if (screen === "toolbar") addEventListener("resize", reportRects);
    if (screen === "deckbrowser") document.addEventListener("click", openDeckOnRowClick);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
