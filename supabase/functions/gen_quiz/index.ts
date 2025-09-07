// supabase/functions/gen_quiz/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/* ---------------- Types ---------------- */
type Payload =
  | { source_type: "url"; url: string; title?: string; difficulty?: string; question_count?: number }
  | { source_type: "text"; text: string; title?: string; difficulty?: string; question_count?: number };

type QuizJSON = {
  title: string;
  difficulty: string;
  questions: Array<{
    question: string;
    choices: string[];              // 4 options
    answer: "A" | "B" | "C" | "D";  // correct letter
    rationale?: string;
  }>;
};

/* ---------------- CORS helpers ---------------- */
const cors = {
  "Access-Control-Allow-Origin": "*", // tighten to your domain in prod
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

/* ---------------- tiny logger ---------------- */
const log = (...a: unknown[]) => console.log("[gen_quiz]", ...a);
const logErr = (...a: unknown[]) => console.error("[gen_quiz][ERROR]", ...a);

/* ---------------- helpers ---------------- */
async function fetchTextFromUrl(url: string): Promise<string> {
  try {
    const r = await fetch(url, { redirect: "follow" });
    const body = await r.text();
    if (!r.ok) throw new Error(`fetch ${r.status} ${r.statusText}`);
    const text = body
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20000); // keep small
    return text;
  } catch (e) {
    throw new Error(`Failed to fetch URL: ${String(e?.message || e)}`);
  }
}

async function callLLM(
  text: string,
  titleHint: string,
  difficulty: string | undefined,
  count: number | undefined
): Promise<QuizJSON> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const n = Math.min(15, Math.max(5, Number(count || 8)));

  // No key: demo fallback so you can finish the flow
  if (!apiKey) {
    log("OPENAI_API_KEY missing → returning demo quiz");
    return {
      title: titleHint || "Generated Quiz (Demo)",
      difficulty: difficulty || "standard",
      questions: [
        { question: "Demo Q1: …?", choices: ["A …", "B …", "C …", "D …"], answer: "A", rationale: "…" },
        { question: "Demo Q2: …?", choices: ["A …", "B …", "C …", "D …"], answer: "B", rationale: "…" },
      ],
    };
  }

  const system = `You are an assessment designer. Produce ${n} multiple-choice questions from the provided source text.

Rules:
- STRICT JSON: {title,difficulty,questions:[{question,choices[4],answer("A".."D"),rationale}]}
- Test understanding, avoid ambiguity.
- 4 plausible choices; exactly one correct answer.
- Concise, enterprise-friendly language.`;

  const user = `Title hint: ${titleHint || "n/a"}
Difficulty: ${difficulty || "standard"}
Source (clipped):
"""${text}"""`;

  // Try multiple models to avoid 404/403 access issues
  const models = ["gpt-5", "gpt-5-mini", "gpt-4o-mini"];
  let lastErr = "";

  for (const model of models) {
    log("OpenAI call", { model, chars: text.length });
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (r.ok) {
      const data = await r.json();
      const content = data?.choices?.[0]?.message?.content || "{}";
      try {
        return JSON.parse(content) as QuizJSON;
      } catch (e) {
        lastErr = `Invalid JSON from ${model}: ${String(e)}`;
        logErr(lastErr);
        continue;
      }
    } else {
      const t = await r.text().catch(() => "");
      lastErr = `${model} ${r.status}: ${t}`;
      logErr("OpenAI HTTP error", lastErr);
    }
  }
  throw new Error(`OpenAI error: ${lastErr}`);
}

/* ---------------- main ---------------- */
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // Platform/env
    const supaUrl = Deno.env.get("SUPABASE_URL");          // platform-injected
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY");  // you set via secrets
    if (!supaUrl) return json({ error: "SUPABASE_URL missing (platform env)" }, 500);
    if (!serviceRole) return json({ error: "SERVICE_ROLE_KEY missing (set via `supabase secrets set SERVICE_ROLE_KEY=...`)" }, 500);

    // Auth (requires function.json -> { "verify_jwt": true })
    const auth = req.headers.get("authorization") || "";
    const jwt = auth.replace("Bearer ", "");
    let userId: string | null = null;
    try { userId = JSON.parse(atob(jwt.split(".")[1] || "")).sub || null; } catch {}
    if (!userId) return json({ error: "Not authenticated" }, 401);

    // Parse body
    const body = (await req.json()) as Payload;
    log("Payload", { src: (body as any).source_type });

    let text = "";
    let titleHint = body.title || "";
    const diff = (body as any).difficulty;
    const cnt = (body as any).question_count;

    if (body.source_type === "url") {
      text = await fetchTextFromUrl(body.url);
      titleHint ||= body.url;
    } else if (body.source_type === "text") {
      text = (body.text || "").slice(0, 20000);
    } else {
      return json({ error: "Invalid source_type (use 'url' or 'text')" }, 400);
    }
    if (!text) return json({ error: "No text extracted from source" }, 400);

    // Generate quiz JSON
    const quiz = await callLLM(text, titleHint, diff, cnt);

    // Normalize defensively
    quiz.questions = (quiz.questions || []).map((q) => {
      const choices = Array.isArray(q.choices) ? q.choices.slice(0, 4) : [];
      while (choices.length < 4) choices.push("—");
      const answer = ["A", "B", "C", "D"].includes(q.answer as string) ? q.answer : "A";
      return { ...q, choices, answer: answer as "A" | "B" | "C" | "D" };
    });

    // Service-role headers (bypass RLS for inserts)
    const headers = {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    // (Optional) quick connectivity check (helps produce clearer errors)
    const ping = await fetch(`${supaUrl}/rest/v1/quizzes?select=id&limit=1`, { headers });
    if (!ping.ok) {
      const t = await ping.text().catch(() => "");
      logErr("PostgREST connectivity check failed", { status: ping.status, t });
      return json({ error: `postgrest connectivity ${ping.status}: ${t}` }, 500);
    }

    // Insert quiz
    const insQuiz = await fetch(`${supaUrl}/rest/v1/quizzes`, {
      method: "POST",
      headers,
      body: JSON.stringify([{
        created_by: userId,
        title: quiz.title,
        source_type: (body as any).source_type,
        source_url: (body as any).url || null,
        difficulty: quiz.difficulty || diff || "standard",
        question_count: quiz.questions.length,
      }]),
    });
    if (!insQuiz.ok) {
      const t = await insQuiz.text().catch(() => "");
      logErr("insert quiz failed", { status: insQuiz.status, t });
      return json({ error: `insert quiz ${insQuiz.status}: ${t}` }, 500);
    }
    const [row] = await insQuiz.json();
    const quizId = row?.id;
    if (!quizId) return json({ error: "Quiz insert returned no id" }, 500);

    // Insert questions
    const rows = quiz.questions.map((qq, i) => ({
      quiz_id: quizId,
      order_index: i + 1,
      question: qq.question,
      choices: qq.choices,
      answer: qq.answer,
      rationale: qq.rationale || null,
    }));
    const insQs = await fetch(`${supaUrl}/rest/v1/quiz_questions`, { method: "POST", headers, body: JSON.stringify(rows) });
    if (!insQs.ok) {
      const t = await insQs.text().catch(() => "");
      logErr("insert questions failed", { status: insQs.status, t });
      return json({ error: `insert questions ${insQs.status}: ${t}` }, 500);
    }

    log("Quiz created", { quizId, count: rows.length });
    return json({ quiz_id: quizId }, 200);
  } catch (e) {
    logErr("Unhandled exception", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
