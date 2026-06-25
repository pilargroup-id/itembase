const express = require('express');
const SkuStatusController = require('../../controllers/master/sku-status.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  SkuStatusController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  SkuStatusController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  SkuStatusController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('itembase'),
  SkuStatusController.update
);

router.delete(
  '/:id',
  authenticate,
  requireApp('itembase'),
  SkuStatusController.destroy
);

router.patch(
  '/:id/status',
  authenticate,
  requireApp('itembase'),
  SkuStatusController.toggleStatus
);

module.exports = router;