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
    return document.querySelector('link[href*="/styles/themes/"]');
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

  // Apply a theme: repoint the <link> and swap the <html> colour class.
  function applyTheme(theme) {
    var link = themeLink();
    if (!link) return;
    var href = link.getAttribute('href');
    var next = href.replace(/themes\/(white|azure|black|gray)\.css/, 'themes/' + theme + '.css');
    if (next !== href) link.setAttribute('href', next);

    var html = document.documentElement;
    THEMES.forEach(function (t) { html.classList.remove('Theme--' + t); });
    html.classList.add('Theme--' + theme);
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
  var initialPair = refresh();

  // The toolbar anchor calls this by filename contract: onclick="ThemeSwitch()".
  // Cycle auto -> light -> dark -> auto.
  window.ThemeSwitch = function () {
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

  // Button is in <body>; set its glyph/label once the DOM is ready.
  if (initialPair) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { updateButton(getMode()); });
    } else {
      updateButton(getMode());
    }
  }
})();
