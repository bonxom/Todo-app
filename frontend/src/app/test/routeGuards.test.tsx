import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  type Location,
} from "react-router-dom";
import {
  getProtectedDecision,
  getPublicOnlyDecision,
  getRootDecision,
} from "../guardDecisions";
import { ProtectedGuard, PublicOnlyGuard, RootGuard } from "../routeGuards";
import { useAuthStore } from "@/stores/useAuthStore";
import { UI_VERSION_STORAGE_KEY } from "@/shared/navigation/uiVersions";

function LocationSpy({ onLocation }: { onLocation: (loc: Location) => void }) {
  const loc = useLocation();
  onLocation(loc);
  return null;
}

describe("route guard decisions", () => {
  it("waits until authentication bootstrap completes", () => {
    expect(getProtectedDecision({ isAuthReady: false, token: null })).toBe(
      "loading",
    );
    expect(getProtectedDecision({ isAuthReady: false, token: "token" })).toBe(
      "loading",
    );
    expect(getPublicOnlyDecision({ isAuthReady: false, token: "token" })).toBe(
      "loading",
    );
    expect(getRootDecision({ isAuthReady: false, token: null })).toBe(
      "loading",
    );
  });

  it("redirects unauthenticated users to /login on protected routes", () => {
    expect(getProtectedDecision({ isAuthReady: true, token: null })).toBe(
      "/login",
    );
  });

  it("allows authenticated users to access protected routes", () => {
    expect(getProtectedDecision({ isAuthReady: true, token: "token" })).toBe(
      "outlet",
    );
  });

  it("redirects authenticated users away from public auth routes to /dashboard", () => {
    expect(getPublicOnlyDecision({ isAuthReady: true, token: "token" })).toBe(
      "/dashboard",
    );
  });

  it("allows guests to access public auth routes", () => {
    expect(getPublicOnlyDecision({ isAuthReady: true, token: null })).toBe(
      "outlet",
    );
  });

  it("redirects authenticated users at root to /dashboard", () => {
    expect(getRootDecision({ isAuthReady: true, token: "token" })).toBe(
      "/dashboard",
    );
  });

  it("renders landing page for guests at root", () => {
    expect(getRootDecision({ isAuthReady: true, token: null })).toBe("landing");
  });
});

describe("Guard components rendering and version-aware routing", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useAuthStore.getState().setAuthReady(false);
  });

  it("renders loading screen while auth is not ready", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedGuard />}>
            <Route path="/dashboard" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Checking your session/i)).toBeDefined();
  });

  it("ProtectedGuard redirects guest to /login with state.returnTo containing path, query, and hash", () => {
    useAuthStore.getState().setAuthReady(true);
    let capturedLocation: Location | null = null;

    render(
      <MemoryRouter initialEntries={["/v2/dashboard?taskId=123#detail"]}>
        <Routes>
          <Route element={<ProtectedGuard />}>
            <Route path="/v2/dashboard" element={<div>V2 Content</div>} />
          </Route>
          <Route
            path="/login"
            element={
              <div>
                <LocationSpy onLocation={(loc) => (capturedLocation = loc)} />
                Login Page
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeDefined();
    const loc1 = capturedLocation as Location | null;
    expect(loc1?.pathname).toBe("/login");
    const state = loc1?.state as { returnTo?: string } | null;
    expect(state?.returnTo).toBe("/v2/dashboard?taskId=123#detail");
  });

  it("ProtectedGuard preserves guest returnTo for explicit V1 route despite V2 preference", () => {
    localStorage.setItem(UI_VERSION_STORAGE_KEY, "v2");
    useAuthStore.getState().setAuthReady(true);
    let capturedLocation: Location | null = null;

    render(
      <MemoryRouter initialEntries={["/calendar?date=2026-11-14"]}>
        <Routes>
          <Route element={<ProtectedGuard />}>
            <Route path="/calendar" element={<div>Calendar Content</div>} />
          </Route>
          <Route
            path="/login"
            element={
              <div>
                <LocationSpy onLocation={(loc) => (capturedLocation = loc)} />
                Login Page
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const loc2 = capturedLocation as Location | null;
    const state = loc2?.state as { returnTo?: string } | null;
    expect(state?.returnTo).toBe("/calendar?date=2026-11-14");
  });

  it("PublicOnlyGuard redirects authenticated user to safe returnTo target", () => {
    useAuthStore.getState().setSession({ accessToken: "valid-token" });
    useAuthStore.getState().setAuthReady(true);

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/login",
            state: { returnTo: "/v2/dashboard?taskId=abc" },
          },
        ]}
      >
        <Routes>
          <Route element={<PublicOnlyGuard />}>
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
          <Route
            path="/v2/dashboard"
            element={<div>V2 Dashboard Content</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("V2 Dashboard Content")).toBeDefined();
  });

  it("PublicOnlyGuard falls back to preferred dashboard when returnTo is absent or invalid", () => {
    localStorage.setItem(UI_VERSION_STORAGE_KEY, "v2");
    useAuthStore.getState().setSession({ accessToken: "valid-token" });
    useAuthStore.getState().setAuthReady(true);

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/login",
            state: { returnTo: "https://malicious.example.com" },
          },
        ]}
      >
        <Routes>
          <Route element={<PublicOnlyGuard />}>
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
          <Route
            path="/v2/dashboard"
            element={<div>Preferred V2 Dashboard</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Preferred V2 Dashboard")).toBeDefined();
  });

  it("RootGuard redirects authenticated user to preferred dashboard", () => {
    localStorage.setItem(UI_VERSION_STORAGE_KEY, "v2");
    useAuthStore.getState().setSession({ accessToken: "valid-token" });
    useAuthStore.getState().setAuthReady(true);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<RootGuard />}>
            <Route path="/" element={<div>Landing Page</div>} />
          </Route>
          <Route
            path="/v2/dashboard"
            element={<div>V2 Preferred Dashboard</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("V2 Preferred Dashboard")).toBeDefined();
  });
});
