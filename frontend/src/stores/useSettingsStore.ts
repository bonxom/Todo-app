import { create } from "zustand";
import type { TaskStatus } from "../shared/types/domain";

export type NotificationDefaultFilter = "all" | "unread";
export type CalendarDefaultView = "month" | "week";
export type WeekStartDay = "sunday" | "monday";
export type AgentBubbleMode = "compact" | "docked";

export interface NotificationSettings {
  showUnreadBadge: boolean;
  autoRefresh: boolean;
  defaultFilter: NotificationDefaultFilter;
}

export interface WorkspaceSettings {
  defaultTaskStatus: TaskStatus | "";
  defaultCalendarView: CalendarDefaultView;
  weekStartsOn: WeekStartDay;
}

export interface AgentSettings {
  showFloatingBubble: boolean;
  defaultBubbleMode: AgentBubbleMode;
}

export interface UserSettings {
  notifications: NotificationSettings;
  workspace: WorkspaceSettings;
  agent: AgentSettings;
}

export interface SettingsState extends UserSettings {
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
  updateWorkspace: (patch: Partial<WorkspaceSettings>) => void;
  updateAgent: (patch: Partial<AgentSettings>) => void;
  resetSettings: () => void;
  syncFromStorage: () => void;
}

export const SETTINGS_STORAGE_KEY = "orbit.settings.v1";

export const DEFAULT_USER_SETTINGS: UserSettings = {
  notifications: {
    showUnreadBadge: true,
    autoRefresh: true,
    defaultFilter: "all",
  },
  workspace: {
    defaultTaskStatus: "",
    defaultCalendarView: "month",
    weekStartsOn: "sunday",
  },
  agent: {
    showFloatingBubble: true,
    defaultBubbleMode: "compact",
  },
};

const VALID_TASK_STATUSES = new Set<string>([
  "",
  "pending",
  "in-progress",
  "completed",
  "given-up",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeSettings(raw: unknown): UserSettings {
  if (!isRecord(raw)) {
    return {
      notifications: { ...DEFAULT_USER_SETTINGS.notifications },
      workspace: { ...DEFAULT_USER_SETTINGS.workspace },
      agent: { ...DEFAULT_USER_SETTINGS.agent },
    };
  }

  const notif = isRecord(raw.notifications) ? raw.notifications : {};
  const workspace = isRecord(raw.workspace) ? raw.workspace : {};
  const agent = isRecord(raw.agent) ? raw.agent : {};

  return {
    notifications: {
      showUnreadBadge:
        typeof notif.showUnreadBadge === "boolean"
          ? notif.showUnreadBadge
          : DEFAULT_USER_SETTINGS.notifications.showUnreadBadge,
      autoRefresh:
        typeof notif.autoRefresh === "boolean"
          ? notif.autoRefresh
          : DEFAULT_USER_SETTINGS.notifications.autoRefresh,
      defaultFilter:
        notif.defaultFilter === "all" || notif.defaultFilter === "unread"
          ? notif.defaultFilter
          : DEFAULT_USER_SETTINGS.notifications.defaultFilter,
    },
    workspace: {
      defaultTaskStatus:
        typeof workspace.defaultTaskStatus === "string" &&
        VALID_TASK_STATUSES.has(workspace.defaultTaskStatus)
          ? (workspace.defaultTaskStatus as TaskStatus | "")
          : DEFAULT_USER_SETTINGS.workspace.defaultTaskStatus,
      defaultCalendarView:
        workspace.defaultCalendarView === "month" ||
        workspace.defaultCalendarView === "week"
          ? workspace.defaultCalendarView
          : DEFAULT_USER_SETTINGS.workspace.defaultCalendarView,
      weekStartsOn:
        workspace.weekStartsOn === "sunday" ||
        workspace.weekStartsOn === "monday"
          ? workspace.weekStartsOn
          : DEFAULT_USER_SETTINGS.workspace.weekStartsOn,
    },
    agent: {
      showFloatingBubble:
        typeof agent.showFloatingBubble === "boolean"
          ? agent.showFloatingBubble
          : DEFAULT_USER_SETTINGS.agent.showFloatingBubble,
      defaultBubbleMode:
        agent.defaultBubbleMode === "compact" ||
        agent.defaultBubbleMode === "docked"
          ? agent.defaultBubbleMode
          : DEFAULT_USER_SETTINGS.agent.defaultBubbleMode,
    },
  };
}

export function readStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return sanitizeSettings(null);
    }
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return sanitizeSettings(null);
  }
}

function persistSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Gracefully fall back to in-memory settings when storage is disabled.
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...readStoredSettings(),

  updateNotifications: (patch) => {
    const next: UserSettings = {
      notifications: { ...get().notifications, ...patch },
      workspace: get().workspace,
      agent: get().agent,
    };
    const sanitized = sanitizeSettings(next);
    persistSettings(sanitized);
    set(sanitized);
  },

  updateWorkspace: (patch) => {
    const next: UserSettings = {
      notifications: get().notifications,
      workspace: { ...get().workspace, ...patch },
      agent: get().agent,
    };
    const sanitized = sanitizeSettings(next);
    persistSettings(sanitized);
    set(sanitized);
  },

  updateAgent: (patch) => {
    const next: UserSettings = {
      notifications: get().notifications,
      workspace: get().workspace,
      agent: { ...get().agent, ...patch },
    };
    const sanitized = sanitizeSettings(next);
    persistSettings(sanitized);
    set(sanitized);
  },

  resetSettings: () => {
    const defaults = sanitizeSettings(null);
    persistSettings(defaults);
    set(defaults);
  },

  syncFromStorage: () => {
    set(readStoredSettings());
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SETTINGS_STORAGE_KEY || event.key === null) {
      useSettingsStore.getState().syncFromStorage();
    }
  });
}
