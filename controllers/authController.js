const passport = require('../config/passport');
const authService = require('../services/authService');

exports.register = async (req, res) => {
  try {
    const userId = await authService.register(req.body);

    // ✅ 인벤토리 자동 생성
    const inventoryModel = require('../models/inventoryModel');
        const missionExecutionModel = require('../models/missionExecutionModel');

    console.log('🧩 인벤토리 생성 시작');
await inventoryModel.createInitialInventory(userId);
try{console.log('✅ 인벤토리 생성 완료');}
catch(err){
  console.log(err);
}

await inventoryModel.giveDefaultSeedToUser(userId);

        await missionExecutionModel.assignInitialMissionsToUser(userId);

    // 회원가입 성공 시 성공 페이지 렌더링
    res.status(201).render('registerSuccess', { userId });
  } catch (err) {
    res.status(400).render('register', {
      title: '회원가입',
      error: [err.message],
      form: req.body
    });
  }
};


exports.login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).render('login', {
        title: '로그인',
        form: { email: req.body.email },
        error: [info?.message || '이메일 또는 비밀번호가 올바르지 않습니다']
      });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      // ✅ 여기서 직접 세션에 사용자 정보 저장!
      req.session.user = {
        user_id: user.user_id,
        nickname: user.nickname
        // 필요한 필드는 더 추가 가능
      };

      console.log('✅ 세션 저장됨:', req.session.user); // 이젠 undefined가 아니어야 함
      return res.redirect('/home');
    });
  })(req, res, next);
};


exports.logout = (req, res) => {
    req.flash('success', '로그아웃되었습니다.');
    res.redirect('/login');
};


exports.changePassword = async (req, res) => {
  try {
    await authService.changePassword(
      req.user.id,
      req.body.oldPassword,
      req.body.newPassword
    );
    res.render('changePassword', {
      title: '비밀번호 변경',
      message: '비밀번호가 성공적으로 변경되었습니다.',
      form: {}
    });
  } catch (err) {
    res.status(400).render('changePassword', {
      title: '비밀번호 변경',
      error: [err.message],
      form: req.body
    });
  }
};

exports.changeEmail = async (req, res) => {
    try {
        await authService.changeEmail(req.user.user_id, req.body.newEmail);
        res.render('changeEmail', {
	    title: '이메일 변경',
            message: '이메일이 성공적으로 변경되었습니다.',
            form: {}
        });
    } catch (err) {
        res.status(400).render('changeEmail', {
	    title: '이메일 변경',
            error: [err.message],
            form: req.body
        });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        await authService.deleteAccount(req.user.user_id);
        req.logout(() => {
            req.flash('success', '회원탈퇴가 완료되었습니다.');
            res.redirect('/login');
        });
    } catch (err) {
        res.status(400).render('myPage', {
            error: [err.message]
        });
    }
};
