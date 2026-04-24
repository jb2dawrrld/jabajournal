import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { calendarDateInTimeZone, compareDateOnly } from "../lib/dates";
import { useAuth } from "../contexts/AuthContext";
import { RichEditor } from "../components/RichEditor";
import { hasMeaningfulBody, hasMeaningfulJournalEntry } from "../lib/journalEntry";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const AUDIO_BUCKET = "journal-audio";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIO_EXTENSIONS = new Set(["webm", "m4a", "mp3"]);

function buildAudioPath(userId: string, entryId: string, ext: string) {
  return `${userId}/${entryId}.${ext}`;
}

function isValidAudioPathForUser(path: string, userId: string) {
  const normalized = path.trim();
  const slashIdx = normalized.indexOf("/");
  if (slashIdx <= 0) return false;
  const owner = normalized.slice(0, slashIdx);
  if (owner !== userId) return false;

  const filename = normalized.slice(slashIdx + 1);
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx <= 0) return false;
  const base = filename.slice(0, dotIdx);
  const ext = filename.slice(dotIdx + 1).toLowerCase();

  return UUID_RE.test(base) && AUDIO_EXTENSIONS.has(ext);
}

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
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const tz = profile?.timezone ?? "UTC";

  const todayStr = calendarDateInTimeZone(new Date(), tz);

  const date = dateParam ?? "";
  const valid = DATE_RE.test(date);

  const [titleValue, setTitleValue] = useState("");
  const [initialHtml, setInitialHtml] = useState("");
  const [audioPath, setAudioPath] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [entryExists, setEntryExists] = useState(false);
  const [bodyHasText, setBodyHasText] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [toolbarHostEl, setToolbarHostEl] = useState<HTMLDivElement | null>(null);

  const latestTitleRef = useRef("");
  const latestHtmlRef = useRef("");
  const latestEntryIdRef = useRef("");
  const latestAudioRef = useRef("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTitleRef = useRef("");
  const lastSavedBodyRef = useRef("");
  const lastSavedAudioRef = useRef("");
  const entryExistsRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const promptSeed = useMemo(() => {
    if (typeof location.state !== "object" || !location.state) return null;
    if (!("promptAsTitle" in location.state)) return null;
    const v = (location.state as { promptAsTitle?: unknown }).promptAsTitle;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t || null;
  }, [location.state]);

  const editable = valid && compareDateOnly(date, todayStr) <= 0;
  const isFuture = valid && compareDateOnly(date, todayStr) > 0;

  const schedulePersist = useCallback(
    (persistFn: () => Promise<void>) => {
      if (!editable) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persistFn();
      }, 650);
    },
    [editable],
  );

  const loadEntry = useCallback(async () => {
    if (!valid || !user || !supabase) return;
    setLoadError(null);
    setLoaded(false);
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, title, body, audio_storage_path")
        .eq("user_id", user.id)
        .eq("entry_date", date)
        .maybeSingle();
      if (error) throw error;
      const seededPrompt = promptSeed;
      const titleFromDb = (data?.title as string | null) ?? "";
      let title = titleFromDb;
      if (!title.trim() && seededPrompt) {
        title = seededPrompt;
      }
      const didApplyPromptSeed = Boolean(seededPrompt && !titleFromDb.trim());
      const body = (data?.body as string | null) ?? "";
      const nextEntryId = (data?.id as string | null) ?? "";
      const nextAudioPath = (data?.audio_storage_path as string | null) ?? "";
      const normalizedAudioPath = isValidAudioPathForUser(nextAudioPath, user.id) ? nextAudioPath : "";
      setTitleValue(title);
      setInitialHtml(body);
      setAudioPath(normalizedAudioPath);
      setBodyHasText(hasMeaningfulBody(body));
      setEntryExists(Boolean(data));

      latestEntryIdRef.current = nextEntryId;
      latestTitleRef.current = title;
      latestHtmlRef.current = body;
      latestAudioRef.current = normalizedAudioPath;
      lastSavedTitleRef.current = titleFromDb;
      lastSavedBodyRef.current = body;
      lastSavedAudioRef.current = normalizedAudioPath;
      entryExistsRef.current = Boolean(data);

      if (didApplyPromptSeed && editable && supabase && user) {
        const { error: upsertError } = await supabase.from("journal_entries").upsert(
          {
            user_id: user.id,
            entry_date: date,
            title: title.trim() || null,
            body,
            audio_storage_path: normalizedAudioPath || null,
          },
          { onConflict: "user_id,entry_date" },
        );
        if (upsertError) throw upsertError;
        lastSavedTitleRef.current = title.trim();
        lastSavedBodyRef.current = body;
        lastSavedAudioRef.current = normalizedAudioPath;
        entryExistsRef.current = true;
        setEntryExists(true);
      }

      if (
        seededPrompt &&
        (!didApplyPromptSeed || (editable && user && supabase))
      ) {
        navigate(location.pathname, { replace: true, state: null });
      }
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Could not load entry");
      setTitleValue("");
      setInitialHtml("");
      setAudioPath("");
      setBodyHasText(false);
      setEntryExists(false);
      latestEntryIdRef.current = "";
      latestTitleRef.current = "";
      latestHtmlRef.current = "";
      latestAudioRef.current = "";
      lastSavedTitleRef.current = "";
      lastSavedBodyRef.current = "";
      lastSavedAudioRef.current = "";
      entryExistsRef.current = false;
    } finally {
      setLoaded(true);
    }
  }, [date, editable, location.pathname, navigate, promptSeed, user, valid]);

  useEffect(() => {
    void loadEntry();
  }, [loadEntry]);

  const deleteEntryAndAudio = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.functions.invoke<{
      deleted: boolean;
      removedAudio: boolean;
    }>("delete-journal-entry", {
      body: { entryDate: date },
    });
    if (error) throw error;
    if (!data?.deleted) {
      throw new Error("Could not delete entry");
    }
  }, [date, user]);

  const persist = useCallback(async () => {
    if (!editable || !user || !supabase) return;

    const nextTitle = latestTitleRef.current.trim();
    const nextBody = latestHtmlRef.current;
    const nextEntryId = latestEntryIdRef.current.trim();
    const nextAudioPath = latestAudioRef.current.trim();

    const unchanged =
      nextTitle === lastSavedTitleRef.current.trim() &&
      nextBody === lastSavedBodyRef.current &&
      nextAudioPath === lastSavedAudioRef.current.trim();
    if (unchanged) return;

    const meaningful = hasMeaningfulJournalEntry({
      title: nextTitle,
      bodyHtml: nextBody,
      audioPath: nextAudioPath,
    });

    const hadMeaningful = hasMeaningfulJournalEntry({
      title: lastSavedTitleRef.current,
      bodyHtml: lastSavedBodyRef.current,
      audioPath: lastSavedAudioRef.current,
    });
    if (!meaningful && !entryExistsRef.current && !hadMeaningful) return;

      setSaveState("saving");
      setSaveMessage(null);
    try {
      if (!meaningful) {
        await deleteEntryAndAudio();

        entryExistsRef.current = false;
        setEntryExists(false);
        latestEntryIdRef.current = "";
        latestAudioRef.current = "";
        setAudioPath("");
        setAudioUrl(null);
        lastSavedTitleRef.current = "";
        lastSavedBodyRef.current = "";
        lastSavedAudioRef.current = "";
        setSaveState("saved");
        setSaveMessage("Entry cleared");
        window.setTimeout(() => setSaveMessage(null), 1600);
        return;
      }

      const stableEntryId = nextEntryId || crypto.randomUUID();
      const { error } = await supabase.from("journal_entries").upsert(
        {
          id: stableEntryId,
          user_id: user.id,
          entry_date: date,
          title: nextTitle || null,
          body: nextBody,
          audio_storage_path: isValidAudioPathForUser(nextAudioPath, user.id) ? nextAudioPath : null,
        },
        { onConflict: "user_id,entry_date" },
      );
      if (error) throw error;
      latestEntryIdRef.current = stableEntryId;
      entryExistsRef.current = true;
      setEntryExists(true);
      lastSavedTitleRef.current = nextTitle;
      lastSavedBodyRef.current = nextBody;
      lastSavedAudioRef.current = nextAudioPath;
      setSaveState("saved");
      setSaveMessage("Saved");
      window.setTimeout(() => setSaveMessage(null), 1600);
    } catch (e: unknown) {
      setSaveState("error");
      setSaveMessage(e instanceof Error ? e.message : "Save failed");
    }
  }, [date, deleteEntryAndAudio, editable, supabase, user]);

  const onTitleChange = useCallback(
    (nextTitle: string) => {
      setTitleValue(nextTitle);
      latestTitleRef.current = nextTitle;
      schedulePersist(persist);
    },
    [persist, schedulePersist],
  );

  const onDraftChange = useCallback(
    (nextHtml: string) => {
      latestHtmlRef.current = nextHtml;
      setBodyHasText(hasMeaningfulBody(nextHtml));
      schedulePersist(persist);
    },
    [persist, schedulePersist],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!supabase || !audioPath) {
      setAudioUrl(null);
      return;
    }
    const client = supabase;

    let cancelled = false;
    const loadAudioUrl = async () => {
      const { data, error } = await client.storage.from(AUDIO_BUCKET).createSignedUrl(audioPath, 3600);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setAudioUrl(null);
        return;
      }
      setAudioUrl(data.signedUrl);
    };
    void loadAudioUrl();

    return () => {
      cancelled = true;
    };
  }, [audioPath, supabase]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!editable || !user || !supabase) return;
    const client = supabase;
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAudioError("Recording is not supported on this browser");
      return;
    }

    try {
      setAudioError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const chunks: BlobPart[] = [];
      const mimeChoices = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
      const mimeType = mimeChoices.find((mime) => MediaRecorder.isTypeSupported(mime));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onerror = () => {
        setAudioError("Recording failed. Please try again.");
        setIsRecording(false);
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("mpeg") ? "mp3" : "webm";
          const stableEntryId = latestEntryIdRef.current || crypto.randomUUID();
          latestEntryIdRef.current = stableEntryId;
          const nextPath = buildAudioPath(user.id, stableEntryId, ext);
          if (!isValidAudioPathForUser(nextPath, user.id)) {
            throw new Error("Invalid audio storage path");
          }
          const { error } = await client.storage.from(AUDIO_BUCKET).upload(nextPath, blob, {
            upsert: true,
            contentType: blob.type || undefined,
          });
          if (error) throw error;
          setAudioPath(nextPath);
          latestAudioRef.current = nextPath;
          schedulePersist(persist);
        } catch (e: unknown) {
          setAudioError(e instanceof Error ? e.message : "Could not upload recording");
        } finally {
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          setIsRecording(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (e: unknown) {
      setAudioError(e instanceof Error ? e.message : "Could not start recording");
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  }, [date, editable, persist, schedulePersist, supabase, user]);

  const removeAudio = useCallback(async () => {
    if (!editable || !supabase || !audioPath) return;

    const { error } = await supabase.storage.from(AUDIO_BUCKET).remove([audioPath]);
    if (error) {
      setAudioError(error.message);
      return;
    }
    setAudioPath("");
    setAudioUrl(null);
    latestAudioRef.current = "";
    schedulePersist(persist);
  }, [audioPath, editable, persist, schedulePersist]);

  const deleteEntry = useCallback(async () => {
    if (!user || !supabase) return;
    const ok = window.confirm("Delete this entry?");
    if (!ok) return;

    try {
      await deleteEntryAndAudio();
      navigate("/calendar");
    } catch (e: unknown) {
      setSaveState("error");
      setSaveMessage(e instanceof Error ? e.message : "Delete failed");
    }
  }, [deleteEntryAndAudio, navigate, supabase, user]);

  const onDone = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (editable) {
      await persist();
    }
    stopRecording();
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
  const canDelete = useMemo(
    () =>
      entryExists ||
      hasMeaningfulJournalEntry({
        title: titleValue,
        bodyHtml: latestHtmlRef.current,
        audioPath: latestAudioRef.current,
      }),
    [audioPath, bodyHasText, entryExists, titleValue],
  );

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
            {audioUrl ? (
              <div className="outline-box journal-audio-card">
                <audio controls src={audioUrl} className="journal-audio-card__player" />
                <div className="journal-audio-card__actions">
                  <button type="button" className="btn-outline" onClick={() => void removeAudio()} disabled={!editable || !audioPath}>
                    Remove audio
                  </button>
                  {!editable ? <span className="muted">Read only</span> : null}
                </div>
              </div>
            ) : null}
            {audioError ? <div className="info-banner" style={{ marginBottom: "0.8rem" }}>{audioError}</div> : null}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <div className="journal-toolbar-host" ref={setToolbarHostEl} />
              <div className="outline-box journal-compose">
                <div className="journal-compose__title">
                  <input
                    type="text"
                    className="journal-compose__title-input"
                    value={titleValue}
                    onChange={(e) => onTitleChange(e.target.value)}
                    disabled={!editable}
                    aria-label="Entry title"
                    placeholder="Title"
                  />
                </div>
                <div className="journal-compose__divider" />
                <div className="journal-compose__entry">
                  <RichEditor
                    editorKey={date}
                    initialHtml={initialHtml}
                    onDraftChange={onDraftChange}
                    readOnly={!editable}
                    embedded
                    onMicToggle={() => (isRecording ? stopRecording() : void startRecording())}
                    isRecording={isRecording}
                    toolbarHost={toolbarHostEl}
                    bodyPlaceholder="Entry"
                    showBodyPlaceholder={!bodyHasText}
                  />
                </div>
              </div>
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
              <button type="button" className="btn-outline" onClick={() => void deleteEntry()} disabled={!canDelete}>
                Delete entry
              </button>
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
