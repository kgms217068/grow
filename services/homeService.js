const db = require('../models/db');

exports.getHomeData = async (userId) => {
  try {
    // 1. 유저 정보 조회
    const [userRows] = await db.promise().query(
      'SELECT nickname, level FROM user WHERE user_id = ?',
      [userId]
    );
    const user = userRows[0];
    if (!user) throw new Error('User not found');

    // 2. 현재 단계의 미션 완료 여부 조회
    const [missionRows] = await db.promise().query(
      `SELECT me.completed_or_not
       FROM mission_execution me
       JOIN mission m ON me.mission_id = m.mission_id
       WHERE me.user_id = ? AND m.level = ?`,
      [userId, user.level]
    );

    const missionTotal = missionRows.length;
    const missionCompleted = missionRows.filter(row => row.completed_or_not).length;

    // 3. 과일 이름 그대로 사용 (최신 등록 순 기준)
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

    // 4. 이미지 경로 계산
    const treeImage = `/images/tree/${fruitName}_${missionCompleted}.png`;

    // 5. 진행률 계산
    const progressRate = missionTotal === 0
      ? 0
      : missionCompleted / missionTotal;

    return {
      nickname: user.nickname,
      level: user.level,
      missionCompleted,
      missionTotal,
      progressRate,
      fruitName,
      treeImage  // EJS에서 <img src="<%= treeImage %>"> 등으로 사용
    };
  } catch (err) {
    throw err;
  }
};
