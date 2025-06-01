const service = require('../services/communityService');

const getUserId = (req) => req.user?.user_id;

// 커뮤니티 메인 페이지 - 게시글 목록
exports.getCommunityPage = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const keyword = req.query.search || '';
  const userId = getUserId(req);

  try {
    const posts = await service.fetchPosts(keyword, userId);
    res.render('community/community', { posts, keyword });
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글을 불러오는 중 오류 발생');
  }
};

// 글 작성 화면
exports.getPostForm = (req, res) => {
  res.render('community/community_post');
};

// 글 작성 처리
exports.createPost = async (req, res) => {
  const { title, content } = req.body;
  const userId = getUserId(req);

  try {
    await service.createPost(title, content, userId);
    res.redirect('/community');
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글 작성 중 오류 발생');
  }
};

// 게시글 상세 보기
exports.getPostDetail = async (req, res) => {
  const { postId } = req.params;
  const userId = getUserId(req);

  try {
    const { post, comments } = await service.fetchPostDetail(postId, userId);
    const likedByUser = await service.checkUserLikedPost(postId, userId);
    const scrappedByUser = await service.checkUserScrappedPost(postId, userId);

    res.render('community/community_detail', {
      post, comments, userId, likedByUser, scrappedByUser
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글 상세보기 중 오류 발생');
  }
};

// 댓글 작성
exports.addComment = async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = getUserId(req);

  try {
    const comment = await service.addComment(postId, userId, content);
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '댓글 작성 중 오류 발생' });
  }
};

// 댓글 삭제
exports.deleteComment = async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = getUserId(req);

  try {
    const success = await service.removeComment(postId, commentId, userId);
    if (!success) return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '댓글 삭제 중 오류 발생' });
  }
};

// 스크랩 토글
exports.toggleScrap = async (req, res) => {
  const { postId } = req.params;
  const userId = getUserId(req);

  try {
    const result = await service.toggleScrapPost(postId, userId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: '스크랩 처리 중 오류' });
  }
};

// 게시글 좋아요 토글
exports.togglePostLike = async (req, res) => {
  const { postId } = req.params;
  const userId = getUserId(req);

  try {
    const result = await service.togglePostLike(postId, userId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: '좋아요 처리 중 오류' });
  }
};

// 댓글 좋아요 토글
exports.toggleCommentLike = async (req, res) => {
  const { commentId } = req.params;
  const userId = getUserId(req);

  try {
    const result = await service.toggleCommentLike(commentId, userId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: '댓글 좋아요 처리 중 오류' });
  }
};

// 게시글 삭제
exports.deletePost = async (req, res) => {
  const { postId } = req.params;
  const userId = getUserId(req);

  try {
    const result = await service.deletePostByUser(postId, userId);
    if (result.status === 404) return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    if (result.status === 403) return res.status(403).json({ error: '게시글 삭제 권한이 없습니다.' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '게시글 삭제 중 오류 발생' });
  }
};
