const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const { ensureAuthenticated: isLoggedIn } = require('../middlewares/auth');

// 홈화면 렌더링
router.get('/', isLoggedIn, homeController.renderHomePage);

router.get('/home', async (req, res) => {
  const userId = req.session.user?.user_id || req.user?.user_id;

  try {
    // 나무 정보 가져오기 (직접 또는 homeService에서 불러오기)
    const [plantedFruits] = await promisePool.query(`
      SELECT pf.id, f.name, pf.growth_level, pf.is_harvested
      FROM planted_fruit pf
      JOIN fruit f ON pf.fruit_id = f.fruit_id
      WHERE pf.user_id = ?
    `, [userId]);

    res.render('home', {
      plantedFruits
    });
  } catch (err) {
    console.error('🌳 /home 나무 로딩 실패:', err);
    res.status(500).send('나무 불러오기 실패');
  }
});


module.exports = router;
