import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { calendarDateInTimeZone, compareDateOnly } from "../lib/dates";
import { useAuth } from "../contexts/AuthContext";
import { RichEditor } from "../components/RichEditor";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatHeaderDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  }).format(dt);
}

export function JournalPage() {
  const { date: dateParam } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const tz = profile?.timezone ?? "UTC";

  const todayStr = calendarDateInTimeZone(new Date(), tz);

  const date = dateParam ?? "";
  const valid = DATE_RE.test(date);

  const [initialHtml, setInitialHtml] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const latestHtmlRef = useRef("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef("");

  const editable = valid && compareDateOnly(date, todayStr) === 0;
  const isFuture = valid && compareDateOnly(date, todayStr) > 0;

  const loadEntry = useCallback(async () => {
    if (!valid || !user || !supabase) return;
    setLoadError(null);
    setLoaded(false);
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("body")
        .eq("user_id", user.id)
        .eq("entry_date", date)
        .maybeSingle();
      if (error) throw error;
      const body = (data?.body as string) ?? "";
      setInitialHtml(body);
      latestHtmlRef.current = body;
      lastSavedRef.current = body;
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Could not load entry");
      setInitialHtml("");
      latestHtmlRef.current = "";
      lastSavedRef.current = "";
    } finally {
      setLoaded(true);
    }
  }, [valid, user, date]);

  useEffect(() => {
    void loadEntry();
  }, [loadEntry]);

  const persist = useCallback(
    async (nextHtml: string) => {
      if (!editable || !user || !supabase) return;
      if (nextHtml === lastSavedRef.current) return;
      setSaveState("saving");
      setSaveMessage(null);
      try {
        const { error } = await supabase.from("journal_entries").upsert(
          {
            user_id: user.id,
            entry_date: date,
            body: nextHtml,
          },
          { onConflict: "user_id,entry_date" },
        );
        if (error) throw error;
        lastSavedRef.current = nextHtml;
        setSaveState("saved");
        setSaveMessage("Saved");
        window.setTimeout(() => setSaveMessage(null), 1600);
      } catch (e: unknown) {
        setSaveState("error");
        setSaveMessage(e instanceof Error ? e.message : "Save failed");
      }
    },
    [date, editable, user],
  );

  const onDraftChange = useCallback(
    (nextHtml: string) => {
      latestHtmlRef.current = nextHtml;
      if (!editable) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(nextHtml);
      }, 650);
    },
    [editable, persist],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const onDone = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (editable) {
      await persist(latestHtmlRef.current);
    }
    navigate("/calendar");
  };

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!loading && user && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!valid) {
    return <Navigate to="/calendar" replace />;
  }

  if (isFuture) {
    return <Navigate to="/calendar" replace />;
  }

  let statusLine = " ";
  if (editable) {
    if (saveState === "saving") statusLine = "Saving…";
    else if (saveMessage) statusLine = saveMessage;
    else if (saveState === "error") statusLine = "Could not save";
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/calendar" className="app-header__brand" style={{ textDecoration: "none", color: "inherit" }}>
          jabajournal
        </Link>
        <span className="app-header__date">{formatHeaderDate(date)}</span>
      </header>

      <main className="app-main" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {loadError ? <div className="error-banner">{loadError}</div> : null}
        {!loaded ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <RichEditor
                editorKey={date}
                initialHtml={initialHtml}
                onDraftChange={onDraftChange}
                readOnly={!editable}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "0.65rem",
                marginTop: "0.85rem",
              }}
            >
              {editable ? (
                <span className="muted" style={{ fontSize: "0.78rem" }}>
                  {statusLine}
                </span>
              ) : (
                <span className="muted" style={{ fontSize: "0.78rem" }}>
                  Read only
                </span>
              )}
              <button type="button" className="btn-done" onClick={() => void onDone()}>
                Done
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
