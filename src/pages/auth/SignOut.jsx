import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "lib/supabase"; // adjust if your path differs

export default function SignOut() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await supabase.auth.signOut();
      navigate("/authentication/sign-in", { replace: true });
    })();
  }, [navigate]);
  return <div style={{ padding: 16 }}>Signing you out…</div>;
}
