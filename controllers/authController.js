const passport = require('../config/passport');
const authService = require('../services/authService');


// Registration
exports.register = async (req, res) => {
    try {
        const userId = await authService.register(req.body);
        // Render a registration success page
        res.status(201).render('registerSuccess', { userId });
    } catch (err) {
        // Render the registration form with an error message
        res.status(400).render('register', { error: err.message, form: req.body });
    }
};

// Login (using Passport.js)
exports.login = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error', '로그인에 실패했습니다.');
            return res.redirect('/login');
        }

        req.logIn(user, (err) => {
            if (err) return next(err);
            // Redirect or render a dashboard/home page after successful login
            res.render('dashboard', { user });
        });
    })(req, res, next);
};

// Logout
exports.logout = (req, res) => {
    req.logout(() => {
        // Redirect to login or home page after logout
        res.render('login', { message: 'Logged out successfully' });
    });
};

// Password reset
exports.resetPassword = async (req, res) => {
    try {
        await authService.resetPassword(req.body.email, req.body.newPassword);
        // Render the reset password page with a success message
        res.render('resetPassword', { message: 'Password reset successful' });
    } catch (err) {
        // Render the reset password form with an error message
        res.status(400).render('resetPassword', { error: err.message, form: req.body });
    }
};

// Password change
exports.changePassword = async (req, res) => {
    try {
        await authService.changePassword(
            req.user.id,
            req.body.oldPassword,
            req.body.newPassword
        );
        // Render the change password page with a success message
        res.render('changePassword', { message: 'Password changed successfully' });
    } catch (err) {
        // Render the change password form with an error message
        res.status(400).render('changePassword', { error: err.message, form: req.body });
    }
};

