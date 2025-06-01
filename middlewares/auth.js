// ✅ 가짜 로그인 미들웨어
const fakeLogin = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    req.user = {
      user_id: 1,
      nickname: '유나'
    };
    req.isAuthenticated = () => true;
  }
  next();
};

// ✅ 실제 인증 체크 미들웨어
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// ✅ 내보내기
module.exports = {
  fakeLogin,
  ensureAuthenticated
};
