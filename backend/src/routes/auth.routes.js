const express        = require('express');
const router         = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, AuthController.me);

module.exports = router;
