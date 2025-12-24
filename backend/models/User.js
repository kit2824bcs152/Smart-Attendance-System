const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true } // Storing plain text as allowed by user instructions for now, or will add basic comparison logic.
});

module.exports = mongoose.model('User', userSchema);
