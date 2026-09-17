-- Align item_parents.status with items.status.
-- Target values: ACTIVE, INACTIVE, DISCONTINUE.
-- User confirmed existing parent data is currently ACTIVE; mappings below also
-- preserve legacy inactive/discontinued values if they are encountered.

ALTER TABLE item_parents
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

UPDATE item_parents
SET status = CASE LOWER(status)
  WHEN 'active' THEN 'ACTIVE'
  WHEN 'inactive' THEN 'INACTIVE'
  WHEN 'discontinued' THEN 'DISCONTINUE'
  WHEN 'discontinue' THEN 'DISCONTINUE'
  WHEN 'draft' THEN 'ACTIVE'
  ELSE UPPER(status)
END;

ALTER TABLE item_parents
  MODIFY COLUMN status ENUM('ACTIVE','INACTIVE','DISCONTINUE') NOT NULL DEFAULT 'ACTIVE';
