const express = require('express');
const multer = require('multer');
const controller = require('../../controllers/item-data/item-data.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /\.xlsx$/i.test(file.originalname)),
});

router.use(authenticate, requireApp('itembase'));

router.get('/export', controller.exportData);
router.get('/inactive-items', controller.inactiveItems);
router.get('/templates/:type', controller.template);
router.post('/imports/:type/preview', upload.single('file'), controller.preview);
router.post('/imports/commit', controller.commit);
router.delete('/imports/preview/:token', controller.cancel);
router.get('/imports/errors/:token', controller.errorFile);

module.exports = router;
