const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        unique: true
    },
    records: [{
        rollNo: String,
        name: String,
        status: {
            type: String,
            enum: ['Present', 'Absent'],
            default: 'Absent'
        }
    }]
});

module.exports = mongoose.model('Attendance', attendanceSchema);
