-- Preserve existing cards and dates; adopt the new scheduler on the next attempt.
ALTER TABLE review_cards ADD COLUMN last_review_at INTEGER;
ALTER TABLE review_cards ADD COLUMN relearning INTEGER NOT NULL DEFAULT 0 CHECK(relearning IN (0,1));
