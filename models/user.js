const conn = require('./db');

const User = {
    create: async (userData) => async ({ email, password, nickname }) => {
        // Check for existing email or nickname
        const [exists] = await conn.promisePool.query(
            'SELECT user_id, email, nickname FROM users WHERE email = ? OR nickname = ?',
            [email, nickname]
        );
        if (exists.length) {
            if (exists[0].email === email) throw new Error('Email already in use');
            if (exists[0].nickname === nickname) throw new Error('Nickname already in use');
        }
        const [result] = await conn.promisePool.query(
            'INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)',
            [email, password, nickname]
        );
        return { user_id: result.insertId, email, nickname };
    },

    findByEmail: async (email) => {
        // Validate email input
        if (!email) {
            throw new Error('Email is required');
        }

        // Query the database for a user with the given email
        const [rows] = await conn.promisePool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        // Return the user if found, otherwise return null
        return rows.length > 0 ? rows[0] : null;
    },

    findByNickname: async (nickname) => {
        // Validate nickname input
        if (!nickname) {
            throw new Error('Nickname is required');
        }

        // Query the database for a user with the given nickname
        const [rows] = await conn.promisePool.query(
            'SELECT * FROM users WHERE nickname = ?',
            [nickname]
        );

        // Return the user if found, otherwise return null
        return rows.length > 0 ? rows[0] : null;
    },

    findById: async (id) => {
        // Validate ID input
        if (!id) {
            throw new Error('ID is required');
        }

        // Query the database for a user with the given ID
        const [rows] = await conn.promisePool.query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        // Return the user if found, otherwise return null
        return rows.length > 0 ? rows[0] : null;
    },

    updatePasswordByEmail: async (email, hashedPassword) => {
        const [result] = await conn.promisePool.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );
        return result.affectedRows > 0;
    },

    updatePasswordById: async (id, hashedPassword) => {
        const [result] = await conn.promisePool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );
        return result.affectedRows > 0;
    }
};

module.exports = User;
