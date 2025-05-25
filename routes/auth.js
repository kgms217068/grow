const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', (req, res) => {
  res.render('login', {
    message: req.flash('success'),
    error: req.flash('error'),
    form: {}
  });
});

router.post('/login', authController.login);

router.get('/register', (req, res) => {
  res.render('register', {
    form: {},
    error: []
  });
});

router.post('/register', authController.register);

router.get('/registerSuccess', (req, res) => res.render('registerSuccess'));

router.post('/change-email', authController.changeEmail);

router.post('/change-password', authController.changePassword);

router.post('/delete-account', authController.deleteAccount);

router.post('/logout', authController.logout);

module.exports = router;

