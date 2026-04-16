import LegalPageLayout from './LegalPageLayout'

const SUMMARY_POINTS = [
  'Covers account, finance, fitness, journal, mood, task, goal, image, and settings data.',
  'Explains when receipt, wallet, grocery, or meal images are processed by OCR providers.',
  'Describes export, deletion, contact, and privacy-rights paths.',
]

const SECTIONS = [
  {
    title: 'What this policy covers',
    paragraphs: [
      'This Privacy Policy explains how Buhay handles information when you use the landing page, create an account, and use the app to track finance, fitness, journal, mood, tasks, goals, and imports.',
      'It is written to match the product as it exists today: an all-in-one life tracker for Filipinos with finance, fitness, mind, receipt, meal, wallet, and grocery flows.',
    ],
  },
  {
    title: 'Information Buhay collects',
    paragraphs: ['Depending on how you use the product, Buhay may collect:'],
    bullets: [
      'Account and profile information such as your name, email address, password-based authentication details, and email-verification status.',
      'Financial workspace data such as accounts, balances, transactions, recurring settings, bills, budgets, savings goals, and manual calendar balance overrides.',
      'Fitness and activity data such as workouts, routines, exercises, sets, reps, weight, duration, meals, body logs, habits, activity, reminders, and fitness goals.',
      'Mind and life-admin data such as daily check-ins, journal entries, mood logs, tasks, life goals, tags, triggers, notes, and calendar dates.',
      'App configuration such as your currency, notification preferences, privacy-mode preference, and other product settings tied to your account.',
      'Support or feedback information if you contact Buhay directly.',
    ],
  },
  {
    title: 'Imports, images, and OCR',
    paragraphs: [
      'If you use receipt, wallet, grocery, or meal import features, the image you choose may be transmitted to a text-recognition provider so Buhay can extract text for your review before you save anything.',
      'Buhay currently supports import review flows where you can edit the detected result before it becomes a saved transaction.',
    ],
    bullets: [
      'Imported images are used to extract text and structured fields such as merchant, amount, date, and description candidates.',
      'Buhay may use OCR Space or a similar OCR provider for that processing when the feature is enabled.',
      'If you do not use import features, Buhay does not need those images to provide the rest of the product.',
    ],
  },
  {
    title: 'How Buhay uses information',
    bullets: [
      'To create and secure your account, keep you signed in, and support password reset or email verification flows.',
      'To render the app itself, including finance, fitness, journal, mood, task, goal, calendar, history, and settings views.',
      'To sync your data across supported devices linked to your account.',
      'To send product notifications that you explicitly enable, such as browser notifications.',
      'To troubleshoot product issues, maintain service reliability, and respond to support requests.',
    ],
  },
  {
    title: 'When information is shared',
    paragraphs: ['Buhay does not sell your personal data. Information may still be processed by service providers that help run the product.'],
    bullets: [
      'Firebase, for authentication and app data storage.',
      'Vercel or similar hosting infrastructure used to serve the site or app.',
      'OCR providers when you actively use image-import features.',
      'Law enforcement, regulators, or professional advisers when disclosure is required by law, needed for safety, or necessary to protect the service.',
    ],
  },
  {
    title: 'Retention, export, and deletion',
    bullets: [
      'Buhay keeps account data while your account remains active or as long as needed to provide the product and handle support, security, or legal obligations.',
      'The app includes export and backup features so you can keep your own copy of your data.',
      'If you delete data in the app or request account deletion, Buhay will delete or de-identify the corresponding information unless retention is required for legitimate security, fraud-prevention, backup, or legal reasons.',
      'Backups or exports that you save on your own device remain under your control after export.',
    ],
  },
  {
    title: 'Your choices and privacy rights',
    paragraphs: [
      'You can review, correct, export, and delete much of your information directly in the app.',
      'If you are in the Philippines, your rights may include the right to be informed, access, object, correct, erase or block, complain, and request data portability, subject to applicable law.',
    ],
    bullets: [
      'Update profile and account settings in the app.',
      'Use export and backup tools before making major changes or deletion requests.',
      'Contact Buhay if you need help with access, correction, deletion, or a privacy concern.',
    ],
  },
  {
    title: 'Security and international processing',
    paragraphs: [
      'Buhay uses reasonable technical and organizational measures to protect account, finance, fitness, and personal journal data, but no online service can promise absolute security.',
      'Because Buhay relies on third-party infrastructure, your information may be processed or stored outside the Philippines. When that happens, Buhay expects service providers to apply appropriate safeguards for the service they provide.',
    ],
  },
  {
    title: 'Children’s privacy',
    paragraphs: [
      'Buhay is not directed to children under 18. If you believe a child has provided personal data without appropriate permission, contact Buhay so the situation can be reviewed and addressed.',
    ],
  },
  {
    title: 'Updates and contact',
    paragraphs: [
      'Buhay may update this policy as the product, infrastructure, or legal requirements change. If a material update is made, the revised version will be posted on this page with an updated effective date.',
      'For privacy questions, data requests, or complaints, use the contact details listed on this page.',
    ],
  },
]

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      eyebrow="Privacy Policy"
      title="How Buhay handles your account and life-tracking data."
      intro="This page explains what Buhay collects, why it is used, which providers help run the product, and how you can access, export, or delete information tied to your account."
      metaTitle="Privacy Policy — Buhay"
      metaDescription="Read how Buhay handles account, finance, fitness, journal, mood, task, goal, and import data, and how you can access, export, or delete it."
      metaPath="/privacy"
      summaryPoints={SUMMARY_POINTS}
      sections={SECTIONS}
    />
  )
}
