const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const isLoggedIn = require('../middlewares/auth'); // 공통 미들웨어로 통일

// 홈화면 렌더링
router.get('/', isLoggedIn, homeController.renderHomePage);

module.exports = router;
