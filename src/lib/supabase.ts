import { createClient } from "@supabase/supabase-js";
import { capturePasswordRecoveryIntentFromUrl } from "./passwordRecovery";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// Snapshot recovery intent before the client consumes/clears the URL hash.
if (typeof window !== "undefined") {
  capturePasswordRecoveryIntentFromUrl();
}

export const supabase = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Required when "Confirm email" is on: confirmation links land with tokens in the URL hash.
        detectSessionInUrl: true,
      },
    })
  : null;
