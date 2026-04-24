/**
 * Base URL of the web UI (Vite dev: http://localhost:1420). Used for Supabase
 * email confirmation redirects. Must match Dashboard → Authentication → URL Configuration.
 */
export function getAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_APP_ORIGIN;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:1420";
}

/** Confirmation link opens the app here; tokens in the URL hash are applied by the Supabase client. */
export function getEmailConfirmationRedirectUrl(): string {
  return `${getAppOrigin()}/auth`;
}

/** Password recovery links open here so users can set a new password. */
export function getPasswordResetRedirectUrl(): string {
  return `${getAppOrigin()}/reset-password`;
}
