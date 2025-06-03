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
          SUM(CASE WHEN me.completed_or_not = 1 THEN 1 ELSE 0 END) AS completed
        FROM mission m
        LEFT JOIN mission_execution me
          ON m.mission_id = me.mission_id AND me.user_id = ?
        WHERE m.level = ?
      `;


      db.query(missionStatusSql, [userId, currentLevel], (err3, statusResults) => {
        if (err3) return callback(err3);
        
        const completedCount = statusResults[0]?.completed ?? 0;
        const totalCount = 5;

        updateAndGetBadgeType(userId, (err4, badgeType) => {
          if (err4) return callback(err4);

          callback(null, {
            userId: user.id,
            nickname: user.nickname,
            email: user.email,
            level: currentLevel,
            missionStatus: { completed: completedCount, total: totalCount },
            badgeType
          });
        });
      });
    });
  });
};

// ✅ 도감 기반 휘장 계산 및 DB 상태 업데이트
function updateAndGetBadgeType(userId, callback) {
  const getCollectionSql = `SELECT collection_id FROM collection WHERE user_id = ?`;

  db.query(getCollectionSql, [userId], (err, result) => {
    if (err) return callback(err);
    if (result.length === 0) return callback(null, null);

    const collectionId = result[0].collection_id;

    const userFruitCountSql = `
      SELECT f.category, COUNT(DISTINCT f.fruit_name) AS count
      FROM fruit f
      WHERE f.collection_id = ?
        AND f.registered = 1
        AND f.harvested_date IS NOT NULL
        AND f.growth_status_id IN (
          SELECT growth_status_id FROM growth_status WHERE growth_rate = 100
        )
      GROUP BY f.category
    `;

    db.query(userFruitCountSql, [collectionId], (err2, userFruitResults) => {
      if (err2) return callback(err2);

      const userFruitMap = Object.fromEntries(userFruitResults.map(row => [row.category, row.count]));
      const hasSilver = (userFruitMap.basic || 0) === 8;
      const hasGold = (userFruitMap.gold || 0) === 8;

      let newStatus = 0;
      if (hasGold) newStatus = 2;
      else if (hasSilver) newStatus = 1;

      const updateSql = `
        UPDATE collection
        SET collection_completion_status = ?
        WHERE collection_id = ?
      `;

      db.query(updateSql, [newStatus, collectionId], (err3) => {
        if (err3) return callback(err3);

        const badgeType = newStatus === 2 ? 'gold' : newStatus === 1 ? 'silver' : null;
        callback(null, badgeType);
      });
    });
  });
}
