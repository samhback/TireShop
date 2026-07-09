CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  role_id TEXT
);

CREATE TABLE IF NOT EXISTS coaches (
  discord_user_id TEXT PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  assigned_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_user_id TEXT NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  contract_text TEXT NOT NULL,
  offered_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'canceled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_offers_player_status ON offers(player_user_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_team_status ON offers(team_id, status);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_user_id TEXT NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  contract_text TEXT NOT NULL,
  signed_by_user_id TEXT NOT NULL,
  offer_id INTEGER REFERENCES offers(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  signed_at TEXT NOT NULL DEFAULT (datetime('now')),
  released_at TEXT,
  released_by_user_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_contract_per_player
  ON contracts(player_user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_contracts_team_status ON contracts(team_id, status);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('signing', 'release')),
  player_user_id TEXT NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  contract_id INTEGER REFERENCES contracts(id),
  offer_id INTEGER REFERENCES offers(id),
  actor_user_id TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO teams (name) VALUES
  ('Roblox Warriors'),
  ('Dumpsville Dummies'),
  ('Bloxburg Buccaneers'),
  ('Redcliff Raiders'),
  ('Overseer Owls'),
  ('Las Vegas Valkyrie'),
  ('Lua Lions'),
  ('Darkheart Dragons'),
  ('Korblox Knights'),
  ('Bloxxer Bengals'),
  ('Stud City Spartans'),
  ('Barton Bruisers');
