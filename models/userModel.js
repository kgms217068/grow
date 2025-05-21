const { promisePool } = require('../db/db');

exports.getUserById = async (userId) => {
  const [rows] = await promisePool.query('SELECT * FROM user WHERE user_id = ?', [userId]);
  return rows[0]; // 단일 사용자
};
