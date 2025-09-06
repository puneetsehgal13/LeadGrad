import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getLesson, markItemComplete } from "../../lib/courses";
import { useAuth } from "../../context/AuthContext";
import { useCourseProgress } from "../../context/CourseProgressContext";
import ensureReadableHtml from "../../lib/ensureReadableHtml";

function toYouTubeEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {}
  return null;
}

export default function LessonView() {
  const { id: lessonId, courseId } = useParams();
  const { user } = useAuth();
  const { toggleComplete } = useCourseProgress();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Hooks first, always
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const l = await getLesson(lessonId);
        if (mounted) setLesson(l);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lessonId]);

  // ✅ These hooks run every render (even when data not ready), so order is stable
  const bodyHtml = useMemo(() => ensureReadableHtml(lesson?.html || ""), [lesson?.html]);
  const ytEmbed = useMemo(() => toYouTubeEmbed(lesson?.video_url || null), [lesson?.video_url]);

  // ⬇️ Only now do conditional returns (after all hooks are declared)
  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!lesson) return <div style={{ padding: 16 }}>Lesson not found.</div>;

  async function onMarkComplete() {
    // If you pass item ids, call markItemComplete(user.id, courseId, itemId) here.
    toggleComplete(lessonId, true);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{lesson.title}</h2>

      {ytEmbed && (
        <div style={{ margin: "12px 0" }}>
          <div style={{ position: "relative", paddingTop: "56.25%" }}>
            <iframe
              src={ytEmbed}
              title="Video"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: 0,
                borderRadius: 8,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {!ytEmbed && lesson.video_url && (
        <div style={{ margin: "12px 0" }}>
          <video
            src={lesson.video_url}
            controls
            style={{ width: "100%", maxWidth: 900, borderRadius: 8 }}
          />
        </div>
      )}

      <article className="lesson-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-success" onClick={onMarkComplete}>
          Mark complete
        </button>
      </div>
    </div>
  );
}
