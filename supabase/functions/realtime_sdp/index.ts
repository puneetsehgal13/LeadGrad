// supabase/functions/realtime_sdp/index.ts
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

    const { sdp, model } = await req.json();
    if (!sdp) {
      return new Response(JSON.stringify({ error: "Missing sdp" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Forward the browser's SDP offer to OpenAI Realtime and return the answer SDP.
    const upstream = await fetch(
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(
        model || "gpt-5-realtime-preview"
      )}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/sdp",
        },
        body: sdp,
      }
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}`, detail: text }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const answer = await upstream.text();
    return new Response(answer, {
      status: 200,
      headers: { ...cors, "Content-Type": "application/sdp" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
