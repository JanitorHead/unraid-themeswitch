# Changelog

Newest first. This file is the single source of truth for the plugin's update
notes: `build/make-standalone-plg.sh` embeds it verbatim into the `.plg`'s
`CHANGES` block, so what you read here is what Unraid shows on update.

###2026.08.03
- **Fix the dashboard's CPU / network graphs in dark mode (issue 4).** Their axis labels
  stayed near-black on the near-black graph — invisible — because Unraid draws those
  graphs on a canvas and picks the label and grid colours server-side, where no
  stylesheet can reach them. They now follow the toggle, along with the dashboard's
  usage rings (memory, boot device, ...), which were baked in the same way and kept
  their light-theme greys on the dark page. All of them use Unraid's own stock palette
  for the effective theme, so the dashboard reads exactly as if the server had rendered
  it. A graph shipped by another plugin in its own colours is left untouched.
- `ThemeSwitch.state()` now also reports whether the graph retinting is active
  (`charts: true` on the Dashboard, `false` on pages without graphs).

###2026.08.01
- **Fix updates not actually replacing the plugin's files.** Unraid's plugin manager
  skips an inline file whose target already exists, so the plugin wipes its own web
  directory first — but that step was accidentally dropped from the packaging script
  on 2026.07.29. Every release since then bumped the version shown on the Plugins
  page while leaving the OLD script on disk, so the Unraid Connect fixes in
  2026.07.29, 2026.07.30 and 2026.07.30b never reached anyone who updated. Updating
  to this build replaces the files for real.
- The update notes shown by Unraid come from CHANGELOG.md again (same regression:
  releases since 2026.07.29 showed a fixed blurb instead of the real history).

###2026.07.30b
- Add `ThemeSwitch.state()`: typing that in the browser console reports which build
  is actually running and whether it got hold of the page (theme, mode, how many
  Connect wrappers it sees, how many colour tokens it resolved). `undefined` means
  the plugin's script never loaded on that page — the fastest way to tell a real
  styling bug apart from a stale page, a plugin that did not update, or a different
  server. The version is stamped in at build time, so it cannot drift.
- Hardening around the colour work: the dark-class sync now runs before it and can
  no longer be held up by it, the token probe never throws, and if it cannot read
  Connect's stylesheet yet it retries instead of caching an empty answer.

###2026.07.30
- Finish the Unraid Connect fix (issue 3). Syncing the dark classes was not enough:
  Connect resets a whole colour-token set on EVERY one of its .unapi wrappers, so a
  single wrapper left without the class re-lights the background for everything
  inside it while the text kept the dark colours — the notifications panel showed a
  white background under near-invisible light text. The token set is now re-declared
  for the active mode, so Connect's colours no longer depend on a class landing on
  every wrapper. The values are read back from Connect's own stylesheet instead of
  hard-coded, so a palette change on their side is picked up automatically.
- The theme sync also keeps working in a background tab (it no longer waits for a
  frame callback that never comes while the tab is hidden).

###2026.07.29
- Sync Unraid Connect components with the toggle (issue 3). The notifications
  panel, toasts and modals decide light/dark from the SERVER-rendered theme, so
  they ignored the client-side switch and rendered unreadable (light-on-dark or
  dark-on-light). Theme Switch now re-declares the CSS variable they read when
  they mount and keeps their dark wrapper classes and toaster theme attributes
  in sync, reload-free, with a lightweight observer catching late mounts.

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
