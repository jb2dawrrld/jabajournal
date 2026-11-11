import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AppLoadingScreen } from "./AppLoadingScreen";
import { ProfileLoadError } from "./ProfileLoadError";

/** Gates calendar/journal routes: auth bootstrap, session, and profile. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading, profileError, refreshProfile } = useAuth();

  if (loading) {
    return <AppLoadingScreen fullViewport />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profileError || !profile) {
    return (
      <ProfileLoadError
        message={profileError ?? "Could not load your profile."}
        onRetry={() => void refreshProfile()}
      />
    );
  }

  return children;
}
