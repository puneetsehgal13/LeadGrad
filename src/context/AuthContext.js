// src/context/AuthContext.js
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthCtx = createContext({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user || null;
      if (!mounted) return;
      setUser(u);

      // optional: load role/profile if you have a profiles table
      if (u) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, role, full_name, avatar_url")
          .eq("id", u.id)
          .maybeSingle();
        if (!mounted) return;
        setProfile(prof || null);
      }

      setLoading(false);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (!u) setProfile(null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [user, profile, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
