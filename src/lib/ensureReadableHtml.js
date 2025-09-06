// src/lib/ensureReadableHtml.js
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function ensureReadableHtml(input = "") {
  const hasHtml = /<(p|ul|ol|li|br|h\d|img|iframe|video|audio|figure)\b/i.test(input);
  if (hasHtml) return input;

  let txt = String(input)
    .replace(/\r\n/g, "\n")
    .replace(/\u2022/g, " • ")
    .trim();

  // Normalize common bullet markers at line starts
  txt = txt.replace(/^\s*[•\-*]\s+/gm, "- ").replace(/^\s*\d+[.)]\s+/gm, (m) => m); // keep numbered lists

  const lines = txt
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let html = "";
  let inUl = false,
    inOl = false;
  const closeLists = () => {
    if (inUl) {
      html += "</ul>";
      inUl = false;
    }
    if (inOl) {
      html += "</ol>";
      inOl = false;
    }
  };

  for (const line of lines) {
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    const bul = line.match(/^[-*]\s+(.*)$/);

    if (num) {
      if (inUl) {
        html += "</ul>";
        inUl = false;
      }
      if (!inOl) {
        html += "<ol>";
        inOl = true;
      }
      html += `<li>${escapeHtml(num[1])}</li>`;
    } else if (bul) {
      if (inOl) {
        html += "</ol>";
        inOl = false;
      }
      if (!inUl) {
        html += "<ul>";
        inUl = true;
      }
      html += `<li>${escapeHtml(bul[1])}</li>`;
    } else {
      closeLists();
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }
  closeLists();
  return html || "<p>—</p>";
}

// Export default too so either import style works
export default ensureReadableHtml;
