import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import V2Layout from "../layouts/V2Layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import i18n from "@/shared/i18n";

const mockLogoutMutateAsync = vi.fn();

vi.mock("@/features/auth/api/authMutations", () => ({
  useLogoutMutation: () => ({
    mutateAsync: mockLogoutMutateAsync,
  }),
}));

function renderLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const router = createMemoryRouter(
    [
      {
        path: "/v2",
        element: <V2Layout />,
        children: [
          {
            path: "dashboard",
            element: (
              <div data-testid="dashboard-content">Dashboard Content</div>
            ),
          },
        ],
      },
      {
        path: "/",
        element: <div data-testid="landing-page">Landing</div>,
      },
    ],
    { initialEntries: ["/v2/dashboard"] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("V2Layout shell", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    useAuthStore.getState().setSession({ accessToken: "test-token" });
    useAuthStore.getState().setAuthReady(true);
  });

  it("renders skip link, landmarks, and content outlet", () => {
    renderLayout();

    const skipLink = screen.getByText(/Skip to main content/i);
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#v2-main-content");

    expect(screen.getByTestId("v2-layout")).toHaveAttribute(
      "data-ui-version",
      "v2",
    );
    expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
  });

  it("renders version switcher with 'Back to V1'", () => {
    renderLayout();

    const switchers = screen.getAllByRole("button", { name: /Back to V1/i });
    expect(switchers.length).toBeGreaterThan(0);
  });

  it("keeps navigation within implemented V2 pages", () => {
    renderLayout();

    const v2Hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href?.startsWith("/v2")));
    expect(v2Hrefs).toEqual(
      expect.arrayContaining(["/v2/dashboard", "/v2/agents", "/v2/calendar"]),
    );
    expect(screen.queryByText("V1")).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^(#|\/v2)/);
    }
  });

  it("invokes logout mutation and navigates to '/' on Sign out", async () => {
    mockLogoutMutateAsync.mockResolvedValueOnce({});
    const user = userEvent.setup();
    renderLayout();

    const signOutBtn = screen.getByRole("button", { name: /Sign out/i });
    await user.click(signOutBtn);

    await waitFor(() => {
      expect(mockLogoutMutateAsync).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    });
  });

  it("toggles language between EN and VI", async () => {
    const user = userEvent.setup();
    renderLayout();

    const langBtn = screen.getByRole("button", { name: /Language/i });
    expect(langBtn).toHaveTextContent("VI");

    await user.click(langBtn);

    await waitFor(() => {
      expect(i18n.language).toMatch(/vi/);
    });
  });

  it("toggles theme between light and dark", async () => {
    const user = userEvent.setup();
    renderLayout();

    const themeBtn = screen.getByRole("button", { name: /dark|light/i });
    await user.click(themeBtn);

    const theme = document.documentElement.getAttribute("data-theme");
    expect(theme === "dark" || theme === "light").toBe(true);
  });

  it("opens mobile navigation drawer and closes on Escape", async () => {
    const user = userEvent.setup();
    renderLayout();

    // Drawer is closed initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click mobile menu button
    const menuBtn = screen.getByRole("button", {
      name: /Open navigation menu/i,
    });
    await user.click(menuBtn);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Press Escape
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("renders user avatar settings link next to Sign out in V2Sidebar", () => {
    useAuthStore.getState().setSession({
      accessToken: "test-token",
      user: {
        _id: "u1",
        id: "u1",
        name: "Alice Orbit",
        email: "alice@orbit.test",
        role: "USER",
        avatarUrl: "",
      },
    });
    renderLayout();

    const settingsLink = screen.getByTestId("v2-sidebar-profile-link");
    expect(settingsLink).toHaveAttribute("href", "/v2/settings");
    expect(settingsLink).toHaveTextContent("Alice Orbit");

    const footer = settingsLink.closest("[data-testid='v2-sidebar-footer']");
    expect(footer).toBeInTheDocument();
    expect(
      footer?.querySelector('button[aria-label="Sign out"]'),
    ).toBeInTheDocument();
  });

  it("collapses and expands the desktop sidebar and persists state in localStorage", async () => {
    const user = userEvent.setup();
    renderLayout();

    const toggleBtn = screen.getByTestId("v2-sidebar-toggle");
    const desktopSidebar = toggleBtn.closest(".v2-sidebar-desktop");
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(desktopSidebar).toHaveAttribute("data-collapsed", "false");

    await user.click(toggleBtn);

    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(desktopSidebar).toHaveAttribute("data-collapsed", "true");
    expect(localStorage.getItem("orbit.v2-sidebar-collapsed")).toBe("true");
    // Navigation links remain accessible by name even while collapsed
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(desktopSidebar).toHaveAttribute("data-collapsed", "false");
    expect(localStorage.getItem("orbit.v2-sidebar-collapsed")).toBe("false");
  });

  it("restores collapsed desktop sidebar preference from localStorage on mount", () => {
    localStorage.setItem("orbit.v2-sidebar-collapsed", "true");
    renderLayout();

    const toggleBtn = screen.getByTestId("v2-sidebar-toggle");
    const desktopSidebar = toggleBtn.closest(".v2-sidebar-desktop");
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(desktopSidebar).toHaveAttribute("data-collapsed", "true");
  });
});
