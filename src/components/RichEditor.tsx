import DOMPurify from "dompurify";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  initialHtml: string;
  onDraftChange: (html: string) => void;
  readOnly: boolean;
  editorKey: string;
  embedded?: boolean;
  onMicToggle?: () => void;
  isRecording?: boolean;
  toolbarHost?: HTMLElement | null;
  bodyPlaceholder?: string;
  showBodyPlaceholder?: boolean;
};

export function RichEditor({
  initialHtml,
  onDraftChange,
  readOnly,
  editorKey,
  embedded = false,
  onMicToggle,
  isRecording = false,
  toolbarHost = null,
  bodyPlaceholder = "",
  showBodyPlaceholder = false,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || readOnly) return;
    el.innerHTML = initialHtml || "";
  }, [editorKey, initialHtml, readOnly]);

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const pushChange = useCallback(() => {
    if (readOnly) return;
    const html = editorRef.current?.innerHTML ?? "";
    onDraftChange(html);
  }, [onDraftChange, readOnly]);

  const run = useCallback(
    (fn: () => void) => {
      if (readOnly) return;
      focusEditor();
      fn();
      pushChange();
    },
    [focusEditor, pushChange, readOnly],
  );

  const onBold = () =>
    run(() => {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("bold", false);
    });

  const onItalic = () =>
    run(() => {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("italic", false);
    });

  const onUnderline = () =>
    run(() => {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("underline", false);
    });

  const onInput = () => {
    pushChange();
  };

  if (readOnly) {
    const safe = DOMPurify.sanitize(initialHtml || "", {
      USE_PROFILES: { html: true },
    });
    return (
      <div
        className={`${embedded ? "" : "outline-box "}rich-editor rich-editor--readonly`}
        style={{
          flex: 1,
          minHeight: "min(60vh, 520px)",
          padding: "1rem 1.1rem",
          overflow: "auto",
          lineHeight: 1.55,
          fontSize: "0.95rem",
          fontFamily: '"DM Sans", "Quicksand", "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        {safe ? (
          <div dangerouslySetInnerHTML={{ __html: safe }} />
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No entry for this day.
          </p>
        )}
      </div>
    );
  }

  const toolbar = (
    <div
      className={`${embedded ? "" : "outline-box "}rich-editor__toolbar`}
      style={{
        alignSelf: "flex-start",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.35rem",
        padding: "0.35rem 0.45rem",
        marginBottom: "0.65rem",
      }}
    >
        <button
          type="button"
          className="btn-outline"
          aria-label="Bold"
          title="Bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onBold}
        >
          B
        </button>
        <button
          type="button"
          className="btn-outline"
          aria-label="Underline"
          title="Underline"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onUnderline}
        >
          U
        </button>
        <button
          type="button"
          className="btn-outline"
          aria-label="Italic"
          title="Italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onItalic}
        >
          I
        </button>
        <button
          type="button"
          className="btn-outline"
          aria-label={isRecording ? "Stop recording voice memo" : "Record voice memo"}
          title={isRecording ? "Stop recording voice memo" : "Record voice memo"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onMicToggle?.()}
        >
          {isRecording ? (
            "■"
          ) : (
            <span className="rich-editor__mic-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                <path
                  d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-7 8a1 1 0 1 1 2 0a5 5 0 0 0 10 0a1 1 0 1 1 2 0a7 7 0 0 1-6 6.92V21h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-3.08A7 7 0 0 1 5 11z"
                  fill="currentColor"
                />
              </svg>
            </span>
          )}
        </button>
      </div>
  );

  return (
    <div className="rich-editor" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {toolbarHost ? createPortal(toolbar, toolbarHost) : toolbar}

      <div
        key={editorKey}
        ref={editorRef}
        className={`${embedded ? "" : "outline-box "}rich-editor__body`}
        data-placeholder={bodyPlaceholder}
        data-show-placeholder={showBodyPlaceholder ? "true" : "false"}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        style={{
          flex: 1,
          minHeight: "min(60vh, 520px)",
          padding: "1rem 1.1rem",
          overflow: "auto",
          outline: "none",
          lineHeight: 1.55,
          fontSize: "0.95rem",
          fontFamily: '"DM Sans", "Quicksand", "Segoe UI", Roboto, Arial, sans-serif',
        }}
        role="textbox"
        aria-multiline="true"
      />
    </div>
  );
}
