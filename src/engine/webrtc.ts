/**
 * Chromium launch args that stop a WebRTC ICE/STUN real-IP leak when a proxy is
 * set — WebRTC is routed through the proxy and non-proxied UDP is blocked, so a
 * page cannot reveal the machine's real IP behind the proxy. Chromium-only.
 * @module engine/webrtc
 */

/** Launch args preventing WebRTC from bypassing the proxy. */
export const WEBRTC_LEAK_ARGS = [
  "--webrtc-ip-handling-policy=disable_non_proxied_udp",
  "--force-webrtc-ip-handling-policy",
];
