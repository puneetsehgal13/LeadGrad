import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Icon from "@mui/material/Icon";

export default function MyCourses() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s?.session?.user?.id;
        if (!uid) throw new Error("Not signed in");

        const { data: enr, error: e1 } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", uid)
          .order("enrolled_at", { ascending: false });
        if (e1) throw e1;

        let courses = [];
        const ids = (enr || []).map((r) => r.course_id);
        if (ids.length) {
          const { data: crs, error: e2 } = await supabase
            .from("courses")
            .select("id,title,short_desc,thumbnail_url")
            .in("id", ids);
          if (e2) throw e2;
          const rank = new Map(ids.map((id, i) => [id, i]));
          courses = (crs || []).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
        } else {
          const { data: pub, error: e3 } = await supabase
            .from("courses")
            .select("id,title,short_desc,thumbnail_url")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(12);
          if (e3) throw e3;
          courses = pub || [];
        }
        if (mounted) setList(courses);
      } catch (e) {
        if (mounted) setErr(e.message || "Failed to load courses");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3} px={2}>
        <MDBox mb={2} display="flex" alignItems="center" gap={1}>
          <Icon>school</Icon>
          <MDTypography variant="h5">My Courses</MDTypography>
        </MDBox>

        {loading && (
          <MDTypography variant="button" color="text">
            Loading your courses…
          </MDTypography>
        )}
        {err && <MDTypography color="error">Error: {err}</MDTypography>}

        {!loading && !err && (
          <Grid container spacing={3}>
            {list.map((c) => (
              <Grid item xs={12} sm={6} md={4} xl={3} key={c.id}>
                <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
                  <CardMedia
                    component="img"
                    height="160"
                    image={c.thumbnail_url || "/course-thumb.png"}
                    alt={c.title}
                  />
                  <CardContent>
                    <MDTypography variant="h6" gutterBottom>
                      {c.title}
                    </MDTypography>
                    <MDTypography variant="button" color="text">
                      {c.short_desc || "—"}
                    </MDTypography>

                    <MDBox mt={2} display="flex" gap={1}>
                      <MDButton
                        size="small"
                        color="secondary"
                        component={Link}
                        to={`/courses/${c.id}`}
                      >
                        Overview
                      </MDButton>
                      <MDButton
                        size="small"
                        color="info"
                        component={Link}
                        to={`/courses/${c.id}/learn`}
                      >
                        Continue
                      </MDButton>
                    </MDBox>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </MDBox>
    </DashboardLayout>
  );
}
