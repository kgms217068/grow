const db = require('../models/db');

exports.getHomeData = async (userId) => {
  try {
    // 1. 유저 닉네임과 현재 단계(level) 조회
    const [[userRow]] = await db.promise().query(
      'SELECT nickname, level FROM user WHERE user_id = ?',
      [userId]
    );
    if (!userRow) throw new Error('User not found');

    const currentLevel = userRow.level;

    // 2. 현재 단계의 미션 수행 현황
    const [statusRows] = await db.promise().query(`
      SELECT 
        COUNT(DISTINCT m.mission_id) AS total,
        COUNT(c.certification_id) AS completed
      FROM mission m
      LEFT JOIN mission_execution me ON m.mission_id = me.mission_id AND me.user_id = ?
      LEFT JOIN certification c ON me.mission_execution_id = c.mission_execution_id 
        AND c.user_id = ? AND c.checked = 1 AND c.confirmed_by_user = 1
      WHERE m.level = ?
    `, [userId, userId, currentLevel]);

    const missionTotal = statusRows[0]?.total ?? 5;
    const missionCompleted = statusRows[0]?.completed ?? 0;

    // 3. 심은 과일 확인 (삭제 없이 단순 조회만!)
    let hasPlanted = false;
    let fruitName = 'default';
    const [fruitRows] = await db.promise().query(
      'SELECT fruit_name FROM planted_fruit WHERE user_id = ?',
      [userId]
    );
    if (fruitRows.length > 0) {
      hasPlanted = true;
      fruitName = fruitRows[0].fruit_name;
    }

    // 4. 이미지 경로 생성
    const treeImage = missionCompleted === 0
      ? `/images/tree/default_0.png`
      : `/images/tree/${fruitName}_${missionCompleted}.png`;

    // 5. 진행률
    const progressRate = missionTotal === 0 ? 0 : missionCompleted / missionTotal;

    return {
      nickname: userRow.nickname,
      level: currentLevel,
      missionCompleted,
      missionTotal,
      progressRate,
      fruitName,
      treeImage,
      hasPlanted
    };

  } catch (err) {
    throw err;
  }
};
