const bcrypt = require('bcrypt');
const validator = require('validator');
const User = require('../models/user');

const userService = {
    register: async (userData) => {
        // Validate required fields
        if (!userData.nickname || !userData.email || !userData.password) {
            throw new Error('Missing required fields: nickname, email, or password');
        }

        // Validate email format
        if (!validator.isEmail(userData.email)) {
            throw new Error('Invalid email');
        }

        // Validate password length
        if (!validator.isLength(userData.password, { min: 8 })) {
            throw new Error('Password too short');
        }

        // Check if nickname already exists
        const existingNickname = await User.findByNickname(userData.nickname);
        if (existingNickname) {
            throw new Error('Nickname already in use');
        }

        // Check if email or nickname already exists
        const existingUser = await User.findByEmail(userData.email);
        if (existingUser) {
            throw new Error('Email already in use');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Save the user to the database
        return await User.create({
            nickname: userData.nickname,
            email: userData.email,
            password: hashedPassword,
        });
    },

    login: async (email, password) => {
        // Validate input
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Find the user by email
        const user = await User.findByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        // Return the user (without the password)
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    },

    resetPassword: async (email, newPassword) => {
        if (!email || !newPassword) {
            throw new Error('Email and new password are required');
        }
        const user = await User.findByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updated = await User.updatePasswordByEmail(email, hashedPassword);
        if (!updated) {
            throw new Error('Password reset failed');
        }
        return true;
    },

    // For password change (user knows old password)
    changePassword: async (userId, oldPassword, newPassword) => {
        if (!userId || !oldPassword || !newPassword) {
            throw new Error('User ID, old password, and new password are required');
        }
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Old password is incorrect');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updated = await User.updatePasswordById(userId, hashedPassword);
        if (!updated) {
            throw new Error('Password change failed');
        }
        return true;
    }
};

module.exports = userService;
