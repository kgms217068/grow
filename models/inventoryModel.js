const { promisePool } = require('../db/db');


// inventoryModel.js
exports.createInitialInventory = async (userId) => {
  // 예: item_id 1 = 비료
  await promisePool.query(
    `INSERT INTO inventory (user_id, item_id, item_count)
     VALUES (?, 999, 0)`, // 비료 초기값 0개
    [userId]
  );
};

// inventoryModel.js 안에 추가
exports.giveDefaultSeedToUser = async (userId) => {
  const [[appleItem]] = await promisePool.query(
    'SELECT item_id FROM item WHERE item_name = "사과"'
  );

  if (!appleItem) throw new Error('❌ 사과 item_id 없음');

  await promisePool.query(`
    INSERT INTO inventory (user_id, item_id, item_count)
    VALUES (?, ?, 1)
    ON DUPLICATE KEY UPDATE item_count = item_count + 1
  `, [userId, appleItem.item_id]);
};


exports.getInventoryByUser = async (userId) => {
  const [rows] = await promisePool.query(`
    SELECT 
      i.*, 
      it.item_name AS name,
      img.image_path AS image_url,
      it.category
    FROM inventory i
    JOIN item it ON i.item_id = it.item_id
    LEFT JOIN item_image img ON it.item_name = img.item_name
    WHERE i.user_id = ?
  `, [userId]);


  return rows;
};


