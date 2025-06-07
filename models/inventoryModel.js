const { promisePool } = require('../db/db');

/*
// inventoryModel.js
exports.createInitialInventory = async (userId) => {
  // 예: item_id 1 = 비료
  await promisePool.query(
    `INSERT INTO inventory (user_id, item_id, item_count)
     VALUES (?, 999, 0)`, // 비료 초기값 0개
    [userId]
  );
};
*/
exports.createInitialInventory = async (userId) => {
  // 1. 인벤토리 먼저 생성
  const [result] = await promisePool.query(
    `INSERT INTO inventory (user_id) VALUES (?)`,
    [userId]
  );
  const inventoryId = result.insertId;

  // 2. 비료 타입 ID 조회
  const [[fertilizerType]] = await promisePool.query(`
    SELECT item_type_id FROM item_type WHERE item_name = '비료'
  `);

  // 3. 비료 지급
  await promisePool.query(`
    INSERT INTO item (inventory_id, item_type_id, item_count)
    VALUES (?, ?, 0)
    ON DUPLICATE KEY UPDATE item_count = item_count + 0
  `, [inventoryId, fertilizerType.item_type_id]);
};


// inventoryModel.js 안에 추가
/*
exports.giveDefaultSeedToUser = async (userId) => {
  const [[appleItem]] = await promisePool.query(`
    SELECT i.item_id
    FROM item i
    JOIN item_type it ON i.item_type_id = it.item_type_id
    WHERE it.item_name = "사과"
  `);
/*
JOIN item_type t ON i.item_type_id = t.item_type_id
WHERE t.item_name = "사과"

  if (!appleItem) throw new Error('❌ 사과 item_id 없음');

  await promisePool.query(`
    INSERT INTO inventory (user_id, item_id, item_count)
    VALUES (?, ?, 1)
    ON DUPLICATE KEY UPDATE item_count = item_count + 1
  `, [userId, appleItem.item_id]);
};

exports.giveDefaultSeedToUser = async (userId) => {
  // 1. 유저의 inventory_id 가져오기
  const [[{ inventory_id }]] = await promisePool.query(`
    SELECT inventory_id FROM inventory WHERE user_id = ?
  `, [userId]);

  // 2. 사과 item_type_id 가져오기
  const [[appleType]] = await promisePool.query(`
    SELECT item_type_id FROM item_type WHERE item_name = "apple"
  `);

  if (!appleType) throw new Error('❌ 사과 item_type_id 없음');

  // 3. 해당 inventory에 사과 아이템 삽입 (없으면 생성, 있으면 개수 +1)
  await promisePool.query(`
    INSERT INTO item (inventory_id, item_type_id, item_count)
    VALUES (?, ?, 1)
    ON DUPLICATE KEY UPDATE item_count = item_count + 1
  `, [inventory_id, appleType.item_type_id]);
};
*/
exports.giveRandomSeedToUser = async (userId) => {
  // 1. 유저의 inventory_id 가져오기
  const [[{ inventory_id }]] = await promisePool.query(`
    SELECT inventory_id FROM inventory WHERE user_id = ?
  `, [userId]);

  // 2. 유저가 보유 중인 씨앗 목록 조회
  const [userSeeds] = await promisePool.query(`
    SELECT it.item_name
    FROM item i
    JOIN item_type it ON i.item_type_id = it.item_type_id
    WHERE i.inventory_id = ? AND it.item_name IN ('apple', 'orange', 'peach')
  `, [inventory_id]);

  const ownedSeedNames = userSeeds.map(row => row.item_name);

  // 3. 전체 옵션에서 이미 받은 것 제외
  const seedOptions = ['apple', 'orange', 'peach'];
  const availableSeeds = seedOptions.filter(seed => !ownedSeedNames.includes(seed));

  // ✅ 모두 소유한 경우는 아무거나 지급 (기본값)
  const candidates = availableSeeds.length > 0 ? availableSeeds : seedOptions;

  // 4. 랜덤 선택
  const selectedSeed = candidates[Math.floor(Math.random() * candidates.length)];

  // 5. 선택된 과일의 item_type_id 가져오기
  const [[seedType]] = await promisePool.query(`
    SELECT item_type_id FROM item_type WHERE item_name = ?
  `, [selectedSeed]);

  if (!seedType) throw new Error(`❌ ${selectedSeed} item_type_id 없음`);

  // 6. 인벤토리에 삽입 또는 개수 +1
  await promisePool.query(`
    INSERT INTO item (inventory_id, item_type_id, item_count)
    VALUES (?, ?, 1)
    ON DUPLICATE KEY UPDATE item_count = item_count + 1
  `, [inventory_id, seedType.item_type_id]);

  return selectedSeed;
};

/*
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
*/
exports.getInventoryByUser = async (userId) => {
  const [[inventoryRow]] = await promisePool.query(`
    SELECT inventory_id FROM inventory WHERE user_id = ?
  `, [userId]);

  const inventoryId = inventoryRow.inventory_id;

  const [rows] = await promisePool.query(`
    SELECT 
      i.item_id,
      i.item_count,
      it.item_name,
      it.category,
      img.image_path,
      img.description
    FROM item i
    JOIN item_type it ON i.item_type_id = it.item_type_id
    LEFT JOIN item_image img ON it.item_name = img.item_name
    WHERE i.inventory_id = ?
  `, [inventoryId]);
  
  //console.log("🔍 인벤토리 조회 결과:", rows);

  return rows;
};

