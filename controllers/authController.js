// const passport = require('../config/passport');
// const authService = require('../services/authService');


// exports.login = (req, res, next) => {
//   passport.authenticate('local', (err, user, info) => {
//     if (err) return next(err);

//     if (!user) {
//       return res.status(401).render('login', {
//         title: '로그인',
//         form: { email: req.body.email },
//         error: [info?.message || '이메일 또는 비밀번호가 올바르지 않습니다']
//       });
//     }

//     req.logIn(user, (err) => {
//       if (err) return next(err);

//       // ✅ 여기서 직접 세션에 사용자 정보 저장!
//       req.session.user = {
//         user_id: user.user_id,
//         nickname: user.nickname
//         // 필요한 필드는 더 추가 가능
//       };

//       console.log('✅ 세션 저장됨:', req.session.user); // 이젠 undefined가 아니어야 함
//       return res.redirect('/home');
//     });
//   })(req, res, next);
// };


// exports.logout = (req, res) => {
//     req.flash('success', '로그아웃되었습니다.');
//     res.redirect('/login');
// };


// exports.changePassword = async (req, res) => {
//   const { oldPassword, newPassword, newPasswordConfirm } = req.body;

//   // 입력값 검증
//   if (!oldPassword || !newPassword || !newPasswordConfirm) {
//     return res.status(400).render('changePassword', {
//       title: '비밀번호 변경',
//       error: ['모든 비밀번호 필드를 입력해주세요.'],
//       form: req.body,
//       user: req.user,
//       message: ''
//     });
//   }

//   // 새 비밀번호와 확인 일치 여부 확인
//   if (newPassword !== newPasswordConfirm) {
//     return res.status(400).render('changePassword', {
//       title: '비밀번호 변경',
//       error: ['새 비밀번호가 일치하지 않습니다.'],
//       form: req.body,
//       user: req.user,
//       message: ''
//     });
//   }

//   try {
//     await authService.changePassword(req.user.user_id, oldPassword, newPassword);
//     res.render('changePassword', {
//       title: '비밀번호 변경',
//       message: '비밀번호가 성공적으로 변경되었습니다.',
//       form: {},
//       user: req.user,
//       error: []
//     });
//   } catch (err) {
//     res.status(400).render('changePassword', {
//       title: '비밀번호 변경',
//       error: [err.message],
//       form: req.body,
//       user: req.user,
//       message: ''
//     });
//   }
// };


// exports.changeEmail = async (req, res) => {
//     try {
//         await authService.changeEmail(req.user.user_id, req.body.newEmail);
//         res.render('changeEmail', {
// 	    title: '이메일 변경',
//             message: '이메일이 성공적으로 변경되었습니다.',
//             form: {},
//             user: req.user
//         });
//     } catch (err) {
//         res.status(400).render('changeEmail', {
// 	    title: '이메일 변경',
//             error: [err.message],
//             form: req.body,
//             user: req.user,
//             message: ''
//         });
//     }
// };

// exports.deleteAccount = async (req, res) => {
//     try {
// 	console.log('[DEBUG] req.user:', req.user);
//         console.log('[DEBUG] req.user.user_id:', req.user?.user_id);
//         console.log('[DEBUG] req.user.id:', req.user?.id);
//         await authService.deleteAccount(req.user.user_id);
//         req.logout(() => {
//             req.flash('success', '회원탈퇴가 완료되었습니다.');
//             res.redirect('/login');
//         });
//     } catch (err) {
// 	console.error('[ERROR] 탈퇴 실패:', err);
//         res.status(400).render('myPage', {
//             error: [err.message]
//         });
//     }
// };
const passport = require('../config/passport');
const authService = require('../services/authService');

exports.register = async (req, res) => {
  try {
    const userId = await authService.register(req.body);

    // ✅ 인벤토리 자동 생성
    const inventoryModel = require('../models/inventoryModel');
    const missionModel = require('../models/missionModel');

    try {
      console.log('🧩 인벤토리 생성 시작');
      await inventoryModel.createInitialInventory(userId);
      console.log('✅ 인벤토리 생성 완료');
    } catch (err) {
      console.log('❌ 인벤토리 생성 실패:', err.message);
    }

    //await inventoryModel.giveDefaultSeedToUser(userId);
    await inventoryModel.giveRandomSeedToUser(userId);
    await missionModel.assignInitialMissionsToUser(userId);

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


exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', '로그아웃되었습니다.');
        res.redirect('/login');
    });
};


exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword, newPasswordConfirm } = req.body;

  // 입력값 검증
  if (!oldPassword || !newPassword || !newPasswordConfirm) {
    return res.status(400).render('changePassword', {
      title: '비밀번호 변경',
      error: ['모든 비밀번호 필드를 입력해주세요.'],
      form: req.body,
      user: req.user,
      message: ''
    });
  }

  // 새 비밀번호와 확인 일치 여부 확인
  if (newPassword !== newPasswordConfirm) {
    return res.status(400).render('changePassword', {
      title: '비밀번호 변경',
      error: ['새 비밀번호가 일치하지 않습니다.'],
      form: req.body,
      user: req.user,
      message: ''
    });
  }

  try {
    await authService.changePassword(req.user.user_id, oldPassword, newPassword);
    res.render('changePassword', {
      title: '비밀번호 변경',
      message: '비밀번호가 성공적으로 변경되었습니다.',
      form: {},
      user: req.user,
      error: []
    });
  } catch (err) {
    res.status(400).render('changePassword', {
      title: '비밀번호 변경',
      error: [err.message],
      form: req.body,
      user: req.user,
      message: ''
    });
  }
};


exports.changeEmail = async (req, res) => {
    try {
        await authService.changeEmail(req.user.user_id, req.body.newEmail);
        res.render('changeEmail', {
       title: '이메일 변경',
            message: '이메일이 성공적으로 변경되었습니다.',
            form: {},
            user: req.user
        });
    } catch (err) {
        res.status(400).render('changeEmail', {
       title: '이메일 변경',
            error: [err.message],
            form: req.body,
            user: req.user,
            message: ''
        });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
   console.log('[DEBUG] req.user:', req.user);
        console.log('[DEBUG] req.user.user_id:', req.user?.user_id);
        console.log('[DEBUG] req.user.id:', req.user?.id);
        await authService.deleteAccount(req.user.user_id);
        req.logout(() => {
            req.flash('success', '회원탈퇴가 완료되었습니다.');
            res.redirect('/login');
        });
    } catch (err) {
   console.error('[ERROR] 탈퇴 실패:', err);
        res.status(400).render('myPage', {
            error: [err.message]
        });
    }
};
