const express = require('express');
const router = express.Router();

const ItemParentController = require('../../controllers/item/item-parent.controller');

const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  ItemParentController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  ItemParentController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  ItemParentController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('itembase'),
  ItemParentController.update
);

module.exports = router;