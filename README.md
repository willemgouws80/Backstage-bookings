# Backstage Worship Music School — Booking System

A full-featured booking and admin platform for [Backstage Worship Music School](https://backstage-music.web.app) in Pretoria East, South Africa. Students can browse courses, view pricing, book lessons, and pay — all in one flow. The admin dashboard gives you full control over courses, pricing, bookings, students, attendance, quotes, and invoices.

## Features

### Student-facing site (`index.html`)
- Course catalog with live slot availability
- Pricing cards with lesson plan selection
- Multi-step booking form (details → lesson → schedule → payment)
- Payment options: Yoco (card), EFT, Cash, Card Machine, Stripe
- Instructor profile, testimonials, and gallery sections
- WhatsApp/email confirmation on booking
- Promotional banner system
- Mobile-responsive design

### Admin dashboard (`admin.html`)
- **Dashboard** — overview stats (bookings, revenue, students)
- **Bookings** — search, filter by status, manage confirmations
- **Calendar** — weekly/monthly view of all lessons
- **Students** — searchable student profiles with notes
- **Courses** — create/manage courses with fixed or multi-option schedules
- **Pricing** — manage lesson plans (prices, features)
- **Promotion** — toggle promotional banners with discounts
- **Website Content** — edit instructor bio, testimonials, gallery, social links
- **Attendance** — track student attendance per date
- **Quotes** — create professional quotes with line items
- **Invoices** — generate and track invoices
- **School Terms** — manage term dates (holidays auto-skipped)
- **Payment Settings** — enable/disable Yoco, Stripe, EFT, Cash, Card Machine
- **Contact & Banking** — update contact info and bank details
- **Alerts** — configure EmailJS notifications for new bookings
- **Firebase Setup** — copy-paste Firestore security rules

### Student portal (`portal.html`)
- Secure login/signup with Firebase Authentication
- Dashboard with next lesson, stats, and recent lessons
- View upcoming and past lessons with status tracking
- Attendance record with present/absent tracking
- Invoice history with paid/unpaid status
- Profile management (name, phone, password reset)

### Monitoring (`monitor.html`)
- Real-time booking monitoring dashboard
- Audio alert on new bookings
- Booking history and status overview

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Backend | Firebase Firestore |
| Auth | Firebase Authentication |
| Hosting | Firebase Hosting |
| Payments | Yoco, Stripe |
| Email | EmailJS |

## Project Structure

```
Backstage-bookings/
├── index.html          # Public booking website
├── admin.html          # Admin dashboard
├── portal.html         # Student & parent portal
├── monitor.html        # Real-time booking monitor
├── New_Backstage_logo.png
└── .github/workflows/  # CI/CD (if configured)
```

## Getting Started

### Prerequisites
- A Firebase project (Firestore + Auth enabled)
- Firebase CLI installed (`npm install -g firebase-tools`)

### Local Development
```bash
# Clone the repo
git clone https://github.com/willemgouws80/Backstage-bookings.git
cd Backstage-bookings

# Serve locally
npx serve .
# or
python3 -m http.server 8000
```

### Firebase Deployment
```bash
firebase login
firebase init hosting
firebase deploy --only hosting
```

### Firestore Setup
Admin → Firebase Setup panel contains the exact security rules to copy into your Firebase Console.

## Admin Access
Visit `/admin.html` and sign in with your Firebase Authentication credentials.

## Student Portal
Visit `/portal.html` to sign in or create an account. Students see only their own lessons, attendance, and invoices using the email they registered with.

## Contact

**Willem Gouws** — info@backstage.co.za
Pretoria East, South Africa
Guitar lessons · Vocal coaching · Worship ministry consulting

---

*Built with passion for worship music education.*
