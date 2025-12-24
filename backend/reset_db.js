const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env
dotenv.config();

// Models
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');

// Connect
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_attendance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log('Connected to MongoDB...');

        try {
            console.log('Deleting All Students...');
            await Student.deleteMany({});

            console.log('Deleting All Attendance Records...');
            await Attendance.deleteMany({});

            console.log('--- DATASET RESET COMPLETE ---');
        } catch (err) {
            console.error('Error resetting data:', err);
        } finally {
            mongoose.connection.close();
        }
    })
    .catch(err => {
        console.error('Connection Error:', err);
    });
