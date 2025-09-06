// supabase/functions/build_course/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type BuilderInput = {
  company_or_industry: string;
  target_audience: string;
  audience_maturity: string;
  key_challenges: string;
  objectives: string;
  topics: string;
  business_focus: string;
  resources?: { type: "url" | "text"; value: string }[];
};

type Outline = {
  title: string;
  short_desc: string;
  long_desc: string; // HTML
  lessons: Array<{ title: string; html: string; module_title: string; order_index: number }>;
};

type Depth = "basic" | "standard" | "advanced";

const DEPTH_CONFIG: Record<Depth, { modules: [number, number]; lessons: [number, number]; minutesPerLesson: [number, number]; }> = {
  basic:    { modules: [1, 2], lessons: [4, 6], minutesPerLesson: [8, 12] },
  standard: { modules: [2, 3], lessons: [6, 8], minutesPerLesson: [12, 18] },
  advanced: { modules: [3, 4], lessons: [8, 12], minutesPerLesson: [18, 30] },
};

// Catalog the model can choose from (it doesn’t have to use all)
const FRAMEWORKS = {
  pedagogy: [
    "ADDIE", "Bloom's Taxonomy", "Kirkpatrick Levels", "Gagné’s 9 Events", "70-20-10"
  ],
  management: [
    "GROW Coaching", "Situational Leadership", "OKRs", "SMART Goals"
  ],
  strategy: [
    "SWOT", "PESTLE", "Porter’s Five Forces", "Blue Ocean Strategy"
  ],
  product_design: [
    "Jobs-to-be-Done", "Design Thinking", "Lean UX"
  ],
  sales: [
    "SPIN Selling", "Challenger Sale", "MEDDICC", "BANT"
  ],
  ops_quality: [
    "Lean", "Six Sigma DMAIC", "Kaizen", "Kanban", "Agile Scrum"
  ],
  change_data: [
    "ADKAR", "CRISP-DM", "PDCA"
  ],
  marketing: [
    "STP", "4Ps/7Ps", "AIDA"
  ]
} as const;

