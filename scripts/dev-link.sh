#!/usr/bin/env bash
# Link addon/ into Anki's add-ons folder for development. Restart Anki to load
# Python changes; set MX_DEV=1 to enable the add-on's dev-only hooks.
set -euo pipefail
cd "$(dirname "$0")/.."
target="$HOME/Library/Application Support/Anki2/addons21/anki_macos_native"
if [ -e "$target" ] && [ ! -L "$target" ]; then
  echo "$target exists and is not a link; remove it first" >&2
  exit 1
fi
ln -sfn "$PWD/addon" "$target"
echo "linked $target -> $PWD/addon"
