const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Seed default admin user if not exists
async function seedDefaultUser() {
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
        await User.create({ username: 'admin', password: 'admin' });
        console.log('Default admin user created');
    }
}
seedDefaultUser();

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true, message: 'Login successful', username: user.username });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Credentials
router.post('/update', async (req, res) => {
    const { currentUsername, currentPassword, newUsername, newPassword } = req.body;
    try {
        // Verify current
        const user = await User.findOne({ username: currentUsername, password: currentPassword });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Current credentials incorrect' });
        }

        // Update
        user.username = newUsername;
        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Credentials updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
