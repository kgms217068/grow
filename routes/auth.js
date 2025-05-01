


// routes/auth.js
const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
  res.send('<h1>로그인 페이지</h1>');
});

router.get('/register', (req, res) => {
  res.send('<h1>회원가입 페이지</h1>');
});

module.exports = router;


module.exports = router