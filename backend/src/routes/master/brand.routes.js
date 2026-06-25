const express = require('express');
const BrandController = require('../../controllers/master/brand.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  BrandController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  BrandController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  BrandController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('itembase'),
  BrandController.update
);

router.delete(
  '/:id',
  authenticate,
  requireApp('itembase'),
  BrandController.destroy
);

router.patch(
  '/:id/status',
  authenticate,
  requireApp('itembase'),
  BrandController.toggleStatus
);

module.exports = router;