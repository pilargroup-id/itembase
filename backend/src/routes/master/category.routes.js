const express = require('express');
const CategoryController = require('../../controllers/master/category.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  CategoryController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  CategoryController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  CategoryController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('itembase'),
  CategoryController.update
);

router.delete(
  '/:id',
  authenticate,
  requireApp('itembase'),
  CategoryController.destroy
);

router.patch(
  '/:id/status',
  authenticate,
  requireApp('itembase'),
  CategoryController.toggleStatus
);

module.exports = router;