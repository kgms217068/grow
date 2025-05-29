const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const { ensureAuthenticated: isLoggedIn } = require('../middlewares/auth');

// 도감 페이지 렌더링
router.get('/', isLoggedIn, collectionController.renderCollectionPage);

module.exports = router;
