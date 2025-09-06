import { Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 24, fontFamily: "monospace" }}>Checking session…</div>;
  }

  if (!user) {
    return <Navigate to="/authentication/sign-in" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0) {
    const role = profile?.role ?? null;
    if (!role || !roles.includes(role)) {
      // Avoid loops → send to a public page or a not-authorized page
      return <Navigate to="/authentication/sign-in" replace />;
      // Or: return <div style={{padding:24}}>Not authorized</div>;
    }
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  roles: PropTypes.arrayOf(PropTypes.string),
};
