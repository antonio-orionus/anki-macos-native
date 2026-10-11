---
name: Anki macOS Native
description: Anki's main window restyled as a native macOS 27 app; Liquid Glass controls, inset grouped lists, one prominent next action.
colors:
  accent: "#0a60ff"
  on-accent: "#ffffff"
  state-new: "#0040dd"
  state-learn: "#d70015"
  state-review: "#1a7230"
  grade-hard: "#c93400"
  mark-star: "#e6a700"
  window-ground: "#f5f5f7"
  toolbar-bar: "#ececee"
  group-surface: "#ffffff"
  label: "rgb(0 0 0 / 0.88)"
  label-secondary: "rgb(0 0 0 / 0.56)"
  label-tertiary: "rgb(0 0 0 / 0.30)"
  separator: "rgb(0 0 0 / 0.09)"
  fill: "rgb(120 120 128 / 0.10)"
  fill-strong: "rgb(120 120 128 / 0.18)"
  glass: "rgb(255 255 255 / 0.74)"
  glass-hover: "rgb(255 255 255 / 0.95)"
  glass-press: "rgb(232 232 236 / 0.95)"
  glass-edge: "rgb(0 0 0 / 0.08)"
  glass-specular: "rgb(255 255 255 / 0.95)"
  state-new-dark: "#409cff"
  state-learn-dark: "#ff6961"
  state-review-dark: "#30db5b"
  grade-hard-dark: "#ffb340"
  window-ground-dark: "#1e1e1f"
  toolbar-bar-dark: "#29292b"
  group-surface-dark: "#2a2a2c"
  label-dark: "rgb(255 255 255 / 0.90)"
  label-secondary-dark: "rgb(235 235 245 / 0.60)"
  label-tertiary-dark: "rgb(235 235 245 / 0.30)"
  separator-dark: "rgb(255 255 255 / 0.09)"
  fill-dark: "rgb(120 120 128 / 0.20)"
  fill-strong-dark: "rgb(120 120 128 / 0.32)"
  glass-dark: "rgb(255 255 255 / 0.08)"
  glass-hover-dark: "rgb(255 255 255 / 0.13)"
  glass-press-dark: "rgb(255 255 255 / 0.05)"
  glass-edge-dark: "rgb(255 255 255 / 0.07)"
  glass-specular-dark: "rgb(255 255 255 / 0.16)"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Helvetica Neue, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.022em"
  card:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, sans-serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.012em"
  prominent:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.015em"
  row:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.012em"
  control:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.38
    letterSpacing: "-0.003em"
  count:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    fontFeature: "tnum"
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"
  column-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  capsule: "999px"
  group: "12px"
  sm: "8px"
  key: "5px"
spacing:
  hairline: "0.5px"
  group-inset: "3px"
  icon-gap: "6px"
  control-gap: "10px"
  row-inset: "14px"
  bar-inset: "16px"
  page-inset: "24px"
  section: "28px"
components:
  button-capsule:
    backgroundColor: "transparent"
    textColor: "{colors.label}"
    typography: "{typography.control}"
    rounded: "{rounded.capsule}"
    padding: "0 12px"
    height: "28px"
  button-capsule-hover:
    backgroundColor: "{colors.fill}"
  button-capsule-active:
    backgroundColor: "{colors.fill-strong}"
  glass-group:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.capsule}"
    padding: "3px"
  button-round:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.label}"
    rounded: "{rounded.capsule}"
    size: "34px"
  button-round-hover:
    backgroundColor: "{colors.glass-hover}"
  button-prominent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.prominent}"
    rounded: "{rounded.capsule}"
    padding: "0 22px"
    height: "40px"
  answer-capsule-show:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.prominent}"
    rounded: "{rounded.capsule}"
    padding: "0 24px"
    height: "52px"
  answer-capsule-grades:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.capsule}"
    padding: "4px"
    height: "52px"
  grade-segment:
    backgroundColor: "transparent"
    rounded: "{rounded.capsule}"
    width: "104px"
    height: "44px"
  grouped-list:
    backgroundColor: "{colors.group-surface}"
    rounded: "{rounded.group}"
  grouped-row:
    backgroundColor: "{colors.group-surface}"
    textColor: "{colors.label}"
    padding: "0 14px"
    height: "42px"
  count-badge-new:
    textColor: "{colors.state-new}"
    typography: "{typography.count}"
    rounded: "{rounded.capsule}"
    padding: "2px 7px"
  keycap:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label-secondary}"
    rounded: "{rounded.key}"
    height: "18px"
  answer-field:
    backgroundColor: "{colors.group-surface}"
    textColor: "{colors.label}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
