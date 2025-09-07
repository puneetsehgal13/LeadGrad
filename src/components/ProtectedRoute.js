import { Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext";

// Set REACT_APP_BYPASS_ROLE_GUARD=true in .env to ignore role checks
const BYPASS_ROLES = String(process.env.REACT_APP_BYPASS_ROLE_GUARD || "").toLowerCase() === "true";

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();
  const loc = useLocation();

  // Wait for auth/profile to avoid flicker
  if (loading) return null;

  // Must be signed in
  if (!user) {
    return <Navigate to="/authentication/sign-in" replace state={{ from: loc }} />;
  }

  // If bypass flag on, skip role checks entirely
  if (BYPASS_ROLES) return children;

  // If roles were requested, enforce them (only when not bypassing)
  if (roles?.length) {
    if (!profile) return null; // still loading profile
    if (!roles.includes(profile.role)) {
      // Not authorized → send to dashboard (or render a message if you prefer)
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  roles: PropTypes.arrayOf(PropTypes.string),
};
