const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// Save or Update Attendance
router.post('/', async (req, res) => {
    const { date, records } = req.body;
    try {
        // Check if attendance for this date already exists
        let attendance = await Attendance.findOne({ date });

        if (attendance) {
            // Update existing record
            attendance.records = records;
            await attendance.save();
        } else {
            // Create new record
            attendance = new Attendance({ date, records });
            await attendance.save();
        }
        res.status(201).json(attendance);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get Attendance for a specific date
router.get('/:date', async (req, res) => {
    try {
        const attendance = await Attendance.findOne({ date: req.params.date });
        if (!attendance) {
            return res.status(404).json({ message: 'No attendance record found for this date' });
        }
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Absent Students for a specific date
router.get('/absent/:date', async (req, res) => {
    try {
        const attendance = await Attendance.findOne({ date: req.params.date });
        if (!attendance) {
            return res.status(404).json({ message: 'No attendance record found for this date' });
        }

        const absentStudents = attendance.records.filter(record => record.status === 'Absent');
        res.json(absentStudents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Reset Attendance for a specific date
router.delete('/reset/:date', async (req, res) => {
    try {
        const result = await Attendance.deleteOne({ date: req.params.date });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No attendance record found to reset' });
        }
        res.json({ message: 'Attendance reset successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Analytics: Get 30 Days Percentage
router.get('/analytics/30days', async (req, res) => {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        // Convert Dates to String Format YYYY-MM-DD to match schema
        // Note: Simple string comparison works for ISO dates
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];

        const records = await Attendance.find({
            date: { $gte: startDate }
        });

        // Map: RollNo -> { total: 0, present: 0 }
        const studentStats = {};

        records.forEach(dayRecord => {
            dayRecord.records.forEach(student => {
                if (!studentStats[student.rollNo]) {
                    studentStats[student.rollNo] = { total: 0, present: 0 };
                }
                studentStats[student.rollNo].total += 1;
                if (student.status === 'Present') {
                    studentStats[student.rollNo].present += 1;
                }
            });
        });

        // Calculate Percentages
        const percentages = {};
        for (const [rollNo, stats] of Object.entries(studentStats)) {
            percentages[rollNo] = ((stats.present / stats.total) * 100).toFixed(1) + '%';
        }

        res.json(percentages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
