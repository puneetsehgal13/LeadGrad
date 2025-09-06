// routes.js
import Dashboard from "layouts/dashboard";
import Profile from "layouts/profile";
import SignIn from "layouts/authentication/sign-in";
import SignOut from "layouts/authentication/sign-out";
import Icon from "@mui/material/Icon";
import ProtectedRoute from "./components/ProtectedRoute";

// Learner
import MyCourses from "pages/learner/MyCourses";
import Assignments from "pages/learner/Assignments";
import Certificates from "pages/learner/Certificates";
import CourseOverview from "pages/learner/CourseOverview";
import LearnShell from "pages/learner/LearnShell";

// Instructor
import InstructorCourses from "pages/instructor/CourseManagement";
import QuizBuilder from "pages/instructor/QuizBuilder";
import Gradebook from "pages/instructor/Gradebook";

// Manager
import TeamDashboard from "pages/manager/TeamDashboard";
import Reports from "pages/manager/Reports";
import AssignCourses from "pages/manager/AssignCourses";

// Admin
import UsersAdmin from "pages/admin/Users";
import RolesAdmin from "pages/admin/Roles";
import PlatformSettings from "pages/admin/PlatformSettings";

const routes = [
  // ---------- Public ----------
  {
    type: "collapse",
    name: "Sign In",
    key: "sign-in",
    icon: <Icon fontSize="small">login</Icon>,
    route: "/authentication/sign-in",
    component: <SignIn />,
  },

  // ---------- Core ----------
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Profile",
    key: "profile",
    icon: <Icon fontSize="small">person</Icon>,
    route: "/profile",
    component: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },

  // ---------- Learner ----------
  { type: "title", title: "Learner", key: "learner-title" },
  {
    type: "collapse",
    name: "My Courses",
    key: "learner-my-courses",
    icon: <Icon fontSize="small">school</Icon>,
    route: "/learner/courses",
    component: (
      <ProtectedRoute>
        <MyCourses />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Assignments",
    key: "learner-assignments",
    icon: <Icon fontSize="small">assignment</Icon>,
    route: "/learner/assignments",
    component: (
      <ProtectedRoute>
        <Assignments />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Certificates",
    key: "learner-certificates",
    icon: <Icon fontSize="small">emoji_events</Icon>,
    route: "/learner/certificates",
    component: (
      <ProtectedRoute>
        <Certificates />
      </ProtectedRoute>
    ),
  },

  // ---------- Instructor ----------
  { type: "title", title: "Instructor", key: "instructor-title" },
  {
    type: "collapse",
    name: "Course Management",
    key: "instr-courses",
    icon: <Icon fontSize="small">menu_book</Icon>,
    route: "/instructor/courses",
    component: (
      <ProtectedRoute roles={["instructor", "admin"]}>
        <InstructorCourses />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Quiz Builder",
    key: "instr-quiz-builder",
    icon: <Icon fontSize="small">fact_check</Icon>,
    route: "/instructor/quizzes",
    component: (
      <ProtectedRoute roles={["instructor", "admin"]}>
        <QuizBuilder />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Gradebook",
    key: "instr-gradebook",
    icon: <Icon fontSize="small">checklist</Icon>,
    route: "/instructor/gradebook",
    component: (
      <ProtectedRoute roles={["instructor", "admin"]}>
        <Gradebook />
      </ProtectedRoute>
    ),
  },

  // ---------- Manager ----------
  { type: "title", title: "Manager", key: "manager-title" },
  {
    type: "collapse",
    name: "Team Dashboard",
    key: "mgr-team",
    icon: <Icon fontSize="small">groups</Icon>,
    route: "/manager/team",
    component: (
      <ProtectedRoute roles={["manager", "admin"]}>
        <TeamDashboard />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Reports",
    key: "mgr-reports",
    icon: <Icon fontSize="small">bar_chart</Icon>,
    route: "/manager/reports",
    component: (
      <ProtectedRoute roles={["manager", "admin"]}>
        <Reports />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Assign Courses",
    key: "mgr-assign",
    icon: <Icon fontSize="small">add_circle</Icon>,
    route: "/manager/assign",
    component: (
      <ProtectedRoute roles={["manager", "admin"]}>
        <AssignCourses />
      </ProtectedRoute>
    ),
  },

  // ---------- Admin ----------
  { type: "title", title: "Admin", key: "admin-title" },
  {
    type: "collapse",
    name: "User Management",
    key: "admin-users",
    icon: <Icon fontSize="small">people</Icon>,
    route: "/admin/users",
    component: (
      <ProtectedRoute roles={["admin"]}>
        <UsersAdmin />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Role Settings",
    key: "admin-roles",
    icon: <Icon fontSize="small">security</Icon>,
    route: "/admin/roles",
    component: (
      <ProtectedRoute roles={["admin"]}>
        <RolesAdmin />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Platform Settings",
    key: "admin-settings",
    icon: <Icon fontSize="small">settings</Icon>,
    route: "/admin/settings",
    component: (
      <ProtectedRoute roles={["admin"]}>
        <PlatformSettings />
      </ProtectedRoute>
    ),
  },

  // ---------- Divider ----------
  { type: "divider", key: "bottom-divider" },

  // ---------- Auth ----------
  {
    type: "collapse",
    name: "Sign Out",
    key: "sign-out",
    icon: <Icon fontSize="small">logout</Icon>,
    route: "/authentication/sign-out",
    component: <SignOut />,
  },

  // ---------- Hidden/utility routes (not in sidebar) ----------
  // Optional alias to support old links or a simpler path
  {
    type: "route",
    name: "My Courses (alias)",
    key: "my-courses-alias",
    route: "/my-courses",
    component: (
      <ProtectedRoute>
        <MyCourses />
      </ProtectedRoute>
    ),
  },
  {
    type: "route",
    name: "Course Overview",
    key: "course-overview",
    route: "/courses/:courseId",
    component: (
      <ProtectedRoute>
        <CourseOverview />
      </ProtectedRoute>
    ),
  },
  {
    type: "route",
    name: "Course Learn",
    key: "course-learn",
    route: "/courses/:courseId/learn/:type/:id",
    component: (
      <ProtectedRoute>
        <LearnShell />
      </ProtectedRoute>
    ),
  },
  {
    type: "route",
    name: "Course Learn Root",
    key: "course-learn-root",
    route: "/courses/:courseId/learn",
    component: (
      <ProtectedRoute>
        <LearnShell />
      </ProtectedRoute>
    ),
  },
];

export default routes;
