const diaryService = require('../services/diaryService');

exports.renderDiaryPage = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const diaries = await diaryService.getUserDiaries(userId);
    res.render('diary', { diaries });
  } catch (err) {
    console.error('[일기 페이지 오류]', err);
    res.status(500).send('일기 불러오기 실패');
  }
};
