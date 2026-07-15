import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { markPasswordRecoveryIntent, capturePasswordRecoveryIntentFromUrl, hasPasswordRecoveryIntent } from "../lib/passwordRecovery";
import { supabase, supabaseConfigured } from "../lib/supabase";

export type Profile = {
  id: string;
  timezone: string;
  onboarding_completed: boolean;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.length) return m;
  }
  return fallback;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, timezone, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

/** Load profile, or insert a row if missing (e.g. trigger not run yet). Requires INSERT policy on profiles. */
async function ensureProfile(userId: string): Promise<Profile> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  const { error: insertErr } = await supabase.from("profiles").insert({ id: userId });
  if (insertErr) {
    throw new Error(insertErr.message || "Could not create profile");
  }
  const created = await fetchProfile(userId);
  if (!created) {
    throw new Error("Could not load profile after create");
  }
  return created;
}

async function ensureProfileWithTimeout(userId: string, label: string): Promise<Profile> {
  return withTimeout(ensureProfile(userId), 5000, label);
}

async function applyTimezoneNudge(userId: string, p: Profile): Promise<Profile> {
  if (!supabase) return p;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  if (p.timezone === "UTC" && tz !== "UTC") {
    await supabase.from("profiles").update({ timezone: tz }).eq("id", userId);
    return { ...p, timezone: tz };
  }
  return p;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const u = (await supabase.auth.getUser()).data.user;
    if (!u) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    try {
      const p = await applyTimezoneNudge(u.id, await ensureProfileWithTimeout(u.id, "refreshProfile"));
      setProfile(p);
      setProfileError(null);
    } catch (err: unknown) {
      setProfile(null);
      setProfileError(toErrorMessage(err, "Could not load profile"));
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    capturePasswordRecoveryIntentFromUrl();

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(data.session ?? null);
        if (data.session?.user) {
          try {
            const p = await applyTimezoneNudge(
              data.session.user.id,
              await ensureProfileWithTimeout(data.session.user.id, "bootstrapProfile"),
            );
            if (cancelled) return;
            setProfile(p);
            setProfileError(null);
          } catch (err: unknown) {
            if (cancelled) return;
            setProfile(null);
            setProfileError(toErrorMessage(err, "Could not load profile"));
          }
        } else {
          setProfile(null);
          setProfileError(null);
        }
      } catch {
        // Never leave the app stuck in loading if auth bootstrap fails.
        setSession(null);
        setProfile(null);
        setProfileError(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") {
        markPasswordRecoveryIntent();
      }
      if (!next?.user) {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }
      // Skip loading gate during password recovery so /reset-password is not raced.
      const shouldGateRouting =
        (event === "SIGNED_IN" || event === "USER_UPDATED") && !hasPasswordRecoveryIntent();
      if (shouldGateRouting) {
        // Gate routing for events that can materially change profile-dependent flow.
        setLoading(true);
      }
      try {
        await withTimeout(refreshProfile(), 5000, `refreshProfile(${event})`);
      } catch (err: unknown) {
        setProfile(null);
        setProfileError(toErrorMessage(err, "Could not load profile"));
      } finally {
        if (!cancelled && shouldGateRouting) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
    setProfileError(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileError,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, profileError, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
