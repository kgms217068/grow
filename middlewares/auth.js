module.exports = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    // ✅ 가짜 사용자 정보 주입
    req.user = {
      user_id: 1,
      nickname: '유나'
    };

    // ✅ isAuthenticated 함수도 덧붙이기
    req.isAuthenticated = () => true;
  }
  next();
};
