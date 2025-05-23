// services/communityService.js
const model = require('../models/communityModel');

// 시간 표시 유틸 함수
function timeAgo(dateInput) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMin = Math.floor((now - date) / 1000 / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return date.toISOString().slice(0, 10); // 'YYYY-MM-DD' 형태로 반환
}

// 게시글 목록
exports.fetchPosts = async (keyword, userId) => {
  const [posts] = await model.getPosts(keyword);

  // 각 게시글별 좋아요/스크랩 여부 동기화
  const enrichedPosts = await Promise.all(
    posts.map(async post => {
      const likedByUser = await model.hasUserLikedPost(post.post_id, userId);
      const scrappedByUser = await model.hasUserScrappedPost(post.post_id, userId);

      return {
        ...post,
        likedByUser,
        scrappedByUser,
        timeAgo: timeAgo(post.createdAt)
      };
    })
  );

  return enrichedPosts;
};


//게시글 작성
exports.createPost = async (title, content, userId) => {
  await model.insertPost(title, content, userId);
};

//게시글 상세화면
exports.fetchPostDetail = async (postId, userId) => {
  const [[post]] = await model.getPostById(postId);
  const [comments] = await model.getCommentsByPostId(postId, userId); // ✅ userId 넘김
  return { post, comments };
};

//댓글 작성
exports.addComment = async (postId, userId, content) => {
  const [[{ nextId }]] = await model.getNextCommentId(postId);
  await model.insertComment(nextId, postId, userId, content);
  await model.updateCommentCount(postId, true);
  const [[comment]] = await model.getInsertedComment(postId, nextId);
  return {
    comment_id: comment.comment_id,
    comment_content: comment.comment_content,
    nickname: comment.nickname,
    timeAgo: timeAgo(comment.created_at), // 상대 시간 추가
    isMine: comment.user_id === userId
  };
};

//댓글 삭제
exports.removeComment = async (postId, commentId, userId) => {
  const [result] = await model.deleteComment(postId, commentId, userId);
  if (result.affectedRows === 0) return false;
  await model.updateCommentCount(postId, false);
  return true;
};

//스크랩토글
exports.toggleScrapPost = async (postId, userId) => {
  return await model.toggleScrap(postId, userId);
};

// 좋아요 토글
exports.togglePostLike = async (postId, userId) => {
  return await model.togglePostLike(postId, userId);
};

// 댓글 좋아요 토글
exports.toggleCommentLike = async (commentId, userId) => {
  return await model.toggleCommentLike(commentId, userId);
};

// 사용자가 해당 게시글을 좋아요 했는지 확인
exports.checkUserLikedPost = async (postId, userId) => {
  return await model.hasUserLikedPost(postId, userId);
};

// 사용자가 해당 게시글을 스크랩했는지 확인
exports.checkUserScrappedPost = async (postId, userId) => {
  return await model.hasUserScrappedPost(postId, userId);
};

//게시글 삭제
exports.deletePostByUser = async (postId, userId) => {
  const [[post]] = await model.getPostAuthor(postId);
  if (!post) return { status: 404 };
  if (post.user_id !== userId) return { status: 403 };
  await model.deleteRelatedPostData(postId);
  await model.deletePost(postId);
  return { status: 200 };
};

