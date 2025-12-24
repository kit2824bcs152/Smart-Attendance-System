const API_URL = 'http://localhost:5000';

// State
let allStudents = [];
let attendanceData = {}; // Map rollNo -> status
// Use Local Time for Default Date
const now = new Date();
const offset = now.getTimezoneOffset() * 60000;
const localDate = new Date(now - offset).toISOString().split('T')[0];
let currentDate = localDate;

// DOM Elements
const dateInput = document.getElementById('attendance-date');
const tableBody = document.getElementById('student-table-body');
const absentList = document.getElementById('absent-students-list');
const totalCountSpan = document.getElementById('total-count');
const presentCountSpan = document.getElementById('present-count');
const absentCountSpan = document.getElementById('absent-count');
const confirmModal = document.getElementById('confirm-modal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    dateInput.value = currentDate;
    loadStudents().then(() => {
        loadAttendanceForDate();
    });

    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.spa-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide all sections
            sections.forEach(sec => sec.classList.add('hidden'));

            // Show target section
            if (item.innerHTML.includes('Attendance')) {
                document.getElementById('section-attendance').classList.remove('hidden');
            } else if (item.innerHTML.includes('Analytics')) {
                document.getElementById('section-analytics').classList.remove('hidden');
                renderChart();
            } else if (item.innerHTML.includes('Settings')) {
                document.getElementById('section-settings').classList.remove('hidden');
            }
        });
    });

    // Event Listeners
    // document.getElementById('load-date-btn').addEventListener('click', loadAttendanceForDate); // Removed from UI

    // Auto-load on date change
    document.getElementById('attendance-date').addEventListener('change', loadAttendanceForDate);

    document.getElementById('save-btn').addEventListener('click', saveAttendance);
    document.getElementById('reset-btn').addEventListener('click', showResetConfirmation);

    // Updated Export ID
    document.getElementById('export-btn').addEventListener('click', exportToExcel);

    document.getElementById('seed-btn').addEventListener('click', seedStudents);

    // Settings & Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    const updateCredsBtn = document.getElementById('update-creds-btn');
    if (updateCredsBtn) {
        updateCredsBtn.addEventListener('click', updateCredentials);
    }

    // Excel Import
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('excel-input');

    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
    }

    document.getElementById('confirm-reset-btn').addEventListener('click', resetAttendance);
    document.getElementById('cancel-reset-btn').addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });

    // Search Functionality
    const searchInput = document.getElementById('search-student');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderTable();
        });
    }
});

let myChart = null;

function renderChart() {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    const present = parseInt(presentCountSpan.textContent) || 0;
    const absent = parseInt(absentCountSpan.textContent) || 0;

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Present', 'Absent'],
            datasets: [{
                data: [present, absent],
                backgroundColor: ['#4cc9f0', '#f72585'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
}

async function updateCredentials() {
    const oldUser = document.getElementById('set-old-user').value;
    const oldPass = document.getElementById('set-old-pass').value;
    const newUser = document.getElementById('set-new-user').value;
    const newPass = document.getElementById('set-new-pass').value;

    if (!oldUser || !oldPass || !newUser || !newPass) {
        alert('Please fill all fields');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentUsername: oldUser,
                currentPassword: oldPass,
                newUsername: newUser,
                newPassword: newPass
            })
        });

        const data = await res.json();
        if (data.success) {
            alert('Credentials updated! Please login again.');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('Error updating credentials');
    }
}

async function loadStudents() {
    try {
        const res = await fetch(`${API_URL}/students`);
        const students = await res.json();
        allStudents = students;

        // Initialize attendance as Absent for all
        allStudents.forEach(student => {
            if (!attendanceData[student.rollNo]) {
                attendanceData[student.rollNo] = 'Absent';
            }
        });

        // Try to load attendance for today if exists
        await loadAttendanceForDate();
    } catch (err) {
        console.error('Error loading students:', err);
        // alert('Failed to load students. Ensure backend is running.');
    }
}

