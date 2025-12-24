require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_attendance', {
    serverSelectionTimeoutMS: 5000 // Fail after 5s if can't connect
})
    .then(async () => {
        console.log('MongoDB Connected');
        
        // Seed default admin user
        const User = require('./models/User');
        try {
            const admin = await User.findOne({ username: 'admin' });
            if (!admin) {
                await User.create({ username: 'admin', password: 'admin' });
                console.log('Default admin user created');
            }
        } catch (err) {
            console.error('Error seeding default user:', err.message);
        }
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err.message);
        // On cloud, we might want to exit if DB fails so the orchestrator restarts it
        // process.exit(1); 
    });

// Routes
app.use('/students', studentRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/auth', authRoutes);

// Root Route
app.get('/', (req, res) => {
    res.send('Smart Attendance System API Running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
