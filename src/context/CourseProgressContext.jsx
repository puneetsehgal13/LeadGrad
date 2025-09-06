import { createContext, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "./AuthContext";
import { getCompletedMap, getLastRoute, setLastRoute } from "../lib/courses";

const Ctx = createContext(null);

export function CourseProgressProvider({ courseId, children }) {
  const { user } = useAuth();
  const [completed, setCompleted] = useState(new Set());
  const [lastRoute, setLastRouteState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!user) return;
        const [map, last] = await Promise.all([
          getCompletedMap(user.id, courseId),
          getLastRoute(user.id, courseId),
        ]);
        if (!mounted) return;
        setCompleted(map);
        setLastRouteState(last);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user, courseId]);

  const value = useMemo(
    () => ({
      loading,
      completed,
      toggleComplete: (itemId, done = true) => {
        setCompleted((prev) => {
          const next = new Set(prev);
          if (done) next.add(itemId);
          else next.delete(itemId);
          return next;
        });
      },
      lastRoute,
      saveLastRoute: async (route) => {
        setLastRouteState(route);
        if (user) await setLastRoute(user.id, courseId, route);
      },
    }),
    [loading, completed, lastRoute, user, courseId]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
CourseProgressProvider.propTypes = {
  courseId: PropTypes.string.isRequired,
  children: PropTypes.node,
};
export const useCourseProgress = () => useContext(Ctx);
