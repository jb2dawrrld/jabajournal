import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

async function renderResetPage({
  hash = "",
  authState,
}: {
  hash?: string;
  authState: { session: object | null; loading: boolean };
}) {
  vi.resetModules();
  window.location.hash = hash;

  vi.doMock("../contexts/AuthContext", () => ({
    useAuth: () => authState,
  }));

  vi.doMock("../lib/supabase", () => ({
    supabase: {
      auth: { updateUser: vi.fn() },
    },
  }));

  const { ResetPasswordPage } = await import("./ResetPasswordPage");

  return render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth" element={<div>auth</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  it("shows expired message without recovery intent", async () => {
    await renderResetPage({
      authState: { session: { user: { id: "u1" } }, loading: false },
      hash: "",
    });

    expect(screen.getByText(/missing or expired/i)).toBeInTheDocument();
  });

  it("shows reset form when recovery intent is present", async () => {
    await renderResetPage({
      authState: { session: { user: { id: "u1" } }, loading: false },
      hash: "#type=recovery&access_token=abc",
    });

    expect(screen.getByRole("heading", { name: /choose a new password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });
});
