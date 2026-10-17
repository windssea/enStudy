-- The cursor advances only after the current assignment has a stored receipt.
ALTER TABLE learning_sessions ADD COLUMN cursor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE learning_sessions ADD COLUMN lesson_id TEXT;
ALTER TABLE learning_sessions ADD COLUMN source TEXT NOT NULL DEFAULT 'single';
ALTER TABLE learning_sessions ADD COLUMN source_ref TEXT;
CREATE TABLE session_results (
  session_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  lesson_id TEXT,
  total INTEGER NOT NULL CHECK(total>0),
  correct INTEGER NOT NULL CHECK(correct>=0 AND correct<=total),
  independent INTEGER NOT NULL CHECK(independent>=0 AND independent<=correct),
  completed_at INTEGER NOT NULL,
  FOREIGN KEY(household_id,child_id,session_id) REFERENCES learning_sessions(household_id,child_id,id) ON DELETE CASCADE
);
CREATE INDEX session_results_child ON session_results(household_id,child_id,completed_at);
CREATE TABLE release_items (
  release_id TEXT NOT NULL REFERENCES content_releases(id),
  item_id TEXT NOT NULL,
  item_version INTEGER NOT NULL,
  PRIMARY KEY(release_id,item_id,item_version),
  FOREIGN KEY(item_id,item_version) REFERENCES items(id,version)
);
INSERT INTO release_items SELECT 'dev-samples-v1',id,version FROM items WHERE lesson_id='dev.samples';
