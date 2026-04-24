import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { calendarDateInTimeZone } from "../lib/dates";
import { useAuth } from "../contexts/AuthContext";
import { getPromptForDay } from "../data/writingPrompts";
import { getEntryPreview, hasMeaningfulJournalEntry } from "../lib/journalEntry";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatRecentDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

type EntryRow = {
  entry_date: string;
  title: string | null;
  body: string | null;
  audio_storage_path: string | null;
};

export function CalendarPage() {
  const { user, profile, loading, signOut } = useAuth();
  const tz = profile?.timezone ?? "UTC";
  const todayStr = useMemo(() => calendarDateInTimeZone(new Date(), tz), [tz]);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [withEntry, setWithEntry] = useState<Set<string>>(new Set());
  const [recentEntries, setRecentEntries] = useState<EntryRow[]>([]);

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();

  const loadDots = useCallback(async () => {
    if (!user || !supabase) return;
    const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const lastDay = daysInMonth(year, monthIndex);
    const end = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("journal_entries")
      .select("entry_date, title, body, audio_storage_path")
      .eq("user_id", user.id)
      .gte("entry_date", start)
      .lte("entry_date", end);

    if (error) return;
    const next = new Set<string>();
    for (const row of data ?? []) {
      const typed = row as unknown as EntryRow;
      if (
        typed.entry_date &&
        hasMeaningfulJournalEntry({
          title: typed.title,
          bodyHtml: typed.body,
          audioPath: typed.audio_storage_path,
        })
      ) {
        next.add(typed.entry_date);
      }
    }
    setWithEntry(next);
  }, [user, year, monthIndex]);

  useEffect(() => {
    void loadDots();
  }, [loadDots]);

  const todaysPrompt = useMemo(
    () => (user?.id ? getPromptForDay(todayStr, user.id) : ""),
    [todayStr, user?.id],
  );

  const loadRecentEntries = useCallback(async () => {
    if (!user || !supabase) return;
    const { data, error } = await supabase
      .from("journal_entries")
      .select("entry_date, title, body, audio_storage_path")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .limit(6);

    if (error) return;
    const normalized = (data ?? [])
      .map((row) => row as unknown as EntryRow)
      .filter((row) =>
        hasMeaningfulJournalEntry({
          title: row.title,
          bodyHtml: row.body,
          audioPath: row.audio_storage_path,
        }),
      );
    setRecentEntries(normalized);
  }, [user]);

  useEffect(() => {
    void loadRecentEntries();
  }, [loadRecentEntries]);

  const grid = useMemo(() => {
    const firstDow = new Date(year, monthIndex, 1).getDay();
    const dim = daysInMonth(year, monthIndex);
    const cells: { dateStr: string | null; inMonth: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) {
      cells.push({ dateStr: null, inMonth: false });
    }
    for (let day = 1; day <= dim; day++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ dateStr, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ dateStr: null, inMonth: false });
    }
    return cells;
  }, [year, monthIndex]);

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!loading && user && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  const label = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(cursor);

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__brand">jabajournal</span>
        <button type="button" className="btn-outline" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      <main className="app-main">
        {user && todaysPrompt ? (
          <div className="info-banner" style={{ marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.02em" }}>Today&apos;s prompt</p>
            <p style={{ margin: "0.45rem 0 0.65rem", lineHeight: 1.5, fontSize: "0.9rem" }}>{todaysPrompt}</p>
            <Link
              to={`/journal/${todayStr}`}
              className="btn-primary"
              style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}
              state={{ promptAsTitle: todaysPrompt }}
            >
              I&apos;ll bite
            </Link>
          </div>
        ) : null}
        <div className="calendar-panel">
          <div className="calendar-panel__header">
            <div className="calendar-panel__nav calendar-panel__nav--between">
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={() => setCursor((c) => addMonths(c, -1))}
                aria-label="Previous month"
              >
                ←
              </button>
              <h2 className="calendar-panel__title">{label}</h2>
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={() => setCursor((c) => addMonths(c, 1))}
                aria-label="Next month"
              >
                →
              </button>
            </div>
          </div>

          <div className="calendar-panel__body">
            <div className="calendar-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="calendar-grid">
              {grid.map((cell, idx) => {
                if (!cell.dateStr) {
                  return <div key={`pad-${idx}`} className="calendar-pad" />;
                }
                const isToday = cell.dateStr === todayStr;
                const isFuture = cell.dateStr > todayStr;
                const hasDot = withEntry.has(cell.dateStr);

                const dayNum = Number(cell.dateStr.slice(8, 10));

                if (isFuture) {
                  return (
                    <div
                      key={cell.dateStr}
                      className="calendar-day calendar-day--future"
                      aria-disabled
                      title="Future dates are disabled"
                    >
                      {dayNum}
                    </div>
                  );
                }

                return (
                  <Link
                    key={cell.dateStr}
                    to={`/journal/${cell.dateStr}`}
                    className={`calendar-day${isToday ? " calendar-day--today" : ""}`}
                  >
                    <span>{dayNum}</span>
                    {hasDot ? (
                      <span
                        className={`calendar-dot ${isToday ? "calendar-dot--on-today" : "calendar-dot--default"}`}
                      />
                    ) : (
                      <span style={{ height: 7 }} aria-hidden />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {recentEntries.length > 0 ? (
          <section style={{ marginTop: "0.9rem" }}>
            <p className="muted" style={{ margin: "0 0 0.55rem", fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              Recent entries
            </p>
            {recentEntries.map((entry) => (
              <Link
                key={entry.entry_date}
                to={`/journal/${entry.entry_date}`}
                className="info-banner calendar-recent-card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <p className="calendar-recent-card__date">{formatRecentDate(entry.entry_date)}</p>
                <p className="calendar-recent-card__title">{entry.title?.trim() || "Untitled"}</p>
                <p className="calendar-recent-card__preview">{getEntryPreview(entry.body, 150) || "No text in entry."}</p>
              </Link>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
