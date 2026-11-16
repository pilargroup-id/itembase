const express = require('express');
const router = express.Router();

const ItemController = require('../../controllers/item/item.controller');
const {
  authenticate,
  authenticateItemRead,
  requireApp,
} = require('../../middleware/auth.middleware');

// Read-only endpoints can be accessed either by:
// 1. X-Internal-Secret: <ITEMBASE_INTERNAL_SECRET>, or
// 2. Existing Bearer auth + requireApp('itembase').
router.get(
  '/',
  authenticateItemRead,
  ItemController.index
);

router.post('/matrix/preview', authenticate, requireApp('itembase'), ItemController.previewMatrix);
router.post('/matrix', authenticate, requireApp('itembase'), ItemController.createMatrix);

router.get(
  '/:id',
  authenticateItemRead,
  ItemController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  ItemController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('itembase'),
  ItemController.update
);

router.post(
  '/:id/duplicate-bd',
  authenticate,
  requireApp('itembase'),
  ItemController.duplicateToBd
);

router.patch(
  '/:id/status',
  authenticate,
  requireApp('itembase'),
  ItemController.updateStatus
);

module.exports = router;
