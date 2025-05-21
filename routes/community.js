const express = require('express');
const router = express.Router();
const { promisePool } = require('../db/db');

// 커뮤니티 메인 페이지 - 게시글 목록
router.get('/', async (req, res) => {
  const keyword = req.query.search || '';

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
      WHERE p.post_title LIKE ?
      ORDER BY p.creation_date DESC
    `, [`%${keyword}%`]);

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

// 게시글 상세 보기(comment_num -> comment_id 수정)
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
      SELECT c.comment_id AS comment_id, c.content AS comment_content, c.creation_date AS created_at, u.nickname, c.user_id
      FROM comment c
      JOIN user u ON c.user_id = u.user_id
      WHERE c.post_id = ?
      ORDER BY c.creation_date ASC
`   , [postId]);

      /*  like 테이블 생성한 경우. 해당 사용자가 좋아요를 눌렀었는지의 여부를 불러오고 표시함
      const [[likeStatus]] = await promisePool.query(`
      SELECT 1 AS liked FROM post_like WHERE post_id = ? AND user_id = ?
      `, [postId, userId]);

      const liked = !!likeStatus; //!!는 값을 boolean형태로 강제로 변환.
      res.render('community/community_detail', { post, comments, liked });
      */

    res.render('community/community_detail', { post, comments, userId: req.session.user?.user_id });
  } catch (err) {
    console.error(err);
    res.status(500).send('게시글 상세보기 중 오류 발생');
  }
});

/*
// 댓글 작성 (AJAX) (컬럼 이름 수정 전, 임시 사용자)
router.post('/detail/:postId/comment', async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = 1; //req.session.user?.user_id;

  //if (!userId) return res.status(401).json({ error: '로그인이 필요합니다.' });

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
*/

// 댓글 작성 (AJAX)
router.post('/detail/:postId/comment', async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = 1; // 실제 로그인 연동 시 req.session.user?.user_id 사용

  try {
    // 다음 댓글 번호 계산
    const [[{ nextId }]] = await promisePool.query(`
      SELECT IFNULL(MAX(comment_id), 0) + 1 AS nextId
      FROM comment
      WHERE post_id = ?
    `, [postId]);

    // 댓글 삽입
    await promisePool.query(`
      INSERT INTO comment (comment_id, post_id, user_id, content, creation_date)
      VALUES (?, ?, ?, ?, NOW())
    `, [nextId, postId, userId, content]);

    // 댓글 수 증가
    await promisePool.query(`
      UPDATE post SET comment_num = comment_num + 1 WHERE post_id = ?
    `, [postId]);

    // 삽입된 댓글 조회
    const [[comment]] = await promisePool.query(`
      SELECT c.comment_id, c.content AS comment_content, c.creation_date AS created_at,
             u.nickname, c.user_id
      FROM comment c
      JOIN user u ON c.user_id = u.user_id
      WHERE c.post_id = ? AND c.comment_id = ?
    `, [postId, nextId]);

    // 응답
    res.json({
      comment_id: comment.comment_id,
      comment_content: comment.comment_content,
      nickname: comment.nickname,
      created_at: comment.created_at,
      isMine: comment.user_id === userId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '댓글 작성 중 오류 발생' });
  }
});


// 댓글 삭제 (AJAX)
router.delete('/detail/:postId/comment/:commentId', async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.session.user?.user_id || 1; // 테스트용

  try {
    const [result] = await promisePool.query(`
      DELETE FROM comment
      WHERE comment_id = ? AND post_id = ? AND user_id = ?
    `, [commentId, postId, userId]);

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


/* like 테이블 만들었을 때의 좋아요 토글
router.post('/like/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = req.session.user?.user_id || 1;

  try {
    const [[exists]] = await promisePool.query(`
      SELECT * FROM post_like WHERE user_id = ? AND post_id = ?
    `, [userId, postId]);

    if (exists) {
      // 이미 좋아요 눌렀으면 취소
      await promisePool.query(`
        DELETE FROM post_like WHERE user_id = ? AND post_id = ?
      `, [userId, postId]);

      await promisePool.query(`
        UPDATE post SET likes_num = likes_num - 1 WHERE post_id = ? AND likes_num > 0
      `, [postId]);

      res.json({ success: true, liked: false });
    } else {
      // 처음 누른 경우
      await promisePool.query(`
        INSERT INTO post_like (user_id, post_id) VALUES (?, ?)
      `, [userId, postId]);

      await promisePool.query(`
        UPDATE post SET likes_num = likes_num + 1 WHERE post_id = ?
      `, [postId]);

      res.json({ success: true, liked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: '좋아요 처리 중 오류' });
  }
});
*/

// 스크랩 토글
router.post('/scrap/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = req.session.user?.user_id || 1; // 테스트 시 1

  try {
    const [[exists]] = await promisePool.query(`
      SELECT * FROM scrap WHERE post_id = ? AND user_id = ?
    `, [postId, userId]);

    if (exists) {
      // 이미 스크랩한 경우: 취소
      await promisePool.query(`
        DELETE FROM scrap WHERE post_id = ? AND user_id = ?
      `, [postId, userId]);

      await promisePool.query(`
        UPDATE post SET scrap_num = scrap_num - 1 WHERE post_id = ?
      `, [postId]);

      return res.json({ success: true, scrapped: false });
    } else {
      // 아직 안 한 경우: 등록
      await promisePool.query(`
        INSERT INTO scrap (user_id, post_id, scrap_date)
        VALUES (?, ?, CURDATE())
      `, [userId, postId]);

      await promisePool.query(`
        UPDATE post SET scrap_num = scrap_num + 1 WHERE post_id = ?
      `, [postId]);

      return res.json({ success: true, scrapped: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: '스크랩 처리 중 오류' });
  }
});

/* 토글 기능 구현 전(클릭할 때마다 숫자 올라가기만 함)
// 스크랩 토글 (AJAX)
router.post('/scrap/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = (req.session.user && req.session.user.user_id)? req.session.user.user_id: 1;//없으면 임시 사용자 1(테스트용)
  
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
*/

// 게시글 삭제
router.delete('/post/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = req.session.user?.user_id || 1; // 테스트용

  try {
    // 게시글 작성자 확인
    const [[post]] = await promisePool.query(`
      SELECT user_id FROM post WHERE post_id = ?
    `, [postId]);

    if (!post) {
      return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    }

    if (post.user_id !== userId) {
      return res.status(403).json({ error: '게시글 삭제 권한이 없습니다.' });
    }

    // 댓글, 스크랩 등 연관 데이터 삭제
    await promisePool.query(`DELETE FROM comment WHERE post_id = ?`, [postId]);
    await promisePool.query(`DELETE FROM scrap WHERE post_id = ?`, [postId]);
    // like 테이블이 있다면 아래도 포함하세요
    // await promisePool.query(`DELETE FROM post_like WHERE post_id = ?`, [postId]);

    // 게시글 삭제
    await promisePool.query(`DELETE FROM post WHERE post_id = ?`, [postId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '게시글 삭제 중 오류 발생' });
  }
});

module.exports = router;