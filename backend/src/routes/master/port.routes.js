const express = require('express');
const PortController = require('../../controllers/master/port.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  PortController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  PortController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  PortController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('itembase'),
  PortController.update
);

router.delete(
  '/:id',
  authenticate,
  requireApp('itembase'),
  PortController.destroy
);

module.exports = router;