#!/bin/sh
# Installs the neon-custom layout, its theme and its eight mods into Herdr.
# It never overwrites: if a name is already taken, it stops and changes nothing.
# It leaves keys.json alone; see INSTALL.md for the two optional shortcuts.
# Usage: sh install.sh            (Herdr home ~/.config/herdr-app)
#        HERDR_APP_HOME=/path sh install.sh
set -eu

SRC=$(cd "$(dirname "$0")" && pwd)
HOME_DIR=${HERDR_APP_HOME:-"$HOME/.config/herdr-app"}
NAME=neon-custom
MODS="sidebar status pane home agent-list more agents machines"

if [ ! -d "$HOME_DIR" ]; then
  echo "Herdr home not found: $HOME_DIR. Start Herdr once, then run this again." >&2
  exit 1
fi
command -v herdr-app >/dev/null 2>&1 || { echo "herdr-app is not on PATH. Start Herdr once, then run this again." >&2; exit 1; }

# 1. Stop if any name is taken.
taken=""
for f in layouts/$NAME.json layouts/$NAME.svg themes/$NAME.json; do
  [ -e "$HOME_DIR/$f" ] && taken="$taken $f"
done
for m in $MODS; do [ -e "$HOME_DIR/mods/$NAME-$m" ] && taken="$taken mods/$NAME-$m"; done
if [ -n "$taken" ]; then
  echo "These already exist in $HOME_DIR:$taken" >&2
  echo "Nothing was copied. Remove or rename them first." >&2
  exit 1
fi

# 2. Copy. Mods first, so the layout finds them when it loads.
mkdir -p "$HOME_DIR/mods" "$HOME_DIR/layouts" "$HOME_DIR/themes"
for m in $MODS; do cp -R "$SRC/mods/$NAME-$m" "$HOME_DIR/mods/$NAME-$m"; done
cp "$SRC/themes/$NAME.json" "$HOME_DIR/themes/"
cp "$SRC/layouts/$NAME.svg" "$HOME_DIR/layouts/"
cp "$SRC/layouts/$NAME.json" "$HOME_DIR/layouts/"

# 3. Check each mod.
fail=0
for m in $MODS; do
  if herdr-app check "$HOME_DIR/mods/$NAME-$m" >/dev/null 2>&1; then echo "check passed: $NAME-$m"; else echo "check FAILED: $NAME-$m" >&2; fail=1; fi
done
[ "$fail" -eq 0 ] || { echo "Run: herdr-app check $HOME_DIR/mods/<name> to see the error." >&2; exit 1; }

# 4. Show the layout. Ctrl-Shift-L switches back.
herdr-app do layout.switch "{\"name\":\"$NAME\"}" >/dev/null 2>&1 && echo "Switched to the $NAME layout." \
  || echo "Installed. Herdr is not running: switch with Ctrl-Shift-L after it starts."
echo "To give your machines short names and colours, edit MACHINES in machine.js (see INSTALL.md)."
