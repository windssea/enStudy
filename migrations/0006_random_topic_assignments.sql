-- Option/token order belongs to the assignment and survives refresh/retries.
ALTER TABLE session_items ADD COLUMN presentation_json TEXT CHECK(presentation_json IS NULL OR json_valid(presentation_json));
CREATE INDEX session_items_recent_child ON session_items(household_id,child_id,session_id);
