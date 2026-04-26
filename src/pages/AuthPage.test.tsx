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
  async function switchToSignupMode() {
    fireEvent.click(screen.getByRole("button", { name: /create one/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    });
  }

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

  it("shows password checklist in signup mode", async () => {
    await renderAuthPage({
      supabaseConfigured: true,
      authState: { session: null, loading: false },
    });
    await switchToSignupMode();

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one number/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one symbol/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords match/i)).toBeInTheDocument();
  });

  it("blocks signup when password rules are not met", async () => {
    const { mocks } = await renderAuthPage({
      supabaseConfigured: true,
      authState: { session: null, loading: false },
    });
    await switchToSignupMode();

    const emailInput = document.querySelector("input[type='email']") as HTMLInputElement;
    const passwordInputs = document.querySelectorAll("input[type='password']");
    const passwordInput = passwordInputs[0] as HTMLInputElement;
    const confirmPasswordInput = passwordInputs[1] as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "weak" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "weak" } });

    const signupButton = screen.getByRole("button", { name: /^sign up$/i });
    expect(signupButton).toBeDisabled();
    fireEvent.click(signupButton);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("blocks signup when passwords do not match", async () => {
    const { mocks } = await renderAuthPage({
      supabaseConfigured: true,
      authState: { session: null, loading: false },
    });
    await switchToSignupMode();

    const emailInput = document.querySelector("input[type='email']") as HTMLInputElement;
    const passwordInputs = document.querySelectorAll("input[type='password']");
    const passwordInput = passwordInputs[0] as HTMLInputElement;
    const confirmPasswordInput = passwordInputs[1] as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongPass1!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "StrongPass1?" } });

    const signupButton = screen.getByRole("button", { name: /^sign up$/i });
    expect(signupButton).toBeDisabled();
    fireEvent.click(signupButton);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("allows signup when all password requirements pass", async () => {
    const { mocks } = await renderAuthPage({
      supabaseConfigured: true,
      authState: { session: null, loading: false },
    });
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });
    await switchToSignupMode();

    const emailInput = document.querySelector("input[type='email']") as HTMLInputElement;
    const passwordInputs = document.querySelectorAll("input[type='password']");
    const passwordInput = passwordInputs[0] as HTMLInputElement;
    const confirmPasswordInput = passwordInputs[1] as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongPass1!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "StrongPass1!" } });

    const signupButton = screen.getByRole("button", { name: /^sign up$/i });
    expect(signupButton).toBeEnabled();
    fireEvent.click(signupButton);

    await waitFor(() => {
      expect(mocks.signUp).toHaveBeenCalledTimes(1);
    });
  });
});
