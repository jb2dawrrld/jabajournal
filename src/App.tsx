import { Navigate, Route, Routes } from "react-router-dom";
import { AppLoadingScreen } from "./components/AppLoadingScreen";
import { useAuth } from "./contexts/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { CalendarPage } from "./pages/CalendarPage";
import { JournalPage } from "./pages/JournalPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

function HomeRedirect() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen fullViewport />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/calendar" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/journal/:date" element={<JournalPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
