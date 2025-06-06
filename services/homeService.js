const db = require('../models/db');
const { promisePool } = require('../db/db');

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

  // 4. 현재 심은 나무가 있는지 확인 (is_harvested = false)
const [plantedRows] = await promisePool.query(`
  SELECT gs.growth_status_id, gs.growth_rate, gs.is_harvested, 
  f.fruit_name, f.fruit_id
  FROM growth_status gs
  JOIN fruit f ON gs.fruit_id = f.fruit_id
  WHERE gs.user_id = ? AND gs.is_harvested = false
  ORDER BY gs.planted_at DESC
  LIMIT 1
`, [userId]);

let hasPlanted = plantedRows.length > 0;
let growthStatusId = null;
let growthRate = 0;
let fruitId = null;
let fruitName = 'default';

if (hasPlanted) {
  const planted = plantedRows[0];
  growthStatusId = planted.growth_status_id;
  growthRate = planted.growth_rate;
  fruitId = planted.fruit_id;
  fruitName = planted.fruit_name;

  // ✅ 성장률이 100 이상이면 자동 수확 및 도감 등록
  if (growthRate >= 100) {
    await promisePool.query(`
      UPDATE growth_status SET is_harvested = true
      WHERE growth_status_id = ? AND user_id = ?
    `, [growthStatusId, userId]);

  if (fruitId) {
  const [fruitExist] = await promisePool.query(
    'SELECT * FROM fruit WHERE fruit_id = ?',
    [fruitId]
  );

  if (fruitExist.length === 0) {
    console.error('❌ 잘못된 fruitId:', fruitId);
  } else {
    await promisePool.query(`
      INSERT IGNORE INTO collection (user_id, fruit_id, collected_at)
      VALUES (?, ?, NOW())
    `, [userId, fruitId]);
    console.log('✅ 도감에 추가됨:', { userId, fruitId });
  }
} else {
  console.error('❌ fruitId가 정의되지 않음!');
}

    // 수확 후 현재 나무가 없기 때문에 이미지/데이터 초기화
    hasPlanted = false;
    fruitName = 'default';
    growthRate = 0;
  }
}

// 🌱 이미지 경로 구성 (성장률 기준)
const stage = Math.floor(growthRate / 20); // 예: 40 → 2
const treeImage = hasPlanted
  ? `/images/tree/${fruitName}_${stage}.png`
  : '/images/tree/default_0.png';





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
