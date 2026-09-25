-- Itembase - allow one physical barcode to be shared by the normal SKU and its BD duplicate.
-- Existing item_code uniqueness remains unchanged.

ALTER TABLE `items`
  DROP INDEX `uq_items_barcode`,
  ADD INDEX `idx_items_barcode` (`barcode`);
