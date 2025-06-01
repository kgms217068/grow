const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');
const { ensureAuthenticated } = require('../middlewares/auth');

// Growmarket 진입 시 로그인 여부 확인
router.get('/', ensureAuthenticated, marketController.getMarketMain);
router.post('/register', ensureAuthenticated, marketController.registerFruit);
router.post('/exchange/:registrationId', ensureAuthenticated, marketController.exchangeFruit);
router.post('/cancel/:registrationId', ensureAuthenticated, marketController.cancelRegistration);

module.exports = router;
