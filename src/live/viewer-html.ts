/**
 * Self-contained HTML viewer for the live screencast. Connects to the SSE
 * `/stream` endpoint (token from the URL) and paints each base64 JPEG frame
 * into a full-window <img>. Read-only, no dependencies.
 * @module live/viewer-html
 */

/** The viewer page served at `/` (inlined; no file reads). */
export const VIEWER_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>fuse-browser · live view</title>
<style>
  html,body{margin:0;height:100%;background:#0b0b0e;color:#9aa;font:13px system-ui}
  #wrap{display:flex;align-items:center;justify-content:center;height:100%}
  #frame{max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 0 40px #0008}
  #status{position:fixed;top:8px;left:10px;opacity:.7}
</style>
</head>
<body>
<div id="status">connecting…</div>
<div id="wrap"><img id="frame" alt="live view" /></div>
<script>
  const token = new URLSearchParams(location.search).get("token");
  const img = document.getElementById("frame");
  const status = document.getElementById("status");
  const es = new EventSource("/stream?token=" + encodeURIComponent(token));
  es.onopen = () => { status.textContent = "live"; };
  es.onmessage = (e) => { img.src = "data:image/jpeg;base64," + e.data; };
  es.onerror = () => { status.textContent = "disconnected"; };
</script>
</body>
</html>`;
