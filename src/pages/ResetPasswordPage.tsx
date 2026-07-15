import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLoadingScreen } from "../components/AppLoadingScreen";
import { useAuth } from "../contexts/AuthContext";
import {
  capturePasswordRecoveryIntentFromUrl,
  clearPasswordRecoveryIntent,
  hasPasswordRecoveryIntent,
} from "../lib/passwordRecovery";
import { supabase } from "../lib/supabase";

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: string }).message;
    if (typeof m === "string" && m.length) return m;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

function parseRecoveryHashTokens(): {
  access_token: string;
  refresh_token: string;
} | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (params.get("type") !== "recovery") return null;
  const access_token = params.get("access_token")?.trim() ?? "";
  const refresh_token = params.get("refresh_token")?.trim() ?? "";
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [recoveryOk] = useState(() => capturePasswordRecoveryIntentFromUrl());
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!supabase) {
        if (!cancelled) setSessionReady(true);
        return;
      }

      capturePasswordRecoveryIntentFromUrl();
      const tokens = parseRecoveryHashTokens();
      if (tokens) {
        const { error: setErr } = await supabase.auth.setSession(tokens);
        if (!cancelled && !setErr) {
          const url = new URL(window.location.href);
          url.hash = "";
          window.history.replaceState(null, "", `${url.pathname}${url.search}`);
        }
      }

      if (!cancelled) setSessionReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const gateLoading = loading || !sessionReady;
  const canShowForm =
    !gateLoading && Boolean(session) && (recoveryOk || hasPasswordRecoveryIntent());

  if (gateLoading) {
    return <AppLoadingScreen fullViewport />;
  }

  if (!canShowForm) {
    return (
      <div className="app-shell app-shell--narrow">
        <header className="app-header">
          <span className="app-header__brand">jabajournal</span>
        </header>
        <main className="app-main page-stack">
          <h1 className="page-title">Reset password</h1>
          <div className="info-banner">This recovery link is missing or expired. Request a new one from sign in.</div>
          <p className="page-copy">
            <Link to="/forgot-password" className="link-quiet">
              Request a new reset link
            </Link>
            {" · "}
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
      clearPasswordRecoveryIntent();
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

  return (
    <div className="app-shell app-shell--narrow">
      <header className="app-header">
        <span className="app-header__brand">jabajournal</span>
      </header>
      <main className="app-main page-stack">
        <h1 className="page-title">Choose a new password</h1>
        {info ? <div className="info-banner">{info}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <form onSubmit={onSubmit} className="outline-box form-card">
          <label className="muted form-label">New password</label>
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
          <label className="muted form-label">Confirm password</label>
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
          <button type="submit" className="btn-primary btn-block" disabled={busy}>
            {busy ? "Updating..." : "Update password"}
          </button>
        </form>
      </main>
    </div>
  );
}
