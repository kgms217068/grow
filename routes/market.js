//이미지 렌더링 미포함 
const express = require('express');
const router = express.Router();
const { promisePool } = require('../db/db');

// 📌 마켓 메인 화면
router.get('/', async (req, res) => {
  //const userId = req.session.user?.user_id || 1; //아래랑 같은 코드. optional chaining 형태
  const userId = (req.session.user && req.session.user.user_id) ? req.session.user.user_id : 1;

  try {
    // 30일이 지난 항목 삭제
    await promisePool.query(`
      DELETE FROM growmarket WHERE DATEDIFF(NOW(), registered_date) > 30
    `);

    // 마켓 항목 조회(등록 최신순 정렬)
    const [fruits] = await promisePool.query(`
      SELECT gm.registration_id, gm.user_id, gm.registered_date, gm.is_sold,
             u.nickname,
             DATEDIFF(DATE_ADD(gm.registered_date, INTERVAL 30 DAY), CURDATE()) AS dday
      FROM growmarket gm
      JOIN user u ON gm.user_id = u.user_id
      ORDER BY gm.registered_date DESC 
    `);

    // 사용자 보유 과일 목록 (이미지 없이)
    const [inventory] = await promisePool.query(`
      SELECT i.item_type_id, it.item_name
      FROM item i
      JOIN item_type it ON i.item_type_id = it.item_type_id
      WHERE i.inventory_id = ?
    `, [userId]);

    res.render('market', { fruits, inventory, user: { user_id: userId } });
  } catch (err) {
    console.error(err);
    res.status(500).send('마켓 정보를 불러오는 데 실패했습니다.');
  }
});

// 📌 과일 등록
router.post('/register', async (req, res) => {
  const { itemTypeId, quantity } = req.body;
  const userId = (req.session.user && req.session.user.user_id) ? req.session.user.user_id : 1;

  if (!itemTypeId || !quantity) {
    return res.status(400).send('과일 종류와 수량을 입력해주세요.');
  }

  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();

    const [check] = await conn.query(`
      SELECT item_count FROM item WHERE item_type_id = ? AND storage_id = ?
    `, [itemTypeId, userId]);

    if (!check.length || check[0].item_count < quantity) {
      await conn.rollback();
      return res.status(400).send('보관함에 과일이 부족합니다.');
    }

    const now = new Date();
    for (let i = 0; i < quantity; i++) {
      await conn.query(`
        INSERT INTO growmarket (registration_id, user_id, registered_date, is_sold)
        VALUES (?, ?, ?, 0)
      `, [Date.now() + i, userId, now]);
    }

    await conn.query(`
      UPDATE item SET item_count = item_count - ? WHERE item_type_id = ? AND storage_id = ?
    `, [quantity, itemTypeId, userId]);

    await conn.commit();
    res.redirect('/market');
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).send('과일 등록 중 오류 발생');
  } finally {
    conn.release();
  }
});

// 📌 교환 요청
router.post('/exchange/:registrationId', async (req, res) => {
  const { registrationId } = req.params;
  try {
    await promisePool.query(`
      UPDATE growmarket SET is_sold = 1 WHERE registration_id = ?
    `, [registrationId]);
    res.redirect('/market');
  } catch (err) {
    console.error(err);
    res.status(500).send('교환 요청 처리 중 오류 발생');
  }
});

// 📌 등록 취소
router.post('/cancel/:registrationId', async (req, res) => {
  const { registrationId } = req.params;
  const userId = req.session.user?.user_id || 1;

  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(`
      SELECT * FROM growmarket WHERE registration_id = ? AND user_id = ?
    `, [registrationId, userId]);

    if (!result.length) {
      await conn.rollback();
      return res.status(404).send('등록 항목을 찾을 수 없습니다.');
    }

    const itemTypeId = 1; // 실제 복원 로직은 개선 필요

    await conn.query(`
      DELETE FROM growmarket WHERE registration_id = ? AND user_id = ?
    `, [registrationId, userId]);

    await conn.query(`
      UPDATE item SET item_count = item_count + 1 WHERE item_type_id = ? AND storage_id = ?
    `, [itemTypeId, userId]);

    await conn.commit();
    res.redirect('/market');
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).send('등록 취소 중 오류 발생');
  } finally {
    conn.release();
  }
});

module.exports = router;
