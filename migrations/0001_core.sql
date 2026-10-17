-- Core design draft for D1/SQLite. Auth-provider tables are intentionally separate.
PRAGMA foreign_keys = ON;

CREATE TABLE adults (
  id TEXT PRIMARY KEY,
  auth_subject TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE household_members (
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  adult_id TEXT NOT NULL REFERENCES adults(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('owner','guardian')),
  PRIMARY KEY(household_id, adult_id)
);
CREATE TABLE children (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 6),
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  stream_version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(household_id, id)
);
CREATE INDEX children_household ON children(household_id);
CREATE TABLE child_grants (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES adults(id),
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY(household_id, child_id) REFERENCES children(household_id, id) ON DELETE CASCADE
);
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('grammar','lexeme','morphology','vocabulary','phonics','listening','reading','speaking','writing')),
  label TEXT NOT NULL
);
CREATE TABLE prerequisites (
  skill_id TEXT NOT NULL REFERENCES skills(id),
  requires_id TEXT NOT NULL REFERENCES skills(id),
  dependency TEXT NOT NULL CHECK(dependency IN ('hard','recommended')),
  PRIMARY KEY(skill_id, requires_id),
  CHECK(skill_id <> requires_id)
);
CREATE TABLE content_releases (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('draft','published','withdrawn')),
  manifest_hash TEXT NOT NULL,
  published_at INTEGER
);
CREATE TABLE lessons (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version > 0),
  release_id TEXT NOT NULL REFERENCES content_releases(id),
  grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 6),
  term TEXT NOT NULL CHECK(term IN ('A','B')),
  unit_number INTEGER NOT NULL CHECK(unit_number BETWEEN 1 AND 6),
  title TEXT NOT NULL,
  public_json TEXT NOT NULL CHECK(json_valid(public_json)),
  PRIMARY KEY(id, version)
);
CREATE TABLE items (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version > 0),
  lesson_id TEXT NOT NULL,
  lesson_version INTEGER NOT NULL,
  primary_skill_id TEXT NOT NULL REFERENCES skills(id),
  modality TEXT NOT NULL,
  type TEXT NOT NULL,
  public_json TEXT NOT NULL CHECK(json_valid(public_json)),
  private_answer_json TEXT NOT NULL CHECK(json_valid(private_answer_json)),
  status TEXT NOT NULL CHECK(status IN ('draft','published','withdrawn')),
  PRIMARY KEY(id, version),
  FOREIGN KEY(lesson_id, lesson_version) REFERENCES lessons(id, version)
);
CREATE TABLE learning_sessions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  release_id TEXT NOT NULL REFERENCES content_releases(id),
  lease_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('active','completed','paused','replaced')),
  created_at INTEGER NOT NULL,
  UNIQUE(household_id, child_id, id),
  FOREIGN KEY(household_id, child_id) REFERENCES children(household_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX one_active_session ON learning_sessions(child_id) WHERE state = 'active';
CREATE TABLE session_items (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK(position >= 0),
  item_id TEXT NOT NULL,
  item_version INTEGER NOT NULL,
  hint_level INTEGER NOT NULL DEFAULT 0 CHECK(hint_level >= 0),
  revealed_at INTEGER,
  UNIQUE(session_id, position),
  UNIQUE(household_id, child_id, id),
  FOREIGN KEY(household_id, child_id, session_id) REFERENCES learning_sessions(household_id, child_id, id) ON DELETE CASCADE,
  FOREIGN KEY(item_id, item_version) REFERENCES items(id, version)
);
CREATE TABLE commit_assertions (
  event_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL,
  ok INTEGER NOT NULL CHECK(ok = 1),
  FOREIGN KEY(household_id, child_id) REFERENCES children(household_id, id) ON DELETE CASCADE
);
-- In a D1 batch, CAS children.stream_version immediately before:
-- INSERT INTO commit_assertions(event_id,household_id,child_id,ok)
-- VALUES(?,?,?,changes());
-- CHECK(ok=1) must abort the entire batch if CAS affected zero rows.
CREATE TABLE attempts (
  event_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  assignment_id TEXT NOT NULL UNIQUE,
  server_sequence INTEGER NOT NULL,
  answer_json TEXT NOT NULL CHECK(json_valid(answer_json)),
  outcome TEXT NOT NULL CHECK(outcome IN ('correct','incorrect','hinted','skipped','unscored')),
  independent_evidence INTEGER NOT NULL CHECK(independent_evidence IN (0,1)),
  evidence_source TEXT NOT NULL CHECK(evidence_source IN ('online','offline_unverified','ai_unscored')),
  received_at INTEGER NOT NULL,
  client_occurred_at INTEGER,
  algorithm_version TEXT NOT NULL,
  receipt_json TEXT NOT NULL CHECK(json_valid(receipt_json)),
  UNIQUE(household_id, child_id, server_sequence),
  UNIQUE(household_id, child_id, event_id),
  FOREIGN KEY(household_id, child_id, assignment_id) REFERENCES session_items(household_id, child_id, id) ON DELETE CASCADE
);
CREATE INDEX attempts_child_time ON attempts(household_id, child_id, received_at);
CREATE TABLE review_cards (
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  modality TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 0 CHECK(stage BETWEEN 0 AND 5),
  due_at INTEGER NOT NULL,
  lapses INTEGER NOT NULL DEFAULT 0 CHECK(lapses >= 0),
  independent_successes INTEGER NOT NULL DEFAULT 0,
  last_success_day TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  algorithm_version TEXT NOT NULL DEFAULT 'rules-v1',
  PRIMARY KEY(child_id, skill_id, modality),
  FOREIGN KEY(household_id, child_id) REFERENCES children(household_id, id) ON DELETE CASCADE
);
CREATE INDEX review_due ON review_cards(household_id, child_id, due_at);
CREATE TABLE reward_ledger (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  source_attempt_id TEXT NOT NULL UNIQUE,
  delta INTEGER NOT NULL CHECK(delta >= 0),
  reason TEXT NOT NULL,
  FOREIGN KEY(household_id, child_id, source_attempt_id) REFERENCES attempts(household_id, child_id, event_id) ON DELETE CASCADE
);
CREATE TABLE ai_connections (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  adapter TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  key_id TEXT NOT NULL,
  key_suffix TEXT NOT NULL,
  capabilities_json TEXT NOT NULL CHECK(json_valid(capabilities_json)),
  state TEXT NOT NULL CHECK(state IN ('pending','enabled','disabled')),
  created_at INTEGER NOT NULL,
  UNIQUE(household_id, id)
);
CREATE TABLE ai_usage (
  request_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('reserved','completed','failed','unknown')),
  reserved_units INTEGER NOT NULL CHECK(reserved_units >= 0),
  actual_units INTEGER CHECK(actual_units >= 0),
  unit_type TEXT NOT NULL CHECK(unit_type IN ('tokens','audio_ms','characters')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(household_id, connection_id) REFERENCES ai_connections(household_id, id) ON DELETE CASCADE,
  FOREIGN KEY(household_id, child_id) REFERENCES children(household_id, id) ON DELETE CASCADE
);
CREATE INDEX usage_household_time ON ai_usage(household_id, created_at);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_ref TEXT NOT NULL,
  action TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Shared topic catalog; private child runs remain tenant scoped.
CREATE TABLE training_topics (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version > 0),
  category TEXT NOT NULL CHECK(category IN ('grammar','tense','forms','sentence','vocabulary','phonics','reading','expression')),
  title TEXT NOT NULL,
  grade_min INTEGER NOT NULL CHECK(grade_min BETWEEN 1 AND 6),
  grade_max INTEGER NOT NULL CHECK(grade_max BETWEEN grade_min AND 6),
  public_json TEXT NOT NULL CHECK(json_valid(public_json)),
  status TEXT NOT NULL CHECK(status IN ('draft','published','withdrawn')),
  PRIMARY KEY(id, version)
);
CREATE TABLE topic_skills (
  topic_id TEXT NOT NULL,
  topic_version INTEGER NOT NULL,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  role TEXT NOT NULL CHECK(role IN ('primary','supporting','prerequisite')),
  PRIMARY KEY(topic_id, topic_version, skill_id, role),
  FOREIGN KEY(topic_id, topic_version) REFERENCES training_topics(id, version)
);
CREATE TABLE topic_items (
  topic_id TEXT NOT NULL,
  topic_version INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  item_version INTEGER NOT NULL,
  phase TEXT NOT NULL CHECK(phase IN ('diagnostic','guided','practice','transfer','retest')),
  level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 4),
  item_family TEXT NOT NULL,
  PRIMARY KEY(topic_id, topic_version, item_id, item_version),
  FOREIGN KEY(topic_id, topic_version) REFERENCES training_topics(id, version),
  FOREIGN KEY(item_id, item_version) REFERENCES items(id, version)
);
CREATE TABLE training_runs (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  topic_id TEXT NOT NULL,
  topic_version INTEGER NOT NULL,
  phase TEXT NOT NULL CHECK(phase IN ('diagnostic','guided','practice','transfer','retest')),
  state TEXT NOT NULL CHECK(state IN ('active','paused','completed','abandoned')),
  summary_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(summary_json)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(household_id, child_id, session_id) REFERENCES learning_sessions(household_id, child_id, id) ON DELETE CASCADE,
  FOREIGN KEY(topic_id, topic_version) REFERENCES training_topics(id, version)
);
CREATE INDEX training_runs_child ON training_runs(household_id, child_id, created_at);
CREATE TABLE word_forms (
  id TEXT PRIMARY KEY,
  lexeme_skill_id TEXT NOT NULL REFERENCES skills(id),
  lemma TEXT NOT NULL,
  form_key TEXT NOT NULL,
  surface TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'common',
  conditions_json TEXT NOT NULL CHECK(json_valid(conditions_json)),
  UNIQUE(lexeme_skill_id, form_key, surface, variant)
);
CREATE TABLE sentence_patterns (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version > 0),
  primary_skill_id TEXT NOT NULL REFERENCES skills(id),
  pattern_kind TEXT NOT NULL CHECK(pattern_kind IN ('chunk','frame','construction')),
  canonical_frame TEXT NOT NULL,
  context_json TEXT NOT NULL CHECK(json_valid(context_json)),
  slots_json TEXT NOT NULL CHECK(json_valid(slots_json)),
  variants_json TEXT NOT NULL CHECK(json_valid(variants_json)),
  teaching_examples_json TEXT NOT NULL CHECK(json_valid(teaching_examples_json)),
  pitfalls_json TEXT NOT NULL CHECK(json_valid(pitfalls_json)),
  status TEXT NOT NULL CHECK(status IN ('draft','published','withdrawn')),
  PRIMARY KEY(id, version)
);
CREATE TABLE topic_patterns (
  topic_id TEXT NOT NULL,
  topic_version INTEGER NOT NULL,
  pattern_id TEXT NOT NULL,
  pattern_version INTEGER NOT NULL,
  PRIMARY KEY(topic_id, topic_version, pattern_id, pattern_version),
  FOREIGN KEY(topic_id, topic_version) REFERENCES training_topics(id, version),
  FOREIGN KEY(pattern_id, pattern_version) REFERENCES sentence_patterns(id, version)
);
