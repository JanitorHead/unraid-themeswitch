/* Theme Switch — client-side light/dark theme override for the Unraid webGUI.
 * Copyright (c) 2026 JanitorHead. MIT License.
 *
 * Loaded in <head> on every page (via ThemeSwitch.page, Menu="Buttons").
 * No server writes, no page reload: it repoints the theme <link href> and the
 * <html> Theme-- colour class in the browser, per client.
 *
 *   mode (localStorage 'themeswitch-mode'): auto | light | dark   (default auto)
 *   - auto : follow the OS via prefers-color-scheme, reacting live
 *   - light/dark : manual override within the current theme's layout family
 *
 * Themes split into two layout families that must not be mixed:
 *   top-nav : white (light) <-> black (dark)
 *   sidebar : azure (light) <-> gray  (dark)
 * We auto-derive the pair from whatever theme the server rendered, so there is
 * no config and the page layout never changes on toggle.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'themeswitch-mode';
  var THEMES = ['white', 'azure', 'black', 'gray'];

  // theme name -> { light, dark } pair for that theme's layout family
  var FAMILY = {
    white: { light: 'white', dark: 'black' },
    black: { light: 'white', dark: 'black' },
    azure: { light: 'azure', dark: 'gray' },
    gray:  { light: 'azure', dark: 'gray' }
  };

  function themeLink() {
    // Constrain to the active stylesheet so a future preload/icon link to the same
    // path can't be picked up instead of the real theme <link>.
    return document.querySelector('link[rel~="stylesheet"][href*="/styles/themes/"]');
  }

  // Unraid's core theme is one <link>, but several plugins ship their OWN per-theme
  // stylesheet, emitted server-side for the theme active at render, so client-side
  // toggling leaves them on the pre-toggle theme (Community Applications' Apps grid,
  // Unassigned Devices' + Docker manager's tables, ...). The token appears in two link
  // conventions: `.../themes/<theme>.css` (core webGUI, Community Applications) and
  // `.../style-<theme>.css` (dynamix.docker.manager, Unassigned Devices). Match either
  // so we repoint EVERY per-theme stylesheet, not just Unraid's own chrome.
  var THEME_TOKEN = /(\/(?:themes\/|style-))(white|azure|black|gray)\.css/;

  // Repoint one stylesheet <link> to the resolved theme, preserving the token flavour
  // (themes/ vs style-) and its ?v= cache-buster (an opaque key, harmless; self-heals on
  // the next full page load). No-op on absent links or hrefs without a theme token.
  function swapThemeHref(link, theme) {
    if (!link) return;
    var href = link.getAttribute('href');
    var next = href.replace(THEME_TOKEN, '$1' + theme + '.css');
    if (next !== href) link.setAttribute('href', next);
  }

  // Parse the active theme name (white|azure|black|gray) from the <link href>,
  // or null if this Unraid version uses a layout we do not recognise.
  function currentTheme(link) {
    var m = link && link.getAttribute('href').match(/themes\/(white|azure|black|gray)\.css/);
    return m ? m[1] : null;
  }

  function getMode() {
    var m;
    try { m = localStorage.getItem(STORAGE_KEY); } catch (e) { m = null; }
    return (m === 'light' || m === 'dark') ? m : 'auto';
  }

  function setMode(m) {
    try { localStorage.setItem(STORAGE_KEY, m); } catch (e) { /* private mode: in-memory only */ }
  }

  function prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Resolve the theme to display given the mode and the family pair.
  function resolveTheme(mode, pair) {
    if (mode === 'light') return pair.light;
    if (mode === 'dark') return pair.dark;
    return prefersDark() ? pair.dark : pair.light; // auto
  }

  // CSS injected only while a dark theme is active. Fixes Unraid's stock dark themes
  // don't cover:
  //
  // 1. Header bar — stock dark themes give it a LIGHT background with DARK content.
  //    Re-scope the tokens the header colours its dynamix-side content from, plus the
  //    inherited `color`, to light values within #header.
  // 2. Command-execution output (docker run, plugin installs) — Unraid prints it into
  //    .CMD/.logLine/#logBody, which stay dark on the dark page. Force them light.
  // 3. Top-nav menu strip (#menu > .nav-tile) — in the black theme the stock strip stays
  //    light (#f2f2f2) with dark labels and a dark active-tab underline (both read
  //    var(--header-text-color)). It mounts OUTSIDE #header, so darken the strip and
  //    re-scope that token here so the labels AND the .nav-item.active::after underline
  //    flip light together. Harmless in the gray sidebar family (no #menu strip).
  var DARK_MODE_CSS =
    '#header{' +
      '--header-background-color:var(--mild-background-color);' +
      '--inverse-text-color:var(--text-color);' +
      '--header-text-color:var(--text-color);' +
      '--customer-header-text-color:var(--text-color);' +
      'color:var(--text-color);' +
    '}' +
    '.logLine,fieldset.CMD,fieldset.CMD>legend,#logBody{color:var(--text-color)!important;}' +
    '#menu,.nav-tile{background:var(--mild-background-color)!important;--header-text-color:var(--text-color)!important;}';

  // Unraid Connect header island (.unapi / UNRAID-USER-PROFILE) — server name, notification
  // bell, account dropdown/hamburger. Reachable light-DOM (not a closed shadow root), so we
  // can recolour it; it mounts OUTSIDE #header, so the rules are global and injected in both
  // modes. We resolve the colour ourselves rather than via var(--header-text-color): Connect
  // REDEFINES that token inside its own island from its independent (OS-driven) scheme, so
  // referencing it tracks Connect, not the header backdrop, and the items vanish whenever our
  // forced mode disagrees with Connect.
  //
  // The backdrop behind the island is DARK in every theme except azure, so light text is
  // right almost everywhere: nav-top (white/black) has a dark header band in both modes, and
  // in dark mode the #header darkening above darkens the gray sidebar backdrop too. Only
  // azure (sidebar + light mode) keeps a light backdrop and needs dark text.
  function islandCss(theme) {
    var color = (theme === 'azure') ? '#1d1b1b' : '#f2f2f2';
    return '.unapi{--color-header-text-primary:' + color + '!important;}' +
      '.text-header-text-primary{color:' + color + '!important;}';
  }

  // Unraid Connect's web components (notifications panel + toasts, modals; plugin
  // dynamix.unraid.net) decide light/dark from the SERVER-rendered theme, not from
  // the page: web-components-extractor.php prints :root{--theme-dark-mode:0|1;
  // --theme-name:<theme>} and each component wrapper checks the COMPUTED
  // --theme-dark-mode when it mounts (falling back to looking for `dark` classes).
  // We swap themes client-side, so that var goes stale and e.g. the notifications
  // panel renders light-on-dark (GitHub issue #3). Re-declare it for the EFFECTIVE
  // theme, !important so it also outranks the inline --theme-dark-mode Connect
  // writes onto <html> during its own init. Emitted in BOTH modes: components that
  // mount later then colour themselves correctly with no help from us.
  //
  // Deliberately NOT overridden: --theme-name. Connect seeds its theme store from
  // it, but then refetches the theme from the server; the answer (the real server
  // theme) would differ, and that store transition strips every `dark` class our
  // value had just caused. Leaving --theme-name alone keeps the store stable so
  // nothing reverts; the dark styling itself only needs --theme-dark-mode plus the
  // wrapper classes syncConnect maintains.
  function themeVarsCss(isDark) {
    return ':root{--theme-dark-mode:' + (isDark ? '1' : '0') + ' !important;}';
  }

  // Components already mounted captured light/dark at mount time in the DOM: a
  // `dark` class on <html>/<body>/every .unapi wrapper, plus "light"/"dark" theme
  // attributes on the vue-sonner toaster. Mirror exactly what Connect's own theme
  // watcher does when the server theme changes, so a runtime toggle restyles them
  // without a page reload. Steady-state this is mutation-free (adding a class that
  // is present / removing one that is absent records nothing; attributes are only
  // written on a real mismatch), which lets the MutationObserver below re-run it
  // without feeding itself.
  var connectDark = false; // effective mode, read by the observer callback
  function syncConnect(isDark) {
    connectDark = isDark;
    var op = isDark ? 'add' : 'remove';
    var i, els;
    document.documentElement.classList[op]('dark');
    if (document.body) document.body.classList[op]('dark');
    els = document.querySelectorAll('.unapi');
    for (i = 0; i < els.length; i++) els[i].classList[op]('dark');
    var from = isDark ? 'light' : 'dark';
    var to = isDark ? 'dark' : 'light';
    ['data-theme', 'data-sonner-theme'].forEach(function (attr) {
      var sel = document.querySelectorAll('.unapi [' + attr + '="' + from + '"]');
      for (var j = 0; j < sel.length; j++) sel[j].setAttribute(attr, to);
    });
  }

  // Connect keeps (re)mounting pieces asynchronously after DOMContentLoaded — the
  // Teleport/modals container rewrites its own class list, the sonner toaster <ol>
  // appears with a store-derived light/dark, lazy chunks mount whole islands. Each
  // of those would pop up in the server theme's colours, so watch the DOM and
  // re-assert. rAF-coalesced: at most one cheap sync per frame regardless of how
  // noisy the page is (dashboards mutate constantly).
  function watchConnect() {
    if (!window.MutationObserver || !document.body) return;
    var scheduled = false;
    new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        syncConnect(connectDark);
      });
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-sonner-theme']
    });
  }

  // Our own <style> element, created once, toggled by content.
  function darkModeStyle() {
    var el = document.getElementById('themeswitch-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'themeswitch-style';
      (document.head || document.documentElement).appendChild(el);
    }
    return el;
  }

  // Apply a theme: repoint every per-theme <link>, swap the <html> colour class,
  // re-declare the Connect theme var, force a dark header when the effective theme
  // is dark, and always keep the Connect island legible. syncConnect retunes
  // already-mounted Connect components (notifications, toasts) to the new mode.
  function applyTheme(theme) {
    var link = themeLink();
    if (!link) return;
    // Repoint every per-theme stylesheet on the page (core theme + any plugin that ships
    // its own, matched by THEME_TOKEN) so the whole page tracks the toggle, not just
    // Unraid's chrome. Cheap: a scoped querySelectorAll + a no-op regex on non-theme links.
    var links = document.querySelectorAll('link[rel~="stylesheet"]');
    for (var i = 0; i < links.length; i++) swapThemeHref(links[i], theme);

    var html = document.documentElement;
    THEMES.forEach(function (t) { html.classList.remove('Theme--' + t); });
    html.classList.add('Theme--' + theme);

    var isDark = (theme === 'black' || theme === 'gray');
    darkModeStyle().textContent = themeVarsCss(isDark) + islandCss(theme) + (isDark ? DARK_MODE_CSS : '');
    syncConnect(isDark);
  }

  // Update the toolbar button glyph/label/tooltip to reflect the current mode.
  // The button lives in <body>, so this only works after the body has rendered.
  function updateButton(mode) {
    var glyph = document.querySelector('.nav-item.ThemeSwitch b.fa');
    if (glyph) {
      var icon = mode === 'light' ? 'fa-sun-o' : mode === 'dark' ? 'fa-moon-o' : 'fa-adjust';
      glyph.className = 'fa ' + icon + ' system';
    }
    var label = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'Auto';
    var anchor = document.querySelector('.nav-item.ThemeSwitch a');
    if (anchor) anchor.setAttribute('title', 'Theme: ' + label);
    var span = document.querySelector('.nav-item.ThemeSwitch a span');
    if (span) span.textContent = label;
  }

  // Resolve + apply for the current mode, returning the family pair (or null).
  function refresh() {
    var link = themeLink();
    var theme = currentTheme(link);
    if (!theme) return null; // unrecognised layout -> leave the page untouched
    var pair = FAMILY[theme];
    applyTheme(resolveTheme(getMode(), pair));
    return pair;
  }

  // --- Run immediately (head): apply before the body paints to limit flashing.
  refresh();

  // The toolbar anchor calls this by filename contract: onclick="ThemeSwitch()".
  // Cycle auto -> light -> dark -> auto. No-op on an unrecognised layout so the glyph
  // never cycles without actually restyling the page.
  window.ThemeSwitch = function () {
    if (!currentTheme(themeLink())) return;
    var next = { auto: 'light', light: 'dark', dark: 'auto' }[getMode()] || 'auto';
    setMode(next);
    refresh();
    updateButton(next);
  };

  // Live OS scheme changes only matter while following the OS (mode=auto).
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSchemeChange = function () { if (getMode() === 'auto') { refresh(); updateButton('auto'); } };
    if (mq.addEventListener) mq.addEventListener('change', onSchemeChange);
    else if (mq.addListener) mq.addListener(onSchemeChange); // older Safari/WebKit
  }

  // Keep other open tabs in sync when the mode changes elsewhere.
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) { refresh(); updateButton(getMode()); }
  });

  // The toolbar button lives in <body>. Once the DOM is ready, re-apply (covers the
  // case where the theme <link> wasn't parsed yet at head time), initialise the
  // button, and start watching Connect's late mounts; updateButton and the watcher
  // only run when the layout was recognised.
  function initButton() {
    if (refresh()) {
      updateButton(getMode());
      watchConnect();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButton);
  } else {
    initButton();
  }
})();
