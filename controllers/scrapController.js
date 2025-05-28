// controllers/scrapController.js
const scrapService = require('../services/scrapService');

exports.renderScrapPage = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const scrapPosts = await scrapService.getUserScraps(userId);
    res.render('scrap', { scrapPosts });
  } catch (err) {
    console.error('[스크랩 페이지 오류]', err);
    res.status(500).send('스크랩한 글을 불러오는 데 실패했습니다.');
  }
};
