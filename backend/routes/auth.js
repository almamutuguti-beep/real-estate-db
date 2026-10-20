const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required'})
    }

    try {
        const [rows] = await db.query (
            `SELECT user_id, username, password_hash, role, is_verified, is_active
            FROM user_account WHERE username = ?`, [username]
        );

        const user = rows[0]
        const valid = user && (await bcrypt.compare(password, user.password_hash));

        if (!valid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated.' });

        }

        const token = jwt.sign (
            { userId: user.user_id, role: user.role},
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            sameite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000,
        });

        res.json({
            uer: {
                userId: user.user_id,
                username: user.username,
                role: user.role,
                isVerfied: !!user.is_verfied,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }

});

module.exports = router;