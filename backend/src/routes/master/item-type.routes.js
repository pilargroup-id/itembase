const express = require('express');
const ItemTypeController = require('../../controllers/master/item-type.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  ItemTypeController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  ItemTypeController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  ItemTypeController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('itembase'),
  ItemTypeController.update
);

router.delete(
  '/:id',
  authenticate,
  requireApp('itembase'),
  ItemTypeController.destroy
);

router.patch(
  '/:id/status',
  authenticate,
  requireApp('itembase'),
  ItemTypeController.toggleStatus
);

module.exports = router;