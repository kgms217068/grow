const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const isLoggedIn = require('../middlewares/auth');

router.get('/', isLoggedIn, diaryController.renderDiaryPage);

module.exports = router;