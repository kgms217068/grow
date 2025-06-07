const { promisePool } = require('../db/db');


// inventoryModel.js
exports.createInitialInventory = async (userId) => {
  const [existing] = await promisePool.query(
    'SELECT * FROM inventory WHERE user_id = ?', [userId]
  );

  if (existing.length === 0) {
    await promisePool.query(
      'INSERT INTO inventory (user_id) VALUES (?)', [userId]
    );
    console.log('✅ inventory row 생성 완료');
  } else {
    console.log('ℹ️ 이미 inventory 있음');
  }
};

exports.createUserInventory = async (userId) => {
  if (!userId) {
    console.error("❌ userId가 없습니다. 인벤토리 생성 중단");
    return;
  }
console.log("🔧 회원가입 후 userId:", userId);
await createUserInventory(userId);

  const [existing] = await promisePool.query(
    `SELECT * FROM inventory WHERE user_id = ?`, [userId]
  );

  if (existing.length === 0) {
    console.log("✅ 새 인벤토리 생성됨");
    await promisePool.query(
      `INSERT INTO inventory (user_id) VALUES (?)`, [userId]
    );
  } else {
    console.log("ℹ️ 이미 인벤토리 존재");
  }
};



// inventoryModel.js 안에 추가
exports.giveDefaultSeedToUser = async (userId) => {
  const [[inventoryRow]] = await promisePool.query(`
    SELECT inventory_id FROM inventory WHERE user_id = ?
  `, [userId]);
  if (!inventoryRow) throw new Error('❌ 해당 유저의 인벤토리가 없습니다.');

  const inventoryId = inventoryRow.inventory_id;

  const [[appleType]] = await promisePool.query(`
    SELECT item_type_id FROM item_type WHERE item_name = "사과"
  `);
  if (!appleType) throw new Error('❌ 사과 item_type_id 없음');

  // 같은 item_type이 이미 있는지 확인
  const [[existing]] = await promisePool.query(`
    SELECT * FROM item
    WHERE inventory_id = ? AND item_type_id = ?
  `, [inventoryId, appleType.item_type_id]);

  if (existing) {
    await promisePool.query(`
      UPDATE item SET item_count = item_count + 1
      WHERE item_id = ?
    `, [existing.item_id]);
  } else {
    await promisePool.query(`
      INSERT INTO item (inventory_id, item_type_id, item_count, category)
      VALUES (?, ?, 1, '씨앗')
    `, [inventoryId, appleType.item_type_id]);
  }
};



exports.getInventoryByUser = async (userId) => {
  const [rows] = await promisePool.query(`
    SELECT 
      i.item_id,
      i.item_count,
      it.item_name,
      it.category,
      img.image_path,
      it.description
    FROM item i
    JOIN inventory inv ON i.inventory_id = inv.inventory_id
    JOIN item_type it ON i.item_type_id = it.item_type_id
    LEFT JOIN item_image img ON it.item_name = img.item_name
    WHERE inv.user_id = ?
  `, [userId]);


  return rows;
};


