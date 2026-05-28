const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const GEMINI_KEY = defineSecret('GEMINI_API_KEY');

exports.adminChat = onRequest(
  { secrets: [GEMINI_KEY], cors: true, maxInstances: 5 },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) { res.status(401).json({ error: 'Missing auth token' }); return; }
    try { await admin.auth().verifyIdToken(idToken); }
    catch { res.status(401).json({ error: 'Invalid auth token' }); return; }

    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || question.length > 2000) {
      res.status(400).json({ error: 'Invalid question' }); return;
    }

    const [bSnap, cSnap, iSnap, aSnap] = await Promise.all([
      db.collection('bookings').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('courses').get(),
      db.collection('invoices').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('attendance').orderBy('sessionDate', 'desc').limit(200).get(),
    ]);

    const bookings = []; bSnap.forEach(d => bookings.push({ id: d.id, ...d.data() }));
    const courses = []; cSnap.forEach(d => courses.push({ id: d.id, ...d.data() }));
    const invoices = []; iSnap.forEach(d => invoices.push({ id: d.id, ...d.data() }));
    const attendance = []; aSnap.forEach(d => attendance.push({ id: d.id, ...d.data() }));

    const stats = {
      totalBookings: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      paid: bookings.filter(b => b.paid).length,
      courses: courses.length,
      students: new Set(bookings.map(b => b.email)).size,
      unpaidInvoices: invoices.filter(i => i.status !== 'paid').length,
    };

    const prompt = `You are the admin assistant for Backstage Worship Music School (South Africa). Answer concisely based on the data below.

STATS: ${JSON.stringify(stats)}

RECENT BOOKINGS (last 10):
${JSON.stringify(bookings.slice(0, 10).map(b => ({
  name: `${b.firstName||''} ${b.lastName||''}`.trim(),
  email: b.email, plan: b.plan, instrument: b.instrument,
  status: b.status, paid: !!b.paid, payMethod: b.payMethod,
  price: b.price, createdAt: b.createdAt,
})), null, 2)}

COURSES:
${JSON.stringify(courses.map(c => ({ title: c.title, category: c.category, level: c.level, price: c.price })), null, 2)}

RECENT INVOICES (last 10):
${JSON.stringify(invoices.slice(0, 10).map(i => ({
  num: i.invoiceNumber, name: i.studentName || i.clientName,
  amount: i.amount || i.total, status: i.status,
  source: i.source, month: i.month ? `${i.month}/${i.year}` : null,
})), null, 2)}

RECENT ATTENDANCE (last 20):
${JSON.stringify(attendance.slice(0, 20).map(a => ({
  email: a.studentEmail, date: a.sessionDate, plan: a.plan, status: a.status,
})), null, 2)}

User question: ${question}

If the data doesn't cover the question, suggest what they can find in the admin panel. Keep answers under 3 paragraphs. Be helpful and direct.`;

    try {
      const apiKey = GEMINI_KEY.value();
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
          }),
        }
      );
      const data = await resp.json();
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) {
        res.json({ answer });
      } else {
        const errMsg = data?.error?.message || JSON.stringify(data);
        res.status(500).json({ error: 'AI error: ' + errMsg });
      }
    } catch (err) {
      console.error('Gemini error:', err);
      res.status(500).json({ error: 'AI error: ' + (err?.message || err?.toString() || 'Unknown') });
    }
  }
);
