const express = require('express');
const router  = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/master', require('./master'));
router.use('/item', require('./item'));

module.exports = router;