// src/pages/learner/QuizHub.jsx
import { useEffect, useState } from "react";
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
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

// ✅ CRA-friendly PDF.js imports
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return text;
}

export default function QuizHub() {
  const nav = useNavigate();

  const [tab, setTab] = useState("generate"); // "generate" | "my"
  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [plain, setPlain] = useState("");
  const [difficulty, setDifficulty] = useState("standard");
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [err, setErr] = useState("");

  async function loadQuizzes() {
    const { data, error } = await supabase
      .from("quizzes")
      .select("id,title,question_count,difficulty,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setErr(error.message);
      return;
    }
    setQuizzes(data || []);
  }

  useEffect(() => {
    if (tab === "my") loadQuizzes();
  }, [tab]);

  async function onGenerate() {
    setLoading(true);
    setErr("");
    try {
      let payload;
      if (pdfFile) {
        const text = await extractPdfText(pdfFile);
        payload = {
          source_type: "text", // your gen_quiz expects "url" | "text"
          text,
          title: pdfFile.name,
          difficulty,
          question_count: count,
        };
      } else if (url.trim()) {
        payload = { source_type: "url", url, difficulty, question_count: count };
      } else if (plain.trim()) {
        payload = { source_type: "text", text: plain, difficulty, question_count: count };
      } else {
        throw new Error("Provide a URL, PDF, or pasted text.");
      }

      // Invoke Edge Function (auto-adds JWT if signed in)
      const { data, error } = await supabase.functions.invoke("gen_quiz", { body: payload });
      if (error) {
        console.error("gen_quiz invoke error:", error);
        throw new Error(error.message || JSON.stringify(error));
      }
      if (!data || data.error) {
        console.error("gen_quiz function error:", data?.error);
        throw new Error(String(data?.error || "Unknown function error"));
      }
      if (!data.quiz_id) {
        throw new Error("gen_quiz returned no quiz_id");
      }

      // Navigate to quiz
      nav(`/courses/placeholder/learn/quiz/${data.quiz_id}`);
    } catch (e) {
      setErr(e.message || String(e));
      alert(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3} px={2}>
        <MDBox mb={2} display="flex" alignItems="center" gap={1}>
          <Icon>quiz</Icon>
          <MDTypography variant="h5">Quizzes</MDTypography>
        </MDBox>

        <MDBox mb={2} display="flex" gap={1}>
          <MDButton
            variant={tab === "generate" ? "contained" : "outlined"}
            onClick={() => setTab("generate")}
          >
            Generate
          </MDButton>
          <MDButton variant={tab === "my" ? "contained" : "outlined"} onClick={() => setTab("my")}>
            My Quizzes
          </MDButton>
        </MDBox>

        {err && (
          <MDTypography color="error" variant="button" mb={2} display="block">
            {err}
          </MDTypography>
        )}

        {tab === "generate" && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Web URL (optional)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Questions"
                value={count}
                onChange={(e) => setCount(Number(e.target.value || 8))}
                inputProps={{ min: 5, max: 20 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                SelectProps={{ native: true }}
                label="Difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="advanced">Advanced</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Or paste text"
                value={plain}
                onChange={(e) => setPlain(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <MDButton
                color="info"
                onClick={onGenerate}
                disabled={loading}
                startIcon={<Icon>auto_awesome</Icon>}
              >
                {loading ? "Generating…" : "Generate Quiz"}
              </MDButton>
            </Grid>
          </Grid>
        )}

        {tab === "my" && (
          <Grid container spacing={2}>
            {quizzes.map((q) => (
              <Grid key={q.id} item xs={12} md={6} lg={4}>
                <Card
                  onClick={() => nav(`/courses/placeholder/learn/quiz/${q.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <CardContent>
                    <MDTypography variant="h6">{q.title}</MDTypography>
                    <MDTypography variant="button" color="text">
                      Questions: {q.question_count ?? "—"} · {q.difficulty || "standard"}
                    </MDTypography>
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
