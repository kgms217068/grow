const { promisePool } = require('../db/db');

const User = {
    create: async ({ email, password, nickname }) => {
    const [exists] = await promisePool.query(
        'SELECT user_id, email, nickname FROM `user` WHERE email = ? OR nickname = ?',
        [email, nickname]
    );

    for (const user of exists) {
        if (user.email === email) {
            throw new Error('이미 사용 중인 이메일입니다.');
        }
        if (user.nickname === nickname) {
            throw new Error('이미 사용 중인 닉네임입니다.');
        }
    }

    const [result] = await promisePool.query(
        'INSERT INTO `user` (email, password, nickname) VALUES (?, ?, ?)',
        [email, password, nickname]
    );

    return { user_id: result.insertId, email, nickname };
    },

    findByEmail: async (email) => {
        if (!email) {
            throw new Error('이메일을 입력해 주세요.');
        }

        const [rows] = await promisePool.query(
            'SELECT * FROM `user` WHERE email = ?',
            [email]
        );

        return rows.length > 0 ? rows[0] : null;
    },

    findByNickname: async (nickname) => {
        if (!nickname) {
            throw new Error('닉네임을 입력해 주세요.');
        }

        const [rows] = await promisePool.query(
            'SELECT * FROM `user` WHERE nickname = ?',
            [nickname]
        );

        return rows.length > 0 ? rows[0] : null;
    },

    findById: async (user_id) => {
        if (!user_id) {
            throw new Error('사용자ID가 필요합니다.');
        }

        const [rows] = await promisePool.query(
            'SELECT * FROM `user` WHERE user_id = ?',
            [user_id]
        );

        return rows.length > 0 ? rows[0] : null;
    },

    updatePasswordByEmail: async (email, hashedPassword) => {
        const [result] = await promisePool.query(
            'UPDATE `user` SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );
        return result.affectedRows > 0;
    },

    updatePasswordById: async (user_id, hashedPassword) => {
        const [result] = await promisePool.query(
            'UPDATE `user` SET password = ? WHERE user_id = ?',
            [hashedPassword, user_id]
        );
        return result.affectedRows > 0;
    },

    updateEmailById: async (user_id, newEmail) => {
        const [result] = await promisePool.query(
            'UPDATE `user` SET email = ? WHERE user_id = ?',
            [newEmail, user_id]
        );
        return result.affectedRows > 0;
    },

    deleteById: async (user_id) => {
        const [result] = await promisePool.query(
            'DELETE FROM `user` WHERE user_id = ?',
            [user_id]
        );
        return result.affectedRows > 0;
    }

};

module.exports = User;
