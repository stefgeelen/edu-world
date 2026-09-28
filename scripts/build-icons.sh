#!/usr/bin/env bash
# Rasterise the app icon from its SVG source.
#
# src/assets/brand/icon-leapio.svg is the source of truth; the PNGs in public/
# are build output that happens to be committed (there is no image pipeline in
# the build). Re-run this after editing the SVG.
#
# Uses headless Chrome because it is already on every machine that runs this
# project's Playwright tests, and adding a native rasteriser (rsvg, ImageMagick)
# would mean a system dependency for a file that changes once a year.
set -euo pipefail

cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SVG="$PWD/src/assets/brand/icon-leapio.svg"

if [ ! -x "$CHROME" ]; then
  echo "Chrome niet gevonden op: $CHROME" >&2
  echo "Zet CHROME=/pad/naar/chrome en probeer opnieuw." >&2
  exit 1
fi

render() {
  local size="$1" out="$2" tmp
  tmp="$(mktemp -d)"
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --screenshot="$tmp/shot.png" --window-size="$size,$size" \
    --force-device-scale-factor=1 "file://$SVG" >/dev/null 2>&1
  sips -Z "$size" "$tmp/shot.png" --out "$out" >/dev/null
  rm -rf "$tmp"
  echo "  $out ($size×$size)"
}

echo "Iconen renderen uit $SVG"
render 512 public/icon-512.png
render 192 public/icon-192.png
render 180 public/apple-touch-icon.png
render 32 public/favicon-32.png
render 16 public/favicon-16.png
echo "Klaar."
