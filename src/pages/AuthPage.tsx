import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import {
  getAppOrigin,
  getEmailConfirmationRedirectUrl,
  getPasswordResetRedirectUrl,
} from "../lib/authRedirect";
import { useAuth } from "../contexts/AuthContext";

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: string }).message;
    if (typeof m === "string" && m.length) return m;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

function genericAuthError(action: "signup" | "signin" | "forgot" | "resend") {
  if (action === "signin") return "Could not sign in. Check your email and password and try again.";
  if (action === "signup") return "Could not create account. Please try again.";
  if (action === "forgot") return "Could not send reset link. Please try again.";
  return "Could not resend verification email. Please try again.";
}

function isLocalEnvironment() {
  const origin = getAppOrigin();
  return origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
}

export function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [holdAuthRedirect, setHoldAuthRedirect] = useState(false);

  if (!supabaseConfigured) {
    const localEnvironment = isLocalEnvironment();

    return (
      <div className="app-shell app-shell--narrow">
        <main className="app-main page-stack">
          <div className="info-banner">
            {localEnvironment ? (
              <>
                Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in
                <code> .env </code>
                at the project root, then restart the local dev server. Vite only reads env vars on
                startup.
              </>
            ) : (
              <>
                This deployment is missing <code>VITE_SUPABASE_URL</code> and/or
                <code> VITE_SUPABASE_ANON_KEY</code>. Set them in the hosting environment and redeploy
                the app.
              </>
            )}
          </div>
          <p className="muted page-copy page-copy--tight">
            Use the <strong>Project URL</strong> and <strong>anon public</strong> key from Supabase{" "}
            {" > "}Project Settings{" > "}API.
          </p>
        </main>
      </div>
    );
  }

  if (!loading && session && !holdAuthRedirect) {
    return <Navigate to="/" replace />;
  }

  const isSignupMode = mode === "signup";
  const passwordRules = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const confirmPasswordMatches = confirmPassword.length > 0 && confirmPassword === password;
  const canSubmitSignup =
    passwordRules.minLength &&
    passwordRules.uppercase &&
    passwordRules.number &&
    passwordRules.symbol &&
    confirmPasswordMatches;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setInfo(null);
    if (isSignupMode && !canSubmitSignup) {
      setError("Your password does not meet the requirements.");
      return;
    }
    setBusy(true);
    try {
      if (isSignupMode) {
        const targetEmail = email.trim().toLowerCase();
        const emailRedirectTo = getEmailConfirmationRedirectUrl();
        const { data, error: err } = await supabase.auth.signUp({
          email: targetEmail,
          password,
          options: {
            emailRedirectTo,
          },
        });
        if (err) throw err;

        const needsEmailConfirm = Boolean(data.user && !data.session);

        if (needsEmailConfirm) {
          setPendingVerificationEmail(targetEmail);
          setInfo(
            `Check your email for a confirmation link. After you click it, this app will open at ${getAppOrigin()} and you can sign in with the same email and password. ` +
              "If no email arrives, check spam.",
          );
          return;
        }

        if (data.session) {
          setPendingVerificationEmail(null);
          setHoldAuthRedirect(true);
          setInfo("Account created - taking you to the app...");
          window.setTimeout(() => {
            setHoldAuthRedirect(false);
            navigate("/", { replace: true });
          }, 2200);
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (err) throw err;
      }
    } catch (err: unknown) {
      console.error("auth submit failed:", errorMessage(err));
      setError(genericAuthError(isSignupMode ? "signup" : "signin"));
    } finally {
      setBusy(false);
    }
  }

  async function onResendVerification() {
    if (!supabase) return;
    const targetEmail = (pendingVerificationEmail ?? email).trim().toLowerCase();
    if (!targetEmail) {
      setError("Enter your email first.");
      return;
    }
    setError(null);
    setInfo(null);
    setResendBusy(true);
    try {
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: getEmailConfirmationRedirectUrl() },
      });
      if (err) throw err;
      setPendingVerificationEmail(targetEmail);
      setInfo("Verification email resent. Check your inbox and spam folder.");
    } catch (err: unknown) {
      console.error("resend verification failed:", errorMessage(err));
      setError(genericAuthError("resend"));
    } finally {
      setResendBusy(false);
    }
  }

  async function onForgotPassword() {
    if (!supabase) return;
    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("Enter your email first.");
      return;
    }

    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      if (err) throw err;
      setInfo("Reset link sent. Check your inbox and open the link on this device.");
    } catch (err: unknown) {
      console.error("forgot password failed:", errorMessage(err));
      setError(genericAuthError("forgot"));
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
        <h1 className="page-title">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p className="muted page-copy page-copy--tight">And let your words take the lead.</p>
        {info ? <div className="info-banner">{info}</div> : null}
        {mode === "signup" && pendingVerificationEmail ? (
          <p className="page-copy page-copy--compact">
            <button type="button" className="link-quiet" onClick={() => void onResendVerification()} disabled={busy || resendBusy}>
              {resendBusy ? "Sending..." : "Resend verification email"}
            </button>
          </p>
        ) : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <form onSubmit={onSubmit} className="outline-box form-card">
          <label className="muted form-label">Email</label>
          <input
            className="field auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: "0.85rem" }}
          />
          <label className="muted form-label">Password</label>
          <input
            className="field auth-input"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isSignupMode ? 8 : 6}
            style={{ marginBottom: "1rem" }}
          />
          {isSignupMode ? (
            <>
              <label className="muted form-label">Confirm password</label>
              <input
                className="field auth-input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                style={{ marginBottom: "0.75rem" }}
              />
              <ul className="password-checklist" aria-live="polite">
                <li className={passwordRules.minLength ? "is-valid" : ""}>At least 8 characters</li>
                <li className={passwordRules.uppercase ? "is-valid" : ""}>At least one uppercase letter</li>
                <li className={passwordRules.number ? "is-valid" : ""}>At least one number</li>
                <li className={passwordRules.symbol ? "is-valid" : ""}>At least one symbol</li>
                <li className={confirmPasswordMatches ? "is-valid" : ""}>Passwords match</li>
              </ul>
            </>
          ) : null}
          <button type="submit" className="btn-primary btn-block" disabled={busy || (isSignupMode && !canSubmitSignup)}>
            {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <p className="page-copy page-copy--tight">
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
                  setConfirmPassword("");
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
                  setConfirmPassword("");
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
        {mode === "signin" ? (
          <p className="page-copy page-copy--compact">
            <button type="button" className="link-quiet" onClick={() => void onForgotPassword()} disabled={busy}>
              Forgot password?
            </button>
          </p>
        ) : null}
      </main>
    </div>
  );
}
