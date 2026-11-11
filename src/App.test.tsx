import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { RequireAuth } from "./components/RequireAuth";

const authState = vi.hoisted(() => ({
  current: {
    session: null as object | null,
    user: null as { id: string } | null,
    profile: null as {
      id: string;
      timezone: string;
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

  it("shows profile error with retry instead of entering the app", () => {
    authState.current.session = { user: { id: "u1" } };
    authState.current.user = { id: "u1" };
    authState.current.profileError = "bootstrapProfile timed out";
    renderAt("/calendar");
    expect(screen.getByRole("heading", { name: /could not load profile/i })).toBeInTheDocument();
    expect(screen.getByText(/bootstrapProfile timed out/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders calendar when profile is ready", () => {
    authState.current.session = { user: { id: "u1" } };
    authState.current.user = { id: "u1" };
    authState.current.profile = {
      id: "u1",
      timezone: "UTC",
    };
    renderAt("/calendar");
    expect(screen.getByText(/calendar page/i)).toBeInTheDocument();
  });
});

describe("RequireAuth", () => {
  it("redirects unauthenticated users to auth", () => {
    authState.current.loading = false;
    authState.current.user = null;
    render(
      <MemoryRouter initialEntries={["/calendar"]}>
        <Routes>
          <Route
            path="/calendar"
            element={
              <RequireAuth>
                <div>secret</div>
              </RequireAuth>
            }
          />
          <Route path="/auth" element={<div>auth page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/auth page/i)).toBeInTheDocument();
  });
});
