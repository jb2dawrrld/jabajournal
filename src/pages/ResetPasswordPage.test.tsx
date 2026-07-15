import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PASSWORD_RECOVERY_FLAG_KEY } from "../lib/passwordRecovery";

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

  const setSession = vi.fn().mockResolvedValue({ error: null });
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  vi.doMock("../lib/supabase", () => ({
    supabase: {
      auth: { updateUser, setSession },
    },
  }));

  const { ResetPasswordPage } = await import("./ResetPasswordPage");

  return {
    ...render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth" element={<div>auth</div>} />
          <Route path="/forgot-password" element={<div>forgot</div>} />
        </Routes>
      </MemoryRouter>,
    ),
    mocks: { setSession, updateUser },
  };
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.location.hash = "";
  });

  it("shows expired message without recovery intent", async () => {
    await renderResetPage({
      authState: { session: { user: { id: "u1" } }, loading: false },
      hash: "",
    });

    await waitFor(() => {
      expect(screen.getByText(/missing or expired/i)).toBeInTheDocument();
    });
  });

  it("shows reset form when sessionStorage recovery flag is set (hash already cleared)", async () => {
    sessionStorage.setItem(PASSWORD_RECOVERY_FLAG_KEY, "1");
    await renderResetPage({
      authState: { session: { user: { id: "u1" } }, loading: false },
      hash: "",
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /choose a new password/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("shows reset form when recovery intent is present in the hash", async () => {
    await renderResetPage({
      authState: { session: { user: { id: "u1" } }, loading: false },
      hash: "#type=recovery&access_token=abc&refresh_token=def",
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /choose a new password/i })).toBeInTheDocument();
    });
    expect(sessionStorage.getItem(PASSWORD_RECOVERY_FLAG_KEY)).toBe("1");
  });
});
