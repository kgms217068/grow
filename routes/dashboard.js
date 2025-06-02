const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { promisePool } = require('../db/db');
const certModel = require('../models/certificationModel');
const missionModel = require('../models/missionModel');
const userModel = require('../models/userModel');


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

// 2. 사용자 인벤토리 ID 가져오기
const [[inventoryRow]] = await promisePool.query(
  'SELECT inventory_id FROM inventory WHERE user_id = ?',
  [userId]
);


const inventoryId = inventoryRow.inventory_id;

    

    // 3. 비료 타입 ID 가져오기
    const [[fertilizerTypeRow]] = await promisePool.query(
      'SELECT item_type_id FROM item_type WHERE item_name = "비료"'
    );

    const fertilizerTypeId = fertilizerTypeRow.item_type_id;

    // 4. 비료 1개 지급 (중복이면 수량 증가)
    await promisePool.query(`
      INSERT INTO item (item_type_id, inventory_id, item_id, item_count)
      VALUES (?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE item_count = item_count + 1
    `, [fertilizerTypeId, inventoryId, fertilizerTypeId]);

    // 5. 모달 띄우기 위한 session 값 저장
    req.session.prevConfirmedId = Number( mission_execution_id);

    res.redirect('/dashboard/mission');
  
});


// ✅ GET /dashboard/mission
router.get('/mission', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;

  // ✅ 사용자 정보 조회 (레벨 포함)
  const [[userInfo]] = await promisePool.query(
    'SELECT nickname, level FROM user WHERE user_id = ?',
    [userId]
  );
  if (!userInfo) {
  console.error('❌ 유저 정보 조회 실패: user_id =', userId);
  return res.status(500).send('유저 정보를 불러올 수 없습니다.');
}
 //const currentLevel = userInfo.level;
const currentLevel = userInfo.level;
  // ✅ 사용자 레벨에 해당하는 미션만 가져오기
  const [missions] = await promisePool.query(
    'SELECT * FROM mission WHERE level = ? ORDER BY mission_id',
    [currentLevel],
    
  );
console.log('🎯 등록 가능한 미션 목록:', missions)
  // ✅ 인증 및 상태 조회
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
    const mid = c.mission_id;

    certStatus[mid] = {
      status: c.checked === 1 && c.confirmed_by_user === 1,
      date: c.certification_date,
      mission_execution_id: c.mission_execution_id,
      awaitingConfirm: c.checked === 1 && c.confirmed_by_user === 0
    };

    if (c.confirmed_by_user === 1 && req.session.prevConfirmedId === c.mission_execution_id) {
      showFertilizerModal = true;
      latestMissionExecutionId = c.mission_execution_id;
    }
  });

  req.session.prevConfirmedId = null;

  // 현재 단계의 미션 수 체크
  const currentMissions = missions.filter(m => m.level === currentLevel);
  const clearedMissions = currentMissions.filter(m => certStatus[m.mission_id]?.status);
  const showLevelOptionModal = !showFertilizerModal && clearedMissions.length === 5;
  // ✅ 과일 보상: 이미 보상되지 않았다면 처리
  if (clearedMissions.length === 5 && !req.session.levelRewardGiven) {
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
  
      const 지급 = async (itemName, amount) => {
        await promisePool.query(`
          INSERT INTO item (inventory_id, item_type_id, item_count)
          SELECT ?, item_type_id, ?
          FROM item_type
          WHERE item_name = ?
          ON DUPLICATE KEY UPDATE item_count = item_count + VALUES(item_count)
        `, [userRow.inventory_id, amount, itemName]);
    };

    if (isUnderTenDays) {
    //일단 테스트 용으로 사과로 지정해 놓음 추후에 변경
      await 지급('황금과일', 1);
      await 지급('사과', 2);
    } else {
      await 지급('사과', 3);
    } 

    // ✅ 중복 지급 방지용 세션 플래그
    req.session.levelRewardGiven = true;
 }
}
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
    // 이전 옵션 삭제 (중복 방지)
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
    } else if (option === 'RETRY') {
      const [executions] = await promisePool.query(`
        SELECT mission_execution_id FROM mission_execution me
        JOIN mission m ON me.mission_id = m.mission_id
        WHERE me.user_id = ? AND m.level = (SELECT level FROM user WHERE user_id = ?)
      `, [userId, userId]);

      const ids = executions.map(e => e.mission_execution_id);
      if (ids.length > 0) {
        await promisePool.query(`
          DELETE FROM certification WHERE mission_execution_id IN (?)
        `, [ids]);

        await promisePool.query(`
          DELETE FROM mission_execution WHERE mission_execution_id IN (?)
        `, [ids]);
      }
    }

    res.redirect('/dashboard/mission');
  } catch (err) {
    console.error('레벨 옵션 처리 실패:', err);
    res.status(500).send('레벨 옵션 처리 실패');
  }
});


// ✅ GET /dashboard/completed (사용 안함 - 현재 모달로 대체)
router.get('/completed', (req, res) => {
  res.render('dashboard/completed', {
    nickname: userInfo.nickname,
  currentLevel: `${userInfo.level}단계`, // 🔥 실제 단계 출력
    missionId: req.query.missionId
  });
});

// ✅ GET/POST /dashboard/diary/:missionId
router.get('/diary/:missionId', (req, res) => {
  const missionId = req.params.missionId;
  res.render('dashboard/diary', { missionId });
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

  res.redirect('/dashboard');
});

module.exports = router;
