import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_USER_SETTINGS,
  SETTINGS_STORAGE_KEY,
  readStoredSettings,
  useSettingsStore,
} from "../useSettingsStore";

describe("useSettingsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetSettings();
  });

  afterEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetSettings();
  });

  it("initializes with expected defaults", () => {
    const state = useSettingsStore.getState();
    expect(state.notifications).toEqual(DEFAULT_USER_SETTINGS.notifications);
    expect(state.workspace).toEqual(DEFAULT_USER_SETTINGS.workspace);
    expect(state.agent).toEqual(DEFAULT_USER_SETTINGS.agent);
  });

  it("persists partial updates to localStorage per section", () => {
    useSettingsStore.getState().updateNotifications({
      showUnreadBadge: false,
      defaultFilter: "unread",
    });
    useSettingsStore.getState().updateWorkspace({
      defaultCalendarView: "week",
      weekStartsOn: "monday",
      defaultTaskStatus: "in-progress",
    });
    useSettingsStore.getState().updateAgent({
      showFloatingBubble: false,
      defaultBubbleMode: "docked",
    });

    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.notifications).toEqual({
      showUnreadBadge: false,
      autoRefresh: true,
      defaultFilter: "unread",
    });
    expect(parsed.workspace).toEqual({
      defaultTaskStatus: "in-progress",
      defaultCalendarView: "week",
      weekStartsOn: "monday",
    });
    expect(parsed.agent).toEqual({
      showFloatingBubble: false,
      defaultBubbleMode: "docked",
    });
  });

  it("recovers safely from corrupt or partial JSON in localStorage", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{not valid json");
    expect(readStoredSettings()).toEqual(DEFAULT_USER_SETTINGS);

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        notifications: { showUnreadBadge: false, defaultFilter: "bogus" },
        workspace: { weekStartsOn: "monday", defaultCalendarView: "year" },
        agent: { defaultBubbleMode: "docked" },
      }),
    );
    expect(readStoredSettings()).toEqual({
      notifications: {
        showUnreadBadge: false,
        autoRefresh: true,
        defaultFilter: "all",
      },
      workspace: {
        defaultTaskStatus: "",
        defaultCalendarView: "month",
        weekStartsOn: "monday",
      },
      agent: {
        showFloatingBubble: true,
        defaultBubbleMode: "docked",
      },
    });
  });

  it("resets all settings back to defaults and syncs from storage", () => {
    useSettingsStore.getState().updateAgent({ showFloatingBubble: false });
    expect(useSettingsStore.getState().agent.showFloatingBubble).toBe(false);

    useSettingsStore.getState().resetSettings();
    expect(useSettingsStore.getState().agent.showFloatingBubble).toBe(true);

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_USER_SETTINGS,
        workspace: {
          ...DEFAULT_USER_SETTINGS.workspace,
          weekStartsOn: "monday",
        },
      }),
    );
    useSettingsStore.getState().syncFromStorage();
    expect(useSettingsStore.getState().workspace.weekStartsOn).toBe("monday");
  });
});
