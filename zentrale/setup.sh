#!/usr/bin/env bash
# Zentrale einmalig bei Cloudflare einrichten (kostenloser Tarif).
#   1. Kostenloses Konto auf https://dash.cloudflare.com/sign-up anlegen
#   2. ./zentrale/setup.sh   – öffnet einmal den Browser zur Anmeldung und fragt nach einem Passwort für die Übersicht
# Danach: ./tools/publish.sh mit erhöhter FW_BUILD, damit die Uhren die Adresse der Zentrale erfahren.
set -euo pipefail
cd "$(dirname "$0")"
npm install --no-audit --no-fund >/dev/null

if ! npx wrangler whoami 2>/dev/null | grep -q "associated with"; then
  echo "Anmeldung bei Cloudflare – der Browser öffnet sich …"
  npx wrangler login
fi

# Datenbank anlegen (nur beim ersten Mal) und ihre Nummer in wrangler.toml eintragen
if grep -q 'database_id = "local"' wrangler.toml; then
  id=$(npx wrangler d1 create bilal-zentrale 2>&1 | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  if [ -z "$id" ]; then
    id=$(npx wrangler d1 list --json | python3 -c 'import json,sys;print(next(d["uuid"] for d in json.load(sys.stdin) if d["name"]=="bilal-zentrale"))')
  fi
  sed -i "s/database_id = \"local\"/database_id = \"$id\"/" wrangler.toml
fi
npx wrangler d1 execute bilal-zentrale --remote --file schema.sql

url=$(npx wrangler deploy 2>&1 | tee /dev/stderr | grep -oE 'https://[a-z0-9.-]+\.workers\.dev' | head -1)

echo
echo "Passwort für die Übersichtsseite festlegen (wird nur bei Cloudflare gespeichert):"
npx wrangler secret put ADMIN_PASSWORD

if [ -n "$url" ]; then
  echo "$url" > url.txt
  echo
  echo "Fertig: $url"
  echo "Jetzt FW_BUILD in include/config.h erhöhen und ./tools/publish.sh ausführen."
fi
