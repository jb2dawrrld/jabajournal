import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!loading && profile?.onboarding_completed) {
    return <Navigate to="/calendar" replace />;
  }

  async function finish() {
    if (!user || !supabase) return;
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      if (err) throw err;
      await refreshProfile();
      navigate("/calendar", { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__brand">jabajournal</span>
      </header>
      <main className="app-main">
        <h1 style={{ fontSize: "1.15rem", fontWeight: 500, marginBottom: "0.75rem" }}>
          Welcome
        </h1>
        <div className="outline-box" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
          <p style={{ margin: 0, lineHeight: 1.55, fontSize: "0.92rem" }}>
            jabajournal: the ideal home <strong>for your thoughts</strong>. Open the
            calendar, choose any day, and write what matters. No multiple fonts, no collages, no <strong>distractions</strong> - just let
            your words take the lead.
          </p>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn-primary" onClick={finish} disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </button>
        </div>
      </main>
    </div>
  );
}
