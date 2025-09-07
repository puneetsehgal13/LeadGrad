// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY; // new client key (NOT Secret)

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // optional: avoids conflicts if you ever spin up a second client in the same page
    storageKey: "leadgrad-auth",
  },
});

// optional: expose in dev for console debugging (don’t create a *second* client)
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.supabase = supabase;
}
