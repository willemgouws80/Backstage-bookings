# 🐛 Bug Report: Calendar & Attendance Issues

## Critical Issues Found

### 1. ❌ CALENDAR MODULE — Missing Core Functions

**Problem:** The calendar functions are referenced in HTML but **not defined** in the JavaScript.

**Missing Functions:**
- `loadCalendar()` — Should load and render calendar
- `calPrev()` — Navigate to previous month
- `calNext()` — Navigate to next month  
- `calToday()` — Return to current month
- `setCalView(view)` — Switch between month/week/day views
- `renderCalendarMonth()` — Render month grid
- `renderCalendarEvents()` — Display bookings/courses on calendar

**Files Affected:** `admin.html` (lines 720-729)

**Impact:** ⚠️ **HIGH** — Calendar tab shows blank grid, cannot navigate or view events

---

### 2. ❌ ATTENDANCE MODULE — Missing Implementation

**Problems:**

#### A. `loadAttendanceView()` not working correctly
- Function loads courses/students but **does not render** attendance table
- Missing function to generate attendance grid with clickable cells
- No save/update mechanism for attendance marks

#### B. No `markAttendance()` function
- Attendance cells should be clickable to cycle: unmarked → present → absent
- Currently no way to save attendance to Firebase

#### C. Missing database lookups
- No function to fetch existing attendance records
- No query for student attendance history

**Files Affected:** `admin.html` (lines 691-712)

**Impact:** ⚠️ **HIGH** — Attendance tab appears but cannot mark attendance or save changes

---

### 3. ❌ Related Missing Functions

**These are called but not defined:**

| Function | Called From | Impact |
|----------|-------------|--------|
| `generateTermDates()` | `confirmBooking()` (line 882) | Recurring lessons not generated |
| `renderCoursesList()` | `loadDashboard()` (line 829) | Courses not displayed in dashboard |
| `loadTerms()` | `onAuthStateChanged()` initial load missing | School terms not loaded |
| `loadCourses()` | Not called on auth | Courses not loaded initially |
| `loadStudents()` | `loadAttendanceView()` | Students list not populated |

---

## Required Fixes

### Fix 1: Implement Calendar Module

```javascript
// Calendar state
window._calendarDate = new Date();
window._calendarView = 'month'; // month, week, or day

async function loadCalendar() {
  try {
    const [bookings, courses] = await Promise.all([
      getDocs(collection(db,'bookings')),
      getDocs(collection(db,'courses'))
    ]);
    
    window._calendarBookings = [];
    window._calendarCourses = [];
    
    bookings.forEach(d => window._calendarBookings.push({id:d.id,...d.data()}));
    courses.forEach(d => window._calendarCourses.push({id:d.id,...d.data()}));
    
    renderCalendarMonth();
  } catch(e) {
    console.error('Calendar load error:', e);
    toast('Error loading calendar','error');
  }
}

function renderCalendarMonth() {
  const year = window._calendarDate.getFullYear();
  const month = window._calendarDate.getMonth();
  
  // Update month label
  const monthName = new Date(year, month).toLocaleDateString('en-ZA', {month:'long', year:'numeric'});
  document.getElementById('calMonthLabel').textContent = monthName;
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  let html = '';
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  
  // Day headers
  days.forEach(d => html += `<div class="cal-day-header">${d}</div>`);
  
  // Previous month's days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="cal-day other-month"><div class="cal-day-num">${day}</div></div>`;
  }
  
  // Current month's days
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = today.toISOString().split('T')[0] === dateStr;
    
    // Get events for this day
    const events = getEventsForDate(dateStr);
    const eventHtml = events.map(e => 
      `<div class="cal-event ${e.type}" onclick="viewCalendarEvent('${e.id}')">${e.title}</div>`
    ).join('');
    
    html += `<div class="cal-day ${isToday?'today':''}">
      <div class="cal-day-num">${day}</div>
      ${eventHtml}
    </div>`;
  }
  
  // Next month's days
  const totalCells = (firstDay + daysInMonth);
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${day}</div></div>`;
  }
  
  document.getElementById('calGrid').innerHTML = html;
}

function getEventsForDate(dateStr) {
  const events = [];
  
  // Add bookings
  (window._calendarBookings||[]).forEach(b => {
    if (b.startDate === dateStr || (b.sessionDates||[]).includes(dateStr)) {
      events.push({
        id: b.id,
        title: b.plan ? b.plan.substring(0,15) : 'Booking',
        type: b.status === 'confirmed' ? 'confirmed' : 'pending'
      });
    }
  });
  
  // Add course sessions
  (window._calendarCourses||[]).forEach(c => {
    if (c.schedStartDate === dateStr) {
      events.push({
        id: c.id,
        title: c.title.substring(0,15),
        type: 'course'
      });
    }
  });
  
  return events;
}

function calPrev() {
  window._calendarDate.setMonth(window._calendarDate.getMonth() - 1);
  renderCalendarMonth();
}

function calNext() {
  window._calendarDate.setMonth(window._calendarDate.getMonth() + 1);
  renderCalendarMonth();
}

function calToday() {
  window._calendarDate = new Date();
  renderCalendarMonth();
}

function setCalView(view) {
  window._calendarView = view;
  document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  
  // TODO: Implement week and day views
  if (view === 'month') renderCalendarMonth();
}

function viewCalendarEvent(id) {
  const booking = (window._calendarBookings||[]).find(b => b.id === id);
  const course = (window._calendarCourses||[]).find(c => c.id === id);
  
  if (booking) {
    alert(`${booking.firstName} ${booking.lastName}\n${booking.plan}\n${booking.prefDay} ${booking.prefTime}`);
  } else if (course) {
    alert(`${course.title}\n${course.description}`);
  }
}
```

