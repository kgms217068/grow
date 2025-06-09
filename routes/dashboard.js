const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { promisePool } = require('../db/db');
const certModel = require('../models/certificationModel');
const missionModel = require('../models/missionModel');
const userModel = require('../models/userModel');
const { createInitialInventory } = require('../models/inventoryModel');

//추가: multer 관련
const fs = require('fs');
// ✅ 업로드 경로 상수
const uploadPath = path.join(__dirname, '../public/uploads');

// ✅ uploads 폴더가 없으면 생성
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ✅ GET /dashboard
router.get('/', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;
  

const user = await userModel.getUserById(userId); // ✅ 유저 정보 가져오기

  const allMissions = await missionModel.getAllMissions();
  const certifications = await certModel.getCertificationsByUser(userId);
  const completedIds = certifications.map(c => c.mission_id);

  const nextMission = allMissions.find(m => !completedIds.includes(m.mission_id));
  const result = certifications.find(c => c.mission_id === nextMission?.mission_id);

const missionId = req.query.missionId;

  let mission = null;

  if (missionId) {
    const [[selected]] = await promisePool.query(`
      SELECT * FROM mission WHERE mission_id = ?
    `, [missionId]);
    mission = selected || null;
  } else {
    // 기존 방식대로 nextMission 사용
    mission = nextMission || null;
  }




  res.render('dashboard/index', {
    mission: nextMission || null,
    result: result || null,
    title: 'dashboard',
    currentPath: req.path
  });
});

// ✅ POST /dashboard/submit
router.post('/submit', upload.single('photo'), async (req, res) => {
  try {
    const userId = req.session.user?.user_id || req.user?.user_id;
    const missionId = parseInt(req.body.missionId);
    const image_source = req.file ? req.file.filename : null;

    // 1. 미션 실행 삽입
    const [missionExecResult] = await promisePool.query(
      'INSERT INTO mission_execution (mission_id, user_id, completed_or_not) VALUES (?, ?, false)',
      [missionId, userId]
    );
    const mission_execution_id = missionExecResult.insertId;

    // 2. 인증 정보 삽입
    await certModel.saveCertification({
      mission_execution_id,
      user_id: userId,
      image_source
    });

    // 3. 인증 후 미션 목록으로 이동
    res.redirect('/dashboard/mission');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: '미션 제출 실패', error: err });
  }
});

// ✅ 사용자가 인증 완료 확정 버튼을 눌렀을 때 (비료 지급 포함)
router.post('/confirm/:mission_execution_id', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;
  const mission_execution_id = req.params.mission_execution_id;

  // 1. 인증 완료 처리 (certification 테이블)
await promisePool.query(`
  UPDATE certification
  SET confirmed_by_user = true,
      completed_date = NOW()
  WHERE mission_execution_id = ? AND user_id = ? AND checked = true
`, [mission_execution_id, userId]);

// ✅ 1.5. mission_execution 테이블도 완료 처리
await promisePool.query(`
  UPDATE mission_execution
  SET completed_or_not = true,
      completed_date = NOW()
  WHERE mission_execution_id = ?
`, [mission_execution_id]);

// ✅ 추가: growth_status 테이블에서 성장률도 올리기 (예: +20)
await promisePool.query(`
  UPDATE growth_status
  SET growth_rate = LEAST(growth_rate + 20, 100)
  WHERE user_id = ? AND is_harvested = false
  ORDER BY planted_at DESC
  LIMIT 1
`, [userId]);

// 2. 사용자 인벤토리 ID 가져오기
await createInitialInventory(userId);

// 이후 inventory_id가 필요한 경우는 별도로 가져옴
// const [[{ inventory_id }]] = await promisePool.query(`
//   SELECT inventory_id FROM inventory WHERE user_id = ?
// `, [userId]);
const [[inventoryRow]] = await promisePool.query(`
  SELECT inventory_id FROM inventory WHERE user_id = ?
`, [userId]);

if (!inventoryRow) {
  throw new Error(`❌ 인벤토리가 존재하지 않습니다: user_id=${userId}`);
}

const inventoryId = inventoryRow.inventory_id;

    // 3. 비료 타입 ID 가져오기
    const [[fertilizerTypeRow]] = await promisePool.query(
      'SELECT item_type_id FROM item_type WHERE item_name = "비료"'
    );

    const fertilizerTypeId = fertilizerTypeRow.item_type_id;

    // 4. 비료 1개 지급 (중복이면 수량 증가)
    await promisePool.query(`
      INSERT INTO item (item_type_id, inventory_id, item_count)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE item_count = item_count + 1
    `, [fertilizerTypeId, inventoryId]);

    // 5. 모달 띄우기 위한 session 값 저장
    req.session.prevConfirmedId = Number( mission_execution_id);

    res.redirect('/dashboard/mission');
  
});


