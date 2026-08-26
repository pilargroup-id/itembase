const express = require('express');
const UserController = require('../../controllers/directory/user.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/product',
  authenticate,
  requireApp('itembase'),
  UserController.productUsers,
);

module.exports = router;
