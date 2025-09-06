// src/components/ProtectedRoute.jsx
import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { supabase } from "../lib/supabase";

// OPTIONAL: if you already have an AuthContext with { user, profile, loading }, use it.
// import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  roles,
  redirectTo = "/authentication/sign-in",
}) {
  const location = useLocation();

  // If you have an AuthContext, uncomment this block and remove the local state/session fetch:
  // const { user, profile, loading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      // 1) Get session
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);

      // 2) Subscribe to auth changes
      const { data: sub } = supabase.auth.onAuthStateChange((_e, nextSession) => {
        setSession(nextSession);
      });

      // 3) If role is required, fetch it from profiles (id == user.id)
      if (data.session?.user && roles?.length) {
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .single();

        if (!mounted) return;
        if (!error) setRole(prof?.role || null);
      }

      setLoading(false);
      return () => sub?.subscription?.unsubscribe?.();
    }

    boot();
    return () => {
      mounted = false;
    };
  }, [roles?.length]);

  // While checking session/role
  if (loading) {
    return <div style={{ padding: 24, fontFamily: "monospace" }}>Checking access…</div>;
  }

  // Not logged in → go to sign-in, keep where they came from
  if (!session?.user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Role check (if roles prop provided)
  if (roles?.length) {
    // If role not fetched yet (rare), block until fetched
    if (role === null) {
      return <div style={{ padding: 24, fontFamily: "monospace" }}>Loading role…</div>;
    }
    const allowed = roles.includes(role);
    if (!allowed) {
      // Optionally send to a "no access" page
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // All good
  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  roles: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string,
};
