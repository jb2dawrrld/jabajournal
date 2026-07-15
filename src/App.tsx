import { Navigate, Route, Routes } from "react-router-dom";
import { AppLoadingScreen } from "./components/AppLoadingScreen";
import { ProfileLoadError } from "./components/ProfileLoadError";
import { RequireCompletedOnboarding } from "./components/RequireCompletedOnboarding";
import { useAuth } from "./contexts/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ForgotPasswordSentPage } from "./pages/ForgotPasswordSentPage";
import { JournalPage } from "./pages/JournalPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

function HomeRedirect() {
  const { session, profile, loading, profileError, refreshProfile } = useAuth();

  if (loading) {
    return <AppLoadingScreen fullViewport />;
  }

  if (!session) {
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

  if (!profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/calendar" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/forgot-password/sent" element={<ForgotPasswordSentPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/calendar"
        element={
          <RequireCompletedOnboarding>
            <CalendarPage />
          </RequireCompletedOnboarding>
        }
      />
      <Route
        path="/journal/:date"
        element={
          <RequireCompletedOnboarding>
            <JournalPage />
          </RequireCompletedOnboarding>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
