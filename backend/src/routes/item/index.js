const express = require('express');
const router = express.Router();

router.use('/item-parents', require('./item-parent.routes'));
router.use('/items', require('./item.routes'));

module.exports = router;