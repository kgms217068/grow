const db = require('../models/db');
const { promisePool } = require('../db/db');

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
    const [missionStatusRows] = await db.promise().query(`
      SELECT 
        COUNT(DISTINCT m.mission_id) AS total,
        COUNT(c.certification_id) AS completed
      FROM mission m
      LEFT JOIN mission_execution me ON m.mission_id = me.mission_id AND me.user_id = ?
      LEFT JOIN certification c ON me.mission_execution_id = c.mission_execution_id 
        AND c.user_id = ? AND c.checked = 1 AND c.confirmed_by_user = 1
      WHERE m.level = ?
    `, [userId, userId, currentLevel]);

    const missionTotal = missionStatusRows[0]?.total ?? 5;

    // 3. 실제 심은 과일 (growth_status 기준) 조회
    const [fruitRows] = await db.promise().query(
      `SELECT f.fruit_name, gs.growth_rate, gs.growth_status_id
       FROM growth_status gs
       JOIN fruit f ON gs.fruit_id = f.fruit_id
       WHERE gs.user_id = ? AND gs.is_harvested = false
       ORDER BY gs.planted_at DESC
       LIMIT 1`,
      [userId]
    );

    const hasPlanted = fruitRows.length > 0;
    const fruitName = hasPlanted ? fruitRows[0].fruit_name : 'default';
    const growthRate = hasPlanted ? fruitRows[0].growth_rate : 0;
    const growthStatusId = hasPlanted ? fruitRows[0].growth_status_id : null;

    // ✅ 성장률 기반으로 계산 (비료 포함된 미션 진행률)
    const inferredCompleted = Math.floor(growthRate / 20); 
    const missionCompleted = inferredCompleted;

    // 4. 이미지 경로 계산
  // 단계 계산
const growthStage = Math.floor(growthRate / 20);

let treeImage;
if (!hasPlanted) {
  treeImage = '/images/tree/default_0.png';
} else if (growthStage >= 0 && growthStage <= 3) {
  // 0~3단계는 공통 이미지 사용 (예: stage_0.png, stage_1.png ...)
  treeImage = `/images/tree/stage_${growthStage}.png`;
} else {
  // 4~5단계는 과일별 이미지 사용 (예: apple_4.png)
  treeImage = `/images/tree/${fruitName}_${growthStage}.png`;
}


 // 5. 자동 수확 처리
if (growthRate >= 100 && growthStatusId) {
  // 1. 성장 상태 업데이트
  await db.promise().query(`
    UPDATE growth_status
    SET is_harvested = true
    WHERE growth_status_id = ? AND user_id = ?
  `, [growthStatusId, userId]);

  // 2. 도감 등록
  await db.promise().query(`
    INSERT IGNORE INTO collection (user_id, fruit_id, collected_at)
    SELECT user_id, fruit_id, NOW()
    FROM growth_status
    WHERE growth_status_id = ? AND user_id = ?
  `, [growthStatusId, userId]);

  // 3. 인벤토리 등록을 위한 데이터 조회
  const [[itemTypeRow]] = await db.promise().query(`
    SELECT item_type_id FROM item_type
    WHERE item_name = ?
  `, [fruitName]);

  const [[inventoryRow]] = await db.promise().query(`
    SELECT inventory_id FROM inventory
    WHERE user_id = ?
  `, [userId]);

  if (itemTypeRow && inventoryRow) {
    // ✅ 일반 과일 (category: 'basic')
    await db.promise().query(`
      INSERT INTO item (inventory_id, item_type_id, item_count, category)
      VALUES (?, ?, 2, 'basic')
      ON DUPLICATE KEY UPDATE item_count = item_count + 2
    `, [inventoryRow.inventory_id, itemTypeRow.item_type_id]);

    // ✅ 황금 과일 (category: 'gold')
    const goldItemName = `gold_${fruitName}`;
    const [[goldItemTypeRow]] = await db.promise().query(`
      SELECT item_type_id FROM item_type
      WHERE item_name = ?
    `, [goldItemName]);

    if (goldItemTypeRow) {
      await db.promise().query(`
        INSERT INTO item (inventory_id, item_type_id, item_count, category)
        VALUES (?, ?, 1, 'gold')
        ON DUPLICATE KEY UPDATE item_count = item_count + 1
      `, [inventoryRow.inventory_id, goldItemTypeRow.item_type_id]);
    }
  }
}
    // 6. 진행률 계산
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