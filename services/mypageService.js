// services/mypageService.js
const db = require('../models/db');

exports.getMyPageData = (userId, callback) => {
  const userSql = `
    SELECT user_id AS id, nickname, email
    FROM user
    WHERE user_id = ?
  `;

  const levelStatusSql = `
    SELECT m.level, COUNT(*) AS completed_count
    FROM mission_execution me
    JOIN mission m ON me.mission_id = m.mission_id
    WHERE me.user_id = ? AND me.completed_or_not = true
    GROUP BY m.level
    ORDER BY m.level ASC
  `;

  db.query(userSql, [userId], (err, userResults) => {
    if (err) return callback(err);
    if (userResults.length === 0) return callback(null, null);

    const user = userResults[0];

    db.query(levelStatusSql, [userId], (err2, levelResults) => {
      if (err2) return callback(err2);

      let currentLevel = 1;
      const levelMap = new Map();
      levelResults.forEach(row => {
        levelMap.set(row.level, row.completed_count);
      });

      for (let lv = 1; lv <= 8; lv++) {
        const count = levelMap.get(lv) || 0;
        if (count < 5) {
          currentLevel = lv;
          break;
        }
      }

      const missionStatusSql = `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN me.completed_or_not = true THEN 1 ELSE 0 END) AS completed
        FROM mission_execution me
        JOIN mission m ON me.mission_id = m.mission_id
        WHERE me.user_id = ? AND m.level = ?
      `;

      db.query(missionStatusSql, [userId, currentLevel], (err3, statusResults) => {
        if (err3) return callback(err3);
        const { total, completed } = statusResults[0];

        getBadgeType(userId, (err4, badgeType) => {
          if (err4) return callback(err4);

          callback(null, {
            userId: user.id,
            nickname: user.nickname,
            email: user.email,
            level: currentLevel,
            missionStatus: { completed, total },
            badgeType // 'silver' | 'gold' | null
          });
        });
      });
    });
  });
};

// 도감 기반 휘장 계산
function getBadgeType(userId, callback) {
  const collectionSql = `SELECT collection_id FROM collection WHERE user_id = ?`;

  db.query(collectionSql, [userId], (err, result) => {
    if (err) return callback(err);
    if (result.length === 0) return callback(null, null);

    const collectionId = result[0].collection_id;

    const userFruitSql = `
      SELECT f.category, COUNT(DISTINCT f.fruit_name) AS count
      FROM fruit f
      JOIN collection c ON f.collection_id = c.collection_id
      WHERE c.user_id = ? AND f.registered = 1
      GROUP BY f.category
    `;

    const totalFruitSql = `
      SELECT category, COUNT(DISTINCT fruit_name) AS total
      FROM fruit
      WHERE registered = 1
      GROUP BY category
    `;

    db.query(userFruitSql, [userId], (err2, userCounts) => {
      if (err2) return callback(err2);

      db.query(totalFruitSql, (err3, totalCounts) => {
        if (err3) return callback(err3);

        const userMap = Object.fromEntries(userCounts.map(row => [row.category, row.count]));
        const totalMap = Object.fromEntries(totalCounts.map(row => [row.category, row.total]));

        const hasSilver = (userMap.basic || 0) === (totalMap.basic || 0);
        const hasGold = (userMap.gold || 0) === (totalMap.gold || 0);

        const badgeType = hasGold ? 'gold' : hasSilver ? 'silver' : null;
        callback(null, badgeType);
      });
    });
  });
}
