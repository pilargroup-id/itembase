const express = require('express');
const router  = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/master', require('./master'));
router.use('/item', require('./item'));
router.use('/directory', require('./directory'));
router.use('/activity-logs', require('./activity-log.routes'));

module.exports = router;
