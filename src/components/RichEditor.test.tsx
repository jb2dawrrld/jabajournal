import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichEditor } from "../components/RichEditor";

vi.mock("dompurify", () => ({
  default: {
    sanitize: (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, ""),
  },
}));

describe("RichEditor", () => {
  it("renders sanitized HTML in read-only mode", () => {
    render(
      <RichEditor
        initialHtml={'<p>Hello</p><script>alert(1)</script>'}
        onDraftChange={() => {}}
        readOnly
        editorKey="ro"
      />,
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("loads sanitized HTML into the editable surface", () => {
    const onDraftChange = vi.fn();
    render(
      <RichEditor
        initialHtml={'<p>Draft</p><script>evil()</script>'}
        onDraftChange={onDraftChange}
        readOnly={false}
        editorKey="edit"
      />,
    );

    const editor = screen.getByRole("textbox");
    expect(editor.innerHTML).toContain("Draft");
    expect(editor.innerHTML).not.toMatch(/script/i);
  });

  it("sanitizes on input drafts", () => {
    const onDraftChange = vi.fn();
    render(
      <RichEditor
        initialHtml="<p>Safe</p>"
        onDraftChange={onDraftChange}
        readOnly={false}
        editorKey="edit-2"
      />,
    );

    const editor = screen.getByRole("textbox");
    editor.innerHTML = '<p>typed</p><script>x()</script>';
    fireEvent.input(editor);

    expect(onDraftChange).toHaveBeenCalled();
    const calls = onDraftChange.mock.calls;
    const last = calls[calls.length - 1]?.[0] as string;
    expect(last).not.toMatch(/script/i);
    expect(last).toContain("typed");
  });
});