function renderTable() {
    tableBody.innerHTML = '';

    // Search Logic
    const searchInput = document.getElementById('search-student');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    let presentCount = 0;

    // Filter Students
    const filteredStudents = allStudents.filter(s =>
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(query))
    );

    filteredStudents.forEach(student => {
        const row = document.createElement('tr');
        const status = attendanceData[student.rollNo] || 'Absent';

        if (status === 'Present') presentCount++;

        row.className = `student-row ${status.toLowerCase()}`;

        // Status Button Logic
        const statusBtnClass = status === 'Present' ? 'btn-present' : 'btn-absent';
        const statusBtnText = status === 'Present' ? 'Present' : 'Absent';

        row.innerHTML = `
            <td>${student.rollNo}</td>
            <td>${student.name}</td>
            <td>${student.department || 'CSE - C'}</td>
            <td>
                <button class="status-btn ${statusBtnClass}" onclick="event.stopPropagation(); toggleAttendance('${student.rollNo}')">
                    ${statusBtnText}
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Calculate Global Stats
    const totalPresent = allStudents.reduce((acc, curr) => {
        return (attendanceData[curr.rollNo] === 'Present') ? acc + 1 : acc;
    }, 0);

    updateStats(totalPresent);
    updateAbsentList();
}

function toggleAttendance(rollNo) {
    const currentStatus = attendanceData[rollNo];
    attendanceData[rollNo] = currentStatus === 'Absent' ? 'Present' : 'Absent';
    renderTable();
}

function updateStats(presentCount) {
    const total = allStudents.length;
    const absent = total - presentCount;

    totalCountSpan.textContent = total;
    presentCountSpan.textContent = presentCount;
    absentCountSpan.textContent = absent;
}

function updateAbsentList() {
    absentList.innerHTML = '';
    const absentStudents = allStudents.filter(s => attendanceData[s.rollNo] === 'Absent');

    absentStudents.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${s.rollNo} - ${s.name}`;
        absentList.appendChild(li);
    });
}

