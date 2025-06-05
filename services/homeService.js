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

    const missionTotal = 5;
    const missionCompleted = missionStatusRows[0]?.completed ?? 0;

    // 4. 사용자가 실제로 심은 과일(planted_fruit 기준) 조회
    const [fruitRows] = await db.promise().query(
      `SELECT fruit_name FROM planted_fruit WHERE user_id = ?`,
      [userId]
    );

    const hasPlanted = fruitRows.length > 0;
    const fruitName = hasPlanted ? fruitRows[0].fruit_name : 'default';

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
      treeImage,
      hasPlanted // ✅ 프론트엔드에서 팝업 조건으로 사용
    };
  } catch (err) {
    throw err;
  }
};
