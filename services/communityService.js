// services/communityService.js
const model = require('../models/communityModel');

// 휘장 정보 조회용 모델 함수 추가
const getUserBadge = async (userId) => {
  const [row] = await model.getUserBadgeStatus(userId); // ✅ 배열 구조 분해

  const status = row[0]?.collection_completion_status;
  if (status === 2) return 'gold';
  if (status === 1) return 'silver';
  return null;
};


function timeAgo(dateInput) {
  const date = new Date(dateInput);

  // UTC → KST 보정
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kstDate = new Date(utc + (9 * 60 * 60 * 1000));

  // 작성시간, 현재시간 모두 초·밀리초 잘라낸 '분 단위 기준 시간'
  const kstTimeStripped = new Date(
    kstDate.getFullYear(),
    kstDate.getMonth(),
    kstDate.getDate(),
    kstDate.getHours(),
    kstDate.getMinutes()
  );

  const now = new Date();
  const nowStripped = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes()
  );

  const diffMin = Math.floor((nowStripped - kstTimeStripped) / (1000 * 60));

  // "방금 전"은 아예 '0분 전'일 때로 처리
  if (diffMin === 0) return '방금 전';
  if (diffMin === 1) return '1분 전';
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return '1시간 전';
  if (diffHr < 24) return `${diffHr}시간 전`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1일 전';
  if (diffDay < 7) return `${diffDay}일 전`;

  return `${kstDate.getFullYear()}-${(kstDate.getMonth() + 1).toString().padStart(2, '0')}-${kstDate.getDate().toString().padStart(2, '0')}`;
}

// 게시글 목록
exports.fetchPosts = async (keyword, userId) => {
  const [posts] = await model.getPosts(keyword);

  // 각 게시글별 좋아요/스크랩 여부 동기화
  const enrichedPosts = await Promise.all(
    posts.map(async post => {
      const likedByUser = await model.hasUserLikedPost(post.post_id, userId);
      const scrappedByUser = await model.hasUserScrappedPost(post.post_id, userId);
      const badge = await getUserBadge(post.user_id); // 👈 badge 선언
  
      return {
        ...post,
        likedByUser,
        scrappedByUser,
        timeAgo: timeAgo(post.createdAt),
        badge
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
  const [comments] = await model.getCommentsByPostId(postId, userId);
  const badge = await getUserBadge(post.user_id); // 👈 게시글 작성자 휘장

  const enrichedComments = await Promise.all(
    comments.map(async c => {
      const badge = await getUserBadge(c.user_id); // 👈 댓글 작성자 휘장
      return {
        ...c,
        timeAgo: timeAgo(c.created_at),
        createdAt: new Date(c.created_at).toISOString(),
        isMine: c.user_id === userId,
        badge
      };
    })
  );

  return {
    post: {
      ...post,
      badge
    },
    comments: enrichedComments
  };
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
    createdAt: new Date(comment.created_at).toISOString(), // ✅ ISO 8601로 변환
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

