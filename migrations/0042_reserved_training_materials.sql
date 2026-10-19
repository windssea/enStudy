-- The workflow remains plan_version=1; material editions are explicit and
-- independent. Existing cycles retain NULL and their immutable allocations.
ALTER TABLE training_cycles ADD COLUMN material_release_id TEXT REFERENCES content_releases(id);
ALTER TABLE training_cycles ADD COLUMN material_adopted_at INTEGER;