// ✅ GET /dashboard/mission
router.get('/mission', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;
  // ✅ 사용자 정보 조회
  const [[userInfo]] = await promisePool.query(
    'SELECT nickname, level FROM user WHERE user_id = ?',
    [userId]
  );
  if (!userInfo) {
    console.error('❌ 유저 정보 조회 실패:', userId);
    return res.status(500).send('유저 정보를 불러올 수 없습니다.');
  }

  const currentLevel = userInfo.level;

  // ✅ 현재 레벨의 미션 가져오기
  const [missions] = await promisePool.query(
    'SELECT * FROM mission WHERE level = ? ORDER BY mission_id',
    [currentLevel]
  );



  // ✅ 인증 상태 조회
  const [certifications] = await promisePool.query(`
    SELECT me.mission_id, c.checked, c.certification_date, c.confirmed_by_user, me.mission_execution_id
    FROM certification c
    JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
    WHERE c.user_id = ?
  `, [userId]);

  const certStatus = {};
  let showFertilizerModal = false;
  let latestMissionExecutionId = null;

  certifications.forEach(c => {
    certStatus[c.mission_id] = {
      status: c.checked === 1 && c.confirmed_by_user === 1,
      date: c.certification_date,
      mission_execution_id: c.mission_execution_id,
      awaitingConfirm: c.checked === 1 && c.confirmed_by_user === 0
    };

   if (
  c.confirmed_by_user === 1 &&
  req.session.prevConfirmedId === c.mission_execution_id &&
  !req.session.fertilizerUsed // ✅ 비료 사용 여부 확인
) {
  showFertilizerModal = true;
  latestMissionExecutionId = c.mission_execution_id;
}

  });

  req.session.prevConfirmedId = null;

  // ✅ 인증 기준 완료 미션 수
// ✅ 4. 단계 완료 여부 확인
//const clearedMissions = currentMissions.filter(m => certStatus[m.mission_id]?.status);

const currentMissions = missions.filter(m => m.level === currentLevel);
const clearedMissions = currentMissions.filter(m => certStatus[m.mission_id]?.status);

const [treeRow] = await promisePool.query(`
  SELECT growth_rate FROM growth_status 
  WHERE user_id = ? AND is_harvested = false
  ORDER BY planted_at DESC
  LIMIT 1
`, [userId]);




const hasFullyGrownTree = treeRow.length > 0 && treeRow[0].growth_rate >= 100;


// 기존 모달 조건
let showLevelOptionModal = !showFertilizerModal && (
  clearedMissions.length === 5 || hasFullyGrownTree
);

// ✅ 1. 이미 NEXT 옵션을 선택했는지 확인
const [[prevOption]] = await promisePool.query(`
  SELECT selected_option FROM level_option
  WHERE user_id = ?
  ORDER BY selected_date DESC
  LIMIT 1
`, [userId]);

if (prevOption && prevOption.selected_option === 'NEXT') {
  showLevelOptionModal = false;  // 이미 다음 단계 선택한 경우 모달 금지
}

// ✅ 2. 비료로 100% 수확했는지도 체크 (예외 처리)
if (!showLevelOptionModal) {
  const [latestTree] = await promisePool.query(`
    SELECT is_harvested, growth_rate
    FROM growth_status
    WHERE user_id = ? 
    ORDER BY planted_at DESC
    LIMIT 1
  `, [userId]);

  if (
    latestTree.length &&
    latestTree[0].is_harvested === 1 &&
    latestTree[0].growth_rate === 100
  ) {
    showLevelOptionModal = true;

    // 단, NEXT를 선택한 적 있다면 다시 false
    if (prevOption && prevOption.selected_option === 'NEXT') {
      showLevelOptionModal = false;
    }
  }
}


 // ✅ 성장률 기반 미션 완료 추정치
  const [[growthRow]] = await promisePool.query(`
    SELECT growth_rate
    FROM growth_status
    WHERE user_id = ? AND is_harvested = false
    ORDER BY planted_at DESC
    LIMIT 1
  `, [userId]);

  const growthRate = growthRow?.growth_rate || 0;
  const inferredCompleted = Math.floor(growthRate / 20); // 예: 40% = 2개 완료 추정

  // ✅ 실제 완료 개수 = 인증된 미션 vs 성장률 추정 중 최대값
  const missionCompleted = Math.max(clearedMissions.length, inferredCompleted);
  //const showLevelOptionModal = !showFertilizerModal && missionCompleted >= 5;

  // ✅ 과일 지급 (1회만)
  if (missionCompleted >= 5 && !req.session.levelRewardGiven) {
    const [[userRow]] = await promisePool.query(`
      SELECT u.level, i.inventory_id
      FROM user u
      JOIN inventory i ON u.user_id = i.user_id
      WHERE u.user_id = ?
    `, [userId]);

    const [executions] = await promisePool.query(`
      SELECT completed_date
      FROM mission_execution me
      JOIN mission m ON me.mission_id = m.mission_id
      WHERE me.user_id = ? AND m.level = ? AND me.completed_or_not = true
      ORDER BY completed_date ASC
    `, [userId, userRow.level]);

    if (executions.length >= 5) {
      const start = new Date(executions[0].completed_date);
      const end = new Date(executions[4].completed_date);
      const isUnderTenDays = (end - start) / (1000 * 60 * 60 * 24) <= 10;

      const [fruits] = await promisePool.query(`SELECT fruit_id, fruit_name FROM fruit`);
      const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];

      await promisePool.query(`
        INSERT INTO planted_fruit (user_id, fruit_id, fruit_name)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE fruit_id = VALUES(fruit_id), fruit_name = VALUES(fruit_name)
      `, [userId, randomFruit.fruit_id, randomFruit.fruit_name]);

      req.session.levelRewardGiven = true;
    }
  }

  // ✅ 렌더링
  res.render('dashboard/mission', {
    missions,
    certStatus,
    nickname: userInfo.nickname,
    currentLevel: `${currentLevel}단계`,
    showFertilizerModal,
    latestMissionExecutionId,
    showLevelOptionModal
  });
});