### Fix 2: Implement Attendance Module

```javascript
async function loadAttendanceView() {
  const mode = document.getElementById('attMode').value;
  const selectId = document.getElementById('attSelect').value;
  
  if (!selectId) {
    document.getElementById('attendanceView').innerHTML = '<div class="loading-text">Please select a course or student</div>';
    return;
  }
  
  if (mode === 'course') {
    loadCourseAttendance(selectId);
  } else {
    loadStudentAttendance(selectId);
  }
}

async function loadCourseAttendance(courseId) {
  try {
    const course = (window._courses||[]).find(c => c.id === courseId);
    if (!course) return;
    
    // Get bookings for this course
    const bookings = (window._bookings||[]).filter(b => b.courseId === courseId);
    
    // Get attendance records
    const attSnap = await getDocs(collection(db, 'attendance'));
    const attRecords = {};
    attSnap.forEach(d => {
      const key = `${d.data().bookingId}_${d.data().sessionDate}`;
      attRecords[key] = d.data().status;
    });
    
    // Build table
    let html = `<div class="att-legend">
      <span><button class="att-cell att-present" style="cursor:default">✓</button> Present</span>
      <span><button class="att-cell att-absent" style="cursor:default">✗</button> Absent</span>
      <span><button class="att-cell att-unmarked" style="cursor:default">—</button> Unmarked</span>
    </div>`;
    
    html += '<div class="att-grid"><table class="att-table"><thead><tr><th class="student-col">Student</th>';
    
    // Session date headers
    const sessions = course.sessionDates || [];
    sessions.forEach(date => {
      html += `<th>${new Date(date).toLocaleDateString('en-ZA', {month:'short', day:'numeric'})}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    // Student rows
    bookings.forEach(booking => {
      html += `<tr><td class="student-name-cell">${booking.firstName} ${booking.lastName}</td>`;
      
      sessions.forEach(date => {
        const key = `${booking.id}_${date}`;
        const status = attRecords[key] || 'unmarked';
        html += `<td>
          <button class="att-cell att-${status}" 
            onclick="cycleAttendance('${booking.id}', '${date}', this)">
            ${status === 'present' ? '✓' : status === 'absent' ? '✗' : '—'}
          </button>
        </td>`;
      });
      
      html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    html += '<button class="btn btn-gold" onclick="saveAttendance()" style="margin-top:1rem">Save Attendance</button>';
    
    document.getElementById('attendanceView').innerHTML = html;
  } catch(e) {
    console.error('Attendance load error:', e);
    toast('Error loading attendance','error');
  }
}

