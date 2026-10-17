ALTER TABLE ai_connections ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_connections ADD COLUMN config_hash TEXT;
ALTER TABLE ai_connections ADD COLUMN policy_url TEXT;
ALTER TABLE ai_connections ADD COLUMN token_parameter TEXT NOT NULL DEFAULT 'max_completion_tokens' CHECK(token_parameter IN ('max_tokens','max_completion_tokens'));
ALTER TABLE ai_connections ADD COLUMN instruction_role TEXT NOT NULL DEFAULT 'system' CHECK(instruction_role IN ('system','developer'));
ALTER TABLE ai_connections ADD COLUMN tested_version INTEGER;
CREATE TABLE ai_settings (
 household_id TEXT PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
 active_connection_id TEXT REFERENCES ai_connections(id) ON DELETE SET NULL,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 daily_calls INTEGER NOT NULL DEFAULT 30 CHECK(daily_calls BETWEEN 1 AND 300),
 daily_units INTEGER NOT NULL DEFAULT 60000 CHECK(daily_units BETWEEN 1000 AND 1000000),
 child_calls INTEGER NOT NULL DEFAULT 10 CHECK(child_calls BETWEEN 1 AND 100),
 consent_at INTEGER,
 version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE ai_daily_budget (
 household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 day TEXT NOT NULL,
 calls INTEGER NOT NULL DEFAULT 0,
 units INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(household_id,day)
);
CREATE TABLE ai_child_budget (
 household_id TEXT NOT NULL,
 child_id TEXT NOT NULL,
 day TEXT NOT NULL,
 calls INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(household_id,child_id,day),
 FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE
);
CREATE TABLE ai_requests (
 request_id TEXT PRIMARY KEY,
 household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 child_id TEXT,
 connection_id TEXT NOT NULL,
 connection_version INTEGER NOT NULL,
 fingerprint TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('reserved','completed','failed','unknown')),
 reserved_units INTEGER NOT NULL,
 actual_units INTEGER,
 response_json TEXT CHECK(response_json IS NULL OR json_valid(response_json)),
 failure_code TEXT,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 UNIQUE(household_id,fingerprint),
 FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE
);
CREATE TABLE ai_reservation_checks (
 request_id TEXT NOT NULL,
 scope TEXT NOT NULL,
 household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 ok INTEGER NOT NULL CHECK(ok=1),
 PRIMARY KEY(request_id,scope)
);
