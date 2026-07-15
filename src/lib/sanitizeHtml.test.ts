import { describe, expect, it, vi } from "vitest";

vi.mock("dompurify", () => ({
  default: {
    sanitize: (html: string) =>
      html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/\son\w+="[^"]*"/gi, "")
        .replace(/\son\w+='[^']*'/gi, ""),
  },
}));

describe("sanitizeJournalHtml", () => {
  it("strips script tags and event handlers", async () => {
    const { sanitizeJournalHtml } = await import("./sanitizeHtml");
    const dirty = `<p onclick="alert(1)">ok</p><script>alert(2)</script>`;
    const clean = sanitizeJournalHtml(dirty);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).toContain("ok");
  });

  it("returns empty string for nullish input", async () => {
    const { sanitizeJournalHtml } = await import("./sanitizeHtml");
    expect(sanitizeJournalHtml(null)).toBe("");
    expect(sanitizeJournalHtml(undefined)).toBe("");
  });
});