// --- CORS ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tighten to your domain in prod
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respondJSON(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- Outline generation (OpenAI optional) ---
async function callLLM(input: BuilderInput & { depth?: Depth; course_hours?: number }): Promise<Outline> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  // knobs
  const depth: Depth = (["basic","standard","advanced"] as const).includes((input.depth as Depth)) ? (input.depth as Depth) : "standard";
  const cfg = DEPTH_CONFIG[depth];
  const totalHours = Math.max(1, Math.min(40, Number(input.course_hours || 3)));

  // Instructional contract for richer output
  const system = `
You are a senior instructional designer. Create a rigorous, workplace-ready training.
Requirements:
- Return STRICT JSON only.
- Make an outline sized for ${depth.toUpperCase()} depth (${cfg.modules[0]}–${cfg.modules[1]} modules, ${cfg.lessons[0]}–${cfg.lessons[1]} lessons total), sized for ~${totalHours} total hours.
- Use 2–3 relevant frameworks from this catalog where appropriate:
  ${Object.entries(FRAMEWORKS).map(([k,v])=>`* ${k}: ${v.join(", ")}`).join("\n  ")}
- For each lesson, write short but substantive HTML that includes sections with <h4>:
  <h4>Overview</h4> 2–3 concise paragraphs.
  <h4>Learning Objectives</h4> bullet list using Bloom verbs.
  <h4>Frameworks Used</h4> name the frameworks applied and how.
  <h4>Case / Activity</h4> a short scenario or activity learners do (action learning bias).
  <h4>Check for Understanding</h4> 2–3 questions learners answer (no answers).
- Align lessons to the stated business focus and challenges. Avoid hallucinated company facts.
`;

  const user = `Company/Industry: ${input.company_or_industry}
Audience: ${input.target_audience} (${input.audience_maturity})
Business focus: ${input.business_focus}
Objectives: ${input.objectives}
Key challenges: ${input.key_challenges}
Topics: ${input.topics}
Resources: ${(input.resources || []).map(r => `${r.type}:${r.value}`).join("; ")}

Schema:
{
 "title": string,
 "short_desc": string,
 "long_desc": string,  // HTML
 "lessons": [
   {"title": string, "html": string, "module_title": string, "order_index": number}
 ]
}`;

  if (!apiKey) {
    return {
      title: "Draft Program (Demo, rich sections)",
      short_desc: "Auto-generated demo with structured sections.",
      long_desc: "<ul><li>Apply core frameworks</li><li>Practice with cases</li><li>Measure outcomes</li></ul>",
      lessons: [
        { title: "Kickoff & Goals", html: "<h4>Overview</h4><p>…</p><h4>Learning Objectives</h4><ul><li>Define…</li></ul><h4>Frameworks Used</h4><p>ADDIE</p><h4>Case / Activity</h4><p>…</p><h4>Check for Understanding</h4><ol><li>…</li></ol>", module_title: "Module 1", order_index: 1 },
        { title: "Applying a Framework", html: "<h4>Overview</h4><p>…</p><h4>Learning Objectives</h4><ul><li>Apply…</li></ul><h4>Frameworks Used</h4><p>Bloom, GROW</p><h4>Case / Activity</h4><p>…</p><h4>Check for Understanding</h4><ol><li>…</li></ol>", module_title: "Module 1", order_index: 2 }
      ],
    };
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`OpenAI error ${resp.status}: ${t}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(text) as Outline;
}

// --- Server entry ---
serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Parse input
    let input: BuilderInput;
    try {
      input = await req.json();
    } catch {
      return respondJSON({ error: "Invalid JSON body" }, 400);
    }

    // Env (NOTE: SUPABASE_URL is injected by the platform; don't create it as a secret)
    const supaUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY"); // set via `supabase secrets set SERVICE_ROLE_KEY=...`
    if (!supaUrl) return respondJSON({ error: "SUPABASE_URL missing (platform env)" }, 500);
    if (!serviceRole) return respondJSON({ error: "SERVICE_ROLE_KEY missing (set with `supabase secrets set SERVICE_ROLE_KEY=...`)" }, 500);

    const restHeaders = {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    // Extract caller user id from verified JWT (function.json has verify_jwt: true)
    const auth = req.headers.get("authorization") || "";
    const jwt = auth.replace("Bearer ", "");
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1] || "")); // already verified by platform
      userId = payload?.sub ?? null;
    } catch {
      // keep null; course will have created_by = null if we can't parse it
    }

    // 1) Generate outline
    const outline = await callLLM(input);

    // 2) Insert course (created_by = caller)
    const insCourse = await fetch(`${supaUrl}/rest/v1/courses`, {
      method: "POST",
      headers: restHeaders,
      body: JSON.stringify([{
        title: outline.title,
        short_desc: outline.short_desc,
        long_desc: outline.long_desc,
        is_published: false,
        created_by: userId, // ✅ key bit
      }]),
    });
    if (!insCourse.ok) {
      const t = await insCourse.text().catch(() => "");
      return respondJSON({ error: `Failed to insert course: ${insCourse.status} ${t}` }, 500);
    }
    const [course] = await insCourse.json();
    const courseId: string | undefined = course?.id;
    if (!courseId) return respondJSON({ error: "Course insert returned no id" }, 500);

    // 3) Insert lessons
    if (outline.lessons?.length) {
      const payload = outline.lessons.map((l) => ({
        course_id: courseId,
        title: l.title,
        html: l.html,
        module_title: l.module_title || "Module",
        order_index: l.order_index || 1,
      }));
      const insLessons = await fetch(`${supaUrl}/rest/v1/lessons`, {
        method: "POST",
        headers: restHeaders,
        body: JSON.stringify(payload),
      });
      if (!insLessons.ok) {
        const t = await insLessons.text().catch(() => "");
        return respondJSON({ error: `Failed to insert lessons: ${insLessons.status} ${t}` }, 500);
      }
    }

    // 4) ✅ Enroll the creator so RLS allows immediate access
    if (userId) {
      await fetch(`${supaUrl}/rest/v1/enrollments`, {
        method: "POST",
        headers: restHeaders,
        body: JSON.stringify([{ user_id: userId, course_id: courseId }]),
      }).catch(() => { /* ignore enrollment failure */ });
    }

    // Done
    return respondJSON({ course_id: courseId, course: outline }, 200);
  } catch (e) {
    // Always CORS on error
    return respondJSON({ error: String(e?.message || e) }, 500);
  }
});
