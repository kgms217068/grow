const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuthenticated } = require('../middlewares/auth');

router.get('/login', (req, res) => {
  res.render('login', {
    title: '로그인',
    message: req.flash('success'),
    error: req.flash('error'),
    form: {}
  });
});

router.post('/login', authController.login);

router.get('/register', (req, res) => {
  res.render('register', {
    title: '회원가입',
    form: {},
    error: []
  });
});

router.post('/register', authController.register);

router.get('/registerSuccess', (req, res) => 
	res.render('registerSuccess', { title: '회원가입 완료'})
);


router.post('/change-email', ensureAuthenticated, authController.changeEmail);
router.post('/change-password', ensureAuthenticated, authController.changePassword);
router.post('/delete-account', ensureAuthenticated, authController.deleteAccount);
router.post('/logout', ensureAuthenticated, authController.logout);


module.exports = router;
