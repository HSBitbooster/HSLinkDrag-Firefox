#!/usr/bin/env bash
# Erzeugt das Paket für addons.mozilla.org (AMO): dist/hslinkdrag-<version>.zip
# Enthält nur, was die Erweiterung zur Laufzeit braucht (Auswahl: web-ext-config.mjs).
# Vorher müssen Unit-Tests und web-ext lint fehlerfrei sein.
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(node -p "require('./manifest.json').version")
out="dist/hslinkdrag-${version}.zip"  # Name vergibt web-ext

node --test test/ > /dev/null
npx web-ext lint --self-hosted=false --warnings-as-errors
npx web-ext build > /dev/null

echo "$out ($(du -h "$out" | cut -f1)):"
unzip -Z1 "$out"
