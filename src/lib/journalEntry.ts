type MeaningfulEntryInput = {
  title?: string | null;
  bodyHtml?: string | null;
  audioPath?: string | null;
};

export function getVisibleTextFromHtml(html: string | null | undefined): string {
  if (!html) return "";

  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    const doc = new window.DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasMeaningfulBody(html: string | null | undefined): boolean {
  return getVisibleTextFromHtml(html).length > 0;
}

export function hasMeaningfulJournalEntry(input: MeaningfulEntryInput): boolean {
  const hasTitle = (input.title ?? "").trim().length > 0;
  const hasAudio = (input.audioPath ?? "").trim().length > 0;
  return hasTitle || hasAudio || hasMeaningfulBody(input.bodyHtml);
}

export function getEntryPreview(html: string | null | undefined, maxLen = 140): string {
  const text = getVisibleTextFromHtml(html);
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trimEnd()}...`;
}
