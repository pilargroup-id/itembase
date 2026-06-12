const express = require('express');
const UomController = require('../../controllers/master/uom.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  UomController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  UomController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  UomController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('itembase'),
  UomController.update
);

router.delete(
  '/:id',
  authenticate,
  requireApp('itembase'),
  UomController.destroy
);

module.exports = router;