/**
 * Tear down an opened context safely. A CDP-attached (`connected`) context must
 * NOT be closed — only the browser link is dropped — otherwise the user's real
 * browser default context/pages would be destroyed.
 * @module engine/teardown
 */
import type { OpenedContext } from "../interfaces/engine.js";

/** Close a launched context+browser, or just drop the link for a CDP attach. */
export async function teardownOpened(opened: OpenedContext): Promise<void> {
  if (opened.connected) {
    await opened.browser?.close().catch(() => {});
    return;
  }
  await opened.context.close().catch(() => {});
  if (opened.browser) await opened.browser.close().catch(() => {});
}
