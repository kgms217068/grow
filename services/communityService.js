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
exports.fetchPosts = async (keyword) => {
  const [posts] = await model.getPosts(keyword);
  return posts.map(post => ({
    ...post,
    timeAgo: timeAgo(post.createdAt)
  }));
};

//게시글 작성
exports.createPost = async (title, content, userId) => {
  await model.insertPost(title, content, userId);
};

//게시글 상세화면
exports.fetchPostDetail = async (postId) => {
  const [[post]] = await model.getPostById(postId);
  const [comments] = await model.getCommentsByPostId(postId);
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
    created_at: comment.created_at,
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

//게시글 삭제
exports.deletePostByUser = async (postId, userId) => {
  const [[post]] = await model.getPostAuthor(postId);
  if (!post) return { status: 404 };
  if (post.user_id !== userId) return { status: 403 };
  await model.deleteRelatedPostData(postId);
  await model.deletePost(postId);
  return { status: 200 };
};

