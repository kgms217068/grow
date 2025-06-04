const bcrypt = require('bcrypt');
const validator = require('validator');
const User = require('../models/user');

const userService = {
    register: async (userData) => {
        const { nickname, email, password, passwordConfirm } = userData;

        // 모든 필수 입력값 확인
        if (!nickname || !email || !password || !passwordConfirm) {
            throw new Error('닉네임, 이메일, 비밀번호, 비밀번호 확인을 모두 입력해주세요.');
        }

        // 비밀번호 일치 여부 검사
        if (password !== passwordConfirm) {
            throw new Error('비밀번호가 일치하지 않습니다.');
        }

        // 이메일 형식 확인
        if (!validator.isEmail(email)) {
            throw new Error('올바른 이메일 형식을 입력해주세요.');
        }

        // 비밀번호 길이 검사
        if (!validator.isLength(password, { min: 8 })) {
            throw new Error('비밀번호는 8자 이상이어야 합니다.');
        }

        // 닉네임 중복 검사
        const existingNickname = await User.findByNickname(nickname);
        if (existingNickname) {
            throw new Error('이미 사용 중인 닉네임입니다.');
        }

        // 이메일 중복 검사
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            throw new Error('이미 사용 중인 이메일입니다.');
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 생성
        // return await User.create({
        //     email,
        //     password: hashedPassword,
	    // nickname,
        // });
        const { user_id } = await User.create({ email, password: hashedPassword, nickname });
        return user_id;
    },

    login: async (email, password) => {
        // Validate input
        if (!email || !password) {
            throw new Error('이메일과 비밀번호를 모두 입력해주세요.');
        }

        // Find the user by email
        const user = await User.findByEmail(email);
        if (!user) {
            throw new Error('존재하지 않는 사용자입니다');
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('비밀번호가 일치하지 않습니다.');
        }

        // Return the user (without the password)
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    },


    // For password change (user knows old password)
    changePassword: async (userId, oldPassword, newPassword) => {
        if (!userId || !oldPassword || !newPassword) {
            throw new Error('현재 비밀번호와 새 비밀번호를 모두 입력해주세요.');
        }
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('존재하지 않는 사용자입니다.');
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('현재 비밀번호가 올바르지 않습니다.');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updated = await User.updatePasswordById(userId, hashedPassword);
        if (!updated) {
            throw new Error('비밀번호 변경에 실패했습니다.');
        }
        return true;
    },

    changeEmail: async (userId, newEmail) => {
        if (!userId || !newEmail) throw new Error('새 이메일을 입력해주세요.');
        const existingUser = await User.findByEmail(newEmail);
        if (existingUser) throw new Error('이미 사용 중인 이메일입니다.');
        const updated = await User.updateEmailById(userId, newEmail);
        if (!updated) throw new Error('이메일 변경에 실패했습니다.');
        return true;
    },

    deleteAccount: async (userId) => {
	console.log('[DEBUG] 서비스 deleteAccount userId:', userId);
        const deleted = await User.deleteById(userId);
	console.log('[DEBUG] delete result:', deleted);
        if (!deleted) throw new Error('회원탈퇴에 실패했습니다.');
        return true;
    }
};

module.exports = userService;
