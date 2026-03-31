const express = require('express');
const router = express.Router();
const { 
  getGoogleAuthUrl, 
  handleGoogleCallback,
  syncWorkspaceUsers 
} = require('../controllers/googleAuthController');
const { authMiddleware } = require('../middleware/AuthMiddleware');

router.get('/url', getGoogleAuthUrl);
router.get('/callback', handleGoogleCallback);
router.post('/sync', authMiddleware, syncWorkspaceUsers);

module.exports = router;

