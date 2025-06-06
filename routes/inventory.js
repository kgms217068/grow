const express = require('express');
const router = express.Router();
const { promisePool } = require('../db/db');

// GET: 인벤토리 화면
router.get('/', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;

  const [items] = await promisePool.query(`
    SELECT 
      i.item_id, 
      i.item_count, 
      it.item_name, 
      i.category,
      ii.image_path,
      ii.description
    FROM item i
    JOIN item_type it ON i.item_type_id = it.item_type_id
    JOIN item_image ii ON it.item_name = ii.item_name
    WHERE i.inventory_id = (SELECT inventory_id FROM inventory WHERE user_id = ?)
    ORDER BY i.item_id
  `, [userId]);

// 🔍 성장 중인 나무가 있는지 확인
const [plantedRows] = await promisePool.query(`
  SELECT gs.growth_status_id, gs.growth_rate, gs.is_harvested, f.fruit_name, gr.image_path
  FROM growth_status gs
  JOIN fruit f ON gs.fruit_id = f.fruit_id
  JOIN growth_rate gr ON gs.growth_rate = gr.growth_rate
  WHERE gs.user_id = ? AND gs.is_harvested = false
`, [userId]);

const hasPlanted = plantedRows.length > 0;
const plantedFruits = plantedRows;

res.render('inventory', { items, hasPlanted, plantedFruits });

});

// ✅ POST: 씨앗 심기 처리
router.post('/plant', async (req, res) => {
  const { itemId, fruitName } = req.body;
  const userId = req.session.user?.user_id || req.user?.user_id;

  if (!fruitName) {
    return res.status(400).send('씨앗 이름이 전달되지 않았습니다.');
  }

  try {
    // ✅ 이미 성장 중인 나무가 있으면 심지 않음
    const [existing] = await promisePool.query(
      'SELECT * FROM growth_status WHERE user_id = ? AND is_harvested = false',
      [userId]
    );
    if (existing.length > 0) {
      return res.status(400).send('이미 성장 중인 나무가 있습니다.');
    }

    // ✅ 씨앗 수량 차감
    const [updateResult] = await promisePool.query(`
      UPDATE item
      SET item_count = item_count - 1
      WHERE item_id = ? AND inventory_id = (
        SELECT inventory_id FROM inventory WHERE user_id = ?
      ) AND item_count > 0
    `, [itemId, userId]);
    if (updateResult.affectedRows === 0) {
      return res.status(400).send('씨앗 수량 부족');
    }

    // ✅ fruit_name → fruit_id 매핑
    const [[fruitRow]] = await promisePool.query(`
      SELECT fruit_id FROM fruit WHERE fruit_name = ?
    `, [fruitName]);
    if (!fruitRow) {
      return res.status(400).send('유효하지 않은 과일 이름입니다.');
    }

    const fruitId = fruitRow.fruit_id;

    // ✅ growth_status에 심기
    await promisePool.query(`
      INSERT INTO growth_status (user_id, fruit_id, growth_rate, is_harvested, planted_at)
      VALUES (?, ?, 0, false, NOW())
    `, [userId, fruitId]);

    res.redirect('/home');
  } catch (err) {
    console.error('🌱 씨앗 심기 중 오류:', err);
    res.status(500).send('씨앗 심기 중 오류');
  }
});



module.exports = router;
