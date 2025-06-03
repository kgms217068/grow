// ✅ 실제 인증 체크 미들웨어
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// ✅ 내보내기
module.exports = {
 
  ensureAuthenticated
};
