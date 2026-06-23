const express = require('express');
const BusinessUnitController = require('../../controllers/directory/business-unit.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireApp('itembase'),
  BusinessUnitController.index,
);

router.get(
  '/:businessUnitId/departments',
  authenticate,
  requireApp('itembase'),
  BusinessUnitController.departments,
);

module.exports = router;
