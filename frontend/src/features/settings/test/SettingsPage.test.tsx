import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/shared/i18n";
import {
  V2_PALETTE_STORAGE_KEY,
  initializeV2Palette,
} from "@/shared/theme/v2Palettes";
import { useSettingsStore } from "@/stores/useSettingsStore";
import SettingsWorkspace from "../SettingsWorkspace";

const mockUpdateProfile = vi.fn();
const mockChangePassword = vi.fn();
const mockCreateCategory = vi.fn();
const mockDeleteCategory = vi.fn();
const mockLoadBrowserPushState = vi.fn();
const mockEnableBrowserPush = vi.fn();
const mockUpdateBrowserPushPrefs = vi.fn();
const mockDisableBrowserPush = vi.fn();

vi.mock("@/features/notifications/lib/pushSubscription", () => ({
  DEFAULT_PUSH_PREFS: { taskDeadlines: true, agentReplies: true },
  loadBrowserPushState: () => mockLoadBrowserPushState(),
  enableBrowserPush: (...args: unknown[]) => mockEnableBrowserPush(...args),
  updateBrowserPushPrefs: (...args: unknown[]) =>
    mockUpdateBrowserPushPrefs(...args),
  disableBrowserPush: (...args: unknown[]) => mockDisableBrowserPush(...args),
}));

