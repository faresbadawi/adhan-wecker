#!/usr/bin/env bash
# Neue Version für alle veröffentlichen: Web-App bauen, Firmware bauen, signiertes Update-Verzeichnis
# und iPhone-Web-App auf GitHub Pages (Zweig gh-pages) hochladen.
# Vorher in include/config.h FW_BUILD erhöhen (und FW_VERSION anpassen) – sonst installiert keine Uhr.
#
#   ./tools/publish.sh
#
# Die Uhren holen das Update nachts selbst (oder sofort über die Zentrale / "Jetzt aktualisieren" in der App).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD

(cd webapp && npm run build && npm run build:pwa)
pio run -e ota

WT=$(mktemp -d)
trap 'git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT
git fetch -q origin gh-pages
git worktree add -q --detach "$WT" origin/gh-pages

rsync -a --checksum --delete --exclude .git --exclude .nojekyll --exclude ota pwa/ "$WT"/
touch "$WT/.nojekyll"
python3 tools/release.py "$WT"

VER=$(sed -n 's/#define FW_VERSION "\(.*\)"/\1/p' include/config.h)
cd "$WT"
git add -A
if git diff --cached --quiet; then echo "Nichts Neues"; exit 0; fi
git commit -qm "Version $VER: Web-App und Update für die Uhren"
git push -q origin HEAD:gh-pages
echo "Veröffentlicht: Version $VER"
