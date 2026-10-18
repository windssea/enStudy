-- Cosmetic choice is separate from learning evidence and its device lease.
CREATE TABLE child_companions (
  child_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  companion_id TEXT NOT NULL CHECK(companion_id IN ('fox','pikachu')),
  version INTEGER NOT NULL CHECK(version > 0),
  command_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE
);
