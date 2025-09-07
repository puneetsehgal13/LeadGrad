// supabase/functions/coach_score/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { transcript, scenario } = await req.json();
    if (!transcript) {
      return new Response(JSON.stringify({ error: "Missing transcript" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rubric = `
You are a communication coach. Score the learner on:
- Empathy (0-5)
- Clarity (0-5)
- Structure (0-5)
- Active Listening (0-5)

Return JSON:
{
  "scores": { "empathy": n, "clarity": n, "structure": n, "listening": n, "overall": n },
  "summary": "2-3 sentence feedback",
  "tips": ["bullet", "bullet", "bullet"]
}
`;

    // Use JSON mode for a clean response
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.1-mini", // small + cheap scorer; change if you prefer
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: rubric },
          { role: "user", content: `Scenario: ${scenario || "N/A"}\nTranscript:\n${transcript}` },
        ],
        temperature: 0.2,
      }),
    });

    if (!completion.ok) {
      const text = await completion.text();
      return new Response(JSON.stringify({ error: `LLM ${completion.status}`, detail: text }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await completion.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    return new Response(content, {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