exports.renderDashboard = async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;
  const missions = await missionModel.getMissionsForUser(userId);
  res.render('dashboard', { missions });
};
router.post('/level-option', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;
  const { option } = req.body; // 'NEXT', 'RETRY', 'WAIT'

  try {
    // ✅ 레벨 옵션 선택할 때마다 보상 세션 초기화
    req.session.levelRewardGiven = false;
    // 이전 옵션 삭제 (중복 방지)f
    await promisePool.query(`
      DELETE FROM level_option WHERE user_id = ?
    `, [userId]);

    // 선택 저장
    await promisePool.query(`
      INSERT INTO level_option (user_id, selected_option, selected_date)
      VALUES (?, ?, NOW())
    `, [userId, option]);

    // 즉시 처리
    if (option === 'NEXT') {
      await promisePool.query(`UPDATE user SET level = level + 1 WHERE user_id = ?`, [userId]);

      // ✅ 과일 삭제도 레벨업 시점에 함께 처리
      await promisePool.query(`DELETE FROM planted_fruit WHERE user_id = ?`, [userId]);
    return res.redirect('/home');
    
    }  else if (option === 'RETRY') {
  // 미션 데이터 삭제
  const [executions] = await promisePool.query(`
    SELECT mission_execution_id FROM mission_execution me
    JOIN mission m ON me.mission_id = m.mission_id
    WHERE me.user_id = ? AND m.level = (SELECT level FROM user WHERE user_id = ?)
  `, [userId, userId]);

  const ids = executions.map(e => e.mission_execution_id);
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await promisePool.query(`
      DELETE FROM certification WHERE mission_execution_id IN (${placeholders})
    `, ids);

    await promisePool.query(`
      DELETE FROM mission_execution WHERE mission_execution_id IN (${placeholders})
    `, ids);
  }

  // 과일 다시 지급
  const [fruits] = await promisePool.query('SELECT fruit_id, fruit_name FROM fruit');
  const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];

  await promisePool.query(`
    INSERT INTO planted_fruit (user_id, fruit_id, fruit_name)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE fruit_id = VALUES(fruit_id), fruit_name = VALUES(fruit_name)
  `, [userId, randomFruit.fruit_id, randomFruit.fruit_name]);

  // 보상 플래그 초기화
  req.session.levelRewardGiven = false;
  req.session.prevConfirmedId = null;


  return res.redirect('/home');
}


    res.redirect('/dashboard/mission');
  } catch (err) {
    console.error('레벨 옵션 처리 실패:', err);
    res.status(500).send('레벨 옵션 처리 실패');
  }
});



