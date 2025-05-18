const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');

// 🔹 로그인 폼
router.get('/login', (req, res) => {
  res.render('login', {
    form: {},
    error: req.flash('error')
  });
});

// 🔹 로그인 처리
router.post('/login', authController.login);

// 🔹 회원가입 폼
router.get('/register', (req, res) => {
  res.render('register', {
    form: {},
    error: []
  });
});

// 🔹 회원가입 처리
router.post('/register', authController.register);

// 🔹 회원가입 성공 화면
router.get('/registerSuccess', (req, res) => res.render('registerSuccess'));

// 🔹 로그아웃
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

module.exports = router;

