ALTER TABLE session_items ADD COLUMN content_release_id TEXT REFERENCES content_releases(id);
CREATE TABLE teaching_exposures (
 household_id TEXT NOT NULL,
 child_id TEXT NOT NULL,
 evidence_key TEXT NOT NULL,
 shown_day TEXT NOT NULL,
 shown_at INTEGER NOT NULL,
 PRIMARY KEY(household_id,child_id,evidence_key),
 FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE
);
