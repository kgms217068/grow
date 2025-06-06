const db = require('../models/db');

exports.getMyPageData = (userId, callback) => {
  // 1. 유저 정보 조회 (level 포함)
  const userSql = `
    SELECT user_id AS id, nickname, email, level
    FROM user
    WHERE user_id = ?
  `;

  db.query(userSql, [userId], (err, userResults) => {
    if (err) return callback(err);
    if (userResults.length === 0) return callback(null, null);

    const user = userResults[0];
    const currentLevel = user.level;

    // 2. 현재 단계의 미션 수행 현황 (certification 기준)
    const missionStatusSql = `
    SELECT 
      COUNT(DISTINCT m.mission_id) AS total,
      COUNT(DISTINCT c.certification_id) AS completed
    FROM mission m
    LEFT JOIN mission_execution me 
      ON m.mission_id = me.mission_id AND me.user_id = ?
    LEFT JOIN certification c 
      ON me.mission_execution_id = c.mission_execution_id 
        AND c.user_id = ? 
        AND c.checked = 1 
        AND c.confirmed_by_user = 1
    WHERE m.level = ?
  `;

    db.query(missionStatusSql, [userId, userId, currentLevel], (err2, statusResults) => {
      if (err2) return callback(err2);

      const completedCount = statusResults[0]?.completed ?? 0;
      const totalCount = statusResults[0]?.total ?? 5;

      updateAndGetBadgeType(userId, (err3, badgeType) => {
        if (err3) return callback(err3);

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
