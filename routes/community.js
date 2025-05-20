/* AJAX 적용 전
const express = require('express');
const router = express.Router();
const { promisePool } = require('../db/db');

// 커뮤니티 메인 페이지 - 게시글 목록
router.get('/', async (req, res) => {
  try {
    const [posts] = await promisePool.query(`
      SELECT 
        p.post_id, 
        p.post_title AS title,
        p.post_content AS content, 
        p.creation_date AS createdAt,
        p.comment_num AS commentCount,
        p.likes_num AS likeCount,
        p.scrap_num AS scrapCount,
        u.nickname
      FROM post p
      JOIN user u ON p.user_id = u.user_id
      ORDER BY p.creation_date DESC
    `);
    res.render('community', { posts });
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글을 불러오는 중 오류 발생');
  }
});

// 글 작성 화면
router.get('/post', (req, res) => {
  res.render('community_post');
});

// 글 작성 처리
router.post('/post', async (req, res) => {
  const { title, content } = req.body;
  const userId = req.session.user?.user_id; // 세션에서 user_id 가져오기 (로그인 구현 필요)

  if (!userId) {
    return res.status(401).send('로그인이 필요합니다.');
  }

  try {
    await promisePool.query(`
      INSERT INTO post (post_id, post_num, post_title, post_content, creation_date, user_id)
      VALUES (NULL, FLOOR(RAND()*1000000), ?, ?, NOW(), ?)
    `, [title, content, userId]);

    res.redirect('/community');
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글 작성 중 오류 발생');
  }
});

// 게시글 상세 보기
router.get('/detail/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    const [[post]] = await promisePool.query(`
      SELECT 
        p.post_id, p.post_title AS title, p.post_content AS content,
        p.creation_date AS createdAt, p.likes_num AS likeCount, 
        p.comment_num AS commentCount, p.scrap_num AS scrapCount,
        u.nickname
      FROM post p
      JOIN user u ON p.user_id = u.user_id
      WHERE p.post_id = ?
    `, [postId]);

    const [comments] = await promisePool.query(`
      SELECT c.comment_content, c.created_at, u.nickname
      FROM comment c
      JOIN user u ON c.user_id = u.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);

    res.render('community_detail', { post, comments });
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글 상세보기 중 오류 발생');
  }
});

// 댓글 작성
router.post('/detail/:postId/comment', async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.session.user?.user_id;

  if (!userId) {
    return res.status(401).send('로그인이 필요합니다.');
  }

  try {
    await promisePool.query(`
      INSERT INTO comment (post_id, user_id, comment_content, created_at)
      VALUES (?, ?, ?, NOW())
    `, [postId, userId, content]);

    // 댓글 수 증가
    await promisePool.query(`
      UPDATE post SET comment_num = comment_num + 1 WHERE post_id = ?
    `, [postId]);

    res.redirect(`/community/detail/${postId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('댓글 작성 중 오류 발생');
  }
});

// 좋아요 (토글)
router.post('/like/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    await promisePool.query(`
      UPDATE post SET likes_num = likes_num + 1 WHERE post_id = ?
    `, [postId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// 스크랩 (토글)
router.post('/scrap/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    await promisePool.query(`
      UPDATE post SET scrap_num = scrap_num + 1 WHERE post_id = ?
    `, [postId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
*/
const express = require('express');
const router = express.Router();
const { promisePool } = require('../db/db');

// 커뮤니티 메인 페이지 - 게시글 목록
router.get('/', async (req, res) => {
  try {
    const [posts] = await promisePool.query(`
      SELECT 
        p.post_id, 
        p.post_title AS title,
        p.post_content AS content, 
        p.creation_date AS createdAt,
        p.comment_num AS commentCount,
        p.likes_num AS likeCount,
        p.scrap_num AS scrapCount,
        u.nickname
      FROM post p
      JOIN user u ON p.user_id = u.user_id
      ORDER BY p.creation_date DESC
    `);
    res.render('community/community', { posts }); 
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
  //테스트를 위해 user_id 1인 user 생성
  const userId = 1;//기존코드: const userId = req.session.user?.user_id;

  //테스트한 후 로그인 시에만 글 작성 가능하도록 처리하기
  //if (!userId) return res.status(401).send('로그인이 필요합니다.');

  try {
    await promisePool.query(`
      INSERT INTO post (post_id, post_num, post_title, post_content, creation_date, user_id)
      VALUES (NULL, FLOOR(RAND()*1000000), ?, ?, NOW(), ?)
    `, [title, content, userId]);

    res.redirect('/community');
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글 작성 중 오류 발생');
  }
});

// 게시글 상세 보기
router.get('/detail/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    const [[post]] = await promisePool.query(`
      SELECT 
        p.post_id, p.post_title AS title, p.post_content AS content,
        p.creation_date AS createdAt, p.likes_num AS likeCount, 
        p.comment_num AS commentCount, p.scrap_num AS scrapCount,
        u.nickname
      FROM post p
      JOIN user u ON p.user_id = u.user_id
      WHERE p.post_id = ?
    `, [postId]);

    const [comments] = await promisePool.query(`
      SELECT c.comment_id, c.comment_content, c.created_at, u.nickname, c.user_id
      FROM comment c
      JOIN user u ON c.user_id = u.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);

    res.render('community/community_detail', { post, comments, userId: req.session.user?.user_id });
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글 상세보기 중 오류 발생');
  }
});

// 댓글 작성 (AJAX)
router.post('/detail/:postId/comment', async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.session.user?.user_id;

  if (!userId) return res.status(401).json({ error: '로그인이 필요합니다.' });

  try {
    await promisePool.query(`
      INSERT INTO comment (post_id, user_id, comment_content, created_at)
      VALUES (?, ?, ?, NOW())
    `, [postId, userId, content]);

    await promisePool.query(`
      UPDATE post SET comment_num = comment_num + 1 WHERE post_id = ?
    `, [postId]);

    const [[comment]] = await promisePool.query(`
      SELECT c.comment_id, c.comment_content, c.created_at, u.nickname
      FROM comment c
      JOIN user u ON c.user_id = u.user_id
      WHERE c.post_id = ? AND c.user_id = ?
      ORDER BY c.comment_id DESC LIMIT 1
    `, [postId, userId]);

    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '댓글 작성 중 오류 발생' });
  }
});

// 댓글 삭제 (AJAX)
router.delete('/detail/:postId/comment/:commentId', async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.session.user?.user_id;

  try {
    const [result] = await promisePool.query(`
      DELETE FROM comment WHERE comment_id = ? AND user_id = ?
    `, [commentId, userId]);

    if (result.affectedRows === 0) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await promisePool.query(`
      UPDATE post SET comment_num = comment_num - 1 WHERE post_id = ?
    `, [postId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '댓글 삭제 중 오류 발생' });
  }
});

// 좋아요 토글 (AJAX)
router.post('/like/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    await promisePool.query(`
      UPDATE post SET likes_num = likes_num + 1 WHERE post_id = ?
    `, [postId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// 스크랩 토글 (AJAX)
router.post('/scrap/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    await promisePool.query(`
      UPDATE post SET scrap_num = scrap_num + 1 WHERE post_id = ?
    `, [postId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;