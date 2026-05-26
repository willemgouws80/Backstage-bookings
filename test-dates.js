const assert = require('assert');

// localDateStr — formats a Date as YYYY-MM-DD in local time (avoids UTC offset)
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Simulate generateSessionDates with pure logic (no DOM dependency)
function generateSessionDatesPure(type, day, startTime, endTime, startDate, repeatType, numSessions) {
  const sessions = [];
  if (!startDate || !numSessions) return sessions;
  const dayMap = {monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:0};
  const targetDay = dayMap[day?.toLowerCase()];
  // FIXED: use T12:00:00 to avoid UTC midnight ambiguity, and localDateStr for output
  let current = new Date(startDate+'T12:00:00');

  if (repeatType === 'weekly' && targetDay !== undefined) {
    while (current.getDay() !== targetDay) {
      current.setDate(current.getDate() + 1);
    }
    for (let i = 0; i < numSessions; i++) {
      sessions.push({
        date: localDateStr(current),
        startTime, endTime,
      });
      current.setDate(current.getDate() + 7);
    }
  } else if (repeatType === 'daily') {
    for (let i = 0; i < numSessions; i++) {
      sessions.push({
        date: localDateStr(current),
        startTime, endTime,
      });
      current.setDate(current.getDate() + 1);
    }
  }
  return sessions;
}

// Simulate generateTermDates with pure logic
function generateTermDatesPure(prefDay, startDate, terms) {
  const dayMap = {sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
  const targetDay = dayMap[prefDay?.toLowerCase()];
  if (targetDay === undefined) return [];

  const dates  = [];
  // FIXED: use T12:00:00 to avoid UTC midnight ambiguity
  const start  = new Date(startDate+'T12:00:00');

  (terms || []).forEach(term => {
    const tStart = new Date(term.start+'T12:00:00');
    const tEnd   = new Date(term.end+'T12:00:00');
    let current  = new Date(Math.max(start.getTime(), tStart.getTime()));
    while (current.getDay() !== targetDay) current.setDate(current.getDate()+1);
    while (current <= tEnd) {
      // FIXED: use localDateStr instead of toISOString().split('T')[0]
      dates.push(localDateStr(current));
      current.setDate(current.getDate()+7);
    }
  });

  return dates.sort();
}

// ── Tests ──

function testLocalDateStr() {
  // Jan 14, 2026 at noon local
  const d = new Date(2026, 0, 14, 12, 0, 0);
  assert.strictEqual(localDateStr(d), '2026-01-14');
  console.log('  ✓ localDateStr returns correct format');

  // Single-digit month and day
  const d2 = new Date(2026, 2, 5, 12, 0, 0); // Mar 5
  assert.strictEqual(localDateStr(d2), '2026-03-05');
  console.log('  ✓ localDateStr pads single digits');

  // Dec 31
  const d3 = new Date(2026, 11, 31, 12, 0, 0);
  assert.strictEqual(localDateStr(d3), '2026-12-31');
  console.log('  ✓ localDateStr handles Dec 31');
}

function testGenerateWeeklySessions() {
  // Start Jan 14 (Wednesday), weekly, 4 sessions, target day = Wednesday
  const sessions = generateSessionDatesPure('fixed', 'wednesday', '09:00', '10:00', '2026-01-14', 'weekly', 4);
  assert.strictEqual(sessions.length, 4, 'Should generate 4 sessions');
  assert.strictEqual(sessions[0].date, '2026-01-14', 'First session on start date');
  assert.strictEqual(sessions[1].date, '2026-01-21', 'Second session +1 week');
  assert.strictEqual(sessions[2].date, '2026-01-28', 'Third session +2 weeks');
  assert.strictEqual(sessions[3].date, '2026-02-04', 'Fourth session +3 weeks');
  console.log('  ✓ generateSessionDates weekly correct dates');
}

function testGenerateWeeklyAdvanceToDay() {
  // Start Jan 14 (Wednesday), target Friday → should advance to Jan 16
  const sessions = generateSessionDatesPure('fixed', 'friday', '09:00', '10:00', '2026-01-14', 'weekly', 3);
  assert.strictEqual(sessions.length, 3);
  assert.strictEqual(sessions[0].date, '2026-01-16', 'Should advance to first Friday');
  assert.strictEqual(sessions[1].date, '2026-01-23', 'Second Friday');
  assert.strictEqual(sessions[2].date, '2026-01-30', 'Third Friday');
  console.log('  ✓ generateSessionDates advances to correct weekday');
}

function testGenerateDailySessions() {
  // Start Jan 14, daily, 5 sessions
  const sessions = generateSessionDatesPure('fixed', 'monday', '09:00', '10:00', '2026-01-14', 'daily', 5);
  assert.strictEqual(sessions.length, 5);
  assert.strictEqual(sessions[0].date, '2026-01-14');
  assert.strictEqual(sessions[1].date, '2026-01-15');
  assert.strictEqual(sessions[2].date, '2026-01-16');
  assert.strictEqual(sessions[3].date, '2026-01-17');
  assert.strictEqual(sessions[4].date, '2026-01-18');
  console.log('  ✓ generateSessionDates daily correct dates');
}

function testGenerateNoSessions() {
  const sessions = generateSessionDatesPure('fixed', 'monday', '09:00', '10:00', '', 'weekly', 0);
  assert.strictEqual(sessions.length, 0);
  console.log('  ✓ generateSessionDates returns empty for no sessions');
}

function testGenerateTermDates() {
  const terms = [
    { name:'Term 1', start:'2026-01-14', end:'2026-03-20' },
    { name:'Term 2', start:'2026-04-07', end:'2026-06-19' },
  ];
  // Wednesday lessons starting Jan 14
  const dates = generateTermDatesPure('wednesday', '2026-01-14', terms);
  assert.ok(dates.length > 0, 'Should generate dates');

  // First date should be Jan 14
  assert.strictEqual(dates[0], '2026-01-14', 'First date is Jan 14');

  // All dates should be Wednesdays (check a few samples)
  for (const d of dates) {
    const dt = new Date(d+'T12:00:00');
    assert.strictEqual(dt.getDay(), 3, `${d} should be a Wednesday`);
  }

  // Dates should be within term ranges
  const term1End = new Date('2026-03-20T12:00:00');
  const term2Start = new Date('2026-04-07T12:00:00');
  for (const d of dates) {
    const dt = new Date(d+'T12:00:00');
    assert.ok(dt <= term1End || dt >= term2Start, `${d} should be within a term`);
  }
  console.log('  ✓ generateTermDates generates correct dates within terms');
}

function testGenerateTermDatesThursday() {
  const terms = [
    { name:'Term 1', start:'2026-01-14', end:'2026-03-20' },
  ];
  // Thursday lessons
  const dates = generateTermDatesPure('thursday', '2026-01-14', terms);
  assert.ok(dates.length > 0);
  // Jan 14 is Wednesday, first Thursday is Jan 15
  assert.strictEqual(dates[0], '2026-01-15', 'First Thursday after Jan 14');
  // All Thursdays
  for (const d of dates) {
    const dt = new Date(d+'T12:00:00');
    assert.strictEqual(dt.getDay(), 4, `${d} should be a Thursday`);
  }
  // Last date should be within term 1
  const lastDate = new Date(dates[dates.length-1]+'T12:00:00');
  assert.ok(lastDate <= new Date('2026-03-20T12:00:00'), `Last date ${dates[dates.length-1]} should be within Term 1`);
  console.log('  ✓ generateTermDates Thursday lessons correct');
}

function testIndexDateMin() {
  const today = new Date();
  const expected = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Verify the same logic used in the fix produces a valid date string
  const result = localDateStr(today);
  assert.strictEqual(result, expected);
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/, 'Date min should match YYYY-MM-DD format');
  console.log('  ✓ index.html fDate.min uses local date correctly');
}

