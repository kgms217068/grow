// routes/admin.js
const express = require('express');
const router = express.Router();
const { promisePool } = require('../db/db');

// 인증 요청 목록 (checked = false인 것만)
router.get('/certifications', async (req, res) => {
   try {
    const [certs] = await promisePool.query(`
      SELECT 
        c.certification_id, 
        c.image_source, 
        c.certification_date,
        u.nickname,
        m.description
      FROM certification c
      JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
      JOIN user u ON c.user_id = u.user_id
      JOIN mission m ON me.mission_id = m.mission_id
      WHERE c.checked = false
      ORDER BY c.certification_date DESC
    `);

    const [approvedCerts] = await promisePool.query(`
      SELECT c.certification_id, u.nickname, m.description, c.certification_date, c.image_source
FROM certification c
JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
JOIN mission m ON me.mission_id = m.mission_id
JOIN user u ON c.user_id = u.user_id
WHERE c.checked = 1 AND c.confirmed_by_user = 1
  AND c.certification_date >= DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY c.certification_date DESC

    `);

    res.render('admin/certifications', { certs, approvedCerts });
  } catch (err) {
    console.error('인증 목록 조회 실패:', err);
    res.status(500).send('서버 오류');
  }
}); 

// 인증 승인 처리
router.post('/certifications/:id/approve', async (req, res) => {
  const certificationId = req.params.id;

  try {
    await promisePool.query(`
      UPDATE certification
      SET checked = true,confirmed_by_user = false
      WHERE certification_id = ?
    `, [certificationId]);

    res.redirect('/admin/certifications'); // 승인 후 목록으로 리다이렉트
  } catch (err) {
    console.error('승인 실패:', err);
    res.status(500).send('인증 승인 중 오류가 발생했습니다.');
  }
});

// 인증 취소 처리 (checked = false로 되돌림)
router.post('/certifications/:id/cancel', async (req, res) => {
  const certificationId = req.params.id;

  try {
    // 1. mission_execution_id, user_id 가져오기
    const [[certRow]] = await promisePool.query(`
      SELECT mission_execution_id, user_id, confirmed_by_user
      FROM certification
      WHERE certification_id = ?
    `, [certificationId]);

    const { mission_execution_id, user_id, confirmed_by_user } = certRow;
    // 2. 인증 취소 (checked = false)
    await promisePool.query(`
      UPDATE certification
      SET checked = false
      WHERE certification_id = ?
    `, [certificationId]);

    // 3. 사용자가 완료했었다면 → 비료 회수
    if (confirmed_by_user) {
      // 인벤토리 ID 조회
      const [[inventoryRow]] = await promisePool.query(`
        SELECT inventory_id FROM inventory WHERE user_id = ?
      `, [user_id]);

      const inventoryId = inventoryRow.inventory_id;

      // 비료 타입 ID 조회
      const [[fertilizerRow]] = await promisePool.query(`
        SELECT item_type_id FROM item_type WHERE item_name = '비료'
      `);

      const fertilizerTypeId = fertilizerRow.item_type_id;

      // item_count가 1 이상일 때만 감소
      await promisePool.query(`
        UPDATE item
        SET item_count = item_count - 1
        WHERE inventory_id = ? AND item_type_id = ? AND item_count > 0
      `, [inventoryId, fertilizerTypeId]);
    }

    res.redirect('/admin/certifications');
  } catch (err) {
    console.error('취소 실패:', err);
    res.status(500).send('인증 취소 중 오류가 발생했습니다.');
  }
});

module.exports = router;
