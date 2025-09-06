import { supabase } from "../lib/supabase";

// --- Core fetchers ---
export async function getCourse(courseId) {
  const { data, error } = await supabase
    .from("courses")
    .select("id,title,short_desc,long_desc,language,duration_mins,level,thumbnail_url")
    .eq("id", courseId)
    .single();
  if (error) throw error;
  return data;
}

export async function getOutline(courseId) {
  // modules + lessons in order
  const { data, error } = await supabase
    .from("course_items_view") // view or table that flattens modules->items with order_index
    .select("id,item_type,title,module_title,order_index,foreign_id")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

// Lesson by id
export async function getLesson(lessonId) {
  const { data, error } = await supabase
    .from("lessons")
    .select("id,title,html,video_url,attachments")
    .eq("id", lessonId)
    .single();
  if (error) throw error;
  return data;
}

// Quiz (stub for now)
export async function getQuiz(quizId) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("id,title")
    .eq("id", quizId)
    .single();
  if (error) throw error;
  return data;
}

// --- Progress helpers ---
export async function getLastRoute(userId, courseId) {
  const { data, error } = await supabase
    .from("user_course_progress")
    .select("last_route")
    .match({ user_id: userId, course_id: courseId })
    .maybeSingle();
  if (error) throw error;
  return data?.last_route || null;
}

export async function setLastRoute(userId, courseId, lastRoute) {
  const { error } = await supabase
    .from("user_course_progress")
    .upsert(
      { user_id: userId, course_id: courseId, last_route: lastRoute },
      { onConflict: "user_id,course_id" }
    );
  if (error) throw error;
}

export async function markItemComplete(userId, courseId, itemId) {
  const { error } = await supabase
    .from("user_completed_items")
    .upsert(
      { user_id: userId, course_id: courseId, item_id: itemId },
      { onConflict: "user_id,course_id,item_id" }
    );
  if (error) throw error;
}

export async function getCompletedMap(userId, courseId) {
  const { data, error } = await supabase
    .from("user_completed_items")
    .select("item_id")
    .match({ user_id: userId, course_id: courseId });
  if (error) throw error;
  const map = new Set(data?.map((d) => d.item_id) || []);
  return map;
}
