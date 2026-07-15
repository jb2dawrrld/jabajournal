import DOMPurify from "dompurify";

/** Sanitize journal body HTML for load, display, and persist. */
export function sanitizeJournalHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? "", {
    USE_PROFILES: { html: true },
  });
}
