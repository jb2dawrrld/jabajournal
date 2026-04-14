import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { getAppOrigin, getEmailConfirmationRedirectUrl } from "../lib/authRedirect";
import { useAuth } from "../contexts/AuthContext";

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: string }).message;
    if (typeof m === "string" && m.length) return m;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** After instant sign-up (no email step), show success copy before leaving /auth. */
  const [holdAuthRedirect, setHoldAuthRedirect] = useState(false);

  if (!supabaseConfigured) {
    return (
      <div className="app-shell">
        <p className="muted">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          in <code>.env</code> at the project root, then restart <code>npm run tauri dev</code>{" "}
          (Vite only reads env on startup).
        </p>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Use the <strong>Project URL</strong> and <strong>anon public</strong> key from Supabase →
          Project Settings → API (the long <code>eyJ…</code> JWT is the usual anon key).
        </p>
      </div>
    );
  }

  if (!loading && session && !holdAuthRedirect) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const emailRedirectTo = getEmailConfirmationRedirectUrl();
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
          },
        });
        if (err) throw err;

        const needsEmailConfirm = Boolean(data.user && !data.session);

        if (needsEmailConfirm) {
          setInfo(
            `Check your email for a confirmation link. After you click it, this app will open at ${getAppOrigin()} and you can sign in with the same email and password. ` +
              "If no email arrives, check spam. In Supabase: Authentication → URL Configuration — set Site URL to " +
              `${getAppOrigin()} and add ${getAppOrigin()}/** under Redirect URLs (see README).`,
          );
          return;
        }

        if (data.session) {
          setHoldAuthRedirect(true);
          setInfo("Account created — taking you to the app…");
          window.setTimeout(() => {
            setHoldAuthRedirect(false);
            navigate("/", { replace: true });
          }, 2200);
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
      }
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ maxWidth: 420 }}>
      <header className="app-header">
        <span className="app-header__brand">jabajournal</span>
      </header>
      <main className="app-main">
        <h1 style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: "0.5rem" }}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="muted" style={{ marginBottom: "1.25rem" }}>
          One private entry per day. Past days are read-only.
        </p>
        {info ? <div className="info-banner">{info}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <form onSubmit={onSubmit} className="outline-box" style={{ padding: "1rem" }}>
          <label className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
            Email
          </label>
          <input
            className="field auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: "0.85rem" }}
          />
          <label className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
            Password
          </label>
          <input
            className="field auth-input"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ marginBottom: "1rem" }}
          />
          <button type="submit" className="btn-primary" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button
                type="button"
                className="link-quiet"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setInfo(null);
                }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="link-quiet"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setInfo(null);
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </main>
    </div>
  );
}
