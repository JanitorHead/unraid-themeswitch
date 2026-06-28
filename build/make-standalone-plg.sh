#!/bin/bash
# Assemble a self-contained INLINE .plg from the source tree (no .txz hosting).
# Proven approach — see ../unraid-topprocesses for the working original.
# NEVER hand-edit the generated .plg; edit source/ and regenerate.
set -e

# ---- plugin config (edit these) ----
NAME=themeswitch
AUTHOR=JanitorHead
GITHUB=JanitorHead/unraid-themeswitch
LAUNCH=""                 # e.g. Settings/ThemeSwitchSettings  (leave empty if no settings page)
ICON=adjust               # FontAwesome 4 icon name, no fa- prefix (e.g. adjust / moon-o / lightbulb-o)
MIN=6.12.0
# ------------------------------------

# Version = today's REAL date. Same-day rebuild: pass a letter-suffixed arg, e.g. 2026.06.28a.
# NEVER a future date — Unraid shows it verbatim.
VER="${1:-$(date +%Y.%m.%d)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/source/$NAME"
EMHTTP="usr/local/emhttp/plugins/$NAME"
OUT="$ROOT/${NAME}.plg"

[ -d "$BASE/$EMHTTP" ] || { echo "missing staging tree: $BASE/$EMHTTP" >&2; exit 1; }

launch_attr=""
[ -n "$LAUNCH" ] && launch_attr="
        launch=\"$LAUNCH\""

# text file -> INLINE CDATA <FILE> (binaries are skipped; base64 heredocs break the installer)
emit_file() {
  local disk="$1" dest="$2"
  printf '  <FILE Name="%s">\n' "$dest"
  printf '    <INLINE><![CDATA[\n'
  sed 's/\r$//' "$disk"
  printf ']]></INLINE>\n'
  printf '  </FILE>\n\n'
}

{
  cat <<XML
<?xml version='1.0' standalone='yes'?>
<!DOCTYPE PLUGIN [
  <!ENTITY name      "$NAME">
  <!ENTITY author    "$AUTHOR">
  <!ENTITY version   "$VER">
  <!ENTITY github    "$GITHUB">
  <!ENTITY plugin    "/boot/config/plugins/&name;">
  <!ENTITY emhttp    "/usr/local/emhttp/plugins/&name;">
  <!ENTITY pluginURL "https://raw.githubusercontent.com/&github;/master/&name;.plg">
]>

<PLUGIN name="&name;"
        author="&author;"
        version="&version;"
        pluginURL="&pluginURL;"
        support="https://github.com/&github;"$launch_attr
        icon="$ICON"
        min="$MIN">

  <CHANGES>
###$VER
- Initial release.
  </CHANGES>

  <FILE Run="/usr/bin/php">
    <INLINE><![CDATA[<?php
      \$v = parse_ini_file('/etc/unraid-version')['version'] ?? '0';
      if (version_compare(\$v, '$MIN', '<')) {
        echo "\n*** $NAME requires Unraid $MIN or newer (found \$v). ***\n";
        exit(1);
      }
    ?>]]></INLINE>
  </FILE>

XML

  # Embed every staged TEXT web file (skip binaries on purpose).
  while IFS= read -r disk; do
    rel="${disk#$BASE/}"
    emit_file "$disk" "/$rel"
  done < <(find "$BASE/$EMHTTP" -type f ! -name '*.png' ! -name '*.gif' ! -name '*.jpg' ! -name '*.ico' | LC_ALL=C sort)

  cat <<XML
  <!-- Seed default config on first install only (only if the plugin ships a default.cfg) -->
  <FILE Run="/bin/bash">
    <INLINE>
      if [ -f &emhttp;/default.cfg ]; then
        mkdir -p &plugin;
        [ -f &plugin;/&name;.cfg ] || cp &emhttp;/default.cfg &plugin;/&name;.cfg
      fi
      echo "$NAME installed."
    </INLINE>
  </FILE>

  <!-- Uninstall -->
  <FILE Run="/bin/bash" Method="remove">
    <INLINE>
      rm -rf &emhttp; &plugin;
    </INLINE>
  </FILE>

</PLUGIN>
XML
} > "$OUT"

echo "Wrote $OUT (version $VER)"
grep -c '<FILE ' "$OUT" | sed 's/^/FILE blocks: /'
