import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getPasswordResetRedirectUrl } from "../lib/authRedirect";
import { supabase, supabaseConfigured } from "../lib/supabase";

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: string }).message;
    if (typeof m === "string" && m.length) return m;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError("Enter your email.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      if (err) throw err;
      navigate("/forgot-password/sent", { replace: true });
    } catch (err: unknown) {
      console.error("forgot password failed:", errorMessage(err));
      setError("Could not send reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <div className="app-shell app-shell--narrow">
        <header className="app-header">
          <span className="app-header__brand">jabajournal</span>
        </header>
        <main className="app-main page-stack">
          <h1 className="page-title">Forgot password</h1>
          <div className="info-banner">Authentication is not configured in this environment.</div>
          <p className="page-copy">
            <Link to="/auth" className="link-quiet">
              Back to sign in
            </Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell app-shell--narrow">
      <header className="app-header">
        <span className="app-header__brand">jabajournal</span>
      </header>
      <main className="app-main page-stack">
        <h1 className="page-title">Forgot password</h1>
        <p className="muted page-copy page-copy--tight">
          Enter your account email and we will send a reset link.
        </p>
        {error ? <div className="error-banner">{error}</div> : null}
        <form onSubmit={onSubmit} className="outline-box form-card">
          <label className="muted form-label" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            className="field auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: "1rem" }}
          />
          <button type="submit" className="btn-primary btn-block" disabled={busy}>
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <p className="page-copy page-copy--tight">
          <Link to="/auth" className="link-quiet">
            Back to sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
