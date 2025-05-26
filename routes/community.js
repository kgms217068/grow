// ✅ routes/community.js (Controller)
const express = require('express');
const router = express.Router();
const service = require('../services/communityService');

// 커뮤니티 메인 페이지 - 게시글 목록
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store'); // ✅ 캐시 사용 금지

  const keyword = req.query.search || '';
  const userId = req.session.user?.user_id || 1;

  try {
    const posts = await service.fetchPosts(keyword, userId);
    res.render('community/community', { posts, keyword });
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글을 불러오는 중 오류 발생');
  }
});


// 글 작성 화면
router.get('/post', (req, res) => {
  res.render('community/community_post');
});

// 글 작성 처리
router.post('/post', async (req, res) => {
  const { title, content } = req.body;
  const userId = 1; // 실제로는 req.session.user?.user_id

  try {
    await service.createPost(title, content, userId);
    res.redirect('/community');
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글 작성 중 오류 발생');
  }
});

// 게시글 상세 보기
router.get('/detail/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = req.session.user?.user_id || 1;

  try {
    // 댓글은 service.fetchPostDetail에서 최신순 정렬되어 넘어옴
    const { post, comments } = await service.fetchPostDetail(postId, userId);

    // 좋아요/스크랩 여부 확인 후 전달
    const likedByUser = await service.checkUserLikedPost(postId, userId);
    const scrappedByUser = await service.checkUserScrappedPost(postId, userId);

    res.render('community/community_detail', {
      post, comments, userId, likedByUser, scrappedByUser
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글 상세보기 중 오류 발생');
  }
});


// 댓글 작성
router.post('/detail/:postId/comment', async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = 1; // 실제 로그인 사용자로 대체

  try {
    const comment = await service.addComment(postId, userId, content);
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '댓글 작성 중 오류 발생' });
  }
});

// 댓글 삭제
router.delete('/detail/:postId/comment/:commentId', async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.session.user?.user_id || 1;

  try {
    const success = await service.removeComment(postId, commentId, userId);
    if (!success) return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '댓글 삭제 중 오류 발생' });
  }
});

// 스크랩 토글
router.post('/scrap/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = req.session.user?.user_id || 1;

  try {
    const result = await service.toggleScrapPost(postId, userId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: '스크랩 처리 중 오류' });
  }
});

// 게시글 좋아요 토글
router.post('/like/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = req.session.user?.user_id || 1;

  try {
    const result = await service.togglePostLike(postId, userId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: '좋아요 처리 중 오류' });
  }
});

// 댓글 좋아요 토글
router.post('/like/comment/:commentId', async (req, res) => {
  const { commentId } = req.params;
  const userId = req.session.user?.user_id || 1;

  try {
    const result = await service.toggleCommentLike(commentId, userId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: '댓글 좋아요 처리 중 오류' });
  }
});

// 게시글 삭제
router.delete('/post/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = req.session.user?.user_id || 1;

  try {
    const result = await service.deletePostByUser(postId, userId);
    if (result.status === 404) return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    if (result.status === 403) return res.status(403).json({ error: '게시글 삭제 권한이 없습니다.' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '게시글 삭제 중 오류 발생' });
  }
});

module.exports = router;