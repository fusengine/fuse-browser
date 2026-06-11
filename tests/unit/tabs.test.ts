import { describe, expect, test } from "bun:test";
import type { Page } from "playwright";
import { closeTab, listTabs, openTab, selectTab } from "../../src/session/tabs.js";
import { handlersOf, makeSession } from "./helpers/fake-tabs.js";

describe("listTabs", () => {
  test("reports index, url, async title and the active marker", async () => {
    const { session, addPage } = makeSession();
    addPage("https://b.example/");
    const tabs = await listTabs(session);
    expect(tabs).toEqual([
      { index: 0, url: "https://a.example/", title: "t:https://a.example/", active: true },
      { index: 1, url: "https://b.example/", title: "t:https://b.example/", active: false },
    ]);
  });
});

describe("selectTab", () => {
  test("re-points page/lastUrl/logs and wires the popup once", async () => {
    const { session, addPage } = makeSession();
    const popup = addPage("https://oauth.example/");
    const initialLogs = session.logs;
    await selectTab(session, 1);
    expect(session.page).toBe(popup);
    expect(session.lastUrl).toBe("https://oauth.example/");
    expect(session.logs).not.toBe(initialLogs);
    const popupLogs = session.logs;
    const wired = handlersOf.get(popup) ?? [];
    expect(wired).toContain("request"); // network listeners
    expect(wired).toContain("crash"); // pageOnly health listeners
    const count = wired.length;
    await selectTab(session, 0); // back to the original tab…
    expect(session.logs).toBe(initialLogs); // …restores its own log
    await selectTab(session, 1); // re-select: no handler stacking
    expect(session.logs).toBe(popupLogs);
    expect((handlersOf.get(popup) ?? []).length).toBe(count);
  });

  test("throws RangeError on an out-of-range index", async () => {
    const { session } = makeSession();
    await expect(selectTab(session, 3)).rejects.toThrow(/invalid_tab_index: 3/);
  });
});

describe("openTab", () => {
  test("opens, navigates and selects the new tab", async () => {
    const { session, pages } = makeSession();
    await openTab(session, "https://c.example/");
    expect(pages).toHaveLength(2);
    expect(session.page).toBe(pages[1] as Page);
    expect(session.page.url()).toBe("https://c.example/");
  });

  test("closes the orphan page when navigation fails", async () => {
    const { session, pages, setNewPageGotoFails } = makeSession();
    setNewPageGotoFails(true);
    const first = session.page;
    await expect(openTab(session, "https://down.example/")).rejects.toThrow("boom");
    expect(pages).toHaveLength(1); // orphan closed
    expect(session.page).toBe(first); // active tab untouched
  });
});

describe("closeTab", () => {
  test("refuses to close the last tab", async () => {
    const { session } = makeSession();
    await expect(closeTab(session, 0)).rejects.toThrow(/cannot_close_last_tab/);
  });

  test("closing the active tab falls back to the first remaining one", async () => {
    const { session, addPage, pages } = makeSession();
    addPage("https://b.example/");
    await selectTab(session, 1);
    await closeTab(session, 1);
    expect(pages).toHaveLength(1);
    expect(session.page.url()).toBe("https://a.example/");
    expect(session.health).toBe("ok");
  });

  test("closing an inactive tab keeps the active one", async () => {
    const { session, addPage, pages } = makeSession();
    addPage("https://b.example/");
    await closeTab(session, 1);
    expect(pages).toHaveLength(1);
    expect(session.page.url()).toBe("https://a.example/");
  });
});
