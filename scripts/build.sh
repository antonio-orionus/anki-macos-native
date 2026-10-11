#!/usr/bin/env bash
# Package addon/ into dist/anki-macos-native-<version>.ankiaddon (a zip whose
# root is the add-on folder's contents, as Anki expects).
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c 'import json; print(json.load(open("addon/manifest.json"))["human_version"])')
out="dist/anki-macos-native-${version}.ankiaddon"
mkdir -p dist
rm -f "$out"
(cd addon && zip -qr -X "../$out" . -x '__pycache__/*' '*/__pycache__/*' 'meta.json' '.DS_Store' '*/.DS_Store')
echo "$out"
