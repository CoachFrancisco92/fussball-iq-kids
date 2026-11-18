#!/usr/bin/env bash
# Verpackt den Stand im aktuellen Verzeichnis nach _site – mit der Paketliste DIESES Stands.
# Stände ohne eigene Liste (v0.2.2 und älter) nutzen die Altliste neben diesem Skript.
# Aufruf (im Stand-Verzeichnis): bash <werkzeuge>/scripts/pack.sh
set -euo pipefail
tools="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f scripts/site-files.json ]; then list=scripts/site-files.json; else list="$tools/site-files.legacy.json"; fi
rm -rf _site && mkdir _site
for f in $(node -p "require('$( [ "$list" = scripts/site-files.json ] && echo ./ )$list').files.join(' ')"); do
  if [ -f "$f" ]; then mkdir -p "_site/$(dirname "$f")"; cp "$f" "_site/$f"; else echo "fehlt im Stand: $f"; exit 1; fi
done
touch _site/.nojekyll
echo "Paketliste: $list · Version $(node -p "require('./package.json').version")"
find _site -type f | sort
