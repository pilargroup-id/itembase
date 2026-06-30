const express = require('express');
const router = express.Router();

const ActivityLogController = require('../controllers/activity-log.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  ActivityLogController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('itembase'),
  ActivityLogController.show
);

module.exports = router;