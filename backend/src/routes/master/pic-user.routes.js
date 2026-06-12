const express = require('express');
const PicUserController = require('../../controllers/master/pic-user.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  PicUserController.index
);

router.get(
  '/options',
  authenticate,
  requireApp('itembase'),
  PicUserController.options
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  PicUserController.show
);

router.post(
  '/',
  authenticate,
  requireApp('itembase'),
  PicUserController.store
);

router.put(
  '/:pic_id',
  authenticate,
  requireApp('itembase'),
  PicUserController.update
);

router.delete(
  '/:id',
  authenticate,
  requireApp('itembase'),
  PicUserController.destroy
);

module.exports = router;