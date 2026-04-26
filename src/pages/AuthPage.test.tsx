import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

type AuthState = {
  session: object | null;
  loading: boolean;
};

async function renderAuthPage({
  supabaseConfigured,
  authState,
  appOrigin = "http://localhost:1420",
  initialPath = "/auth",
}: {
  supabaseConfigured: boolean;
  authState: AuthState;
  appOrigin?: string;
  initialPath?: string;
}) {
  vi.resetModules();
  const signInWithPassword = vi.fn();
  const signUp = vi.fn();
  const resetPasswordForEmail = vi.fn();
  const resend = vi.fn();

  vi.doMock("../lib/supabase", () => ({
    supabaseConfigured,
    supabase: supabaseConfigured
      ? {
          auth: {
            signUp,
            signInWithPassword,
            resetPasswordForEmail,
            resend,
          },
        }
      : null,
  }));

  vi.doMock("../contexts/AuthContext", () => ({
    useAuth: () => authState,
  }));

  vi.doMock("../lib/authRedirect", () => ({
    getAppOrigin: () => appOrigin,
    getEmailConfirmationRedirectUrl: () => `${appOrigin}/auth`,
    getPasswordResetRedirectUrl: () => `${appOrigin}/reset-password`,
  }));

  const { AuthPage } = await import("./AuthPage");

  const view = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </MemoryRouter>,
  );

  return { ...view, mocks: { signInWithPassword, signUp, resetPasswordForEmail, resend } };
}

describe("AuthPage", () => {
  it("shows local env guidance when Supabase env vars are missing on localhost", async () => {
    await renderAuthPage({
      supabaseConfigured: false,
      authState: { session: null, loading: false },
      appOrigin: "http://localhost:1420",
    });

    expect(screen.getByText(/restart the local dev server/i)).toBeInTheDocument();
    expect(screen.getByText(/project settings > api/i)).toBeInTheDocument();
  });

  it("shows deployment guidance when Supabase env vars are missing in production", async () => {
    await renderAuthPage({
      supabaseConfigured: false,
      authState: { session: null, loading: false },
      appOrigin: "https://jabajournal.com",
    });

    expect(screen.getByText(/hosting environment and redeploy the app/i)).toBeInTheDocument();
  });

  it("redirects authenticated users away from the auth page", async () => {
    await renderAuthPage({
      supabaseConfigured: true,
      authState: { session: { user: { id: "123" } }, loading: false },
    });

    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("renders the sign-in form when Supabase is configured", async () => {
    await renderAuthPage({
      supabaseConfigured: true,
      authState: { session: null, loading: false },
    });

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows a generic sign-in error message", async () => {
    const { mocks } = await renderAuthPage({
      supabaseConfigured: true,
      authState: { session: null, loading: false },
    });
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: "User not found" },
    });

    const emailInput = document.querySelector("input[type='email']") as HTMLInputElement;
    const passwordInput = document.querySelector("input[type='password']") as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "nobody@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not sign in/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/user not found/i)).not.toBeInTheDocument();
  });
});
