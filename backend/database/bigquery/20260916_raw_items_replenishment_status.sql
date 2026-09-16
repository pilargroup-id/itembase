-- BigQuery raw_items schema alignment for the revised MariaDB items table.
-- Adjust project/dataset only if this environment differs.

ALTER TABLE `even-gearbox-255203.itembase.raw_items`
ADD COLUMN IF NOT EXISTS replenishment_type STRING;

ALTER TABLE `even-gearbox-255203.itembase.raw_items`
ADD COLUMN IF NOT EXISTS status STRING;

-- Do not drop is_active here automatically.
-- Existing views may still reference it. Migrate downstream views first, then
-- remove the legacy column only after all consumers use status.
