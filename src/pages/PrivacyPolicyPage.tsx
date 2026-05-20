import { Link } from "react-router-dom";
import {
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY_LAST_UPDATED,
  privacyPolicySections,
} from "../content/privacyPolicy";

export function PrivacyPolicyPage() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__brand">jabajournal</span>
        <Link to="/auth" className="link-quiet" style={{ fontSize: "0.85rem" }}>
          Back
        </Link>
      </header>
      <main className="app-main page-stack">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="muted page-copy page-copy--tight">Last updated: {PRIVACY_POLICY_LAST_UPDATED}</p>

        <article className="outline-box legal-prose">
          {privacyPolicySections.map((section) => (
            <section key={section.title} className="legal-prose__section">
              <h2 className="legal-prose__heading">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="legal-prose__paragraph">
                  {paragraph.includes(PRIVACY_CONTACT_EMAIL) ? (
                    <>
                      Questions about this policy or your data:{" "}
                      <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="link-quiet">
                        {PRIVACY_CONTACT_EMAIL}
                      </a>
                      .
                    </>
                  ) : (
                    paragraph
                  )}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
