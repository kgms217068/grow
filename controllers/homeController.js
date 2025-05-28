const homeService = require('../services/homeService');

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

// ✅ EJS 뷰 렌더링용 핸들러
exports.renderHomePage = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const homeData = await homeService.getHomeData(userId);
    res.render('home', homeData); // 👉 views/home.ejs에 전달
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: error.message });
  }
};
