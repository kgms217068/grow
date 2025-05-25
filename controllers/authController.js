const passport = require('../config/passport');
const authService = require('../services/authService');

// 🔹 Registration
exports.register = async (req, res) => {
  try {
    const userId = await authService.register(req.body);
    // 회원가입 성공 시 성공 페이지 렌더링
    res.status(201).render('registerSuccess', { userId });
  } catch (err) {
    // 실패 시 폼 정보와 오류 메시지를 배열로 전달
    res.status(400).render('register', {
      error: [err.message],
      form: req.body
    });
  }
};

// 🔹 Login (Passport.js 사용)
exports.login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      // 로그인 실패 시 에러 메시지와 입력된 이메일 유지
      return res.status(401).render('login', {
        form: { email: req.body.email },
        error: [info?.message || '이메일 또는 비밀번호가 올바르지 않습니다']
      });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      // 로그인 성공 시
      return res.redirect('/home');
    });
  })(req, res, next);
};

// 🔹 Logout
exports.logout = (req, res) => {
    req.flash('success', '로그아웃되었습니다.');
    res.redirect('/login');
  });
};

// 🔹 Password reset
exports.resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body.email, req.body.newPassword);
    res.render('resetPassword', {
      message: '비밀번호가 성공적으로 초기화되었습니다.',
      form: {}
    });
  } catch (err) {
    res.status(400).render('resetPassword', {
      error: [err.message],
      form: req.body
    });
  }
};

// 🔹 Password change
exports.changePassword = async (req, res) => {
  try {
    await authService.changePassword(
      req.user.id,
      req.body.oldPassword,
      req.body.newPassword
    );
    res.render('changePassword', {
      message: '비밀번호가 성공적으로 변경되었습니다.',
      form: {}
    });
  } catch (err) {
    res.status(400).render('changePassword', {
      error: [err.message],
      form: req.body
    });
  }
};

