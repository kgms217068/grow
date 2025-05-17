// routes/auth.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');

// Render login form
router.get('/login', (req, res) => res.render('login'));

// Handle login submission
router.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

// Render registration form
router.get('/register', (req, res) => res.render('register'));

// Handle registration submission
router.post('/register', authController.register);

router.get('/registerSuccess', (req, res) => res.render('registerSuccess'));

// Logout
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/login');
    });
});
/*
// Render password reset form
router.get('/reset-password', (req, res) => {
    res.render('resetPassword');
});

// Handle password reset submission
router.post('/reset-password', authController.resetPassword);

// Render password change form (should be protected, e.g., only for logged-in users)
router.get('/change-password', (req, res) => {
    res.render('changePassword');
});

// Handle password change submission
router.post('/change-password', authController.changePassword);
*/

module.exports = router;

