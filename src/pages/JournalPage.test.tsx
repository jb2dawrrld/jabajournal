import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  current: {
    user: { id: "u1" } as { id: string } | null,
    profile: {
      id: "u1",
      timezone: "UTC",
      onboarding_completed: true,
    } as {
      id: string;
      timezone: string;
      onboarding_completed: boolean;
    } | null,
    loading: false,
    profileError: null as string | null,
    refreshProfile: vi.fn(),
    signOut: vi.fn(),
    session: { user: { id: "u1" } } as object | null,
  },
}));

const maybeSingle = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => authState.current,
}));

vi.mock("../lib/supabase", () => ({
  supabaseConfigured: true,
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: (...args: unknown[]) => maybeSingle(...args),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: vi.fn(),
        upload: vi.fn(),
        remove: vi.fn(),
      }),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("../components/RichEditor", () => ({
  RichEditor: () => <div data-testid="editor">editor</div>,
}));

describe("JournalPage", () => {
  beforeEach(() => {
    authState.current = {
      user: { id: "u1" },
      profile: { id: "u1", timezone: "UTC", onboarding_completed: true },
      loading: false,
      profileError: null,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
      session: { user: { id: "u1" } },
    };
    maybeSingle.mockResolvedValue({
      data: {
        id: "entry-1",
        title: "Hello",
        body: "<p>Body</p>",
        audio_storage_path: null,
      },
      error: null,
    });
  });

  it("loads an entry for a valid past/today date", async () => {
    const { JournalPage } = await import("./JournalPage");
    render(
      <MemoryRouter initialEntries={["/journal/2026-07-14"]}>
        <Routes>
          <Route path="/journal/:date" element={<JournalPage />} />
          <Route path="/calendar" element={<div>calendar</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Hello")).toBeInTheDocument();
    });
    expect(screen.getByTestId("editor")).toBeInTheDocument();
  });

  it("redirects invalid dates to calendar without crashing", async () => {
    const { JournalPage } = await import("./JournalPage");
    render(
      <MemoryRouter initialEntries={["/journal/not-a-date"]}>
        <Routes>
          <Route path="/journal/:date" element={<JournalPage />} />
          <Route path="/calendar" element={<div>calendar-dest</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("calendar-dest")).toBeInTheDocument();
    });
  });

  it("redirects future dates to calendar", async () => {
    const { JournalPage } = await import("./JournalPage");
    render(
      <MemoryRouter initialEntries={["/journal/2099-01-01"]}>
        <Routes>
          <Route path="/journal/:date" element={<JournalPage />} />
          <Route path="/calendar" element={<div>calendar-dest</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("calendar-dest")).toBeInTheDocument();
    });
  });
});
