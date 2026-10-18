-- Private authored work is separate from scored exercises, stars and review evidence.
CREATE TABLE writing_drafts (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt_version INTEGER NOT NULL,
  prompt_json TEXT NOT NULL,
  title TEXT NOT NULL,
  plan TEXT NOT NULL,
  paragraphs_json TEXT NOT NULL,
  checks_json TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision>0),
  last_request_id TEXT NOT NULL,
  last_command_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(household_id,child_id,id),
  FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE
);
CREATE INDEX writing_drafts_child ON writing_drafts(household_id,child_id,updated_at DESC,id);
CREATE TABLE writing_commands (
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  command_hash TEXT NOT NULL,
  revision INTEGER NOT NULL,
  checks_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(household_id,child_id,request_id),
  FOREIGN KEY(household_id,child_id,draft_id) REFERENCES writing_drafts(household_id,child_id,id) ON DELETE CASCADE
);
