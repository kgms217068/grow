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

        // 2. 현재 단계의 미션 개수만 먼저 조회
    const missionCountSql = `
      SELECT COUNT(DISTINCT mission_id) AS total
      FROM mission
      WHERE level = ?
    `;

    db.query(missionCountSql, [currentLevel], (err2, totalResults) => {
      if (err2) return callback(err2);

      const totalCount = totalResults[0]?.total ?? 5;

      // ✅ growth_status에서 성장률 가져와서 미션 수행 개수 추론
      const growthSql = `
        SELECT growth_rate
        FROM growth_status
        WHERE user_id = ? AND is_harvested = false
        ORDER BY planted_at DESC
        LIMIT 1
      `;

      db.query(growthSql, [userId], (err3, growthResults) => {
        if (err3) return callback(err3);

        const growthRate = growthResults[0]?.growth_rate ?? 0;
        const completedCount = Math.floor(growthRate / 20);

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
