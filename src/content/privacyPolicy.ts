export const PRIVACY_POLICY_LAST_UPDATED = "April 24, 2026";
export const PRIVACY_CONTACT_EMAIL = "privacy@jabajournal.com";

export const privacyPolicySections: { title: string; paragraphs: string[] }[] = [
  {
    title: "Overview",
    paragraphs: [
      "jabajournal is a personal journaling app. This Privacy Policy explains what information we collect when you create an account and use the service, how we use it, and the choices you have.",
      "By creating an account, you agree to this policy. If you do not agree, please do not sign up.",
    ],
  },
  {
    title: "Information we collect",
    paragraphs: [
      "Account information: your email address and password (stored and handled by our authentication provider). We do not store your password in plain text.",
      "Profile information: your timezone preference and whether you have finished onboarding.",
      "Journal content: entry dates, titles, written entries (including formatted text), and optional voice recordings you attach to an entry.",
      "Technical data: basic service logs needed to operate the app (for example, error and security events). We do not use third-party advertising or analytics trackers in the app.",
    ],
  },
  {
    title: "How we use your information",
    paragraphs: [
      "We use your information to provide the journaling service: sign you in, save and sync your entries, show your calendar, and let you record or play back voice memos.",
      "We use your email to send account-related messages such as email verification and password reset links when you request them.",
      "We may use aggregated, non-identifying information to keep the service reliable and secure.",
    ],
  },
  {
    title: "Where your data is stored",
    paragraphs: [
      "Your data is stored in cloud infrastructure operated by Supabase (database, authentication, and file storage for audio). Supabase processes data on our behalf as a service provider.",
      "Journal entries and audio are private to your account. Access is enforced with row-level security so only you can read or change your own content.",
    ],
  },
  {
    title: "Sharing",
    paragraphs: [
      "We do not sell your personal information.",
      "We share data only with service providers needed to run jabajournal (currently Supabase), when required by law, or to protect the security and rights of users and the service.",
    ],
  },
  {
    title: "Retention and deletion",
    paragraphs: [
      "We keep your account data and journal entries while your account is active.",
      "You can delete individual journal entries (including attached audio) from within the app.",
      "To delete your entire account and associated data, contact us at the email below. We will delete or anonymize your data within a reasonable time, except where we must retain information for legal or security reasons.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We use industry-standard practices through our hosting providers, including encrypted connections (HTTPS) and access controls on stored data. No method of transmission or storage is completely secure; use a strong, unique password and keep your device secure.",
    ],
  },
  {
    title: "Your choices and rights",
    paragraphs: [
      "Depending on where you live, you may have rights to access, correct, export, or delete your personal information. Contact us and we will respond within a reasonable time.",
      "You can stop using the service at any time by signing out. Deleting your account requires contacting us unless we add in-app account deletion later.",
    ],
  },
  {
    title: "Children",
    paragraphs: [
      "jabajournal is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us data, contact us so we can delete it.",
    ],
  },
  {
    title: "Changes",
    paragraphs: [
      "We may update this policy from time to time. We will post the revised version in the app and update the \"Last updated\" date. Continued use after changes means you accept the updated policy.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `Questions about this policy or your data: ${PRIVACY_CONTACT_EMAIL}.`,
    ],
  },
];
