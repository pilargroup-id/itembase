const express = require('express');
const PicController = require('../../controllers/master/pic.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  PicController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  PicController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  PicController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('itembase'),
  PicController.update
);

router.delete(
  '/:id',
  authenticate,
  requireApp('itembase'),
  PicController.destroy
);

router.patch(
  '/:id/status',
  authenticate,
  requireApp('itembase'),
  PicController.toggleStatus
);

module.exports = router;