import LegalPageLayout from './LegalPageLayout'

const SUMMARY_POINTS = [
  'Takda is a tracking and planning tool, not a bank or financial adviser.',
  'You stay responsible for the accuracy of what you log, import, and rely on.',
  'These terms explain availability, acceptable use, and account closure.',
]

const SECTIONS = [
  {
    title: 'Using Takda',
    paragraphs: [
      'These Terms of Use govern your access to the Takda website, signup flow, and app. By using Takda, you agree to these terms and to the Privacy Policy.',
      'Takda is designed to help you track money, read your month more clearly, and maintain records such as balances, entries, bills, budgets, goals, and imports.',
    ],
  },
  {
    title: 'Eligibility and accounts',
    bullets: [
      'You must provide accurate account information and keep your login credentials secure.',
      'You are responsible for activity that happens through your account unless caused by Takda’s own failure to protect it.',
      'If you suspect unauthorized access, reset your password and contact Takda as soon as possible.',
    ],
  },
  {
    title: 'What Takda is and is not',
    bullets: [
      'Takda is a personal finance tracking and planning tool.',
      'Takda is not a bank, e-wallet, lender, insurer, brokerage, or regulated investment service.',
      'Takda does not provide financial, investment, legal, tax, or accounting advice.',
      'Forecasts, bills, recurring schedules, budgets, goals, and gamified status features are informational tools. You remain responsible for verifying your own finances and decisions.',
    ],
  },
  {
    title: 'Your data and responsibilities',
    paragraphs: [
      'You keep ownership of the content and financial information you add to Takda. You give Takda the limited rights needed to host, process, back up, transmit, and display that information in order to operate the product.',
    ],
    bullets: [
      'Review imported OCR results before saving them.',
      'Do not upload unlawful, abusive, infringing, or harmful material.',
      'Do not interfere with the service, abuse automated flows, or attempt unauthorized access to Takda or other users’ data.',
    ],
  },
  {
    title: 'Third-party services',
    paragraphs: [
      'Takda depends on third-party providers for infrastructure and certain features. Those providers may have their own terms and privacy practices.',
    ],
    bullets: [
      'Firebase may be used for authentication and app data storage.',
      'Vercel or similar infrastructure may be used to host the site or app.',
      'OCR providers may process images when you choose to use import features.',
    ],
  },
  {
    title: 'Availability, updates, and product changes',
    bullets: [
      'Takda may add, remove, pause, or change features to improve the service, address risk, or comply with law.',
      'The service may be unavailable from time to time for maintenance, bugs, provider outages, or security issues.',
      'Takda may update these terms when the product or legal environment changes. Continued use after an update means you accept the revised terms.',
    ],
  },
  {
    title: 'Backups, exports, and deletion',
    bullets: [
      'Takda may offer export, backup, or restore tools, but you should keep your own copies of important records.',
      'You may stop using the product at any time and may request account deletion where that feature is available.',
      'Takda may suspend or terminate access if the service is misused, if legal compliance requires it, or if continued access creates security or fraud risk.',
    ],
  },
  {
    title: 'Disclaimers and limits',
    paragraphs: [
      'Takda is provided on an as-is and as-available basis to the extent allowed by applicable law. Takda works to make the product useful and reliable, but cannot guarantee uninterrupted service, perfectly accurate imports, or error-free forecasts.',
      'To the fullest extent allowed by law, Takda is not liable for indirect, incidental, special, consequential, or punitive damages, or for losses caused by your reliance on inaccurate entries, imports, or forecasts that you did not review.',
    ],
  },
  {
    title: 'Applicable law and contact',
    paragraphs: [
      'These terms are intended for Takda’s current user base in the Philippines and should be read together with applicable Philippine law, subject to any mandatory law that protects you in your location.',
      'Questions about these terms can be sent to the contact details listed on this page.',
    ],
  },
]

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Terms of Use"
      title="The product rules for using Takda."
      intro="These terms explain what Takda provides, what it does not provide, what you remain responsible for, and how account access, third-party providers, and service changes are handled."
      summaryPoints={SUMMARY_POINTS}
      sections={SECTIONS}
    />
  )
}
