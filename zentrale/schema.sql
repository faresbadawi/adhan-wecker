-- Uhren, die sich bei der Zentrale melden
CREATE TABLE IF NOT EXISTS clocks (
  id TEXT PRIMARY KEY,          -- Gerätenummer (12 Hex-Zeichen)
  secret_hash TEXT NOT NULL,    -- SHA-256 des Geheimnisses der Uhr
  name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '',
  build INTEGER NOT NULL DEFAULT 0,
  rssi INTEGER,
  uptime INTEGER,
  first_seen INTEGER NOT NULL,  -- Unix-Sekunden
  last_seen INTEGER NOT NULL,
  update_wanted INTEGER NOT NULL DEFAULT 0
);

-- Interessenten von der Produktseite (nur E-Mail und Sprache)
CREATE TABLE IF NOT EXISTS interest (
  email TEXT PRIMARY KEY,
  lang TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,     -- Unix-Sekunden
  ip_hash TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS interest_ip ON interest (ip_hash, created);
