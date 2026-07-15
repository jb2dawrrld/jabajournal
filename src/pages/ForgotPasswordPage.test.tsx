import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

describe("ForgotPasswordPage", () => {
  it("sends reset email and navigates to the sent page", async () => {
    vi.resetModules();
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("../lib/supabase", () => ({
      supabaseConfigured: true,
      supabase: {
        auth: { resetPasswordForEmail },
      },
    }));

    vi.doMock("../contexts/AuthContext", () => ({
      useAuth: () => ({ session: null, loading: false }),
    }));

    vi.doMock("../lib/authRedirect", () => ({
      getPasswordResetRedirectUrl: () => "http://localhost:1420/reset-password",
    }));

    const { ForgotPasswordPage } = await import("./ForgotPasswordPage");
    const { ForgotPasswordSentPage } = await import("./ForgotPasswordSentPage");

    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/forgot-password/sent" element={<ForgotPasswordSentPage />} />
          <Route path="/auth" element={<div>auth</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "person@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith("person@example.com", {
        redirectTo: "http://localhost:1420/reset-password",
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/reset link sent/i)).toBeInTheDocument();
    });
  });
});

describe("ForgotPasswordSentPage", () => {
  it("shows confirmation copy and a link back to sign in", async () => {
    const { ForgotPasswordSentPage } = await import("./ForgotPasswordSentPage");
    render(
      <MemoryRouter>
        <ForgotPasswordSentPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/reset link sent! check your inbox/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute("href", "/auth");
  });
});
