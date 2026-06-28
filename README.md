# Theme Switch — Unraid light/dark toggle

> 🚧 **Work in progress.** Scaffolding only — the plugin is being designed/built.

A small Unraid plugin to flip the webGUI between **light and dark**:

- **One‑click toggle** (sun/moon) in an easily‑accessible spot (the Unraid top bar/header),
  not a dashboard widget.
- **Auto‑follow your OS** — match the system colour scheme (`prefers-color-scheme`) and
  switch dark/light automatically as your OS does.

Simpler than Dynamix Day/Night (no schedules — just a button + your OS).

## Status

Repo scaffolded with the proven build/deploy infrastructure (see `build/make-standalone-plg.sh`).
Design and implementation in progress.

## Install (once released)

Unraid → **Plugins → Install Plugin** → paste:

```
https://raw.githubusercontent.com/JanitorHead/unraid-themeswitch/master/themeswitch.plg
```

## Building

`themeswitch.plg` is **generated** from `source/` — never hand‑edit it. After changing
anything under `source/themeswitch/…`, regenerate (version defaults to today's date):

```bash
build/make-standalone-plg.sh
```

## License

[MIT](LICENSE).
