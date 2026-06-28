# Theme Switch — Design Spec

**Date:** 2026-06-29
**Author:** JanitorHead
**Status:** Approved (brainstorm complete)

## Goal

A simple Unraid webGUI light/dark theme switcher (simpler than Dynamix Day/Night — no
schedules). Two capabilities:

1. **One-click toggle** in the Unraid **header toolbar** (sun/moon icon) to flip the whole
   webGUI between light and dark.
2. **Auto-follow the OS**: track `prefers-color-scheme` and go dark when the OS is dark,
   light when light, reacting live when the OS flips.

## Architecture — A: client-side stylesheet swap (no server writes, no reload)

Decision: **per-client, client-side** override. The Unraid theme
(`dynamix.cfg [display] theme`) is a single *server* setting shared by all clients;
`prefers-color-scheme` is *per-client*. Writing the server setting would make clients with
different OS modes fight over one shared value and force page reloads. Instead we override
the theme **in the browser**, per client, with no server writes.

### Verified by research (against `unraid/webgui` master, Unraid 7.x)

- The active theme is emitted as a **single swappable `<link>`**:
  `<link rel="stylesheet" href="/webGui/styles/themes/{white,azure,black,gray}.css?v=…">`
  (`DefaultPageLayout.php`). Themes are **CSS-custom-property based** (`:root{…}` redefining
  the same variable names), so repointing that `href` re-cascades colours across the page
  instantly.
- **A `<link>` swap alone is not 100%.** A block of jQuery-UI dialog/button colour
  variables in the always-loaded `default-dynamix.css` is gated on the `<html>` class
  `Theme--white` / `Theme--black`. So the swap is **two DOM mutations**: repoint the
  `<link>` *and* swap the `Theme--<name>` colour class on `document.documentElement`.
  Inline banner/font `<style>` values are **not** light/dark-dependent — leave them alone.
- **Themes split into two layout families** that are NOT interchangeable:
  - Top-nav family: `white` (light) ⇄ `black` (dark)
  - Sidebar family: `azure` (light) ⇄ `gray` (dark)
  Mixing across families (e.g. white⇄gray) flips the page layout, not just colours. The
  light/dark pair must stay within one family.

### Global injection — `Menu="Buttons"`

A `.page` file with `Menu="Buttons:<n>"` (verified in `DefaultPageLayout.php` /
`Navigation/Main.php`):
- renders a clickable icon `<a>` into the right side of the header toolbar **on every
  page**, and
- emits its body into `<head>` **on every page** — our global-JS hook.

Contract: the toolbar anchor's `onclick` calls a JS function **named exactly after the
`.page` filename base**. File `ThemeSwitch.page` → `onclick="ThemeSwitch();return false;"`.
So a global `function ThemeSwitch()` must exist. `Icon=` with a bare name resolves to
FontAwesome 4 (`fa-<name>`).

## Components — two files

Path root: `source/themeswitch/usr/local/emhttp/plugins/themeswitch/`

### 1. `ThemeSwitch.page`

```
Menu="Buttons:1"
Title="Theme"
Icon="adjust"
---
<?PHP /* license header */ ?>
<script src="/plugins/themeswitch/themeswitch.js"></script>
```

The external script is loaded **synchronously in `<head>`** (render-blocking) so the theme
applies as early as possible. `themeswitch.js` defines the global `ThemeSwitch()` handler,
so no inline wrapper is needed.

### 2. `themeswitch.js`

State machine + DOM swap. Responsibilities:

- **Detect** current theme: `document.querySelector('link[href*="/styles/themes/"]')`, parse
  `white|azure|black|gray` from the href. If not found (older Unraid / unexpected layout),
  **bail gracefully** — leave page untouched, button becomes a no-op.
- **Derive the family pair** from the detected theme:
  `{white,black} → {light:white, dark:black}`, `{azure,gray} → {light:azure, dark:gray}`.
- **Mode** in `localStorage['themeswitch-mode']`: `auto` (default) | `light` | `dark`.
- **Resolve effective theme:** `auto` → `matchMedia('(prefers-color-scheme: dark)')`;
  `light`/`dark` → that side of the pair.
- **Apply** (two mutations):
  - repoint `<link>` href, replacing only the theme token (preserves the `?v=` cache-bust,
    which self-heals on the next page reload after an Unraid update);
  - on `document.documentElement`, remove any `Theme--{white,azure,black,gray}` class and add
    the new one (leaving `Theme--nav-top` / `Theme--sidebar` / width classes intact).
  - Apply runs **immediately** on script execution (head) — the `<link>` and `<html>` class
    already exist at that point.
- **Button icon** reflects mode: `fa-sun-o` (light), `fa-moon-o` (dark), `fa-adjust` (auto).
  The button lives in `<body>`, which has not rendered when the head script runs, so the
  icon/label/tooltip update is deferred to `DOMContentLoaded` (and re-run on each toggle).
- **Click** `ThemeSwitch()` cycles `auto → light → dark → auto`, persists, re-applies.
- **Live OS reaction:** `matchMedia` `change` listener re-applies, but only while mode is
  `auto`.
- **Cross-tab sync (nice-to-have):** a `storage` event listener re-applies when the mode
  changes in another tab.

### 3. `README.md` (installed, minimal)

Rendered whole on the Plugins page — a `#### Theme Switch` heading + one short line only.

## Build & packaging

- Self-contained **inline `.plg`** generated by `build/make-standalone-plg.sh` (already
  scaffolded: `NAME=themeswitch`, `ICON=adjust`, `LAUNCH=""` — no settings page). Version =
  today's real date. **Never hand-edit the `.plg`.**
- No `default.cfg`, no settings page, no PHP config reads/writes — auto-derive removes all of
  it.

## Data flow

```
page load (server theme rendered)
  └─ head: <script src=themeswitch.js> (sync)
       ├─ detect theme link  → family pair  (bail if absent)
       ├─ read localStorage mode (default auto)
       ├─ resolve effective theme (auto→prefers-color-scheme)
       └─ apply: swap <link href> + swap <html> Theme-- class   ← before body paint
  └─ DOMContentLoaded: update toolbar button icon/label/tooltip
user click ThemeSwitch(): cycle mode → persist → apply → update button
OS scheme change (mode=auto): re-resolve → apply → update button
other-tab mode change: storage event → apply → update button
```

## Edge cases

- **Older / non-7.x Unraid** where the theme link path differs → detection returns null →
  graceful bail (button no-op, no breakage). `min=6.12.0` does not block install; functional
  support is effectively Unraid 7.x — **verify on the box** (alexandria).
- **Flash of server theme** when the client's resolved theme differs from the server default:
  the sync head-script swaps as early as possible, but the new stylesheet loads
  asynchronously, so a brief flash is possible. Inherent to client-only switching; accepted.
- **Stale swapped stylesheet after an Unraid update:** preserving the original `?v=` token
  self-heals on the next full page reload (PHP re-renders a fresh `?v=`).

## Out of scope (YAGNI)

Settings page, config file, schedules, geolocation, per-theme custom CSS, forcing a family
independent of the server theme, embedding any binary icon.

## Verification plan

- Local: regenerate `.plg`; validate against Unraid's exact parser
  (`simplexml_load_file($f, NULL, LIBXML_NOCDATA)`) via the lxml mimic
  (`strip_cdata=True, resolve_entities=False, load_dtd=False`).
- On box (alexandria, web terminal, no SSH): clean install via GitHub API download; visually
  confirm a live toggle restyles header, body, **jQuery-UI dialogs**, and that auto-follow
  reacts to an OS dark/light flip with no reload.
