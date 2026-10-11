# Roadmap

What still has Anki's own look, in the order you're likely to run into it. Every item already gets the add-on's shared field style and popup menus; the rest of the window is unstyled.

## Next

1. **Congratulations screen.** The main-window screen you see after finishing a deck (SvelteKit `congrats`).
2. **Card Layout.** The template editor and preview opened by "Cards…" (`clayout`).
3. **Card Info.** Browse → Info (SvelteKit `card-info`).
4. **Card Previewer.** Browse → Preview (`browser/previewer`).

## Later

5. **Manage Note Types** and the **Fields** dialog.
6. **Add-ons** manager.
7. **Import** (file, CSV, `.apkg`) and **Export**.
8. **Custom Study** and **Filtered Deck**.
9. **Change Note Type** and the **Image Occlusion** editor.
10. **Smaller dialogs:**
    - Find and Replace, Find Duplicates, Reposition, Set Due Date
    - Deck Description
    - Empty Cards, Check Media, Check Database
    - Sync login, Profiles, About, Debug Console

## Compatibility

- **New SvelteKit editor.** Style the `editor/?mode=…` page and map `NewAddCards` / `NewEditCurrent` to the Add / Edit window styling. Anki 26.9 uses the legacy editor by default, so this only matters once the new editor is switched on.

## Staying native on purpose

- Choose Deck / Choose Note Type.
- File pickers and alert boxes.
- The macOS menu bar.

These already look right on a Mac.

---

Implementation notes for each kind of surface (SvelteKit page or Qt dialog) are in [AGENTS.md](AGENTS.md#coverage).
