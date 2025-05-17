const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const bcrypt = require('bcrypt');

// Local strategy for login
passport.use(new LocalStrategy(
    { usernameField: 'email' }, // use 'email' instead of 'username'
    async (email, password, done) => {
        try {
            const user = await User.findByEmail(email);
            if (!user) return done(null, false, { message: 'Incorrect email.' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return done(null, false, { message: 'Incorrect password.' });

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user.user_id); // use user_id as primary key
});

// Deserialize user from session
passport.deserializeUser(async (user_id, done) => {
    try {
        const user = await User.findById(user_id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;
