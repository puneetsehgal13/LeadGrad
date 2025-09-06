import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getLesson, markItemComplete } from "../../lib/courses";
import { useAuth } from "../../context/AuthContext";
import { useCourseProgress } from "../../context/CourseProgressContext";

function toYouTubeEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {}
  return null;
}

export default function LessonView() {
  const { id: lessonId, courseId } = useParams(); // <-- important
  const { user } = useAuth();
  const { toggleComplete } = useCourseProgress();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

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

  async function onMarkComplete() {
    if (!user || !lesson) return;
    // course_items_view.id is 'lesson:<uuid>' — we need the outline item id; easiest is to
    // store completion by composite key, but for demo we’ll just no-op if missing.
    // If you pass the item id via context, call markItemComplete(user.id, courseId, itemId).
    toggleComplete(lessonId, true);
  }

  if (loading) return null;
  if (!lesson) return <div>Lesson not found.</div>;

  const yt = toYouTubeEmbed(lesson.video_url);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{lesson.title}</h2>

      {/* YouTube (iframe) */}
      {yt && (
        <div style={{ margin: "12px 0" }}>
          <div style={{ position: "relative", paddingTop: "56.25%" }}>
            <iframe
              src={yt}
              title="YouTube video"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
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

      {/* Direct MP4 (if you ever set video_url to an MP4) */}
      {!yt && lesson.video_url && (
        <div style={{ margin: "12px 0" }}>
          <video
            src={lesson.video_url}
            controls
            style={{ width: "100%", maxWidth: 900, borderRadius: 8 }}
          />
        </div>
      )}

      {/* Rich HTML body: can include images/pdf/audio */}
      <article dangerouslySetInnerHTML={{ __html: lesson.html || "<p>—</p>" }} />

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-success" onClick={onMarkComplete}>
          Mark complete
        </button>
      </div>
    </div>
  );
}
