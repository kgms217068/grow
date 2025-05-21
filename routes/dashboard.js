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
  const userId = req.session.userId || 1;
  

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
    const userId = req.session.userId || 1;
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
// ✅ GET /dashboard/mission
router.get('/mission', async (req, res) => {
  const userId = req.session.userId || 1;

  // 전체 미션 가져오기
  const allMissions = await missionModel.getAllMissions();

  // 인증 내역 (checked 여부 + 완료 날짜)
  const [certifications] = await promisePool.query(`
    SELECT me.mission_id, c.checked, c.certification_date
    FROM certification c
    JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
    WHERE c.user_id = ?
  `, [userId]);

  // 이전 완료된 미션 ID 저장 (모달 표시용)
  const prevCompleted = req.session.prevCompleted || [];

  // 인증 상태 저장: mission_id -> { status, date }
  const certStatus = {};
  let newlyChecked = false;

  certifications.forEach(c => {
    const mid = c.mission_id;
    certStatus[mid] = {
      status: c.checked === 1,
      date: c.certification_date,
    };

    if (c.checked && !prevCompleted.includes(mid)) {
      newlyChecked = true;
    }
  });

  // 최신 인증 완료된 mission_execution_id
  const [latestCertified] = await promisePool.query(`
    SELECT c.mission_execution_id
    FROM certification c
    JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
    WHERE c.user_id = ? AND c.checked = true
    ORDER BY c.certification_date DESC
    LIMIT 1
  `, [userId]);

  const latestMissionExecutionId = latestCertified.length > 0
    ? latestCertified[0].mission_execution_id
    : null;

  // 현재 완료된 목록을 세션에 저장 (다음 렌더링 때 비교)
  req.session.prevCompleted = certifications.filter(c => c.checked).map(c => c.mission_id);



const [userInfoRows] = await promisePool.query(
  'SELECT nickname, level FROM user WHERE user_id = ?',
  [userId]
);

const userInfo = userInfoRows[0]; // 첫 번째 행

res.render('dashboard/mission', {
  missions: allMissions,
  certStatus,
  nickname: userInfo.nickname,
  currentLevel: `${userInfo.level}단계`, // 🔥 실제 단계 출력
  showFertilizerModal: newlyChecked,
  latestMissionExecutionId
});
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
  const userId = req.session.userId || 1;
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
