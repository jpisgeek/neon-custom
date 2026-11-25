#!/bin/sh
# Maintainer tool, not needed to install. Rebuilds this package from the
# working copy of the layout in a Herdr home (layout "jason-neon" and its
# jason-neon-* mods): renames everything to jason-neon-custom and swaps the
# personal machine list in machine.js for the generic one below.
# Usage: sh sync.sh            (Herdr home ~/.config/herdr-app)
#        HERDR_APP_HOME=/path sh sync.sh
set -eu

REPO=$(cd "$(dirname "$0")" && pwd)
SRC=${HERDR_APP_HOME:-"$HOME/.config/herdr-app"}
FROM=jason-neon
TO=jason-neon-custom
PARTS="sidebar status pane home agent-list more agents machines"

[ -f "$SRC/layouts/$FROM.json" ] || { echo "No $FROM layout in $SRC" >&2; exit 1; }

# 1. Copy. The app writes jsconfig.json and the .d.ts files itself; the plain
#    halftone images are unused leftovers.
rm -rf "$REPO/mods" "$REPO/layouts" "$REPO/themes"
mkdir -p "$REPO/mods" "$REPO/layouts" "$REPO/themes"
for p in $PARTS; do
  rsync -a --exclude '*.d.ts' --exclude jsconfig.json --exclude halftone.png --exclude halftone.svg \
    "$SRC/mods/$FROM-$p/" "$REPO/mods/$TO-$p/"
done
cp "$SRC/layouts/$FROM.json" "$REPO/layouts/$TO.json"
cp "$SRC/layouts/$FROM.svg" "$REPO/layouts/$TO.svg"
cp "$SRC/themes/$FROM.json" "$REPO/themes/$TO.json"

# 2. Its keys section, renamed, as a file to merge by hand.
python3 - "$SRC/keys.json" "$REPO/keys.$TO.json" "$FROM" "$TO" <<'EOF'
import json, sys
src, out, old, new = sys.argv[1:]
keys = json.load(open(src)).get(f"layout:{old}", {})
json.dump({f"layout:{new}": keys}, open(out, "w"), indent=2)
open(out, "a").write("\n")
EOF

# 3. Rename: mod names, asset paths, commands, shared and stored keys, titles.
find "$REPO/mods" "$REPO/layouts" "$REPO/themes" -type f \( -name '*.js' -o -name '*.json' \) \
  -exec perl -pi -e 's/jason-neon(?!-custom)/jason-neon-custom/g; s/Jason Neon(?! Custom)/Jason Neon Custom/g' {} +

# 4. The generic machine list in place of the personal one.
GENERIC=$(mktemp)
cat > "$GENERIC" <<'EOF'
// <machines>
// Short names and colours for your machines, by their `hc machine ls` name.
// Key "" is this computer; `host` is what the status bar and tooltips call it.
// Colours are theme names. A machine not listed shows its own name, in a
// colour picked from that name. For example:
//   "my-studio-hostname": { label: "studio", color: "ansi4" },
export const MACHINES = {
  "": { label: "local", color: "ansi2" },
};
// </machines>
EOF
for p in sidebar status pane; do
  f="$REPO/mods/$TO-$p/machine.js"
  GEN="$GENERIC" perl -0pi -e 'BEGIN { local $/; open my $g, "<", $ENV{GEN} or die; $x = <$g> } s{// <machines>\n.*?// </machines>\n}{$x}s or die "no machines block in $ARGV\n"' "$f"
done
rm -f "$GENERIC"

echo "Rebuilt $REPO from $SRC. Review with git diff before committing."
