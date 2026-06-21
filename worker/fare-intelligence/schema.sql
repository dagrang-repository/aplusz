-- AplusZ fare-intelligence moat — permanent fare history (Cloudflare D1 / SQLite)
-- Apply with:  npx wrangler d1 execute aplusz-fares --remote --file=schema.sql
-- Price is stored in MINOR UNITS (e.g. cents) as INTEGER to avoid float drift.

CREATE TABLE IF NOT EXISTS fares (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  origin      TEXT    NOT NULL,                 -- IATA, e.g. 'CDG'
  dest        TEXT    NOT NULL,                 -- IATA, e.g. 'MNL'
  depart_date TEXT    NOT NULL,                 -- 'YYYY-MM-DD'
  return_date TEXT,                             -- NULL for one-way
  price       INTEGER NOT NULL,                 -- minor units (cents)
  currency    TEXT    NOT NULL DEFAULT 'EUR',
  source      TEXT    NOT NULL DEFAULT 'crawler', -- 'crawler' | 'search'
  found_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- Primary read path: /verdict and /history scan one route's history fast.
CREATE INDEX IF NOT EXISTS idx_fares_route
  ON fares (origin, dest, depart_date, found_at);

-- Latest-price lookup powering the change-only write gate.
CREATE INDEX IF NOT EXISTS idx_fares_latest
  ON fares (origin, dest, depart_date, return_date, found_at DESC);
