import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: string }).message;
    if (typeof m === "string" && m.length) return m;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!loading && !session) {
    return (
      <div className="app-shell" style={{ maxWidth: 420 }}>
        <header className="app-header">
          <span className="app-header__brand">jabajournal</span>
        </header>
        <main className="app-main">
          <h1 style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: "0.6rem" }}>Reset password</h1>
          <div className="info-banner">This recovery link is missing or expired. Request a new one from sign in.</div>
          <p style={{ marginTop: "1rem" }}>
            <Link to="/auth" className="link-quiet">
              Back to sign in
            </Link>
          </p>
        </main>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setInfo("Password updated. Redirecting to your journal...");
      window.setTimeout(() => {
        navigate("/", { replace: true });
      }, 1200);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ maxWidth: 420 }}>
      <header className="app-header">
        <span className="app-header__brand">jabajournal</span>
      </header>
      <main className="app-main">
        <h1 style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: "0.5rem" }}>Choose a new password</h1>
        {info ? <div className="info-banner">{info}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <form onSubmit={onSubmit} className="outline-box" style={{ padding: "1rem" }}>
          <label className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
            New password
          </label>
          <input
            className="field auth-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ marginBottom: "0.85rem" }}
          />
          <label className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
            Confirm new password
          </label>
          <input
            className="field auth-input"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            style={{ marginBottom: "1rem" }}
          />
          <button type="submit" className="btn-primary" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </main>
    </div>
  );
}
