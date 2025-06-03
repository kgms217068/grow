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

    const fruitMessages = [
      '이 과일은 당신이 하루를 이겨낸 증거예요.',
      '오늘도 수고했어요. 이 과일은 당신의 노력의 결과예요.',
      '작은 실천이 큰 열매를 맺었어요!',
      '포기하지 않고 하루를 살아낸 당신, 멋져요!',
      '당신의 하루가 이 과일처럼 영글었어요.'
    ];
    const randomMessage = fruitMessages[Math.floor(Math.random() * fruitMessages.length)];

    res.render('collection', {
      layout: 'layout',         
      currentPath: req.path,    
      userId,
      category,
      imageName,
      ...result,
      fruitMessage: randomMessage
    });
  });
};