---

# Design System: Anki macOS Native

## Overview

**Creative North Star: "The Settings-Grade Study Window"**

Anki's main window is dressed as a first-party macOS 27 app that could sit beside Mail, Finder and System Settings. The window ground is a quiet off-white (or near-black), content lives in opaque inset grouped panels with hairline separators, and every control floats above it in Liquid Glass capsules. Nothing is decorative: depth, colour and motion all exist to say what can be pressed and what is due.

The density is Mac-native, not web-native: 13px system text, 28px capsule controls, 40 to 42px rows, a single large title per screen. Numbers are always tabular so due counts, intervals and timers line up in columns. Colour is spent almost entirely on meaning: the user's macOS accent marks the one next action and the current selection, and three state colours (new, learn, review) carry Anki's scheduling vocabulary everywhere it appears.

The system follows Anki's Light/Dark theme exactly (two complete token sets, light by default, dark under Anki's night mode) and follows the macOS accent live. It rejects Anki's stock look: a web page with a floating table and grey HTML buttons.

**Key Characteristics:**
- Unified 52px toolbar merged with the title bar; traffic lights centred on its midline.
- Liquid Glass reserved for controls; content panels are opaque.
- One accent-filled capsule per screen; everything else is quiet glass or transparent.
- Capsule controls, 12px grouped panels, 8px small surfaces; nothing else.
- Tabular numerals wherever a number is shown.
- Every bottom control sits on one centred axis shared with the reviewer's answer capsule.

## Colors

A neutral Apple system palette in two complete modes, with one live accent and three scheduling colours.

### Primary
- **System Accent** (accent): the user's macOS accent, read from Qt and injected over the default system blue at runtime, so it is never hard-coded in components. Fills the one prominent action (Study Now, Show Answer), tints the current deck row at 13%, colours the current toolbar item's icon, filtered-deck names, links, the drag-insertion line, selection (30%) and the focus ring (45%).
- **On Accent** (on-accent): label on accent fills, computed in Python from the live accent's luminance: white or black, whichever contrasts more (white on the default #0a60ff).

### Secondary
- **New Blue** (state-new / state-new-dark): new-card counts, the New row dot and value, the Easy grade, the normal-sync indicator.
- **Learn Red** (state-learn / state-learn-dark): learning counts, the Again grade, the full-sync indicator, the overtime timer.
- **Review Green** (state-review / state-review-dark): review counts, the Good grade and its default-grade tint.
- **Mark Star** (mark-star): the marked-note star badge in the reviewer, in both themes; a glyph colour, never text.
- **Hard Orange** (grade-hard / grade-hard-dark): the Hard grade only.

These are Apple's darker, higher-contrast system variants in light mode and the brighter variants in dark mode. Counts sit on a 12% tint of their own colour as capsule badges.

### Neutral
- **Window Ground** (window-ground / -dark): the page behind everything, including bottom bars and the reviewer card.
- **Toolbar Bar** (toolbar-bar / -dark): the unified title bar strip, one step darker than the ground, closed by a hairline.
- **Group Surface** (group-surface / -dark): opaque grouped lists, callouts, the type-answer field.
- **Label, Secondary, Tertiary** (label, label-secondary, label-tertiary and -dark): system label opacities. Primary text; subtitles, column labels, icons at rest, intervals; zero counts and buried counts.
- **Separator** (separator / -dark): every 0.5px hairline, between rows, between capsule segments, under the toolbar.
- **Fill, Fill Strong** (fill, fill-strong / -dark): hover and pressed backgrounds for transparent controls, keycaps, the current toolbar item.
- **Glass family** (glass, glass-hover, glass-press, glass-edge, glass-specular / -dark): the Liquid Glass material; see Elevation & Depth.

### Named Rules
**The Accent Is Live Rule.** Accent usage always goes through the accent token, never a literal blue; the user's macOS accent must repaint every accent surface without a reload.

**The Scheduling Colour Rule.** Blue, red and green mean new, learn and review (plus orange for Hard) and nothing else; zero counts drop to tertiary label instead of keeping their colour.

**The Two Sets Rule.** Every colour token has a light and a dark value; a new surface that only works in one theme is unfinished.

