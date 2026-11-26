#!/bin/sh
# Maintainer tool, not needed to install. Rebuilds this package from the
# installed copy you run and edit (layout neon-custom in a Herdr home),
# swapping your own machine list in machine.js for the generic one below.
# Usage: sh sync.sh            (Herdr home ~/.config/herdr-app)
#        HERDR_APP_HOME=/path sh sync.sh
set -eu

REPO=$(cd "$(dirname "$0")" && pwd)
SRC=${HERDR_APP_HOME:-"$HOME/.config/herdr-app"}
NAME=neon-custom
PARTS="sidebar status pane home agent-list more agents machines"

[ -f "$SRC/layouts/$NAME.json" ] || { echo "No $NAME layout in $SRC" >&2; exit 1; }

# 1. Copy. The app writes jsconfig.json and the .d.ts files itself.
rm -rf "$REPO/mods" "$REPO/layouts" "$REPO/themes"
mkdir -p "$REPO/mods" "$REPO/layouts" "$REPO/themes"
for p in $PARTS; do
  rsync -a --exclude '*.d.ts' --exclude jsconfig.json "$SRC/mods/$NAME-$p/" "$REPO/mods/$NAME-$p/"
done
cp "$SRC/layouts/$NAME.json" "$SRC/layouts/$NAME.svg" "$REPO/layouts/"
cp "$SRC/themes/$NAME.json" "$REPO/themes/"

# 2. Its keys section, as a file to merge by hand.
python3 - "$SRC/keys.json" "$REPO/keys.$NAME.json" "$NAME" <<'EOF'
import json, sys
src, out, name = sys.argv[1:]
section = f"layout:{name}"
json.dump({section: json.load(open(src)).get(section, {})}, open(out, "w"), indent=2)
open(out, "a").write("\n")
EOF

# 3. The generic machine list in place of yours.
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
  f="$REPO/mods/$NAME-$p/machine.js"
  GEN="$GENERIC" perl -0pi -e 'BEGIN { local $/; open my $g, "<", $ENV{GEN} or die; $x = <$g> } s{// <machines>\n.*?// </machines>\n}{$x}s or die "no machines block in $ARGV\n"' "$f"
done
rm -f "$GENERIC"

echo "Rebuilt $REPO from $SRC. Review with git diff before committing."
