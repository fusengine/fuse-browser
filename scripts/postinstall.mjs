/**
 * Soft post-install: attempt to download the Chromium binary so the package
 * works out of the box. Never fails the install (CI / offline safe) and can be
 * skipped with PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 or FUSE_SKIP_BROWSER_DOWNLOAD=1.
 */
import { execSync } from "node:child_process";

const skip =
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD || process.env.FUSE_SKIP_BROWSER_DOWNLOAD;

if (skip) {
  console.log("[fuse-browser] Skipping Chromium download (skip env set).");
  process.exit(0);
}

try {
  console.log("[fuse-browser] Installing Chromium (patchright)…");
  execSync("npx --no-install patchright install chromium", { stdio: "inherit" });
  console.log("[fuse-browser] Chromium ready.");
} catch (err) {
  console.warn(`[fuse-browser] Chromium auto-install failed (non-fatal): ${err?.message ?? err}`);
  console.warn("[fuse-browser] Install manually: npx patchright install chromium");
  process.exit(0);
}
