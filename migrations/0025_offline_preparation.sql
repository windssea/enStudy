-- Preparing a question removes independent credit even if a client omits its offline flag.
ALTER TABLE session_items ADD COLUMN offline_prepared_at INTEGER;
ALTER TABLE session_items ADD COLUMN offline_pack_id TEXT;