## Typography

**Display Font:** SF Pro Display via the system stack (-apple-system, Helvetica Neue fallback)
**Body Font:** SF Pro Text via the system stack

**Character:** The platform's own face, used the way Apple uses it: one heavy large title, everything else at control sizes with slight negative tracking.

### Hierarchy
- **Large Title** (700, 26px, 1.15, -0.022em): one per screen, top-left of the content column (Decks, the deck name on Overview).
- **Card** (400, 21px, 1.5): reviewer question and answer text, centred, max 680px, balanced wrapping; bold inside cards is 650.
- **Prominent** (600, 15px): the accent capsule label; also overview count values.
- **Row** (500, 14px): deck names; overview rows use 400 at the same size; grade labels use 600.
- **Control** (500, 13px, 1): toolbar items and capsule buttons.
- **Body** (400, 13px, 1.38): page default, subtitles, deck descriptions (max 65ch).
- **Count** (600, 12px/16px, tabular): count badges and remaining-count line.
- **Caption** (400, 12px, tabular): studied-today footnote, hints under the prominent action.
- **Column Label** (500, 11px): column headings above the grouped list; grade intervals and keycaps also sit at 10 to 11px.

### Named Rules
**The Tabular Figures Rule.** Every number (counts, intervals, timers, keycaps, statistics) is set with tabular figures so columns align.

**The One Large Title Rule.** Only the screen title uses the display weight; nothing else on the screen exceeds 15px except card content.

## Layout

The window is a unified 52px toolbar over a single centred content column. The toolbar keeps an 84px leading gutter for the traffic lights, which are centred at 26px; its glass groups are centred in the strip and the rest of the strip drags the window.

Content columns are narrow and centred: 720px for the deck list, 460px for the overview, 680px for card text, 480px for the type-answer field. Page insets are 24px horizontally (32px in the reviewer) with 28 to 40px top padding; the overview starts 6vh down and the reviewer 7vh (never less than 44px under the unified title bar).

Rhythm runs on a small step set: 3px inside glass groups, 6px between icon and label, 10px between toolbar groups and row items, 14px row insets, 16px bar insets, 18px under a title block, 22 to 28px between sections. Rows are 40px (deck list) or 42px (overview). Column labels sit above the grouped panel, aligned to the deck name (34px inset), not inside it.

Bottom bars put one centred glass group on the window ground. In the reviewer, the answer capsule is centred between two 120px side columns holding round glass buttons. At 640px and below, grade segments narrow from 104px to 80px and Show Answer from 300px to 220px minimum width.

**The Shared Axis Rule.** Every screen's bottom control is horizontally centred so it shares one axis with the reviewer's answer capsule.

## Elevation & Depth

Two materials, strictly separated. Content (grouped lists, callouts, fields) is opaque group surface lifted by a hairline ring plus a 1px soft shadow, the System Settings inset look. Controls are Liquid Glass: a translucent fill with 24px backdrop blur and 1.8 saturation, a 0.5px specular highlight along the top edge, a 0.5px inner edge, and a soft neutral drop shadow. Accent fills replace the glass fill but keep the same specular top and a faint dark bottom edge. Dark mode strengthens shadows rather than lightening surfaces.

### Shadow Vocabulary
- **Glass** (`0 1px 2px rgb(0 0 0 / 0.06), 0 4px 14px rgb(0 0 0 / 0.07)`; dark `0 1px 2px rgb(0 0 0 / 0.30), 0 4px 14px rgb(0 0 0 / 0.28)`): resting toolbar groups, round buttons, mark/flag badges.
- **Glass Lift** (`0 2px 4px rgb(0 0 0 / 0.07), 0 10px 28px rgb(0 0 0 / 0.10)`; dark `0 2px 4px rgb(0 0 0 / 0.35), 0 10px 28px rgb(0 0 0 / 0.40)`): the prominent action and the reviewer answer capsule, the most important floating control.
- **Glass Rim** (`inset 0 0.5px 0 glass-specular, inset 0 0 0 0.5px glass-edge`): stacked before Glass or Glass Lift on every glass control.
- **Accent Rim** (`inset 0 0.5px 0 rgb(255 255 255 / 0.35), inset 0 -0.5px 0 rgb(0 0 0 / 0.12)`): on accent-filled capsules.
- **Group** (`0 0 0 0.5px rgb(0 0 0 / 0.07), 0 1px 2px rgb(0 0 0 / 0.04)`; dark `0 0 0 0.5px rgb(255 255 255 / 0.06), 0 1px 2px rgb(0 0 0 / 0.25)`): grouped panels and callouts.

