#!/usr/bin/env bash
# Builds the offline file from the published site files, tests it from disk in a headless browser,
# builds the download page and the IT note, and copies them into the site working tree. It does not commit.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${SITE_DIR:?Set SITE_DIR to the site working tree}"
export SITE_DIR
node "$DIR/tools/build.mjs"
node "$DIR/tools/selftest.mjs" "$DIR/out/simon-g-tools.html"
node "$DIR/tools/build-pages.mjs"
mkdir -p "$SITE_DIR/simon-g/download" "$SITE_DIR/en/simon-g"
cp "$DIR/out/simon-g-tools.html" "$DIR/pages/it.css" "$SITE_DIR/simon-g/download/"
cp "$DIR/pages/en/simon-g/"*.html "$SITE_DIR/en/simon-g/"
cp "$DIR/pages/simon-g/"*.html "$SITE_DIR/simon-g/"
echo "Published the offline file, its download page and the IT note into $SITE_DIR"
