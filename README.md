# Smart Attendance System

A full-stack web application for managing student attendance with MongoDB support.

## Project Structure

```
Smart-Attendance-System/
├── frontend/           # Client-side code
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/            # Server-side code
│   ├── server.js
│   ├── .env
│   ├── models/
│   └── routes/
└── package.json
```

## Setup Instructions

### 1. Prerequisites
- Node.js installed on your machine.
- MongoDB Atlas account (or local MongoDB).

### 2. Backend Setup
1. Open a terminal in the project root.
2. Install dependencies:
   ```bash
   npm install
   ```
   If that fails, manually install:
   ```bash
   npm install express mongoose cors dotenv xlsx
   ```
3. Configure Environment Variables:
   - Open `backend/.env`.
   - Replace `<db_password>` with your actual MongoDB password.
   - Ensure the connection string is correct.

4. Start the Server:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:5000`.

### 3. Frontend Setup
1. Navigate to the `frontend/` folder.
2. You can open `index.html` directly in a browser (e.g., Chrome).
   - *Note: For best results with API calls, usage of a live server extension or simple http server is recommended to avoid CORS issues with file protocol, although the backend is configured with CORS.*

### 4. Usage Guide
1. **Seed Data**: Click the "Seed Students" button to populate the database with dummy student data.
2. **Mark Attendance**: Click on rows to toggle between Present (Green) and Absent (Red).
3. **Save**: Click "Save Attendance" to store data in MongoDB.
4. **Change Date**: Use the date picker to view or mark attendance for different days.
5. **Export**: Click "Export to Excel" to download the current sheet.
6. **Reset**: Click "Reset Attendance" to clear data for the selected date.

## Features
- **Real-time Color Toggle**: Visual feedback for attendance status.
- **Date Management**: Auto-load existing records.
- **Absentee List**: Dynamic list of absent students.
- **Excel Export**: Download reports instantly.
- **Data Persistence**: MongoDB storage.

## API Endpoints
- `GET /students` - List all students
- `POST /attendance` - Save day's attendance
- `GET /attendance/:date` - Get specific date record
- `DELETE /attendance/reset/:date` - Delete record

## Troubleshooting
- **Frontend not loading students?** Check console (F12) for connection errors. Ensure backend is running on port 5000.
- **Database authentication failed?** Check `.env` file for correct password and username.
