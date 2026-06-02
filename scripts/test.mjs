import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let failed = false;
const errs = [];

function check(condition, msg) {
  if (!condition) { errs.push('FAIL: ' + msg); failed = true; }
  else console.log('  OK: ' + msg);
}

// ── Extract JS from HTML module scripts ──
function extractModuleScript(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  return match ? match[1] : null;
}

function extractInlineScripts(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  // Only match <script> tags whose closing tag is NOT backslash-escaped
  // (prevents matching template literal content)
  const matches = [...html.matchAll(/^[ \t]*<script>([\s\S]*?)<\/script>/gm)];
  return matches.filter(m => !m[1].includes('<\\/script>')).map(m => m[1]);
}

// ── Check JS syntax ──
function checkJSSyntax(code, label) {
  try {
    new Function(code);
    return true;
  } catch(e) {
    // For module scripts with imports, new Function won't work
    // Check if the error is because of import statements
    if (code.includes('import ') && e.message.includes('Cannot use import')) {
      return true; // Expected for module scripts
    }
    errs.push(`JS syntax error in ${label}: ${e.message}`);
    failed = true;
    return false;
  }
}

// ── Check HTML has critical elements ──
function checkHTMLElements(filePath, requirements) {
  const html = fs.readFileSync(filePath, 'utf8');
  requirements.forEach(req => {
    if (typeof req === 'string') {
      check(html.includes(req), `${path.basename(filePath)} contains "${req}"`);
    } else {
      check(html.match(req.regex), `${path.basename(filePath)} matches ${req.label}`);
    }
  });
}

console.log('\n=== Testing Backstage Bookings ===\n');

// 1. HTML files exist
const files = ['index.html', 'admin.html', 'portal.html'];
files.forEach(f => {
  const fp = path.join(root, f);
  check(fs.existsSync(fp), `${f} exists`);
});

// 2. JS syntax checks on inline scripts
console.log('\n--- JS Syntax ---');
files.forEach(f => {
  const fp = path.join(root, f);
  if (!fs.existsSync(fp)) return;

  const moduleJS = extractModuleScript(fp);
  if (moduleJS) {
    const stripped = moduleJS.replace(/import .* from .*/g, '// import');
    checkJSSyntax(stripped, f + ' (module script)');
  }

  const inlineScripts = extractInlineScripts(fp);
  inlineScripts.forEach((js, i) => {
    checkJSSyntax(js, `${f} (inline script ${i+1})`);
  });
});

// 3. Index.html critical elements
console.log('\n--- Public Site (index.html) ---');
checkHTMLElements(path.join(root, 'index.html'), [
  'id="courses"',
  'id="book"',
  'id="pricing"',
  'id="instructor"',
  'id="testimonials"',
  'id="gallery"',
  'collection(db,\'bookings\')',
  'collection(db,\'courses\')',
  'siteConfig',
  'loadSiteConfig',
  'loadPricing',
  'loadCourses',
  'submitBooking',
  'fbq',
  { regex: /increment/, label: 'increment imported' },
]);

// 4. Admin.html critical elements
console.log('\n--- Admin Panel (admin.html) ---');
checkHTMLElements(path.join(root, 'admin.html'), [
  'loadDashboard',
  'loadPricing',
  'loadContent',
  'loadAlerts',
  'loadAnnouncements',
  'addDoc(collection(db,\'announcements\')',
  'uploadBytesResumable',
  'getDownloadURL',
  'onAuthStateChanged',
  'signInWithEmailAndPassword',
  'panel-dashboard',
  'panel-bookings',
  'panel-courses',
  'panel-alerts',
]);

// 5. Portal.html critical elements
console.log('\n--- Student Portal (portal.html) ---');
checkHTMLElements(path.join(root, 'portal.html'), [
  'onAuthStateChanged',
  'createUserWithEmailAndPassword',
  'signInWithEmailAndPassword',
  'onSnapshot',
  'loadStudentData',
  'renderDashboard',
  'renderInvoices',
  'downloadInvoicePDF',
  'countdownTo',
  'announcementsBlock',
  'authSignin',
  'authSignup',
  'switchAuthTab',
  'doSignIn',
  'doSignUp',
]);

// 6. Firebase rules syntax
console.log('\n--- Firebase Rules ---');
const rulesFiles = ['firestore.rules', 'storage.rules'];
rulesFiles.forEach(f => {
  const fp = path.join(root, f);
  check(fs.existsSync(fp), `${f} exists`);
});

// 7. firebase.json structure
console.log('\n--- firebase.json ---');
try {
  const fbJSON = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
  check(!!fbJSON.hosting, 'has hosting config');
  check(!!fbJSON.firestore, 'has firestore config');
  check(!!fbJSON.storage, 'has storage config');
} catch(e) {
  check(false, 'firebase.json is valid JSON: ' + e.message);
}

// ── Summary ──
console.log('\n' + '='.repeat(40));
if (failed) {
  console.log('\n❌ TESTS FAILED');
  errs.forEach(e => console.log('  ' + e));
  process.exit(1);
} else {
  console.log('\n✅ All tests passed');
  process.exit(0);
}
