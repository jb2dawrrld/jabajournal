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
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

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
async function ensureProfile(userId: string): Promise<Profile | null> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;
  if (!supabase) return null;
  const { error: insertErr } = await supabase.from("profiles").insert({ id: userId });
  if (insertErr) {
    console.error("ensureProfile insert failed:", insertErr.message);
    return null;
  }
  return fetchProfile(userId);
}

async function ensureProfileWithTimeout(userId: string, label: string): Promise<Profile | null> {
  return withTimeout(ensureProfile(userId), 5000, label);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const u = (await supabase.auth.getUser()).data.user;
    if (!u) {
      setProfile(null);
      return;
    }
    const tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
    const p = await ensureProfileWithTimeout(u.id, "refreshProfile");
    if (p && p.timezone === "UTC" && tz !== "UTC") {
      await supabase.from("profiles").update({ timezone: tz }).eq("id", u.id);
      setProfile({ ...p, timezone: tz });
      return;
    }
    setProfile(p);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(data.session ?? null);
        if (data.session?.user) {
          try {
            const p = await ensureProfileWithTimeout(data.session.user.id, "bootstrapProfile");
            const tz =
              Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
            if (p && p.timezone === "UTC" && tz !== "UTC") {
              await supabase
                .from("profiles")
                .update({ timezone: tz })
                .eq("id", data.session.user.id);
              setProfile({ ...p, timezone: tz });
            } else {
              setProfile(p);
            }
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch {
        // Never leave the app stuck in loading if auth bootstrap fails.
        setSession(null);
        setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, next) => {
      setSession(next);
      if (!next?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const shouldGateRouting = event === "SIGNED_IN" || event === "USER_UPDATED";
      if (shouldGateRouting) {
        // Gate routing for events that can materially change profile-dependent flow.
        setLoading(true);
      }
      try {
        await withTimeout(refreshProfile(), 5000, `refreshProfile(${event})`);
      } catch {
        setProfile(null);
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
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
