import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const getSession = vi.fn();
const getUser = vi.fn();
const onAuthStateChange = vi.fn();
const fromMock = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabaseConfigured: true,
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      getUser: (...args: unknown[]) => getUser(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChange(...args),
      signOut: vi.fn(),
    },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function AuthProbe() {
  const { loading, profile, profileError, user } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user?.id ?? "none"}</div>
      <div data-testid="profile">{profile ? "yes" : "no"}</div>
      <div data-testid="error">{profileError ?? ""}</div>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    getSession.mockReset();
    getUser.mockReset();
    onAuthStateChange.mockReset();
    fromMock.mockReset();

    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("surfaces profileError when profile bootstrap fails", async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: { message: "db down" } }),
        }),
      }),
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("error").textContent).toMatch(/db down/i);
    expect(screen.getByTestId("profile").textContent).toBe("no");
  });

  it("loads profile successfully and clears profileError", async () => {
    getSession.mockResolvedValue({
      data: {
        session: { user: { id: "u1" } },
      },
    });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "u1", timezone: "America/Chicago", onboarding_completed: true },
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("profile").textContent).toBe("yes");
    expect(screen.getByTestId("error").textContent).toBe("");
  });
});
