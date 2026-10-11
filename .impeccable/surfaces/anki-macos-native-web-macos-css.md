---
version: 1
slug: "anki-macos-native-web-macos-css"
primary_target: "addon/web/macos.css"
related_targets: []
---

# Surface: Anki main window (toolbar, deck list, overview, reviewer, bottom bars)

Mode: Operate. Audience: Mac Anki users in daily review sessions, keyboard-first (Space, 1–4). Job: see what is due, start studying, grade cards fast. Constraints: every Anki behaviour, shortcut and third-party toolbar link keeps working; follows Anki light/dark and the macOS accent colour; respects Anki's reduce-motion. Build path: code-led (no image generation).

## Direction contract

THESIS: Anki's main window becomes a macOS 27 "Golden Gate" app: a unified toolbar of Liquid Glass capsules, inset grouped lists like System Settings, and one prominent next action per screen. It refuses Anki's default of a web page with a floating table and grey HTML buttons.

OWN-WORLD: SF Pro (system-ui) with large-title 26/700 headings and tabular figures; window ground #F5F5F7 / #1E1E1F, grouped panels white / #2A2A2C with 0.5px hairline separators; system label opacities; macOS accent pulled live from Qt; state colours system blue (new), red (learn), green (review); one shared 12px/capsule corner language; Liquid Glass = translucent fill + specular top edge + soft offset shadow, used only on controls.

STORY: Open Anki → the deck list reads like a Mail mailbox list with due-count badges → pick a deck → overview shows a big title, a three-row grouped summary and one accent "Study Now" capsule → review with a calm card and a floating glass answer bar.

FIRST VIEWPORT: Toolbar strip (≈52px) merged with the title bar: traffic-light gutter left, centred glass capsule group [Decks · Add · Browse · Stats] + separate [Sync] capsule. Content: large title "Decks" + summary line top-left of a 720px column; inset grouped deck list below; studied-today footnote; bottom bar holds a centred glass capsule [Get Shared · Create Deck · Import] — centred so every screen's bottom control shares one axis with the reviewer's answer capsule.

FORM: Pinned by the user ("native macOS 27"); concept-seed roll aadcf851 overridden by the pinned brief. Raises kept from declined challengers: tabular, column-aligned numerals (data-field discipline); one prominent next action per screen (wayfinding: only the next decision is loud). Signature move: the reviewer answer bar — a floating glass capsule that morphs from "Show Answer" into a four-segment Again/Hard/Good/Easy capsule with intervals and keycaps.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
