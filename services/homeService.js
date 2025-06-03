const db = require('../models/db');

exports.getHomeData = async (userId) => {
  try {
    // 1. 유저 정보 조회
    const [userRows] = await db.promise().query(
      'SELECT nickname FROM user WHERE user_id = ?',
      [userId]
    );
    const user = userRows[0];
    if (!user) throw new Error('User not found');

    // 2. 현재 단계(currentLevel) 계산
    const [levelRows] = await db.promise().query(
      `SELECT m.level, COUNT(*) AS completed_count
       FROM mission_execution me
       JOIN mission m ON me.mission_id = m.mission_id
       WHERE me.user_id = ? AND me.completed_or_not = 1
       GROUP BY m.level
       ORDER BY m.level ASC`,
      [userId]
    );

    let currentLevel = 1;
    const levelMap = new Map();
    levelRows.forEach(row => {
      levelMap.set(row.level, row.completed_count);
    });

    for (let lv = 1; lv <= 8; lv++) {
      const count = levelMap.get(lv) || 0;
      if (count < 5) {
        currentLevel = lv;
        break;
      }
    }

    // 3. 현재 단계의 미션 현황 조회
    const [missionStatusRows] = await db.promise().query(
      `SELECT 
         COUNT(m.mission_id) AS total,
         SUM(CASE WHEN me.completed_or_not = 1 THEN 1 ELSE 0 END) AS completed
       FROM mission m
       LEFT JOIN mission_execution me
         ON m.mission_id = me.mission_id AND me.user_id = ?
       WHERE m.level = ?`,
      [userId, currentLevel]
    );

    const missionTotal = missionStatusRows[0]?.total ?? 0;
    const missionCompleted = missionStatusRows[0]?.completed ?? 0;

    // 4. 과일 이름 조회 (최신 등록 순 기준)
    const [fruitRows] = await db.promise().query(
      `SELECT f.fruit_name
       FROM fruit f
       JOIN collection c ON f.collection_id = c.collection_id
       WHERE c.user_id = ?
       ORDER BY f.registered DESC
       LIMIT 1`,
      [userId]
    );

    const fruitName = fruitRows.length > 0 ? fruitRows[0].fruit_name : 'default';

    // 5. 이미지 경로 계산
    const treeImage = `/images/tree/${fruitName}_${missionCompleted}.png`;

    // 6. 진행률 계산
    const progressRate = missionTotal === 0
      ? 0
      : missionCompleted / missionTotal;

    return {
      nickname: user.nickname,
      level: currentLevel,
      missionCompleted,
      missionTotal,
      progressRate,
      fruitName,
      treeImage
    };
  } catch (err) {
    throw err;
  }
};
