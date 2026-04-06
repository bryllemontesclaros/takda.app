# Takda

> Bawat piso, sinusubaybayan. — Every peso, tracked.

Takda is a personal finance tracker built for Filipinos. The current app focuses on calendar-based logging, budgeting, savings goals, account balances, OCR-assisted imports, and monthly insights powered by React, Firebase Auth, and Firestore.

## Current App Sections

- Dashboard
- Calendar
- History
- Breakdown
- Budget
- Accounts
- Savings Goals
- Settings

## Current Features

- Email/password authentication with registration, login, logout, remember-me, and password reset
- First-run onboarding for preferred currency, account balances, and recurring bills
- Dashboard with net worth, monthly income/expense summary, savings rate, budget health, recent transactions, and end-of-month forecast
- Calendar-based income and expense tracking with add, edit, delete, and day-level summaries
- Recurring transactions with projected entries and cash-flow forecasting
- OCR-assisted import for GCash/Maya screenshots and receipt images
- Transaction history with search, filters, sorting, and inline editing
- Spending breakdown charts with category pie chart and 6-month comparisons
- Category budgets with overspending warnings and unbudgeted spending visibility
- Accounts tracking for cash, bank, e-wallet, credit card, investment, and other balances
- Savings goals with progress tracking and contribution updates
- Privacy mode for masking financial values across the app
- Light and dark theme toggle
- In-app alerts for budgets, bills, goals, and high-spend days
- Data export to CSV and JSON, plus a printable monthly report
- Firestore-backed real-time sync across devices
- Installable PWA with a basic service worker
- Built-in EXP and level-based gamification tied to money activity

## Tech Stack

- **Frontend** — React + Vite
- **Auth** — Firebase Authentication (Email/Password)
- **Database** — Firestore (real-time, per-user, secured)
- **Hosting** — Vercel
- **PWA** — Installable web app with service worker caching
- **OCR Import** — OCR.Space for screenshot and receipt parsing

## Getting Started

```bash
git clone https://github.com/bryllemontesclaros/sentimo.git
cd sentimo
npm install
cp .env.example .env.local
# Fill in your Firebase config in .env.local
npm run dev
```

## Environment Variables

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_OCR_SPACE_API_KEY=your_ocr_space_api_key
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
VITE_ENABLE_PAYMONGO_TEST_TOOLS=false
```

`VITE_OCR_SPACE_API_KEY` is optional, but recommended for receipt and wallet screenshot import.
`PAYMONGO_SECRET_KEY` is server-side only. Do not expose it in client code.
`VITE_ENABLE_PAYMONGO_TEST_TOOLS=true` shows a temporary Settings card for creating one-time PayMongo test checkout links.

## Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

## Deploy to Vercel

1. Push to GitHub
2. Import the repo into Vercel
3. Add all `VITE_FIREBASE_*` env vars in Vercel project settings
4. Add `VITE_OCR_SPACE_API_KEY` if you want OCR import enabled in production
5. Add `PAYMONGO_SECRET_KEY` if you want to test server-side PayMongo links
6. Optionally add `VITE_ENABLE_PAYMONGO_TEST_TOOLS=true` for preview/test billing
7. Deploy
8. Add your Vercel domain to Firebase Console → Authentication → Authorized domains

## PWA — Install on Mobile

1. Open the deployed URL in Chrome (Android) or Safari (iOS)
2. Android: tap the menu → "Add to Home Screen"
3. iOS: tap the Share icon → "Add to Home Screen"

## Firestore Structure

```text
users/{uid}/
  income/       { desc, amount, date, cat, recur, type, createdAt }
  expenses/     { desc, amount, date, cat, recur, type, createdAt }
  bills/        { name, amount, due, cat, freq, paid, type, createdAt }
  goals/        { name, target, current, date, createdAt }
  accounts/     { name, type, balance, color, notes, createdAt }
  budgets/      { cat, limit, createdAt }
  feedback/     { kind, rating, message, allowFeature, email, createdBy, createdAt }
  profile/main  { currency, privacyMode, notificationPrefs }
```

## Notes

- The current app entry redirects `/` to `/login`.
- A marketing landing page and some older standalone pages still exist in the repo, but the main in-app experience is driven by the sections listed above.
- Google Sign-In is not currently enabled in the active auth screen.
- Wallet transfer imports can be detected during OCR review, but transfers are not stored as a dedicated transaction type yet.
- Bills are supported in Firestore, exports, reports, and alerts, but there is no dedicated Bills section in the current main app shell navigation.

## License

MIT