async function loadStudentAttendance(studentId) {
  try {
    const booking = (window._bookings||[]).find(b => b.email === studentId);
    if (!booking) return;
    
    const attSnap = await getDocs(collection(db, 'attendance'));
    const records = [];
    
    attSnap.forEach(d => {
      if (d.data().bookingId === booking.id) {
        records.push({id: d.id, ...d.data()});
      }
    });
    
    let html = `<h3>${booking.firstName} ${booking.lastName}</h3>`;
    html += '<div class="att-legend" style="margin-bottom:1rem">';
    html += '<span><span style="display:inline-block;width:12px;height:12px;background:#27ae60;border-radius:2px;margin-right:.5rem"></span>Present</span>';
    html += '<span><span style="display:inline-block;width:12px;height:12px;background:#e74c3c;border-radius:2px;margin-right:.5rem"></span>Absent</span>';
    html += '</div>';
    
    if (records.length === 0) {
      html += '<p class="loading-text">No attendance records yet</p>';
    } else {
      html += '<table class="att-table" style="width:auto"><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>';
      records.forEach(r => {
        html += `<tr>
          <td>${new Date(r.sessionDate).toLocaleDateString('en-ZA')}</td>
          <td><span style="color:${r.status==='present'?'#27ae60':'#e74c3c'}">${r.status}</span></td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    
    document.getElementById('attendanceView').innerHTML = html;
  } catch(e) {
    console.error('Student attendance error:', e);
  }
}

function cycleAttendance(bookingId, date, button) {
  const current = button.classList.contains('att-present') ? 'present' : 
                  button.classList.contains('att-absent') ? 'absent' : 'unmarked';
  
  const next = current === 'unmarked' ? 'present' : current === 'present' ? 'absent' : 'unmarked';
  const icon = next === 'present' ? '✓' : next === 'absent' ? '✗' : '—';
  
  button.classList.remove(`att-${current}`);
  button.classList.add(`att-${next}`);
  button.textContent = icon;
  
  // Store in temp object for batch save
  if (!window._attChanges) window._attChanges = {};
  window._attChanges[`${bookingId}_${date}`] = next;
}

async function saveAttendance() {
  if (!window._attChanges || Object.keys(window._attChanges).length === 0) {
    toast('No changes to save','error');
    return;
  }
  
  try {
    for (const key in window._attChanges) {
      const [bookingId, date] = key.split('_');
      const status = window._attChanges[key];
      
      // Upsert attendance record
      const attRef = doc(db, 'attendance', `${bookingId}_${date}`);
      await setDoc(attRef, {
        bookingId,
        sessionDate: date,
        status,
        updatedAt: new Date().toISOString()
      });
    }
    
    window._attChanges = {};
    toast('Attendance saved','success');
    loadAttendanceView();
  } catch(e) {
    console.error('Save attendance error:', e);
    toast('Error saving attendance','error');
  }
}
```

### Fix 3: Initialize Functions on Auth

Add to `onAuthStateChanged()` callback (after line 792):

```javascript
loadCalendar();
loadCourses();
loadTerms();
populateAttendanceSelects();
```

### Fix 4: Implement Missing Functions

```javascript
async function generateTermDates(dayOfWeek, startDate) {
  const terms = window._schoolTerms || [];
  const sessions = [];
  const start = new Date(startDate);
  
  let current = new Date(start);
  
  while (sessions.length < 12) { // Max 12 weeks
    // Check if current date is within any term
    const inTerm = terms.some(t => {
      const tStart = new Date(t.startDate);
      const tEnd = new Date(t.endDate);
      return current >= tStart && current <= tEnd;
    });
    
    if (inTerm && current.toLocaleDateString('en-ZA', {weekday:'long'}) === dayOfWeek) {
      sessions.push(current.toISOString().split('T')[0]);
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return sessions;
}

async function loadCourses() {
  try {
    const snap = await getDocs(collection(db, 'courses'));
    window._courses = [];
    snap.forEach(d => window._courses.push({id: d.id, ...d.data()}));
  } catch(e) {
    console.warn('Load courses error:', e);
  }
}

async function loadTerms() {
  try {
    const snap = await getDoc(doc(db, 'siteConfig', 'terms'));
    if (snap.exists()) {
      window._schoolTerms = snap.data().terms || [];
    }
  } catch(e) {
    console.warn('Load terms error:', e);
  }
}

async function populateAttendanceSelects() {
  const modeEl = document.getElementById('attMode');
  const selectEl = document.getElementById('attSelect');
  const labelEl = document.getElementById('attSelectLabel');
  
  if (modeEl.value === 'course') {
    labelEl.textContent = 'Select Course';
    selectEl.innerHTML = '<option value="">— Select —</option>' +
      (window._courses||[]).map(c => `<option value="${c.id}">${c.title}</option>`).join('');
  } else {
    labelEl.textContent = 'Select Student';
    const students = [...new Set((window._bookings||[]).map(b => b.email))];
    selectEl.innerHTML = '<option value="">— Select —</option>' +
      students.map(s => {
        const booking = (window._bookings||[]).find(b => b.email === s);
        return `<option value="${s}">${booking.firstName} ${booking.lastName}</option>`;
      }).join('');
  }
}
```

---

## Implementation Priority

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| Calendar functions missing | 🔴 HIGH | 2 hours | **1. DO FIRST** |
| Attendance rendering broken | 🔴 HIGH | 1.5 hours | **2. DO SECOND** |
| generateTermDates() missing | 🟠 MEDIUM | 30 mins | **3. DO THIRD** |
| Support functions missing | 🟠 MEDIUM | 1 hour | **4. DO LAST** |

---

## Testing Checklist

- [ ] Calendar loads on auth
- [ ] Can navigate months (prev/next/today)
- [ ] Events display on correct dates
- [ ] Attendance table renders for course
- [ ] Can click attendance cells and cycle through states
- [ ] Attendance saves to Firebase
- [ ] School terms load and apply to recurring lessons
- [ ] No console errors

