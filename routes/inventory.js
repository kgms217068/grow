const express = require('express');
const router = express.Router();
const { promisePool } = require('../db/db');

router.get('/', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;

  const [items] = await promisePool.query(`
    SELECT 
  i.item_id, 
  i.item_count, 
  it.item_name, 
  i.category, -- ✅ 핵심 수정
  ii.image_path,
  ii.description
FROM item i
JOIN item_type it ON i.item_type_id = it.item_type_id
JOIN item_image ii ON it.item_name = ii.item_name
WHERE i.inventory_id = (SELECT inventory_id FROM inventory WHERE user_id = ?)
ORDER BY i.item_id

  `, [userId]);

  res.render('inventory', { items });
});
// ✅ 씨앗 심기 POST 요청
router.post('/plant', async (req, res) => {
  const { itemId } = req.body;
  const userId = req.session.user?.user_id || req.user?.user_id;

  try {
    const [result] = await promisePool.query(`
      UPDATE item
      SET item_count = item_count - 1
      WHERE item_id = ? AND inventory_id = (SELECT inventory_id FROM inventory WHERE user_id = ?) AND item_count > 0
    `, [itemId, userId]);

    if (result.affectedRows > 0) {
      res.redirect('/inventory');
    } else {
      res.status(400).send('아이템이 없거나 수량이 부족합니다.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('씨앗 심기에 실패했습니다.');
  }
});
module.exports = router;
