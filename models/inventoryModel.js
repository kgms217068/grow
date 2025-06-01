const { promisePool } = require('../db/db');

exports.getInventoryByUser = async (userId) => {
  const [rows] = await promisePool.query(`
    SELECT i.*, it.name, it.image_url
    FROM inventory i
    JOIN item it ON i.item_id = it.item_id
    WHERE i.user_id = ?
  `, [userId]);
  return rows;
};
