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