vi.mock("@/features/profile/api/userQueries", () => ({
  useCurrentUserQuery: () => ({
    data: {
      _id: "u1",
      id: "u1",
      name: "Minh Nguyen",
      email: "minh@orbit.test",
      role: "USER",
      dob: "1998-05-12T00:00:00.000Z",
      nationality: "Vietnam",
      avatarUrl: "",
      createdAt: "2026-01-10T00:00:00.000Z",
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/features/profile/api/userMutations", () => ({
  useUpdateProfileMutation: () => ({
    mutateAsync: mockUpdateProfile,
    isPending: false,
  }),
  useChangePasswordMutation: () => ({
    mutateAsync: mockChangePassword,
    isPending: false,
  }),
}));

vi.mock("@/features/tasks/api/taskQueries", () => ({
  useTasksQuery: () => ({
    data: {
      data: [
        { _id: "t1", status: "completed" },
        { _id: "t2", status: "in-progress" },
        { _id: "t3", status: "pending" },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/features/categories/api/categoryQueries", () => ({
  useCategoriesQuery: () => ({
    data: [
      { _id: "c1", name: "Uncategorized" },
      { _id: "c2", name: "Work" },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/features/categories/api/categoryMutations", () => ({
  useCreateCategoryMutation: () => ({
    mutateAsync: mockCreateCategory,
    isPending: false,
  }),
  useDeleteCategoryMutation: () => ({
    mutateAsync: mockDeleteCategory,
    isPending: false,
  }),
}));

vi.mock("@/features/tasks/api/projectQueries", () => ({
  useProjectsQuery: () => ({
    data: [{ _id: "p1", name: "Orbit Core", status: "active" }],
    isLoading: false,
  }),
}));

function renderSettings(version: "v1" | "v2") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[version === "v2" ? "/v2/settings" : "/settings"]}
      >
        <SettingsWorkspace version={version} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SettingsWorkspace", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    mockLoadBrowserPushState.mockResolvedValue({
      status: "disabled",
      permission: "default",
      serverSupported: true,
      subscribed: false,
      endpoint: null,
      prefs: { taskDeadlines: true, agentReplies: true },
    });
    await i18n.changeLanguage("en");
    initializeV2Palette();
    useSettingsStore.getState().resetSettings();
  });

  it("shows V2 color palette selector (Mint, Ocean, Golden, Crimson) ONLY in V2 and persists selection", async () => {
    const user = userEvent.setup();
    renderSettings("v2");

    await user.click(screen.getByRole("button", { name: /Appearance/i }));

    expect(screen.getByTestId("v2-palette-picker")).toBeInTheDocument();
    const oceanBtn = screen.getByRole("button", { name: /Ocean Glass/i });
    const goldenBtn = screen.getByRole("button", { name: /Golden Glass/i });
    const crimsonBtn = screen.getByRole("button", { name: /Crimson Glass/i });

    await user.click(oceanBtn);
    expect(localStorage.getItem(V2_PALETTE_STORAGE_KEY)).toBe("ocean");
    expect(document.documentElement.dataset.v2Palette).toBe("ocean");
    expect(oceanBtn).toHaveAttribute("aria-pressed", "true");

    await user.click(goldenBtn);
    expect(localStorage.getItem(V2_PALETTE_STORAGE_KEY)).toBe("golden");
    expect(document.documentElement.dataset.v2Palette).toBe("golden");
    expect(goldenBtn).toHaveAttribute("aria-pressed", "true");

    await user.click(crimsonBtn);
    expect(localStorage.getItem(V2_PALETTE_STORAGE_KEY)).toBe("crimson");
    expect(document.documentElement.dataset.v2Palette).toBe("crimson");
    expect(crimsonBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("does NOT display the V2 color palette selector in V1", async () => {
    const user = userEvent.setup();
    renderSettings("v1");

    await user.click(screen.getByRole("button", { name: /Appearance/i }));

    expect(screen.queryByTestId("v2-palette-picker")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Ocean Glass/i }),
    ).not.toBeInTheDocument();
  });

  it("persists notification, workspace, and agent preferences to useSettingsStore", async () => {
    const user = userEvent.setup();
    renderSettings("v2");

    // Notifications
    await user.click(screen.getByRole("button", { name: /Notifications/i }));
    const badgeSwitch = screen.getByRole("switch", {
      name: /Show unread count badge/i,
    });
    await user.click(badgeSwitch);
    expect(useSettingsStore.getState().notifications.showUnreadBadge).toBe(
      false,
    );

    // Workspace
    await user.click(screen.getByRole("button", { name: /Workspace/i }));
    await user.click(screen.getByRole("button", { name: /^Monday$/i }));
    expect(useSettingsStore.getState().workspace.weekStartsOn).toBe("monday");

    // Agent
    await user.click(screen.getByRole("button", { name: /AI Assistant/i }));
    const bubbleSwitch = screen.getByRole("switch", {
      name: /Show floating assistant bubble/i,
    });
    await user.click(bubbleSwitch);
    expect(useSettingsStore.getState().agent.showFloatingBubble).toBe(false);
  });

  it("updates profile details and validates password confirmation inline", async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      user: { name: "Minh Updated", email: "minh@orbit.test" },
    });
    const user = userEvent.setup();
    renderSettings("v2");

    const nameInput = screen.getByLabelText(/Full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Minh Updated");
    await user.click(screen.getByRole("button", { name: /Save profile/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Minh Updated" }),
      );
    });

    // Password mismatch shows inline error without calling API
    await user.type(screen.getByLabelText(/Current password/i), "oldpass123");
    await user.type(screen.getByLabelText(/^New password$/i), "newpass123");
    await user.type(
      screen.getByLabelText(/Confirm new password/i),
      "different123",
    );
    await user.click(screen.getByRole("button", { name: /Update password/i }));

    expect(
      screen.getByText(/New password and confirmation must match/i),
    ).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("enables browser push, toggles deadline & agent reply categories, and disables push in Settings", async () => {
    mockEnableBrowserPush.mockResolvedValueOnce({
      endpoint: "https://push.example/dev-1",
      prefs: { taskDeadlines: true, agentReplies: true },
    });
    mockUpdateBrowserPushPrefs.mockResolvedValueOnce({
      subscribed: true,
      prefs: { taskDeadlines: true, agentReplies: false },
    });
    mockDisableBrowserPush.mockResolvedValueOnce({
      endpoint: "https://push.example/dev-1",
      removed: true,
    });

    const user = userEvent.setup();
    renderSettings("v2");

    await user.click(screen.getByRole("button", { name: /Notifications/i }));

    const masterSwitch = await screen.findByRole("switch", {
      name: /Push notifications on this browser/i,
    });
    await waitFor(() => expect(masterSwitch).not.toBeDisabled());
    expect(masterSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(masterSwitch);
    await waitFor(() => {
      expect(mockEnableBrowserPush).toHaveBeenCalledTimes(1);
    });
    expect(masterSwitch).toHaveAttribute("aria-checked", "true");

    const agentRepliesSwitch = screen.getByRole("switch", {
      name: /AI Agent reply completed/i,
    });
    await user.click(agentRepliesSwitch);
    await waitFor(() => {
      expect(mockUpdateBrowserPushPrefs).toHaveBeenCalledWith(
        "https://push.example/dev-1",
        { agentReplies: false },
      );
    });
    expect(agentRepliesSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(masterSwitch);
    await waitFor(() => {
      expect(mockDisableBrowserPush).toHaveBeenCalledWith(
        "https://push.example/dev-1",
      );
    });
    expect(masterSwitch).toHaveAttribute("aria-checked", "false");
  });

  it("shows localized Vietnamese push settings and blocked permission hint", async () => {
    mockLoadBrowserPushState.mockResolvedValueOnce({
      status: "denied",
      permission: "denied",
      serverSupported: true,
      subscribed: false,
      endpoint: null,
      prefs: { taskDeadlines: true, agentReplies: true },
    });
    await i18n.changeLanguage("vi");

    const user = userEvent.setup();
    renderSettings("v1");

    await user.click(screen.getByRole("button", { name: /Thông báo/i }));
    const masterSwitch = await screen.findByRole("switch", {
      name: /Thông báo đẩy trên trình duyệt này/i,
    });
    expect(masterSwitch).toBeDisabled();
    expect(screen.getByText(/trình duyệt đang chặn/i)).toBeInTheDocument();
  });
});
