CREATE TABLE ai_writing_settings (
 household_id TEXT PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
 connection_id TEXT REFERENCES ai_connections(id) ON DELETE SET NULL,
 connection_version INTEGER NOT NULL DEFAULT 0,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
 consent_at INTEGER,
 version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE writing_ai_links (
 request_id TEXT PRIMARY KEY REFERENCES ai_requests(request_id) ON DELETE CASCADE,
 household_id TEXT NOT NULL,
 child_id TEXT NOT NULL,
 draft_id TEXT NOT NULL,
 draft_revision INTEGER NOT NULL CHECK(draft_revision>0),
 section_index INTEGER NOT NULL CHECK(section_index BETWEEN 0 AND 2),
 FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(household_id,child_id,draft_id) REFERENCES writing_drafts(household_id,child_id,id) ON DELETE CASCADE
);
CREATE INDEX writing_ai_draft ON writing_ai_links(draft_id);
CREATE INDEX writing_ai_household ON writing_ai_links(household_id);
CREATE TRIGGER writing_ai_remove BEFORE DELETE ON writing_drafts BEGIN
 UPDATE ai_requests SET response_json=NULL WHERE request_id IN(SELECT request_id FROM writing_ai_links WHERE draft_id=OLD.id);
END;
CREATE TRIGGER writing_ai_revision AFTER UPDATE OF revision ON writing_drafts WHEN OLD.revision<>NEW.revision BEGIN
 UPDATE ai_requests SET response_json=NULL WHERE request_id IN(SELECT request_id FROM writing_ai_links WHERE draft_id=OLD.id);
END;
CREATE TRIGGER writing_ai_settings AFTER UPDATE ON ai_writing_settings BEGIN
 UPDATE ai_requests SET response_json=NULL WHERE request_id IN(SELECT request_id FROM writing_ai_links WHERE household_id=NEW.household_id);
END;
CREATE TRIGGER writing_ai_settings_remove BEFORE DELETE ON ai_writing_settings BEGIN
 UPDATE ai_requests SET response_json=NULL WHERE request_id IN(SELECT request_id FROM writing_ai_links WHERE household_id=OLD.household_id);
END;
