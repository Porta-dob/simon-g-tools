#!/usr/bin/env bash
# Builds the Excel templates and their pages and copies them into the Groma site working tree.
# It does not commit.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="${SITE_DIR:?Set SITE_DIR to the site working tree}"

python "$DIR/tools/build-workbooks.py" "$DIR/out"
node "$DIR/tools/build-pages.mjs"

mkdir -p "$SITE_DIR/simon-g/excel" "$SITE_DIR/en/simon-g"
cp "$DIR/out/"*.xlsx "$SITE_DIR/simon-g/excel/"
cp "$DIR/app/track.js" "$DIR/app/excel.css" "$SITE_DIR/simon-g/excel/"
cp "$DIR/pages/en/simon-g/"*.html "$SITE_DIR/en/simon-g/"
cp "$DIR/pages/simon-g/"*.html "$SITE_DIR/simon-g/"
echo "Published the Excel templates and their four pages into $SITE_DIR"
