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

router.get('/export/items', controller.exportItems);
router.get('/export/parents', controller.exportParents);
router.get('/export/masters/:type', controller.exportMaster);
router.get('/inactive-items', controller.inactiveItems);

router.get('/templates/masters/:type', controller.masterTemplate);
router.get('/templates/:type', controller.template);

router.post('/imports/masters/:type/preview', upload.single('file'), controller.masterPreview);
router.post('/imports/masters/commit', controller.masterCommit);
router.delete('/imports/masters/preview/:token', controller.masterCancel);
router.get('/imports/masters/errors/:token', controller.masterErrorFile);

router.post('/imports/:type/preview', upload.single('file'), controller.preview);
router.post('/imports/commit', controller.commit);
router.delete('/imports/preview/:token', controller.cancel);
router.get('/imports/errors/:token', controller.errorFile);

module.exports = router;
