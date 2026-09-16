-- ItemBase - items replenishment type + item status migration
-- Run against the ItemBase MariaDB database before deploying the revised backend.
-- Existing item status mapping:
--   is_active = 1 -> ACTIVE
--   is_active = 0 -> INACTIVE

ALTER TABLE items
  ADD COLUMN replenishment_type ENUM('RG','SS','BD','NR') NULL AFTER uom_id,
  ADD COLUMN status ENUM('ACTIVE','INACTIVE','DISCONTINUE') NULL AFTER replenishment_type;

UPDATE items
SET status = CASE
  WHEN is_active = 1 THEN 'ACTIVE'
  ELSE 'INACTIVE'
END;

ALTER TABLE items
  MODIFY COLUMN status ENUM('ACTIVE','INACTIVE','DISCONTINUE') NOT NULL DEFAULT 'ACTIVE',
  DROP COLUMN is_active;

CREATE INDEX idx_items_status ON items (status);
CREATE INDEX idx_items_replenishment_type ON items (replenishment_type);
