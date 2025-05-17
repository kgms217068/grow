const conn = require('./db');


const User = {
    create: async (userData) => {
        // Validate required fields
        if (!userData.nickname || !userData.email || !userData.password) {
            throw new Error('Missing required fields: nickname, email, or password');
        }

        // Insert into the database
        const [result] = await conn.promise().query(
            'INSERT INTO users (nickname, email, password) VALUES (?, ?, ?)',
            [userData.nickname, userData.email, userData.password]
        );

        // Return the inserted ID
        return result.insertId;
    },

    findByEmail: async (email) => {
        // Validate email input
        if (!email) {
            throw new Error('Email is required');
        }

        // Query the database for a user with the given email
        const [rows] = await conn.promise().query(
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
        const [rows] = await conn.promise().query(
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
        const [rows] = await conn.promise().query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        // Return the user if found, otherwise return null
        return rows.length > 0 ? rows[0] : null;
    },

    updatePasswordByEmail: async (email, hashedPassword) => {
        const [result] = await conn.promise().query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );
        return result.affectedRows > 0;
    },

    updatePasswordById: async (id, hashedPassword) => {
        const [result] = await conn.promise().query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );
        return result.affectedRows > 0;
    }

};

module.exports = User;
