const express = require('express');
const router = express.Router();
const ItemDownloadController = require('../../controllers/item/item-download.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/download',
  authenticate,
  requireApp('itembase'),
  ItemDownloadController.download
);
router.use('/item-parents', require('./item-parent.routes'));
router.use('/items', require('./item.routes'));
module.exports = router;
