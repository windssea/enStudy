-- Bound adult-to-household reads and membership limits without a global table scan.
CREATE INDEX household_member_adult ON household_members(adult_id,household_id);
