// ✅ models/communityModel.js
const { promisePool } = require('../db/db');

exports.getPosts = (keyword) => {
  return promisePool.query(`
    SELECT p.post_id, p.post_title AS title, p.post_content AS content,
           p.creation_date AS createdAt, p.comment_num AS commentCount,
           p.likes_num AS likeCount, p.scrap_num AS scrapCount, u.nickname
    FROM post p
    JOIN user u ON p.user_id = u.user_id
    WHERE p.post_title LIKE ?
    ORDER BY p.creation_date DESC
  `, [`%${keyword}%`]);
};

exports.insertPost = (title, content, userId) => {
  return promisePool.query(`
    INSERT INTO post (post_id, post_num, post_title, post_content, creation_date, user_id)
    VALUES (NULL, FLOOR(RAND()*1000000), ?, ?, NOW(), ?)
  `, [title, content, userId]);
};

exports.getPostById = (postId) => {
  return promisePool.query(`
    SELECT p.post_id, p.post_title AS title, p.post_content AS content,
           p.creation_date AS createdAt, p.likes_num AS likeCount,
           p.comment_num AS commentCount, p.scrap_num AS scrapCount,
           u.nickname, p.user_id
    FROM post p
    JOIN user u ON p.user_id = u.user_id
    WHERE p.post_id = ?
  `, [postId]);
};

exports.getCommentsByPostId = (postId) => {
  return promisePool.query(`
    SELECT c.comment_id, c.content AS comment_content, c.creation_date AS created_at,
           u.nickname, c.user_id
    FROM comment c
    JOIN user u ON c.user_id = u.user_id
    WHERE c.post_id = ?
    ORDER BY c.creation_date ASC
  `, [postId]);
};

exports.getNextCommentId = (postId) => {
  return promisePool.query(`
    SELECT IFNULL(MAX(comment_id), 0) + 1 AS nextId FROM comment WHERE post_id = ?
  `, [postId]);
};

exports.insertComment = (commentId, postId, userId, content) => {
  return promisePool.query(`
    INSERT INTO comment (comment_id, post_id, user_id, content, creation_date)
    VALUES (?, ?, ?, ?, NOW())
  `, [commentId, postId, userId, content]);
};

exports.getInsertedComment = (postId, commentId) => {
  return promisePool.query(`
    SELECT c.comment_id, c.content AS comment_content, c.creation_date AS created_at,
           u.nickname, c.user_id
    FROM comment c
    JOIN user u ON c.user_id = u.user_id
    WHERE c.post_id = ? AND c.comment_id = ?
  `, [postId, commentId]);
};

exports.deleteComment = (postId, commentId, userId) => {
  return promisePool.query(`
    DELETE FROM comment WHERE comment_id = ? AND post_id = ? AND user_id = ?
  `, [commentId, postId, userId]);
};

exports.updateCommentCount = (postId, increment = true) => {
  const op = increment ? '+' : '-';
  return promisePool.query(`
    UPDATE post SET comment_num = comment_num ${op} 1 WHERE post_id = ?
  `, [postId]);
};

exports.toggleScrap = async (postId, userId) => {
  const [[exists]] = await promisePool.query(`
    SELECT * FROM scrap WHERE post_id = ? AND user_id = ?
  `, [postId, userId]);

  if (exists) {
    await promisePool.query(`
      DELETE FROM scrap WHERE post_id = ? AND user_id = ?
    `, [postId, userId]);
    await promisePool.query(`
      UPDATE post SET scrap_num = scrap_num - 1 WHERE post_id = ?
    `, [postId]);
    return { scrapped: false };
  } else {
    await promisePool.query(`
      INSERT INTO scrap (user_id, post_id, scrap_date) VALUES (?, ?, CURDATE())
    `, [userId, postId]);
    await promisePool.query(`
      UPDATE post SET scrap_num = scrap_num + 1 WHERE post_id = ?
    `, [postId]);
    return { scrapped: true };
  }
};

exports.deletePost = (postId) => {
  return promisePool.query(`DELETE FROM post WHERE post_id = ?`, [postId]);
};

exports.getPostAuthor = (postId) => {
  return promisePool.query(`SELECT user_id FROM post WHERE post_id = ?`, [postId]);
};

exports.deleteRelatedPostData = (postId) => {
  return Promise.all([
    promisePool.query(`DELETE FROM comment WHERE post_id = ?`, [postId]),
    promisePool.query(`DELETE FROM scrap WHERE post_id = ?`, [postId]),
    // promisePool.query(`DELETE FROM post_like WHERE post_id = ?`, [postId])
  ]);
};
