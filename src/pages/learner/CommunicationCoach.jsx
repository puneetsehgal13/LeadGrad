import { useEffect, useRef, useState } from "react";
import { supabase } from "lib/supabase"; // supabase-js client
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";

// Helper: play() might be blocked if not triggered by a click.
async function safePlay(el) {
  try {
    await el.play();
  } catch {
    /* ignore */
  }
}

export default function CommunicationCoach() {
  const [scenario, setScenario] = useState(
    "Handle an upset customer about a delayed delivery. Keep it concise and empathetic."
  );
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [transcript, setTranscript] = useState(""); // local running transcript (simple)

  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const recognizerRef = useRef(null);

  // Simple browser speech-to-text for demo (English/Hindi only)
  function startLocalSTT() {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return; // no STT in this browser; fine for demo
      const r = new SR();
      r.lang = "en-IN"; // switch to "hi-IN" if you prefer
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        const finals = Array.from(e.results)
          .filter((x) => x.isFinal)
          .map((x) => x[0].transcript)
          .join(" ");
        if (finals) setTranscript((t) => (t ? t + "\n" : "") + finals.trim());
      };
      r.onerror = () => {};
      r.start();
      recognizerRef.current = r;
    } catch {}
  }

  function stopLocalSTT() {
    try {
      recognizerRef.current?.stop();
    } catch {}
    recognizerRef.current = null;
  }

  async function start() {
    setErr("");
    try {
      // --- PeerConnection setup ---
      const pc = new RTCPeerConnection({
        // Add TURN if your network needs it
        // iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // Remote audio
      const remoteAudio = new Audio();
      remoteAudio.autoplay = true;
      remoteAudioRef.current = remoteAudio;
      pc.ontrack = async (e) => {
        remoteAudio.srcObject = e.streams[0];
        await safePlay(remoteAudio);
      };

      // Local mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      if (localAudioRef.current) localAudioRef.current.srcObject = stream;

      // Data channel
      const dc = pc.createDataChannel("coach");
      dcRef.current = dc;
      dc.onopen = () => {
        dc.send(
          JSON.stringify({
            type: "session.update",
            instructions: `
You are an AI Communication Coach. Speak briefly (1–2 sentences).
Rubric: empathy, clarity, structure, listening.
Push realistic follow-ups. Keep responses under ~10 seconds.`,
          })
        );
        dc.send(
          JSON.stringify({
            type: "response.create",
            instructions: `Kick off the roleplay: ${scenario}`,
          })
        );
      };

      // --- Create offer and set local description ---
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      // Use the SDP from localDescription only (avoid stray "offer.sdp" references)
      const sdp = pc.localDescription?.sdp;
      if (!sdp) throw new Error("Failed to build local SDP");

      // --- Exchange SDP via Supabase invoke (adds JWT automatically) ---
      const { data, error } = await supabase.functions.invoke("realtime_sdp", {
        body: { sdp, model: "gpt-4o-realtime-preview" }, // use a realtime model your account can access
      });

      if (error) {
        console.error("realtime_sdp error:", error);
        const msg =
          (error.message || error.status || "unknown") +
          (error.context?.requestId ? ` (reqId ${error.context.requestId})` : "");
        setErr(`realtime_sdp failed: ${msg}`);
        return;
      }

      const answerSdp =
        typeof data === "string" ? data : data?.sdp ? String(data.sdp) : String(data);

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setConnected(true);
      startLocalSTT();
    } catch (e) {
      setErr(e.message || String(e));
      stop();
    }
  }

  function stop() {
    try {
      dcRef.current?.close();
      pcRef.current?.getSenders()?.forEach((s) => s.track?.stop());
      pcRef.current?.close();
    } catch {}
    stopLocalSTT();
    setConnected(false);
  }

  async function scoreAndSave() {
    try {
      if (!transcript?.trim()) {
        setErr("No transcript captured. Say something before scoring.");
        return;
      }
      setSaving(true);
      setErr("");

      // 1) Get feedback from coach_score (OpenAI call happens server-side)
      const { data: feedback, error: scoreErr } = await supabase.functions.invoke("coach_score", {
        body: { transcript, scenario },
      });
      if (scoreErr) {
        console.error("coach_score error:", scoreErr);
        const msg =
          (scoreErr.message || scoreErr.status || "unknown") +
          (scoreErr.context?.requestId ? ` (reqId ${scoreErr.context.requestId})` : "");
        setErr(`coach_score failed: ${msg}`);
        setSaving(false);
        return;
      }

      // 2) Persist to DB (coach_sessions) with RLS-aware insert
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) {
        setErr("Not signed in. Please sign in to save your session.");
        setSaving(false);
        return;
      }

      const { error: dbErr } = await supabase.from("coach_sessions").insert({
        user_id: uid,
        scenario,
        ended_at: new Date().toISOString(),
        transcript,
        feedback, // JSON returned by the function
      });

      if (dbErr) {
        console.error("coach_sessions insert error:", dbErr);
        setErr(`DB insert failed: ${dbErr.message}`);
        setSaving(false);
        return;
      }

      setSaving(false);
      setErr("");
      alert("Saved!\n\n" + JSON.stringify(feedback, null, 2));
    } catch (e) {
      setSaving(false);
      setErr(e.message || String(e));
    }
  }

  useEffect(() => () => stop(), []); // cleanup on unmount

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3} px={2}>
        <MDBox mb={2} display="flex" alignItems="center" gap={1}>
          <Icon>record_voice_over</Icon>
          <MDTypography variant="h5">AI Communication Coach</MDTypography>
        </MDBox>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} display="flex" gap={1} alignItems="center">
            {!connected ? (
              <MDButton color="info" onClick={start} startIcon={<Icon>play_arrow</Icon>}>
                Start
              </MDButton>
            ) : (
              <>
                <MDButton color="error" onClick={stop} startIcon={<Icon>stop</Icon>}>
                  End
                </MDButton>
                <MDButton
                  color="secondary"
                  onClick={scoreAndSave}
                  startIcon={<Icon>grading</Icon>}
                  disabled={saving}
                >
                  {saving ? "Scoring & Saving…" : "End session & Score"}
                </MDButton>
              </>
            )}
            {err && (
              <MDTypography color="error" variant="button">
                {err}
              </MDTypography>
            )}
          </Grid>

          <Grid item xs={12}>
            <MDTypography variant="subtitle2" mb={1}>
              Transcript (local STT demo)
            </MDTypography>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#f6f6f6",
                padding: 12,
                borderRadius: 8,
                minHeight: 120,
              }}
            >
              {transcript || "—"}
            </pre>
          </Grid>
        </Grid>

        {/* Hidden local mic preview; remote audio is played via the programmatic <audio> */}
        <audio ref={localAudioRef} style={{ display: "none" }} />
      </MDBox>
    </DashboardLayout>
  );
}
