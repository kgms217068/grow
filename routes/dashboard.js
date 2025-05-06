const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

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

// ✅ GET /dashboard — 다음 미션 하나씩 보여주기
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId || 1; // 테스트용
    const allMissions = await missionModel.getAllMissions();
    const certifications = await certModel.getCertificationsByUser(userId);
    const completedIds = certifications.map(c => c.mission_id);

    const nextMission = allMissions.find(m => !completedIds.includes(m.mission_id));
    const result = certifications.find(c => c.mission_id === nextMission?.mission_id);

    res.render('dashboard/index', {
      mission: nextMission || null,
      result: result || null
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
    const isSuccess = req.body.success === 'on';
    const memo = req.body.memo || null;
    const photo = req.file ? req.file.filename : null;

    await certModel.saveCertification({
      mission_id: missionId,
      user_id: userId,
      photo,
      memo: isSuccess ? memo : null,
      is_success: isSuccess
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: '미션 제출 실패', error: err });
  }
});

module.exports = router;
