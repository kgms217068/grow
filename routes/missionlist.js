const express = require('express');
const router = express.Router();
const certModel = require('../models/certificationModel');
const missionModel = require('../models/missionModel');

router.get('/', async (req, res) => {
  const userId = req.session.userId || 1;

  const missions = await missionModel.getAllMissions();
  const certs = await certModel.getCertificationsByUser(userId);
  const diaries = await certModel.getDiariesByUser(userId);

  const statusMap = {};

  certs.forEach(cert => {
    const hasDiary = diaries.some(d => d.mission_execution_id === cert.mission_execution_id);
    statusMap[cert.mission_id] = hasDiary ? 'done' : 'pending';
  });

  res.render('mission/list', {
    title: '미션 목록',
    nickname: '가연이',
    currentLevel: '3단계',
    missions,
    statusMap
  });
});

module.exports = router;
