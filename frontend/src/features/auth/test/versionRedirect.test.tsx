import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  type Location,
  type InitialEntry,
} from "react-router-dom";
import AuthPage from "../AuthPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UI_VERSION_STORAGE_KEY } from "@/shared/navigation/uiVersions";

const mockLoginMutateAsync = vi.fn();
const mockRegisterMutateAsync = vi.fn();

vi.mock("../api/authMutations", () => ({
  useLoginMutation: () => ({
    mutateAsync: mockLoginMutateAsync,
  }),
  useRegisterMutation: () => ({
    mutateAsync: mockRegisterMutateAsync,
  }),
}));

function LocationObserver({
  onLocation,
}: {
  onLocation: (loc: Location) => void;
}) {
  const loc = useLocation();
  onLocation(loc);
  return (
    <div data-testid="location-display">
      {loc.pathname}
      {loc.search}
    </div>
  );
}

function getSubmitButton(
  container: HTMLElement = document.body,
): HTMLButtonElement {
  const btn = container.querySelector<HTMLButtonElement>(
    "button[type='submit']",
  );
  if (!btn) {
    throw new Error("Submit button not found");
  }
  return btn;
}

function renderAuthPage(initialEntries: InitialEntry[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let currentLocation: Location | null = null;

  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={<div data-testid="v1-dashboard">V1 Dashboard</div>}
          />
          <Route
            path="/v2/dashboard"
            element={<div data-testid="v2-dashboard">V2 Dashboard</div>}
          />
          <Route
            path="/calendar"
            element={<div data-testid="calendar-page">Calendar</div>}
          />
        </Routes>
        <LocationObserver onLocation={(loc) => (currentLocation = loc)} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return {
    ...result,
    getCurrentLocation: (): Location => {
      if (!currentLocation) {
        throw new Error("Location not observed");
      }
      return currentLocation;
    },
  };
}

describe("AuthPage version-aware redirects and return state", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("redirects to /dashboard by default after successful login", async () => {
    mockLoginMutateAsync.mockResolvedValueOnce({ user: { id: "1" } });
    const user = userEvent.setup();

    renderAuthPage(["/login"]);

    await user.type(screen.getByLabelText(/Email/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "password123");
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByTestId("v1-dashboard")).toBeInTheDocument();
    });
  });

  it("redirects to /v2/dashboard if v2 is preferred and no returnTo is specified", async () => {
    localStorage.setItem(UI_VERSION_STORAGE_KEY, "v2");
    mockLoginMutateAsync.mockResolvedValueOnce({ user: { id: "1" } });
    const user = userEvent.setup();

    renderAuthPage(["/login"]);

    await user.type(screen.getByLabelText(/Email/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "password123");
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByTestId("v2-dashboard")).toBeInTheDocument();
    });
  });

  it("redirects to returnTo destination after successful login", async () => {
    mockLoginMutateAsync.mockResolvedValueOnce({ user: { id: "1" } });
    const user = userEvent.setup();

    renderAuthPage([
      {
        pathname: "/login",
        state: { returnTo: "/calendar?view=week" },
      },
    ]);

    await user.type(screen.getByLabelText(/Email/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "password123");
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByTestId("calendar-page")).toBeInTheDocument();
    });
  });

  it("preserves returnTo state when switching between login and register modes", async () => {
    const user = userEvent.setup();
    const initialEntry = {
      pathname: "/login",
      state: { returnTo: "/v2/dashboard" },
    };

    const { getCurrentLocation } = renderAuthPage([initialEntry]);

    const registerLink = screen.getByRole("button", { name: /Sign up/i });
    await user.click(registerLink);

    expect(getCurrentLocation().pathname).toBe("/register");
    const state = getCurrentLocation().state as { returnTo?: string } | null;
    expect(state?.returnTo).toBe("/v2/dashboard");
  });

  it("preserves returnTo state when authentication fails", async () => {
    mockLoginMutateAsync.mockRejectedValueOnce(
      new Error("Invalid credentials"),
    );
    const user = userEvent.setup();
    const initialEntry = {
      pathname: "/login",
      state: { returnTo: "/v2/dashboard" },
    };

    const { getCurrentLocation } = renderAuthPage([initialEntry]);

    await user.type(screen.getByLabelText(/Email/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "wrongpass");
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });

    expect(getCurrentLocation().pathname).toBe("/login");
    const state = getCurrentLocation().state as { returnTo?: string } | null;
    expect(state?.returnTo).toBe("/v2/dashboard");
  });
});
