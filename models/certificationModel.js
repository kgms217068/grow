const { promisePool } = require('../db/db');

exports.saveCertification = async (data) => {
  const sql = `
    INSERT INTO certification (mission_id, user_id, photo, memo, is_success)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await promisePool.query(sql, [
    data.mission_id,
    data.user_id,
    data.photo,
    data.memo,
    data.is_success
  ]);
  return result;
};

exports.getCertificationsByUser = async (userId) => {
    const [rows] = await promisePool.query(
      'SELECT * FROM certification WHERE user_id = ?',
      [userId]
    );
    return rows;
  };
  