router.post('/use-fertilizer', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;

  try {
    // 1. 유저 인벤토리 ID 확인
    const [[inventoryRow]] = await promisePool.query(`
      SELECT inventory_id FROM inventory WHERE user_id = ?
    `, [userId]);
    if (!inventoryRow) return res.status(400).send('인벤토리가 없습니다.');
    const inventoryId = inventoryRow.inventory_id;

    // 2. 비료 존재 확인
    const [[fertilizerRow]] = await promisePool.query(`
      SELECT item_id, item_count FROM item
      WHERE inventory_id = ? AND item_type_id = (
        SELECT item_type_id FROM item_type WHERE item_name = '비료'
      )
    `, [inventoryId]);
    if (!fertilizerRow || fertilizerRow.item_count < 1) {
      return res.status(400).send('비료가 없습니다.');
    }

    // 3. 최근에 심은, 아직 수확되지 않은 나무 1개 가져오기
    const [[targetTree]] = await promisePool.query(`
      SELECT growth_status_id FROM growth_status
      WHERE user_id = ? AND is_harvested = false
      ORDER BY planted_at DESC
      LIMIT 1
    `, [userId]);

    if (!targetTree) {
      return res.status(400).send('성장 중인 나무가 없습니다.');
    }

    const growthStatusId = targetTree.growth_status_id;

    // 4. 비료 차감
    await promisePool.query(`
      UPDATE item SET item_count = item_count - 1
      WHERE item_id = ?
    `, [fertilizerRow.item_id]);

   // 🌱 1. 비료 사용 → 성장률 증가
await promisePool.query(`
  UPDATE growth_status
  SET growth_rate = LEAST(growth_rate + 20, 100)
  WHERE growth_status_id = ? AND user_id = ? AND is_harvested = false
`, [growthStatusId, userId]);

// ✅ 2. 미션 완료 기록 추가
// 현재 레벨 가져오기
const [[userRow]] = await promisePool.query(
  `SELECT level FROM user WHERE user_id = ?`,
  [userId]
);

//const currentLevel = userRow.level;
const currentLevel = 8;
// 완료되지 않은 미션 중 하나 찾기
const [[availableMission]] = await promisePool.query(`
  SELECT m.mission_id
  FROM mission m
  LEFT JOIN mission_execution me 
    ON m.mission_id = me.mission_id AND me.user_id = ?
  WHERE m.level = ? AND (me.completed_or_not IS NULL OR me.completed_or_not = 0)
  LIMIT 1
`, [userId, currentLevel]);

if (availableMission) {
  await promisePool.query(`
    INSERT INTO mission_execution (mission_id, user_id, completed_or_not, completed_date)
    VALUES (?, ?, 1, NOW())
  `, [availableMission.mission_id, userId]);
}

    res.redirect('/home');
  } catch (error) {
    console.error('🔥 비료 사용 중 오류:', error);
    res.status(500).send('비료 사용 중 오류 발생');
  }
});



