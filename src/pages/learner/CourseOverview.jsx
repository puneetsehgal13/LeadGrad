import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getCourse, getOutline } from "../../lib/courses";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Icon from "@mui/material/Icon";

export default function CourseOverview() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState(null);
  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [c, o] = await Promise.all([getCourse(courseId), getOutline(courseId)]);
        if (!mounted) return;
        setCourse(c);
        setOutline(o);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3} px={2}>
        {loading && (
          <MDTypography variant="button" color="text">
            Loading…
          </MDTypography>
        )}
        {!loading && !course && <MDTypography color="error">Course not found.</MDTypography>}

        {course && (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12} md={5} lg={4}>
                <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
                  <CardMedia
                    component="img"
                    height="220"
                    image={course.thumbnail_url || "/course-thumb.png"}
                    alt={course.title}
                  />
                </Card>
              </Grid>

              <Grid item xs={12} md={7} lg={8}>
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <MDTypography variant="h4">{course.title}</MDTypography>
                    <MDBox mt={1} mb={2}>
                      <MDTypography variant="button" color="text">
                        {course.short_desc}
                      </MDTypography>
                    </MDBox>

                    <MDBox display="flex" gap={1} flexWrap="wrap" mb={2}>
                      {course.level && <Chip label={`Level: ${course.level}`} size="small" />}
                      {course.duration_mins && (
                        <Chip label={`${course.duration_mins} mins`} size="small" />
                      )}
                      {course.language && <Chip label={course.language} size="small" />}
                    </MDBox>

                    <MDBox mb={2}>
                      <MDTypography variant="subtitle2" color="text">
                        What you’ll learn
                      </MDTypography>
                      <MDBox
                        mt={0.5}
                        sx={{ "& p": { m: 0, color: "text.secondary", fontSize: "0.9rem" } }}
                        dangerouslySetInnerHTML={{ __html: course.long_desc || "<p>—</p>" }}
                      />
                    </MDBox>

                    <MDButton
                      color="info"
                      onClick={() => {
                        if (outline.length) {
                          const first = outline[0];
                          nav(`/courses/${courseId}/learn/${first.item_type}/${first.foreign_id}`);
                        }
                      }}
                      startIcon={<Icon>play_arrow</Icon>}
                    >
                      Start / Continue
                    </MDButton>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <MDBox mt={3}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <MDBox mb={1} display="flex" alignItems="center" gap={1}>
                    <Icon>view_list</Icon>
                    <MDTypography variant="h6">Course outline</MDTypography>
                  </MDBox>
                  <List dense>
                    {outline.map((it) => (
                      <ListItem
                        key={it.id}
                        component={Link}
                        to={`/courses/${courseId}/learn/${it.item_type}/${it.foreign_id}`}
                        sx={{
                          borderRadius: 2,
                          "&:hover": { backgroundColor: "action.hover" },
                        }}
                      >
                        <ListItemText primary={it.title} secondary={it.module_title} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </MDBox>
          </>
        )}
      </MDBox>
    </DashboardLayout>
  );
}
