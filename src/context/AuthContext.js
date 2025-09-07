import { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const authedUser = session?.user ?? null;
      setUser(authedUser);

      if (authedUser) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authedUser.id)
          .single();
        if (mounted) setProfile(data ?? null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const authedUser = session?.user ?? null;
      setUser(authedUser);

      if (!authedUser) {
        setProfile(null);
        return;
      }

      supabase
        .from("profiles")
        .select("*")
        .eq("id", authedUser.id)
        .single()
        .then(({ data }) => setProfile(data ?? null));
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data ?? null);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
