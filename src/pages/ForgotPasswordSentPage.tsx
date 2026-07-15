import { Link } from "react-router-dom";

export function ForgotPasswordSentPage() {
  return (
    <div className="app-shell app-shell--narrow">
      <header className="app-header">
        <span className="app-header__brand">jabajournal</span>
      </header>
      <main className="app-main page-stack">
        <div className="info-banner">Reset link sent! Check your inbox and click the link.</div>
        <p className="muted page-copy page-copy--tight">
          Open the email on this device, then choose a new password. If nothing arrives, check spam.
        </p>
        <p className="page-copy page-copy--tight">
          <Link to="/auth" className="link-quiet">
            Back to sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
