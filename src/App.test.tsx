import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { RequireCompletedOnboarding } from "./components/RequireCompletedOnboarding";

const authState = vi.hoisted(() => ({
  current: {
    session: null as object | null,
    user: null as { id: string } | null,
    profile: null as {
      id: string;
      timezone: string;
      onboarding_completed: boolean;
    } | null,
    loading: false,
    profileError: null as string | null,
    refreshProfile: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock("./contexts/AuthContext", () => ({
  useAuth: () => authState.current,
}));

vi.mock("./pages/CalendarPage", () => ({
  CalendarPage: () => <div>calendar page</div>,
}));

vi.mock("./pages/JournalPage", () => ({
  JournalPage: () => <div>journal page</div>,
}));

vi.mock("./pages/AuthPage", () => ({
  AuthPage: () => <div>auth page</div>,
}));

vi.mock("./pages/OnboardingPage", () => ({
  OnboardingPage: () => <div>onboarding page</div>,
}));

vi.mock("./pages/PrivacyPolicyPage", () => ({
  PrivacyPolicyPage: () => <div>privacy</div>,
}));

vi.mock("./pages/ResetPasswordPage", () => ({
  ResetPasswordPage: () => <div>reset</div>,
}));

vi.mock("./pages/ForgotPasswordPage", () => ({
  ForgotPasswordPage: () => <div>forgot page</div>,
}));

vi.mock("./pages/ForgotPasswordSentPage", () => ({
  ForgotPasswordSentPage: () => <div>forgot sent</div>,
}));

describe("App routing guards", () => {
  beforeEach(() => {
    authState.current = {
      session: null,
      user: null,
      profile: null,
      loading: false,
      profileError: null,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    };
  });

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );
  }

  it("shows loading screen while auth is bootstrapping on protected routes", () => {
    authState.current.loading = true;
    authState.current.session = { user: { id: "u1" } };
    authState.current.user = { id: "u1" };
    renderAt("/calendar");
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it("shows profile error with retry instead of forcing onboarding", () => {
    authState.current.session = { user: { id: "u1" } };
    authState.current.user = { id: "u1" };
    authState.current.profileError = "bootstrapProfile timed out";
    renderAt("/calendar");
    expect(screen.getByRole("heading", { name: /could not load profile/i })).toBeInTheDocument();
    expect(screen.getByText(/bootstrapProfile timed out/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("sends incomplete onboarding users to onboarding", async () => {
    authState.current.session = { user: { id: "u1" } };
    authState.current.user = { id: "u1" };
    authState.current.profile = {
      id: "u1",
      timezone: "UTC",
      onboarding_completed: false,
    };
    renderAt("/calendar");
    await waitFor(() => {
      expect(screen.getByText(/onboarding page/i)).toBeInTheDocument();
    });
  });

  it("renders calendar when onboarding is complete", () => {
    authState.current.session = { user: { id: "u1" } };
    authState.current.user = { id: "u1" };
    authState.current.profile = {
      id: "u1",
      timezone: "UTC",
      onboarding_completed: true,
    };
    renderAt("/calendar");
    expect(screen.getByText(/calendar page/i)).toBeInTheDocument();
  });
});

describe("RequireCompletedOnboarding", () => {
  it("redirects unauthenticated users to auth", () => {
    authState.current.loading = false;
    authState.current.user = null;
    render(
      <MemoryRouter initialEntries={["/calendar"]}>
        <Routes>
          <Route
            path="/calendar"
            element={
              <RequireCompletedOnboarding>
                <div>secret</div>
              </RequireCompletedOnboarding>
            }
          />
          <Route path="/auth" element={<div>auth page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/auth page/i)).toBeInTheDocument();
  });
});
