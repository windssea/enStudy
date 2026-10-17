-- Existing sessions remain unclaimed until a learner explicitly resumes them.
ALTER TABLE learning_sessions ADD COLUMN lease_grant_id TEXT REFERENCES child_grants(id) ON DELETE SET NULL;
ALTER TABLE learning_sessions ADD COLUMN lease_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE session_claims (
 household_id TEXT NOT NULL,
 child_id TEXT NOT NULL,
 request_id TEXT NOT NULL,
 session_id TEXT NOT NULL,
 grant_id TEXT NOT NULL,
 expected_version INTEGER NOT NULL,
 lease_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(household_id,child_id,request_id),
 FOREIGN KEY(household_id,child_id,session_id) REFERENCES learning_sessions(household_id,child_id,id) ON DELETE CASCADE
);