async function saveAttendance() {
    const records = allStudents.map(s => ({
        rollNo: s.rollNo,
        name: s.name,
        status: attendanceData[s.rollNo]
    }));

    const payload = {
        date: dateInput.value,
        records: records
    };

    try {
        const res = await fetch(`${API_URL}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Attendance saved successfully!');
        } else {
            throw new Error('Failed to save');
        }
    } catch (err) {
        console.error(err);
        alert('Error saving attendance');
    }
}

async function loadAttendanceForDate() {
    const date = dateInput.value;
    try {
        const res = await fetch(`${API_URL}/attendance/${date}`);
        if (!res.ok) {
            // If date not found, reset UI to "Absent" (New Day)
            if (res.status === 404) {
                console.log('No record found for date, resetting UI.');
                allStudents.forEach(student => {
                    attendanceData[student.rollNo] = 'Absent';
                });
                renderTable();
                return;
            }
            throw new Error('Failed to fetch');
        }

        const data = await res.json();

        // Populate attendanceData from fetched records
        // Reset first to ensure clean state
        allStudents.forEach(student => {
            attendanceData[student.rollNo] = 'Absent';
        });

        data.records.forEach(record => {
            attendanceData[record.rollNo] = record.status;
        });

        renderTable();
    } catch (err) {
        console.error('Error loading date:', err);
        // Do not alert on 404/reset, only on real errors if needed
    }
}

function showResetConfirmation() {
    confirmModal.classList.remove('hidden');
}

async function resetAttendance() {
    const date = dateInput.value;
    try {
        // Delete from Backend
        const res = await fetch(`${API_URL}/attendance/${date}`, {
            method: 'DELETE'
        });

        if (res.ok || res.status === 404) {
            // Reset Local State
            allStudents.forEach(s => {
                attendanceData[s.rollNo] = 'Absent';
            });
            renderTable();
            // alert('Attendance data has been permanently deleted.');
        } else {
            const data = await res.json();
            alert('Error resetting data: ' + data.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to reset attendance.');
    } finally {
        confirmModal.classList.add('hidden');
    }
}

async function exportToExcel() {
    // 1. Prepare Data
    // We want to include 30-Day Stats
    let analyticsData = {};
    try {
        const res = await fetch(`${API_URL}/attendance/analytics/30days`);
        if (res.ok) {
            analyticsData = await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch analytics for export', e);
    }

    const wsData = allStudents.map(s => {
        const status = attendanceData[s.rollNo] || 'Absent';
        const percent = analyticsData[s.rollNo] ? `${analyticsData[s.rollNo]}%` : '0%';
        return {
            "Roll No": s.rollNo,
            "Name": s.name,
            "Department": s.department || 'CSE - C',
            // "Date": dateInput.value, // Removed as per request
            // "Status": status, // Removed as per request
            "Attendance % (30 Days)": percent
        };
    });

    // 2. Create Sheet
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report");

    // 3. Download
    XLSX.writeFile(wb, `Attendance_${dateInput.value}.xlsx`);
}

async function exportMonthlyReport() {
    // Prompt for Month (Default to current YYYY-MM)
    const currentMonth = dateInput.value.substring(0, 7);
    const month = prompt("Enter Month (YYYY-MM):", currentMonth);
    if (!month) return;

    try {
        const res = await fetch(`${API_URL}/attendance/report/monthly?month=${month}`);
        if (!res.ok) throw new Error('Failed to fetch monthly data');

        const records = await res.json();

        // Process Data: Matrix [Student x Days]
        // Get number of days in the month
        const year = parseInt(month.split('-')[0]);
        const monthIndex = parseInt(month.split('-')[1]) - 1;
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        // Create Header Row
        const headers = ['Roll No', 'Name', 'Department'];
        for (let i = 1; i <= daysInMonth; i++) {
            headers.push(i.toString());
        }
        headers.push('Total Present');
        headers.push('Percentage');

        // Map Data
        const excelData = allStudents.map(student => {
            const row = {};
            row['Roll No'] = student.rollNo;
            row['Name'] = student.name;
            row['Department'] = student.department || 'CSE - C';

            let presentCount = 0;

            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${month}-${String(i).padStart(2, '0')}`;

                // Find record for this date
                const recordForDay = records.find(r => r.date === dateStr);
                let status = '-'; // Default no data

                if (recordForDay) {
                    const studentRecord = recordForDay.records.find(sr => sr.rollNo === student.rollNo);
                    if (studentRecord) {
                        status = studentRecord.status === 'Present' ? 'P' : 'A';
                    }
                }

                if (status === 'P') presentCount++;
                row[i.toString()] = status;
            }

            row['Total Present'] = presentCount;
            row['Percentage'] = ((presentCount / daysInMonth) * 100).toFixed(1) + '%';

            return row;
        });

        // Generate Sheet
        const ws = XLSX.utils.json_to_sheet(excelData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Monthly_${month}`);
        XLSX.writeFile(wb, `Monthly_Attendance_${month}.xlsx`);

    } catch (err) {
        console.error(err);
        alert('Error generating monthly report');
    }
}

async function seedStudents() {
    const students = [
        { rollNo: '101', name: 'Alice Johnson', department: 'CSE - C' },
        { rollNo: '102', name: 'Bob Smith', department: 'CSE - C' },
        { rollNo: '103', name: 'Charlie Brown', department: 'CSE - C' },
        { rollNo: '104', name: 'David Lee', department: 'CSE - C' },
        { rollNo: '105', name: 'Eve Davis', department: 'CSE - C' }
    ];

    try {
        await fetch(`${API_URL}/students/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students })
        });
        alert('Seeded dummy students!');
        loadStudents();
    } catch (err) {
        console.error(err);
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Assume first sheet
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            // Transform data to match Schema
            const students = jsonData.map(row => {
                const keys = Object.keys(row);
                // Heuristics to find correct columns case-insensitively
                const getVal = (k) => {
                    const foundKey = keys.find(key => key.toLowerCase().includes(k.toLowerCase()));
                    return foundKey ? row[foundKey] : undefined;
                };

                return {
                    rollNo: getVal('roll') || getVal('reg') || 'Unknown',
                    name: getVal('name') || 'Unknown',
                    department: getVal('dept') || 'CSE - C'
                };
            }).filter(s => s.rollNo !== 'Unknown' && s.name !== 'Unknown');

            if (students.length === 0) {
                alert('No valid student data found in Excel.');
                return;
            }

            // Send to Backend
            const res = await fetch(`${API_URL}/students/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(students)
            });

            if (res.ok) {
                const result = await res.json();
                alert(`Success! ${result.message}`);
                loadStudents(); // Reload table
            } else {
                const err = await res.json();
                throw new Error(err.message);
            }

        } catch (err) {
            console.error(err);
            alert('Failed to import Excel: ' + err.message);
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}
