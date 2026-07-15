/** sessionStorage key set when a password-recovery landing is detected. */
export const PASSWORD_RECOVERY_FLAG_KEY = "jabajournal_password_recovery";

export function markPasswordRecoveryIntent(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PASSWORD_RECOVERY_FLAG_KEY, "1");
}

export function clearPasswordRecoveryIntent(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG_KEY);
}

export function hasPasswordRecoveryIntent(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(PASSWORD_RECOVERY_FLAG_KEY) === "1";
}

/** True if the current URL hash or search indicates a recovery callback. */
export function urlHasRecoveryType(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hash.includes("type=recovery") ||
    window.location.search.includes("type=recovery")
  );
}

/**
 * Snapshot recovery intent from the URL and return whether recovery is active
 * (URL or previously stored flag).
 */
export function capturePasswordRecoveryIntentFromUrl(): boolean {
  if (urlHasRecoveryType()) {
    markPasswordRecoveryIntent();
    return true;
  }
  return hasPasswordRecoveryIntent();
}