### Named Rules
**The Glass Is For Controls Rule.** Liquid Glass (translucency, blur, specular top edge) is used only on things you can press; content panels stay opaque.

**The Soft Shadow Rule.** Shadows are soft, neutral and stacked from a tight contact shadow and a wide diffuse one; no coloured glows, no hard offsets.

## Shapes

One corner language. Controls are full capsules (999px): toolbar items, glass groups, the prominent action, count badges, grade segments, the answer capsule; icon-only controls are circles. Content groups use 12px corners. Small surfaces such as card images and the type-answer field use 8px. Keycaps and the disclosure-chevron hit area use 5px (the grade keycap 4px). Borders are never drawn as CSS borders; every edge is a 0.5px hairline drawn with an inset shadow or a pseudo-element, and segment dividers stop 8px (toolbar) or 14px (answer capsule) short of the capsule's edges.

**The Three Radii Rule.** Capsule for controls, 12px for groups, 8px for small surfaces; a new radius needs a reason the build already has.

Icons are Lucide outlines on a 24px grid, drawn at 16px (17px in round buttons, 13px for the chevron) with a 1.9 stroke and round caps, coloured secondary label at rest and label on hover.

## Components

### Buttons
- **Capsule button:** transparent, 28px tall, 12px side padding, icon plus label 6px apart. Hover takes the fill; press takes fill strong and scales to 0.97 over 120ms. Inside a glass group, neighbours are split by a 0.5px hairline that hides beside the hovered button.
- **Current item:** a toolbar button for the current screen keeps fill strong and colours its icon with the accent.
- **Round glass button:** 34px circle of glass with the glass rim and shadow, icon only (label kept in the tooltip and aria-label); hover brightens to glass hover, press to glass press.
- **Stand-alone toolbar links** (other add-ons, Sync): carry their own glass at 34px tall.
- **Focus:** a 3.5px ring of the accent at 45%, no outline, on every focusable element.

### Prominent Action
- One per screen, accent filled, 40px tall, at least 240px wide (full column width on the overview), 600 15px white label, accent rim plus glass lift. Hover mixes 10% white into the accent, press 12% black. A caption hint can sit 10px under it.

### Glass Group
- A capsule of glass with 3px inner padding that holds capsule buttons as one segmented control: toolbar navigation, Sync, every bottom bar.

### Grouped List
- **Corner Style:** 12px.
- **Background:** group surface, opaque.
- **Shadow Strategy:** Group shadow (see Elevation & Depth).
- **Rows:** 40 to 42px, 12 to 14px insets, 0.5px separator between rows, none after the last. Hover mixes 4% label into the surface; the current deck is tinted 13% with the accent. Overview rows lead with an 8px state dot and end with a 600 15px tabular value in the state colour; zero rows fade the dot to 35% and set the value in the secondary label at 500.
- **Disclosure and options:** a rotating chevron (90 degrees, 160ms) replaces Anki's plus/minus; deck options are a 26px round ellipsis, tertiary at rest, secondary on row hover, filled on its own hover.

### Count Badges
- Capsule, min 26px wide, 2px 7px padding, 600 12px tabular text in the state colour on a 12% tint of the same colour. Zero counts drop the badge and render in tertiary label.

### Keycaps
- 18px tall, 5px corners, fill background with a bottom hairline, 600 11px secondary label. On the accent capsule the keycap turns 20% white with 90% white text.

### Answer Field
- Opaque group surface, 8px corners, 8px 12px padding, 17px text, glass edge plus Group shadow; focus shows the accent ring.

### Reviewer Answer Capsule (signature)
- One glass capsule, always 52px tall, centred on the bottom axis. Before the answer it is the accent: a single Show Answer capsule (min 300px) with a Space keycap, and the remaining counts (new, learn, review in their state colours, separated by tertiary middots, current one underlined) float 12px above it. After the answer it becomes glass with 4px padding holding four 44px grade segments, 104px wide: label over interval, a numbered keycap at the trailing edge, coloured red, orange, green, blue. The default grade (Good) carries a 13% green tint and the hairlines beside it hide.
- **Morph:** in both directions (Show Answer to grades and back), the capsule animates its width from the old to the new size over 340ms on the house curve, while each segment fades in from 94% scale and a 4px blur, 260ms, staggered 24ms. Skipped entirely under Anki's reduce-motion setting or the system preference.