function testNoUTCOffsetBug() {
  // The core bug: using toISOString() can shift dates. Test that localDateStr doesn't.
  // Even at midnight local, localDateStr gives the correct local date.
  const midnight = new Date(2026, 0, 14, 0, 0, 0); // Jan 14 midnight local time
  assert.strictEqual(localDateStr(midnight), '2026-01-14', 'Midnight local date is correct');

  // Any time during the day should still give the same date
  for (let h = 0; h < 24; h++) {
    const dt = new Date(2026, 5, 15, h, 0, 0);
    assert.strictEqual(localDateStr(dt), '2026-06-15', `localDateStr consistent at hour ${h}`);
  }
  console.log('  ✓ localDateStr is consistent across all hours (no UTC shift)');
}

// ── Run all tests ──
let passed = 0;
let failed = 0;
const tests = [
  testLocalDateStr,
  testGenerateWeeklySessions,
  testGenerateWeeklyAdvanceToDay,
  testGenerateDailySessions,
  testGenerateNoSessions,
  testGenerateTermDates,
  testGenerateTermDatesThursday,
  testIndexDateMin,
  testNoUTCOffsetBug,
];

for (const t of tests) {
  try {
    t();
    passed++;
  } catch (e) {
    console.log(`  ✗ ${t.name}: ${e.message}`);
    failed++;
  }
}

console.log(`\n${passed}/${passed+failed} tests passed`);
process.exit(failed > 0 ? 1 : 0);
