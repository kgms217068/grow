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
   
const missionCompleted = Number(missionStatusRows[0]?.completed ?? 0);

    // 4. 사용자가 실제로 심은 과일(planted_fruit 기준) 조회
  const [fruitRows] = await db.promise().query(
  `SELECT f.fruit_name, gs.growth_rate
   FROM growth_status gs
   JOIN fruit f ON gs.fruit_id = f.fruit_id
   WHERE gs.user_id = ? AND gs.is_harvested = false
   ORDER BY gs.planted_at DESC
   LIMIT 1
  `,
  [userId]
);

    const hasPlanted = fruitRows.length > 0;
const fruitName = hasPlanted ? fruitRows[0].fruit_name : 'default';
const growthRate = hasPlanted ? fruitRows[0].growth_rate : 0;
// 이미지 경로 계산

const treeImage = hasPlanted
  ? `/images/tree/${fruitName}_${Math.floor(growthRate / 20)}.png`
  : '/images/tree/default_0.png';

if (growthRate >= 100) {
  // 자동 수확 가능 상태
  await promisePool.query(`
    UPDATE growth_status SET is_harvested = true
    WHERE growth_status_id = ? AND user_id = ?
  `, [growthStatusId, userId]);

  // 도감 등록
  await promisePool.query(`
    INSERT IGNORE INTO collection (user_id, fruit_id, collected_at)
    SELECT user_id, fruit_id, NOW()
    FROM growth_status
    WHERE growth_status_id = ? AND user_id = ?
  `, [growthStatusId, userId]);
}


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
