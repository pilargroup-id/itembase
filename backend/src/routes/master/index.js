const express = require('express');
const router = express.Router();

router.use('/brands', require('./brand.routes'));
router.use('/pics', require('./pic.routes'));
router.use('/pic-users', require('./pic-user.routes'));
router.use('/categories', require('./category.routes'));
router.use('/item-types', require('./item-type.routes'));
router.use('/ports', require('./port.routes'));
router.use('/uoms', require('./uom.routes'));
router.use('/sku-statuses', require('./sku-status.routes'));

module.exports = router;