const express = require('express');
const router = express.Router();

router.use('/business-units', require('./business-unit.routes'));
router.use('/users', require('./user.routes'));

module.exports = router;
