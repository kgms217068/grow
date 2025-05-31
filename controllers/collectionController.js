const collectionService = require('../services/collectionService');

// ✅ 기존 API용 (그대로 유지)
exports.getCollection = (req, res) => {
  const userId = req.params.userId;
  const category = req.query.category;
  const page = parseInt(req.query.page) || 1;
  const limit = 1;

  collectionService.getUserCollection(userId, category, page, limit, (err, result) => {
    if (err) {
      console.error('[도감 조회 오류]', err);
      return res.status(500).json({ error: '도감 데이터를 불러오지 못했습니다.' });
    }

    res.status(200).json({
      userId: parseInt(userId),
      ...result
    });
  });
};

// ✅ EJS 렌더링용 (layout.ejs 기반으로 수정됨)
exports.renderCollectionPage = (req, res) => {
  const userId = req.user.user_id;
  const category = req.query.category || 'basic';
  const page = parseInt(req.query.page) || 1;
  const limit = 1;

  collectionService.getUserCollection(userId, category, page, limit, (err, result) => {
    if (err) {
      console.error('[도감 페이지 렌더링 오류]', err);
      return res.status(500).send('도감 페이지를 불러오는 중 오류 발생');
    }

    const imageName = result.fruits.length > 0
      ? result.fruits[0].fruit_name
      : 'default';

    res.render('collection', {
      layout: 'layout',          // ✅ layout.ejs 사용
      currentPath: req.path,     // ✅ 네비게이션 조건에 필요
      userId,
      category,
      imageName,
      ...result
    });
  });
};
