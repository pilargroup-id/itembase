const express = require('express');
const router = express.Router();

const ItemController = require('../../controllers/item/item.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  ItemController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
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

module.exports = router;