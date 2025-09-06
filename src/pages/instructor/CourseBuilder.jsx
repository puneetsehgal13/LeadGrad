import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Icon from "@mui/material/Icon";

export default function CourseBuilder() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    company_or_industry: "",
    target_audience: "",
    audience_maturity: "entry-level",
    key_challenges: "",
    objectives: "",
    topics: "",
    business_focus: "",
    resources: "", // one URL per line (links to docs/pdfs allowed)
    depth: "standard", // NEW: basic | standard | advanced
    course_hours: 3, // NEW: target total hours
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNumber = (k) => (e) => setForm((f) => ({ ...f, [k]: Number(e.target.value || 0) }));

  async function onGenerate() {
    setLoading(true);
    setErr("");
    try {
      const resources = (form.resources || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((value) => ({ type: "url", value }));

      const payload = { ...form, resources };

      // Must be signed-in; the SDK will attach your JWT automatically
      const { data, error } = await supabase.functions.invoke("build_course", { body: payload });
      if (error) throw error;

      const { course_id } = data || {};
      if (!course_id) throw new Error("No course_id returned by function");

      // Go to the new course
      nav(`/courses/${course_id}`);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3} px={2}>
        <MDBox mb={2} display="flex" alignItems="center" gap={1}>
          <Icon>auto_awesome</Icon>
          <MDTypography variant="h5">Course Builder</MDTypography>
        </MDBox>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Company / Industry"
              value={form.company_or_industry}
              onChange={set("company_or_industry")}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Target Audience"
              value={form.target_audience}
              onChange={set("target_audience")}
              placeholder="e.g., New managers, Field sales"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Audience experience / maturity"
              value={form.audience_maturity}
              onChange={set("audience_maturity")}
              placeholder="entry-level / intermediate / advanced"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Business line / product focus"
              value={form.business_focus}
              onChange={set("business_focus")}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Key challenges"
              value={form.key_challenges}
              onChange={set("key_challenges")}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Objectives of program"
              value={form.objectives}
              onChange={set("objectives")}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Topics to cover"
              value={form.topics}
              onChange={set("topics")}
              placeholder="topic A, topic B, …"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Supporting links (one per line)"
              value={form.resources}
              onChange={set("resources")}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              SelectProps={{ native: true }}
              fullWidth
              label="Depth"
              value={form.depth}
              onChange={set("depth")}
            >
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="advanced">Advanced</option>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              type="number"
              fullWidth
              label="Target total hours"
              value={form.course_hours}
              onChange={setNumber("course_hours")}
              inputProps={{ min: 1, max: 40, step: 1 }}
            />
          </Grid>
        </Grid>

        <MDBox mt={2} display="flex" gap={1} alignItems="center">
          <MDButton
            onClick={onGenerate}
            color="info"
            disabled={loading}
            startIcon={<Icon>sparkles</Icon>}
          >
            {loading ? "Generating…" : "Generate Draft"}
          </MDButton>
          {err && (
            <MDTypography color="error" variant="button">
              {err}
            </MDTypography>
          )}
        </MDBox>
      </MDBox>
    </DashboardLayout>
  );
}
