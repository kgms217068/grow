const express = require('express');
const router = express.Router();
const mypageController = require('../controllers/mypageController');
const isLoggedIn = require('../middlewares/auth');

// ✅ 1) JSON API: 로그인된 사용자 기준
router.get('/api', isLoggedIn, mypageController.getMyPage);

// ✅ 2) 뷰 렌더링: 로그인된 사용자 기준
router.get('/', isLoggedIn, mypageController.renderMypage);

module.exports = router;
