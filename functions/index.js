const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const OpenAI = require('openai');

admin.initializeApp();
const db = admin.firestore();

const OPENAI_KEY = defineSecret('OPENAI_API_KEY');

exports.adminChat = onRequest(
  { secrets: [OPENAI_KEY], cors: true, maxInstances: 5 },
  async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(204).end(); return; }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Verify auth
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      res.status(401).json({ error: 'Missing auth token' });
      return;
    }
    let uid;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      res.status(401).json({ error: 'Invalid auth token' });
      return;
    }

    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || question.length > 2000) {
      res.status(400).json({ error: 'Invalid question' });
      return;
    }

    const openai = new OpenAI({ apiKey: OPENAI_KEY.value() });

    // Fetch context from Firestore in parallel
    const [bSnap, cSnap, iSnap, aSnap, configSnap] = await Promise.all([
      db.collection('bookings').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('courses').get(),
      db.collection('invoices').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('attendance').orderBy('sessionDate', 'desc').limit(200).get(),
      db.collection('siteConfig').doc('main').get(),
    ]);

    const bookings = [];
    bSnap.forEach(d => bookings.push({ id: d.id, ...d.data() }));
    const courses = [];
    cSnap.forEach(d => courses.push({ id: d.id, ...d.data() }));
    const invoices = [];
    iSnap.forEach(d => invoices.push({ id: d.id, ...d.data() }));
    const attendance = [];
    aSnap.forEach(d => attendance.push({ id: d.id, ...d.data() }));

    // Revise sensitive fields
    const bookingsClean = bookings.map(b => {
      const { phone, notes, ...rest } = b;
      return { ...rest, phone: phone ? phone.slice(0, 4) + '***' : null };
    });

    const stats = {
      totalBookings: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      paid: bookings.filter(b => b.paid).length,
      courses: courses.length,
      students: new Set(bookings.map(b => b.email)).size,
      unpaidInvoices: invoices.filter(i => i.status !== 'paid').length,
    };

    const systemPrompt = `You are the admin assistant for Backstage Worship Music School (South Africa). Answer concisely based on the data below.

STATS: ${JSON.stringify(stats)}

RECENT BOOKINGS (last 10):
${JSON.stringify(bookingsClean.slice(0, 10).map(b => ({
  name: `${b.firstName||''} ${b.lastName||''}`.trim(),
  email: b.email,
  plan: b.plan,
  instrument: b.instrument,
  status: b.status,
  paid: !!b.paid,
  payMethod: b.payMethod,
  price: b.price,
  createdAt: b.createdAt,
})), null, 2)}

COURSES (${courses.length}):
${JSON.stringify(courses.map(c => ({ title: c.title, category: c.category, level: c.level, price: c.price })), null, 2)}

RECENT INVOICES (last 10):
${JSON.stringify(invoices.slice(0, 10).map(i => ({
  num: i.invoiceNumber,
  name: i.studentName || i.clientName,
  amount: i.amount || i.total,
  status: i.status,
  source: i.source,
  month: i.month ? `${i.month}/${i.year}` : null,
})), null, 2)}

RECENT ATTENDANCE (last 20):
${JSON.stringify(attendance.slice(0, 20).map(a => ({
  email: a.studentEmail,
  date: a.sessionDate,
  plan: a.plan,
  status: a.status,
})), null, 2)}

If the user asks about something not in this data, suggest what they can find in the admin panel. Keep answers under 3 paragraphs. Be helpful and direct.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 600,
        temperature: 0.3,
      });

      res.json({ answer: completion.choices[0]?.message?.content || 'No response.' });
    } catch (err) {
      console.error('OpenAI error:', err);
      res.status(500).json({ error: 'AI service error. Check your OpenAI API key and billing status.' });
    }
  }
);
