import DOMPurify from "dompurify";
import { useCallback, useEffect, useRef, useState } from "react";

const FONTS = [
  { label: "DM Sans", fontName: "DM Sans" },
  { label: "Mono", fontName: "Courier New" },
  { label: "System", fontName: "Segoe UI" },
  { label: "Times", fontName: "Times New Roman" },
] as const;

type Props = {
  initialHtml: string;
  onDraftChange: (html: string) => void;
  readOnly: boolean;
  editorKey: string;
};

export function RichEditor({ initialHtml, onDraftChange, readOnly, editorKey }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontIndex, setFontIndex] = useState(0);

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

  const onFontCycle = () =>
    run(() => {
      const next = (fontIndex + 1) % FONTS.length;
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("fontName", false, FONTS[next].fontName);
      setFontIndex(next);
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
        className="outline-box rich-editor rich-editor--readonly"
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

  return (
    <div className="rich-editor" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div
        className="outline-box rich-editor__toolbar"
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
          aria-label={`Font: ${FONTS[fontIndex].label}. Click to use next font.`}
          title={`Font: ${FONTS[fontIndex].label} (click to cycle)`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onFontCycle}
        >
          {FONTS[fontIndex].label}
        </button>
      </div>

      <div
        key={editorKey}
        ref={editorRef}
        className="outline-box rich-editor__body"
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
