const express = require('express');
const router = express.Router();
const certModel = require('../models/certificationModel'); // diary 저장도 여기 있다고 가정

const diaryController = require('../controllers/diaryController');
const { ensureAuthenticated: isLoggedIn } = require('../middlewares/auth');

router.get('/', isLoggedIn, diaryController.renderDiaryPage);


// GET: 일기 작성 폼 보여주기
router.get('/:missionExecutionId', (req, res) => {
  const missionExecutionId = req.params.missionExecutionId;
  res.render('dashboard/diary', { missionId: missionExecutionId });
});

// POST: 일기 저장
router.post('/:missionExecutionId', async (req, res) => {
  try {
    const missionExecutionId = req.params.missionExecutionId;
    const { title, content, emotions } = req.body;

    await certModel.saveDiary({
      mission_execution_id: missionExecutionId,
      title,
      content,
      emotions: Array.isArray(emotions) ? emotions : [emotions]
    });

    res.redirect('/dashboard/mission');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: '일기 저장 실패', error: err });
  }
});

module.exports = router;
