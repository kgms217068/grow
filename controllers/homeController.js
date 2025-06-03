const homeService = require('../services/homeService');

// ✅ API용 (그대로 유지)
exports.getHomeData = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const homeData = await homeService.getHomeData(userId);
    res.json(homeData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || '서버 에러' });
  }
};

// ✅ EJS 뷰 렌더링용 (layout.ejs 기반 네비게이션 포함)
exports.renderHomePage = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const homeData = await homeService.getHomeData(userId);

    res.render('home', {
      ...homeData,              // nickname, level, fruitName, missionCompleted 등
      layout: 'layout',         // layout.ejs 적용
      currentPath: req.path     // 네비게이션 조건용
    });
  } catch (error) {
    console.error('[홈 페이지 오류]', error);
    res.status(500).render('error', { message: error.message });
  }
};
