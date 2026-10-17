CREATE TABLE training_cycles (
 id TEXT PRIMARY KEY,
 household_id TEXT NOT NULL,
 child_id TEXT NOT NULL,
 topic_id TEXT NOT NULL,
 plan_version INTEGER NOT NULL DEFAULT 1 CHECK(plan_version=1),
 version INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 UNIQUE(household_id,child_id,id),
 UNIQUE(child_id,topic_id),
 FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE
);
CREATE TABLE training_phase_runs (
 cycle_id TEXT NOT NULL REFERENCES training_cycles(id) ON DELETE CASCADE,
 phase TEXT NOT NULL CHECK(phase IN ('diagnostic','practice','transfer','retest')),
 checkpoint INTEGER NOT NULL CHECK(checkpoint IN (0,1,3,7)),
 session_id TEXT NOT NULL UNIQUE REFERENCES learning_sessions(id) ON DELETE CASCADE,
 PRIMARY KEY(cycle_id,phase,checkpoint)
);
CREATE TABLE training_claim_checks (
 session_id TEXT PRIMARY KEY REFERENCES learning_sessions(id) ON DELETE CASCADE,
 ok INTEGER NOT NULL CHECK(ok=1)
);
CREATE TABLE session_activation_checks (
 request_id TEXT PRIMARY KEY,
 household_id TEXT NOT NULL,
 child_id TEXT NOT NULL,
 ok INTEGER NOT NULL CHECK(ok=1),
 FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE
);
