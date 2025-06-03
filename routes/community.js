const express = require('express');
const router = express.Router();
const controller = require('../controllers/communityController');
const { ensureAuthenticated } = require('../middlewares/auth.js');

// 로그인한 유저만 접근 가능
router.get('/', ensureAuthenticated, controller.getCommunityPage);
router.get('/post', ensureAuthenticated, controller.getPostForm);
router.post('/post', ensureAuthenticated, controller.createPost);
router.get('/detail/:postId', ensureAuthenticated, controller.getPostDetail);
router.post('/detail/:postId/comment', ensureAuthenticated, controller.addComment);
router.delete('/detail/:postId/comment/:commentId', ensureAuthenticated, controller.deleteComment);
router.post('/scrap/:postId', ensureAuthenticated, controller.toggleScrap);
router.post('/like/:postId', ensureAuthenticated, controller.togglePostLike);
router.post('/like/comment/:commentId', ensureAuthenticated, controller.toggleCommentLike);
router.delete('/post/:postId', ensureAuthenticated, controller.deletePost);

module.exports = router;