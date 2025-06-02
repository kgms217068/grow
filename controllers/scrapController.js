// controllers/scrapController.js
const scrapService = require('../services/scrapService');

exports.renderScrapPage = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const scrapPosts = await scrapService.getUserScraps(userId);
    res.render('scrap', {
      scrapPosts,
      layout: 'layout',      // ✅ layout.ejs 적용
      currentPath: req.path  // ✅ 하단 네비게이션 조건 분기 위해
    });
  } catch (err) {
    console.error('[스크랩 페이지 오류]', err);
    res.status(500).render('error', { message: '스크랩한 글을 불러오는 데 실패했습니다.' });
  }
};
