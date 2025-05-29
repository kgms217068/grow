// routes/scrap.js
const express = require('express');
const router = express.Router();
const scrapController = require('../controllers/scrapController');
const { ensureAuthenticated: isLoggedIn } = require('../middlewares/auth');

// 스크랩한 글 페이지
router.get('/', isLoggedIn, scrapController.renderScrapPage);

module.exports = router;
