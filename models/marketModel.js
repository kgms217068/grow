const { promisePool } = require('../db/db');

module.exports = {
  deleteOldItems: () =>
    promisePool.query(`   
      DELETE FROM growmarket
      WHERE DATE(registered_date) <= CURDATE() - INTERVAL 30 DAY
      `),

getMarketItems: () =>
  promisePool.query(`
    SELECT gm.registration_id, gm.user_id, gm.item_type_id, gm.registered_date, gm.is_sold,
           gm.count, u.nickname, it.item_name, ii.image_path,
           DATEDIFF(DATE_ADD(DATE(gm.registered_date), INTERVAL 30 DAY), CURDATE()) AS dday
    FROM growmarket gm
    JOIN user u ON gm.user_id = u.user_id
    JOIN item_type it ON gm.item_type_id = it.item_type_id
    JOIN item_image ii ON it.item_name = ii.item_name
    WHERE gm.is_sold = 0
    ORDER BY gm.registered_date DESC
  `),

  getInventoryList: () =>
    promisePool.query(`
      SELECT item_type_id, item_name
      FROM item_type
      WHERE item_name IN ('사과', '오렌지', '복숭아')
    `),

  getInventoryIdByUserId: (conn, userId) =>
    conn.query(`SELECT inventory_id FROM inventory WHERE user_id = ?`, [userId]),

  getItemCount: (conn, itemTypeId, inventoryId) =>
    conn.query(`SELECT item_count FROM item WHERE item_type_id = ? AND inventory_id = ?`, [itemTypeId, inventoryId]),

 insertGrowMarketItem: (conn, userId, itemTypeId, now, quantity) =>
  conn.query(`
    INSERT INTO growmarket (user_id, item_type_id, registered_date, is_sold, count)
    VALUES (?, ?, ?, 0, ?)
  `, [userId, itemTypeId, now, quantity]),

  deductItemCount: (conn, quantity, itemTypeId, inventoryId) =>
  conn.query(`
    UPDATE item 
    SET item_count = item_count - ?
    WHERE item_type_id = ? AND inventory_id = ? AND item_count >= ?
  `, [quantity, itemTypeId, inventoryId, quantity]),

  //하루 교환 3번 제한
getTodayExchangeCount: (conn, userId) =>
  conn.query(`
    SELECT COUNT(*) AS count
    FROM growmarket
    WHERE is_sold = 1 AND exchanged_by = ?
      AND DATE(sold_date) = CURDATE()
  `, [userId]),
  
  //교환 여부 업데이트
updateIsSold: (conn, registrationId, userId) =>
  conn.query(`
    UPDATE growmarket
    SET is_sold = 1, sold_date = NOW(), exchanged_by = ?
    WHERE registration_id = ?
  `, [userId, registrationId]),

  // 해당 유저가 등록한 과일 탐색(등록 취소용)
  getGrowMarketItemById: (conn, registrationId, userId) =>
    conn.query(`SELECT * FROM growmarket WHERE registration_id = ? AND user_id = ?`, [registrationId, userId]),

  // 등록된 과일 항목 탐색
  getGrowMarketItemByRegistrationId: (conn, registrationId) =>
  conn.query(`SELECT * FROM growmarket WHERE registration_id = ?`, [registrationId]),

  deleteGrowMarketItem: (conn, registrationId, userId) =>
    conn.query(`DELETE FROM growmarket WHERE registration_id = ? AND user_id = ?`, [registrationId, userId]),

  increaseItemCount: async (conn, itemTypeId, inventoryId, count) => {
  // 먼저 기존 행이 있는지 확인
  const [rows] = await conn.query(
    `SELECT item_count FROM item WHERE item_type_id = ? AND inventory_id = ?`,
    [itemTypeId, inventoryId]
  );

  if (rows.length > 0) {
    // 이미 존재 → UPDATE(수량 증가)
    return conn.query(
      `UPDATE item SET item_count = item_count + ? WHERE item_type_id = ? AND inventory_id = ?`,
      [count, itemTypeId, inventoryId]
    );
  } else {
    // 없으면 새로 INSERT(새로 삽입)
    return conn.query(
      `INSERT INTO item (item_type_id, inventory_id, item_count) VALUES (?, ?, ?)`,
      [itemTypeId, inventoryId, count]
    );
  }
}};