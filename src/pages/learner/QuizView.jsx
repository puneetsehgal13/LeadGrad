// src/pages/learner/QuizView.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

export default function QuizView() {
  const { id: quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [qs, setQs] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const { data: quiz, error: qErr } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .single();
        if (qErr) throw qErr;

        const { data: qs, error: qsErr } = await supabase
          .from("quiz_questions")
          .select("*")
          .eq("quiz_id", quizId)
          .order("order_index");

        if (qsErr) throw qsErr;

        setQuiz(quiz);
        setQs(qs || []);
      } catch (e) {
        console.error(e);
        setErr(e.message || String(e));
      }
    })();
  }, [quizId]);

  const onChange = (qid, val) => setAnswers((a) => ({ ...a, [qid]: val }));

  async function onSubmit() {
    try {
      setErr("");

      // score locally
      let score = 0;
      for (const q of qs) {
        if ((answers[q.id] || "") === q.answer) score++;
      }
      const max = qs.length;

      // require auth (RLS insert needs user_id = auth.uid())
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        setErr("You must be signed in to submit a quiz.");
        return;
      }

      // write attempt with answers JSON
      const payload = {
        quiz_id: quizId,
        user_id: uid,
        answers, // JSON object: { [question_id]: "A"/"B"/... }
        score,
        completed_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("quiz_attempts").insert(payload);
      if (error) {
        console.error("quiz_attempts insert error:", error);
        setErr(`Save failed: ${error.message}`);
        // still show the score to the user
      }

      setResult({ score, max });
      setSubmitted(true);
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  if (!quiz) return null;

  return (
    <MDBox p={2}>
      <MDTypography variant="h5" mb={1}>
        {quiz.title}
      </MDTypography>

      {err && (
        <MDTypography color="error" variant="button" mb={2} display="block">
          {err}
        </MDTypography>
      )}

      {!submitted ? (
        <>
          {qs.map((q, idx) => (
            <Card key={q.id} style={{ marginBottom: 12 }}>
              <CardContent>
                <MDTypography variant="button">
                  {idx + 1}. {q.question}
                </MDTypography>
                <RadioGroup
                  value={answers[q.id] || ""}
                  onChange={(e) => onChange(q.id, e.target.value)}
                >
                  {Array.isArray(q.choices) &&
                    q.choices.map((c, i) => {
                      const letter = String.fromCharCode(65 + i); // A/B/C/D
                      return (
                        <FormControlLabel
                          key={i}
                          value={letter}
                          control={<Radio />}
                          label={`${letter}. ${c}`}
                        />
                      );
                    })}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
          <MDButton color="info" onClick={onSubmit}>
            Submit
          </MDButton>
        </>
      ) : (
        <Card>
          <CardContent>
            <MDTypography variant="h6">
              Your Score: {result.score} / {result.max}
            </MDTypography>
          </CardContent>
        </Card>
      )}
    </MDBox>
  );
}
