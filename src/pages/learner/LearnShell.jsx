import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { getOutline } from "../../lib/courses";
import LessonView from "./LessonView";
import QuizView from "./QuizView";
import { CourseProgressProvider, useCourseProgress } from "../../context/CourseProgressContext";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import LinearProgress from "@mui/material/LinearProgress";
import Icon from "@mui/material/Icon";

export default function LearnShell() {
  const { courseId } = useParams();
  return (
    <CourseProgressProvider courseId={courseId}>
      <LearnInner />
    </CourseProgressProvider>
  );
}

function LearnInner() {
  const { courseId } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const { saveLastRoute } = useCourseProgress();

  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const o = await getOutline(courseId);
        if (mounted) setOutline(o);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  useEffect(() => {
    saveLastRoute(loc.pathname);
  }, [loc.pathname, saveLastRoute]);

  const indexByKey = useMemo(() => {
    const m = new Map();
    outline.forEach((it, i) => m.set(`${it.item_type}:${it.foreign_id}`, i));
    return m;
  }, [outline]);

  const navPrevNext = (delta) => {
    if (!outline.length) return;
    const [, , , , type, fid] = loc.pathname.split("/");
    const idx = indexByKey.get(`${type}:${fid}`) ?? 0;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= outline.length) return;
    const next = outline[nextIdx];
    nav(`/courses/${courseId}/learn/${next.item_type}/${next.foreign_id}`);
  };

  // decide which content to show
  const [, , , , type, fid] = loc.pathname.split("/");
  const content =
    type === "lesson" ? (
      <LessonView key={`lesson-${fid}`} />
    ) : type === "quiz" ? (
      <QuizView key={`quiz-${fid}`} />
    ) : (
      <MDTypography variant="button" color="text">
        Select a lesson from the outline.
      </MDTypography>
    );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3} px={2}>
        {loading ? (
          <MDTypography variant="button" color="text">
            Loading…
          </MDTypography>
        ) : (
          <Grid container spacing={3}>
            {/* Outline */}
            <Grid item xs={12} md={4} lg={3}>
              <Card sx={{ borderRadius: 3, position: "sticky", top: 24 }}>
                <CardContent>
                  <MDBox mb={1} display="flex" alignItems="center" gap={1}>
                    <Icon>menu_book</Icon>
                    <MDTypography variant="h6">Outline</MDTypography>
                  </MDBox>
                  <List dense>
                    {outline.map((it) => {
                      const sel = `${type}:${fid}` === `${it.item_type}:${it.foreign_id}`;
                      return (
                        <ListItemButton
                          key={it.id}
                          component={Link}
                          to={`/courses/${courseId}/learn/${it.item_type}/${it.foreign_id}`}
                          selected={sel}
                          sx={{ borderRadius: 2 }}
                        >
                          <ListItemText primary={it.title} secondary={it.module_title} />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Content */}
            <Grid item xs={12} md={8} lg={9}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <MDBox mb={1} display="flex" justifyContent="space-between" alignItems="center">
                    <MDButton
                      variant="text"
                      color="secondary"
                      component={Link}
                      to={`/courses/${courseId}`}
                      startIcon={<Icon>arrow_back</Icon>}
                    >
                      Overview
                    </MDButton>
                  </MDBox>

                  {content}

                  <MDBox mt={3} display="flex" justifyContent="space-between" gap={1}>
                    <MDButton
                      color="secondary"
                      onClick={() => navPrevNext(-1)}
                      startIcon={<Icon>chevron_left</Icon>}
                    >
                      Prev
                    </MDButton>
                    <MDButton
                      color="info"
                      onClick={() => navPrevNext(1)}
                      endIcon={<Icon>chevron_right</Icon>}
                    >
                      Next
                    </MDButton>
                  </MDBox>

                  {/* Optional: static progress bar placeholder (wire to completed later) */}
                  <MDBox mt={2}>
                    <LinearProgress
                      variant="determinate"
                      value={outline.length ? 100 / outline.length : 0}
                    />
                  </MDBox>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </MDBox>
    </DashboardLayout>
  );
}
