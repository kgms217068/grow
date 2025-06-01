// routes/last-complete.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('last-complete'); // 또는 views/complete.ejs
});

module.exports = router;
