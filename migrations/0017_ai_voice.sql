CREATE TABLE ai_voice_settings (
 household_id TEXT PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
 text_connection_id TEXT REFERENCES ai_connections(id) ON DELETE SET NULL,
 asr_connection_id TEXT REFERENCES ai_connections(id) ON DELETE SET NULL,
 tts_connection_id TEXT REFERENCES ai_connections(id) ON DELETE SET NULL,
 asr_model TEXT NOT NULL DEFAULT '',
 tts_model TEXT NOT NULL DEFAULT '',
 tts_voice TEXT NOT NULL DEFAULT '',
 text_enabled INTEGER NOT NULL DEFAULT 0 CHECK(text_enabled IN(0,1)),
 asr_enabled INTEGER NOT NULL DEFAULT 0 CHECK(asr_enabled IN(0,1)),
 tts_enabled INTEGER NOT NULL DEFAULT 0 CHECK(tts_enabled IN(0,1)),
 consent_at INTEGER,
 audio_consent_at INTEGER,
 child_turns INTEGER NOT NULL DEFAULT 6 CHECK(child_turns BETWEEN 1 AND 12),
 child_audio_ms INTEGER NOT NULL DEFAULT 180000 CHECK(child_audio_ms BETWEEN 20000 AND 600000),
 family_audio_ms INTEGER NOT NULL DEFAULT 600000 CHECK(family_audio_ms BETWEEN 20000 AND 3600000),
 child_tts_chars INTEGER NOT NULL DEFAULT 2000 CHECK(child_tts_chars BETWEEN 200 AND 6000),
 family_tts_chars INTEGER NOT NULL DEFAULT 6000 CHECK(family_tts_chars BETWEEN 500 AND 20000),
 version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE ai_voice_capabilities (
 household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN('asr','tts')),
 config_hash TEXT NOT NULL,
 tested_at INTEGER NOT NULL,
 PRIMARY KEY(household_id,kind,config_hash)
);
CREATE TABLE ai_voice_budget (
 household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 subject TEXT NOT NULL,
 day TEXT NOT NULL,
 turns INTEGER NOT NULL DEFAULT 0,
 audio_ms INTEGER NOT NULL DEFAULT 0,
 tts_chars INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(household_id,subject,day)
);
CREATE TABLE ai_voice_checks (
 request_id TEXT NOT NULL,
 kind TEXT NOT NULL,
 household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 ok INTEGER NOT NULL CHECK(ok=1),
 PRIMARY KEY(request_id,kind)
);
CREATE TABLE ai_conversations (
 id TEXT PRIMARY KEY,
 household_id TEXT NOT NULL,
 child_id TEXT NOT NULL,
 grant_id TEXT NOT NULL REFERENCES child_grants(id) ON DELETE CASCADE,
 scene_id TEXT NOT NULL,
 settings_version INTEGER NOT NULL,
 turn_count INTEGER NOT NULL DEFAULT 0 CHECK(turn_count BETWEEN 0 AND 6),
 pending_request_id TEXT,
 payload_json TEXT CHECK(payload_json IS NULL OR json_valid(payload_json)),
 state TEXT NOT NULL DEFAULT 'open' CHECK(state IN('open','closed')),
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 FOREIGN KEY(household_id,child_id) REFERENCES children(household_id,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX one_conversation_per_grant ON ai_conversations(child_id,grant_id) WHERE state='open';
