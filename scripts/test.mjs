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

function extractModuleScript(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  return match ? match[1] : null;
}

function extractInlineScripts(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const stripped = html.replace(/<script type="module">[\s\S]*?<\/script>/g, '');
  const matches = [...stripped.matchAll(/^[ \t]*<script>([\s\S]*?)<\/script>/gm)];
  return matches.map(m => m[1]);
}

function checkJSSyntax(code, label) {
  try {
    new Function(code);
    check(true, label + ' \u2014 valid JS syntax');
    return true;
  } catch(e) {
    if (/import\s|export\s/.test(code) && e.message.includes('Cannot use')) {
      check(true, label + ' \u2014 module-level syntax (' + e.message.trim() + ')');
      return true;
    }
    check(false, label + ' \u2014 JS syntax error: ' + e.message);
    return false;
  }
}

function checkHTMLElements(filePath, requirements) {
  const html = fs.readFileSync(filePath, 'utf8');
  requirements.forEach(function(req) {
    if (typeof req === 'string') {
      check(html.includes(req), path.basename(filePath) + ' contains "' + req + '"');
    } else {
      check(html.match(req.regex), path.basename(filePath) + ' matches ' + req.label);
    }
  });
}

console.log('\n=== Testing Backstage Bookings ===\n');

const files = ['index.html', 'admin.html', 'portal.html'];
files.forEach(function(f) {
  const fp = path.join(root, f);
  check(fs.existsSync(fp), f + ' exists');
});

console.log('\n--- JS Syntax ---');
files.forEach(function(f) {
  const fp = path.join(root, f);
  if (!fs.existsSync(fp)) return;

  const moduleJS = extractModuleScript(fp);
  if (moduleJS) {
    const stripped = moduleJS.replace(/import .* from .*/g, '// import');
    checkJSSyntax(stripped, f + ' (module script)');
  } else {
    check(false, f + ' \u2014 no module script found');
  }

  const inlineScripts = extractInlineScripts(fp);
  if (inlineScripts.length > 0) {
    inlineScripts.forEach(function(js, i) {
      checkJSSyntax(js, f + ' (inline script ' + (i+1) + ')');
    });
  } else {
    check(true, f + ' \u2014 no inline scripts to check');
  }
});

function checkGroup(label, file, checks) {
  console.log('\n--- ' + label + ' ---');
  checkHTMLElements(path.join(root, file), checks);
}

checkGroup('Public Site (index.html)', 'index.html', [
  'id="courses"', 'id="book"', 'id="pricing"', 'id="instructor"',
  'id="testimonials"', 'id="gallery"',
  "collection(db,'bookings')", "collection(db,'courses')",
  'siteConfig', 'loadSiteConfig', 'loadPricing', 'loadCourses',
  'submitBooking', 'fbq',
  { regex: /increment/, label: 'increment imported' },
]);

checkGroup('Admin Panel (admin.html)', 'admin.html', [
  'loadDashboard', 'loadPricing', 'loadContent', 'loadAlerts', 'loadAnnouncements',
  "addDoc(collection(db,'announcements')", 'uploadBytesResumable', 'getDownloadURL',
  'onAuthStateChanged', 'signInWithEmailAndPassword',
  'panel-dashboard', 'panel-bookings', 'panel-courses', 'panel-alerts',
]);

checkGroup('Student Portal (portal.html)', 'portal.html', [
  'onAuthStateChanged', 'createUserWithEmailAndPassword', 'signInWithEmailAndPassword',
  'onSnapshot', 'loadStudentData', 'renderDashboard', 'renderInvoices',
  'downloadInvoicePDF', 'countdownTo', 'announcementsBlock',
  'authSignin', 'authSignup', 'switchAuthTab', 'doSignIn', 'doSignUp',
  'showEditProfile', 'saveProfile', 'hideEditProfile', 'resetPassword',
  'filterLessons', 'showPanel', 'uploadBytesResumable', 'photoURL', 'profilePhotos/',
]);

console.log('\n--- Firebase Rules ---');
['firestore.rules', 'storage.rules'].forEach(function(f) {
  check(fs.existsSync(path.join(root, f)), f + ' exists');
});

console.log('\n--- firebase.json ---');
try {
  const fbJSON = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
  check(!!fbJSON.hosting, 'has hosting config');
  check(!!fbJSON.firestore, 'has firestore config');
  check(!!fbJSON.storage, 'has storage config');
} catch(e) {
  check(false, 'firebase.json is valid JSON: ' + e.message);
}

console.log('\n' + '='.repeat(40));
if (failed) {
  console.log('\nT E S T S   F A I L E D');
  errs.forEach(function(e) { console.log('  ' + e); });
  process.exit(1);
} else {
  console.log('\nAll tests passed');
  process.exit(0);
}
