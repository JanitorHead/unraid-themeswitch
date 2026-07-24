# Changelog

Newest first. This file is the single source of truth for the plugin's update
notes: `build/make-standalone-plg.sh` embeds it verbatim into the `.plg`'s
`CHANGES` block, so what you read here is what Unraid shows on update.

###2026.07.24c
- Docs: add this changelog; the plugin's update notes are now the real
  per-version history instead of a fixed blurb.

###2026.07.24b
- Repoint EVERY per-theme stylesheet on the page, not just Unraid's core theme.
  Plugins ship their own per-theme stylesheet under two link conventions —
  "themes/NAME.css" (core webGUI, Community Applications) and "style-NAME.css"
  (Docker manager, Unassigned Devices). Toggling now follows all of them, so the
  Apps grid AND the Unassigned Devices / Docker tables track light/dark instead
  of stranding stray white table rows or invisible cards on the dark page.
- Fix updates silently keeping the old files. Unraid's plugin-manager skips an
  inline file whose target already exists, so previous fixes never reached an
  already-installed box on update. The plugin now wipes its web files first and
  rewrites them fresh every install/update.

###2026.07.24
- Sync the Community Applications (Apps tab) theme with the toggle. Its cards no
  longer stay dark-on-dark (invisible) when you switch to dark mode.

###2026.07.23a
- Dark mode: darken the top-nav menu strip so it no longer stays light with a
  light active-tab underline in the white/black theme family.
- Recolour the Unraid Connect header items (server name, notification bell,
  account dropdown) so they stay legible when a forced theme disagrees with
  Connect's own light/dark scheme, in every theme and mode. (Thanks @Pross.)

###2026.06.29
- Initial release: one-click light/dark toggle (sun/moon) in the Unraid header
  toolbar, with three modes — Auto (follows your OS colour scheme live), Light
  and Dark.
- Instant client-side switch: no page reload, no server settings changed, per
  browser.
- Forces a fully dark header and keeps command-execution output readable in
  dark mode, which Unraid's stock dark themes don't fully cover.
