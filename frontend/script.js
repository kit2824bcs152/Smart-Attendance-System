const API_URL = 'http://localhost:5000';

// State
let allStudents = [];
let attendanceData = {}; // Map rollNo -> status
let currentDate = new Date().toISOString().split('T')[0];

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
    loadStudents();

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
    document.getElementById('load-date-btn').addEventListener('click', loadAttendanceForDate);
    document.getElementById('save-btn').addEventListener('click', saveAttendance);
    document.getElementById('reset-btn').addEventListener('click', showResetConfirmation);
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
        if (res.ok) {
            const data = await res.json();
            // Map fetched records to state
            data.records.forEach(record => {
                attendanceData[record.rollNo] = record.status;
            });
            // Reset others to Default (Absent) if new students added? 
            // For simplicity, we assume student list is static enough or we merge
        } else {
            // No record found, reset to all Absent
            console.log('No record found for this date, resetting view to Absent.');
            allStudents.forEach(student => {
                attendanceData[student.rollNo] = 'Absent';
            });
        }
        renderTable();
    } catch (err) {
        console.error(err);
        // Fallback or error handling
    }
}

function showResetConfirmation() {
    confirmModal.classList.remove('hidden');
}

async function resetAttendance() {
    const date = dateInput.value;
    try {
        const res = await fetch(`${API_URL}/attendance/reset/${date}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            alert('Attendance reset successfully');
            // Reset local state
            allStudents.forEach(student => {
                attendanceData[student.rollNo] = 'Absent';
            });
            renderTable();
        } else {
            alert('No record to reset or error occurred');
        }
    } catch (err) {
        console.error(err);
        alert('Error resetting attendance');
    } finally {
        confirmModal.classList.add('hidden');
    }
}

async function exportToExcel() {
    try {
        // Fetch 30-day analytics
        const res = await fetch(`${API_URL}/attendance/analytics/30days`);
        const analyticsData = await res.json();

        // Prepare data with Analytics
        const data = allStudents.map(s => ({
            Date: dateInput.value,
            RollNo: s.rollNo,
            Name: s.name,
            Department: s.department,
            Status: attendanceData[s.rollNo] || 'Absent',
            'Attendance % (30 Days)': analyticsData[s.rollNo] || '0.0%'
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

        XLSX.writeFile(workbook, `Attendance_${dateInput.value}.xlsx`);
    } catch (err) {
        console.error('Error exporting Excel:', err);
        alert('Failed to export Excel with Analytics');
    }
}

async function seedStudents() {
    try {
        const res = await fetch(`${API_URL}/students/seed`, { method: 'POST' });
        if (res.ok) {
            alert('Sample students added! Reloading...');
            loadStudents();
        }
    } catch (err) {
        console.error(err);
        alert('Error seeding database');
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
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            // Transform data to match Schema
            const students = jsonData.map(row => {
                const keys = Object.keys(row);
                const getVal = (k) => row[keys.find(key => key.toLowerCase().includes(k))];

                return {
                    rollNo: getVal('reg') || getVal('roll') || row['RollNo'] || 'Unknown',
                    name: getVal('name') || row['Name'] || 'Unknown',
                    department: getVal('dept') || row['Department'] || 'CSE - C'
                };
            }).filter(s => s.rollNo !== 'Unknown');

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
