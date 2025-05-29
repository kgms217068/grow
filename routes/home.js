const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const { ensureAuthenticated: isLoggedIn } = require('../middlewares/auth');

// 홈화면 렌더링
router.get('/', isLoggedIn, homeController.renderHomePage);

module.exports = router;
