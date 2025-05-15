// routes/admin.js
const express = require('express');
const router = express.Router();
const { promisePool } = require('../db/db');

// 인증 요청 목록 (checked = false인 것만)
router.get('/certifications', async (req, res) => {
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

  res.render('admin/certifications', { certs });
});

// 인증 승인 처리
router.post('/certifications/:id/approve', async (req, res) => {
  const certificationId = req.params.id;

  try {
    await promisePool.query(`
      UPDATE certification
      SET checked = true
      WHERE certification_id = ?
    `, [certificationId]);

    res.redirect('/admin/certifications'); // 승인 후 목록으로 리다이렉트
  } catch (err) {
    console.error('승인 실패:', err);
    res.status(500).send('인증 승인 중 오류가 발생했습니다.');
  }
});


module.exports = router;