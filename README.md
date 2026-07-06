# Theme Switch — Unraid light/dark toggle

A small Unraid plugin that adds a **one-click light/dark switch** to the webGUI header and can
**follow your operating system's colour scheme** automatically. Simpler than Dynamix Day/Night —
no schedules, just a button and your OS.

- **Header toggle** — a sun/moon button in the Unraid top toolbar (not a dashboard widget),
  available on every page.
- **Three modes**, cycled by clicking the button: **Auto → Light → Dark**.
  - **Auto** follows your browser/OS `prefers-color-scheme` and flips live when the OS does.
  - **Light** / **Dark** are manual overrides that stick until you cycle back to Auto.
- **Instant & per-client** — the switch happens in your browser with no page reload and
  **no server settings changed**, so each client (and each OS) gets the right look without
  fighting over Unraid's single shared theme setting.

## How it works

Unraid renders the active theme as one stylesheet `<link>` (`white`/`azure`/`black`/`gray`).
Theme Switch repoints that `<link>` and swaps the `<html>` `Theme--*` class in the browser,
deriving the light/dark pair from whichever theme the server is set to:

| Server theme | Light | Dark |
|--------------|-------|------|
| `white` / `black` (top-nav) | white | black |
| `azure` / `gray` (sidebar)  | azure | gray |

It stays within a layout family, so toggling only changes colours — never the page layout. Your
chosen mode is stored in `localStorage` (per browser) and synced across open tabs. In dark mode
it also forces the header bar dark and keeps command-execution output (e.g. `docker run`)
readable, which Unraid's stock dark themes don't fully cover.

## Install

Unraid → **Plugins → Install Plugin** → paste:

```
https://raw.githubusercontent.com/JanitorHead/unraid-themeswitch/master/themeswitch.plg
```

Then hard-refresh the browser (Ctrl+Shift+R) once so the global script loads.

## Compatibility

- **Unraid 7.x** — fully supported (verified against the variable-based theme system).
- **Older Unraid** — installs without error; if the theme layout isn't recognised the button
  simply does nothing, so it can't break the page.

## Known limitation

In dark mode, a few **Unraid Connect** header elements — the server name, the notification bell
and the account dropdown/hamburger — stay dark. Those are rendered inside a closed shadow-DOM
web component that no external CSS or JavaScript can recolour. Everything else (the header
background, menus, dialogs and command output) is themed correctly.

## Building

`themeswitch.plg` is **generated** from `source/` — never hand-edit it. After changing anything
under `source/themeswitch/…`, regenerate (version defaults to today's date):

```bash
build/make-standalone-plg.sh
```

The plugin ships as a self-contained inline `.plg` (no separate `.txz` to host): the web files
are embedded directly and written to `/usr/local/emhttp/plugins/themeswitch/` on install.

## License

[MIT](LICENSE) © JanitorHead.
