const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { promisePool } = require('../db/db');
const certModel = require('../models/certificationModel');
const missionModel = require('../models/missionModel');

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

// ✅ GET /dashboard — 다음 미션 1개 보여주기
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId || 1;

    const allMissions = await missionModel.getAllMissions();

    // DB에서 인증 상태 가져오기
    const [certRows] = await promisePool.query(`
      SELECT me.mission_id, c.checked
      FROM certification c
      JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
      WHERE c.user_id = ?
    `, [userId]);

    const completedIds = certRows.map(c => c.mission_id);
    const certStatus = {};
    certRows.forEach(c => {
      certStatus[c.mission_id] = c.checked ? true : false;
    });

    const nextMission = allMissions.find(m => !completedIds.includes(m.mission_id));
    const result = certStatus[nextMission?.mission_id] ?? null;

    res.render('dashboard/index', {
      mission: nextMission || null,
      result,
      title: 'dashboard',
      currentPath: req.path
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: '미션 로딩 실패', error: err });
  }
});

// ✅ POST /dashboard/submit
router.post('/submit', upload.single('photo'), async (req, res) => {
  try {
    const userId = req.session.userId || 1;
    const missionId = parseInt(req.body.missionId);
    const image_source = req.file ? req.file.filename : null;

    // 미션 수행 기록 추가
    const [result] = await promisePool.query(
      'INSERT INTO mission_execution (mission_id, user_id, completed_or_not) VALUES (?, ?, false)',
      [missionId, userId]
    );
    const missionExecutionId = result.insertId;

    // 인증 등록 (checked = false 로 기본)
    await certModel.saveCertification({
      mission_execution_id: missionExecutionId,
      user_id: userId,
      image_source
    });

    res.redirect('/dashboard/mission');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: '미션 제출 실패', error: err });
  }
});

// ✅ 완료 화면
router.get('/completed', (req, res) => {
  res.render('dashboard/completed', {
    nickname: '가연이',
    currentLevel: '3단계',
    missionId: req.query.missionId,
    
  });
});

// ✅ 미션 목록 (전체)
router.get('/mission', async (req, res) => {
  try {
    const userId = req.session.userId || 1;
    const allMissions = await missionModel.getAllMissions();
     const certifications = await certModel.getCertificationsByUser(userId); 

    const [certRows] = await promisePool.query(`
      SELECT me.mission_id, c.checked
      FROM certification c
      JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
      WHERE c.user_id = ?
    `, [userId]);

    const certStatus = {};
    certRows.forEach(c => {
      certStatus[c.mission_id] = c.checked ? true : false;
    });

    const certMap = {};
  let newlyChecked = false;

  certifications.forEach(cert => {
    certMap[cert.mission_id] = cert.checked;
    
    if (cert.just_checked) {
      newlyChecked = true; // 직전 인증에서 완료 처리된 것 여부 판단 (이 값은 DB 컬럼 or 조건에 따라 지정)
    }
  });

    res.render('dashboard/mission', {
      missions: allMissions,
      certStatus,
      nickname: '가연이',
      currentLevel: '3단계',
      showFertilizerModal: newlyChecked // 👈 새로 완료된 경우 모달 보여주기
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: '미션 목록 불러오기 실패', error: err });
  }
});

// ✅ 일기 작성
router.get('/diary/:missionId', (req, res) => {
  const missionId = req.params.missionId;
  res.render('dashboard/diary', { missionId });
});

router.post('/diary/:missionId', async (req, res) => {
  const userId = req.session.userId || 1;
  const missionExecutionId = req.params.missionId;
  const { title, content, emotions } = req.body;

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
