const express = require('express');
const router = express.Router();

router.use('/business-units', require('./business-unit.routes'));

module.exports = router;
