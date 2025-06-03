const mypageService = require('../services/mypageService');

// ✅ 로그인된 사용자 기준 마이페이지 데이터 반환 (JSON용)
exports.getMyPage = (req, res) => {
  const userId = req.user.user_id;

  mypageService.getMyPageData(userId, (err, userData) => {
    if (err) {
      console.error('[마이페이지 조회 오류]', err);
      return res.status(500).json({ message: '서버 오류' });
    }

    if (!userData) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // badgeType 포함된 userData를 그대로 응답
    res.json(userData);
  });
};

// ✅ 도감 데이터도 로그인된 사용자 기준으로 반환 (필요 시 유지)
exports.getCollection = (req, res) => {
  const userId = req.user.user_id;

  mypageService.getUserCollection(userId, (err, data) => {
    if (err) {
      console.error('[도감 조회 오류]', err);
      return res.status(500).json({ message: '서버 오류' });
    }

    if (!data) {
      return res.status(404).json({ message: '도감을 찾을 수 없습니다.' });
    }

    res.json(data);
  });
};

// ✅ 마이페이지 EJS 렌더링 (layout.ejs 사용 + currentPath 전달)
exports.renderMypage = (req, res) => {
  const userId = req.user.user_id;

  mypageService.getMyPageData(userId, (err, data) => {
    if (err) {
      console.error('[마이페이지 렌더링 오류]', err);
      return res.status(500).render('error', { message: '마이페이지 로딩 실패' });
    }

    if (!data) {
      return res.status(404).render('error', { message: '사용자를 찾을 수 없습니다.' });
    }

    res.render('mypage', {
      ...data,               // nickname, level, email, badgeType, missionStatus 등
      layout: 'layout',      // ✅ layout.ejs 적용
      currentPath: req.path  // ✅ 네비게이션 조건 분기 위해 전달
    });
  });
};