### Settings Controls (Deck Options)
- **Toolbar strip:** the toolbar bar colour with a hairline under it. The preset pop-up is a 30px field; **Save** is a 30px accent capsule; its menu is a 30px round glass button.
- **Sections:** grouped panels (12px, group surface, group shadow) titled 700 17px display with a hairline under the title. Settings are split by 0.5px hairlines drawn on each `.row`.
- **Segmented control:** an 8px fill track with 2px padding; segments are 22px, 500 12px, secondary label; the active segment is a raised white (dark: 20% white) 5px pill in the primary label.
- **Fields and pop-ups:** 28px, 8px corners, field surface (white; dark 7% white) with a 0.5px edge ring, 400 13px tabular. Focus takes the accent focus ring.
- **Switch:** 36 by 20px capsule, fill strong when off and accent when on, a white 16px knob drawn as a gradient that slides over 160ms.
- **Slider:** 4px fill-strong track, 18px white knob with a soft shadow.
- **Notices:** 8px corners, no border, the state colour at 10 to 12% behind primary-label text, 12px type.

### Note Editor
- **Toolbar:** a ground strip with a hairline under it. Each button group is a glass capsule (8px corners, 2px padding) of flat 24px buttons with 5px corners, 500 12px. Hover takes the fill, and active or pressed takes fill strong.
- **Fields:** labels are 600 12px in the secondary label. The field box is the field surface with 8px corners and a 0.5px edge ring, and focus takes the accent ring. Only the box is styled; the text inside belongs to the note.
- **Tags:** the same field box, at least 30px tall.

### Browse and Add Windows (Qt)
- **Sidebar:** the sidebar ground (#ececee / #252527), 13px items with 6px rounded hover and selection pills (fill / fill strong).
- **Table:** the group surface, a subtle alternate row, no grid, and an accent selection with on-accent text. The header is 500 12px secondary with hairline separators. Anki's row colours (flags, marked, suspended) are untouched.
- **Fields:** the search box and filters are 8px-corner field surfaces with a 1px edge, plus a 2px accent border on focus.
- **Buttons:** 8px-corner field surfaces with a 1px edge. **Add** is the accent fill with on-accent 600 text.
- **Scroll bars:** thin overlay-style handles (fill strong, 3px corners), since a stylesheet replaces the native ones.

### Menus (Qt popups)
- **Panel:** 12px corners, translucent window so macOS draws a rounded shadow, 1px edge (black 12% / white 12%), 5px padding. Light ground rgba(246,246,248,0.94), dark rgba(42,42,44,0.94).
- **Items:** 13px system type, 4px by 12px padding (24px on the right), 5px corners. The selected item is filled with the accent and set in the on-accent colour. Disabled items use the tertiary label.
- **Separator:** 1px hairline inset 10px.

### Motion
- House curve `cubic-bezier(0.2, 0.9, 0.25, 1)`. Control feedback is 100 to 120ms; the deck list enters with a 320ms rise of 6px from a 3px blur. Motion is gated on Anki's reduce-motion class and on the system reduced-motion preference.

## Do's and Don'ts

### Do:
- **Do** route every accent use through the accent token so the macOS accent repaints it live.
- **Do** keep exactly one accent-filled capsule on a screen; demote everything else to glass or transparent capsules.
- **Do** put glass only on controls, and give every glass control the full recipe: translucent fill, 0.5px specular top, 0.5px edge, soft neutral shadow.
- **Do** keep the answer capsule 52px tall in both states so the morph changes width, never height.
- **Do** use tabular figures for every number.
- **Do** draw edges as 0.5px hairlines in the separator colour.
- **Do** define both light and dark values for any new colour.
- **Do** gate new motion on Anki's reduce-motion class as well as the system preference.

### Don't:
- **Don't** hard-code a blue where the accent belongs.
- **Don't** put glass, blur or translucency on content panels, cards or the window ground.
- **Don't** use the state colours for anything but new, learn, review and the four grades.
- **Don't** introduce radii outside capsule, 12px, 8px and the 5px keycap.
- **Don't** use hard offset or coloured shadows.
- **Don't** add a second filled accent action to a screen.
- **Don't** recreate Anki's DOM nodes; restyle or move them so shortcuts, drag-and-drop and add-on links keep working.
