const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const authService = require('../services/authService');

passport.use(new LocalStrategy(
  { usernameField: 'email' },  // 이메일 기반 로그인
  async (email, password, done) => {
    try {
      const user = await authService.login(email, password);
      return done(null, user); // 로그인 성공
    } catch (err) {
      return done(null, false, { message: err.message }); // 로그인 실패 → authService의 메시지 사용
    }
  }
));

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user.user_id);
});

// Deserialize user from session
passport.deserializeUser(async (user_id, done) => {
    try {
        const user = await User.findById(user_id);
        done(null, {...user, user_id: user.user_id});
    } catch (err) {
        done(err);
    }
});

module.exports = passport;