router.post('/harvest/:growthStatusId', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;
  const growthStatusId = parseInt(req.params.growthStatusId, 10);

  
  try {
    // 1. 수확 조건 확인
    const [[tree]] = await promisePool.query(`
      SELECT fruit_id, is_harvested, growth_rate
      FROM growth_status
      WHERE growth_status_id = ? AND user_id = ?
    `, [growthStatusId, userId]);

    if (!tree) {
      return res.status(400).send('존재하지 않는 나무입니다.');
    }

    if (tree.is_harvested) {
      return res.status(400).send('이미 수확한 나무입니다.');
    }

    if (tree.growth_rate < 100) {
      return res.status(400).send('아직 수확할 수 없습니다.');
    }

    const fruitId = tree.fruit_id;

    // 2. 수확 처리
    await promisePool.query(`
      UPDATE growth_status
      SET is_harvested = true
      WHERE growth_status_id = ?
    `, [growthStatusId]);

    // 3. 도감에 등록
    await promisePool.query(`
      INSERT IGNORE INTO collection (user_id, fruit_id, collected_at)
      VALUES (?, ?, NOW())
    `, [userId, fruitId]);

    // ✅ 4. fruit 테이블 등록 상태 업데이트
    await promisePool.query(`
      UPDATE fruit
      SET registered = 1
      WHERE fruit_id = ?
    `, [fruitId]);

    res.redirect('/dashboard/collection');
  } catch (error) {
    console.error(error);
    res.status(500).send('수확 중 오류 발생');
  }
});

// ✅ GET/POST /dashboard/diary/:missionId
// router.get('/diary/:missionId',async (req, res) => {
//   const missionId = Number(req.params.missionId);
//  console.log('🧩 missionId 전달됨:', missionId);

//   if (isNaN(missionId)) {
//   return res.status(400).send('올바르지 않은 미션 ID입니다.');
// }

//     const [[missionRow]] = await promisePool.query(`
//     SELECT description FROM mission WHERE mission_id = ?
//   `, [missionId]);

//   if (!missionRow) {
//     return res.status(404).send('미션을 찾을 수 없습니다.');
//   }

//  console.log('📦 missionRow:', missionRow);

//   res.render('dashboard/diary', { missionId ,  mission: missionRow});
// });

router.get('/diary/:missionExecutionId', async (req, res) => {
  const missionExecutionId = Number(req.params.missionExecutionId);
  if (isNaN(missionExecutionId)) {
    return res.status(400).send('올바르지 않은 미션 ID입니다.');
  }

  // mission_execution_id → mission_id 매핑
  const [[missionRow]] = await promisePool.query(`
    SELECT m.description, m.mission_id
    FROM mission_execution me
    JOIN mission m ON me.mission_id = m.mission_id
    WHERE me.mission_execution_id = ?
  `, [missionExecutionId]);

  if (!missionRow) {
    return res.status(404).send('미션을 찾을 수 없습니다.');
  }

  res.render('dashboard/diary', {
    missionId: missionRow.mission_id,
    mission: missionRow,
    missionExecutionId
  });
});


router.post('/diary/:missionId', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;
  const { title, content, emotions } = req.body;
  const missionExecutionId = req.params.missionId;

  await certModel.saveDiary({
    mission_execution_id: missionExecutionId,
    user_id: userId,
    title,
    content,
    emotions: Array.isArray(emotions) ? emotions : [emotions]
  });

  res.redirect('/dashboard/mission');
});

module.exports = router;