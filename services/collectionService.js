const db = require('../models/db');

exports.getUserCollection = (userId, category, page, limit, callback) => {
  const offset = (page - 1) * limit;

  // 전체 과일 개수 구하는 쿼리
  let countSql = `
    SELECT COUNT(*) AS total
    FROM fruit f
    JOIN growth_status gs ON f.growth_status_id = gs.growth_status_id
    JOIN collection c ON f.collection_id = c.collection_id
    WHERE c.user_id = ?
      AND f.harvested_date IS NOT NULL
      AND gs.growth_rate = 100
      AND f.registered = 1
  `;
  const countParams = [userId];
  if (category) {
    countSql += ' AND f.category = ?';
    countParams.push(category);
  }

  db.query(countSql, countParams, (countErr, countResult) => {
    if (countErr) return callback(countErr);

    const totalFruits = countResult[0].total;
    const totalPages = Math.ceil(totalFruits / limit);

    // 실제 과일 조회 쿼리
    let sql = `
      SELECT f.fruit_name, f.category, f.harvested_date
      FROM fruit f
      JOIN growth_status gs ON f.growth_status_id = gs.growth_status_id
      JOIN collection c ON f.collection_id = c.collection_id
      WHERE c.user_id = ?
        AND f.harvested_date IS NOT NULL
        AND gs.growth_rate = 100
        AND f.registered = 1
    `;
    const params = [userId];
    if (category) {
      sql += ' AND f.category = ?';
      params.push(category);
    }
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.query(sql, params, (err, results) => {
      if (err) return callback(err);

      return callback(null, {
        currentPage: page,
        totalPages,
        totalFruits,
        fruits: results
      });
    });
  });
};
