-- Device playback is learner self-report, not proof of acoustic perception.
CREATE TABLE listening_inputs (
 assignment_id TEXT PRIMARY KEY,
 household_id TEXT NOT NULL,
 child_id TEXT NOT NULL,
 heard_at INTEGER,
 transcript_at INTEGER,
 FOREIGN KEY(household_id,child_id,assignment_id) REFERENCES session_items(household_id,child_id,id) ON DELETE CASCADE,
 CHECK(heard_at IS NOT NULL OR transcript_at IS NOT NULL)
);
CREATE TABLE listening_commits (
 id TEXT PRIMARY KEY,
 household_id TEXT NOT NULL,
 child_id TEXT NOT NULL,
 ok INTEGER NOT NULL CHECK(ok=1),
 FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE
);
