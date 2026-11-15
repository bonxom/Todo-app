import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  type Location,
} from "react-router-dom";
import VersionSwitcher from "../VersionSwitcher";
import { UI_VERSION_STORAGE_KEY } from "@/shared/navigation/uiVersions";

function LocationSpy({ onLocation }: { onLocation: (loc: Location) => void }) {
  const loc = useLocation();
  onLocation(loc);
  return null;
}

function BackButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Go Back</button>;
}

function renderSwitcher(initialEntries: string[]) {
  let currentLocation: Location | null = null;

  const result = render(
    <MemoryRouter initialEntries={initialEntries}>
      <LocationSpy onLocation={(loc) => (currentLocation = loc)} />
      <VersionSwitcher />
      <BackButton />
      <Routes>
        <Route path="/dashboard" element={<div>V1 Dashboard</div>} />
        <Route path="/v2/dashboard" element={<div>V2 Dashboard</div>} />
        <Route path="/calendar" element={<div>Calendar</div>} />
        <Route path="/v2/other" element={<div>V2 Other</div>} />
      </Routes>
    </MemoryRouter>,
  );

  return {
    ...result,
    getCurrentLocation: (): Location => {
      if (!currentLocation) throw new Error("Location not captured");
      return currentLocation;
    },
  };
}

describe("VersionSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders 'Try V2' when on V1 dashboard and switches to /v2/dashboard on click", async () => {
    const user = userEvent.setup();
    const { getCurrentLocation } = renderSwitcher(["/dashboard"]);

    const button = screen.getByRole("button", { name: /Try V2/i });
    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(getCurrentLocation().pathname).toBe("/v2/dashboard");
    expect(localStorage.getItem(UI_VERSION_STORAGE_KEY)).toBe("v2");
  });

  it("renders 'Back to V1' when on V2 dashboard and switches to /dashboard on click", async () => {
    const user = userEvent.setup();
    const { getCurrentLocation } = renderSwitcher(["/v2/dashboard"]);

    const button = screen.getByRole("button", { name: /Back to V1/i });
    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(getCurrentLocation().pathname).toBe("/dashboard");
    expect(localStorage.getItem(UI_VERSION_STORAGE_KEY)).toBe("v1");
  });

  it("preserves only taskId query param when switching dashboard to V2", async () => {
    const user = userEvent.setup();
    const { getCurrentLocation } = renderSwitcher([
      "/dashboard?taskId=507f1f77bcf86cd799439011&page=3#filter",
    ]);

    await user.click(screen.getByRole("button", { name: /Try V2/i }));

    expect(getCurrentLocation().pathname).toBe("/v2/dashboard");
    expect(getCurrentLocation().search).toBe(
      "?taskId=507f1f77bcf86cd799439011",
    );
    expect(getCurrentLocation().hash).toBe("");
  });

  it("falls back to /v2/dashboard without state when switching from unsupported V1 page", async () => {
    const user = userEvent.setup();
    const { getCurrentLocation } = renderSwitcher([
      "/calendar?date=2026-11-14#week",
    ]);

    await user.click(screen.getByRole("button", { name: /Try V2/i }));

    expect(getCurrentLocation().pathname).toBe("/v2/dashboard");
    expect(getCurrentLocation().search).toBe("");
  });

  it("navigates successfully even when localStorage throws an error", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    const user = userEvent.setup();
    const { getCurrentLocation } = renderSwitcher(["/dashboard"]);

    await user.click(screen.getByRole("button", { name: /Try V2/i }));

    expect(getCurrentLocation().pathname).toBe("/v2/dashboard");
  });

  it("follows URL rather than saved preference on history Back", async () => {
    const user = userEvent.setup();
    renderSwitcher(["/dashboard"]);

    // Click to switch to V2
    await user.click(screen.getByRole("button", { name: /Try V2/i }));
    expect(
      screen.getByRole("button", { name: /Back to V1/i }),
    ).toBeInTheDocument();

    // Now go back
    await user.click(screen.getByRole("button", { name: "Go Back" }));
    expect(screen.getByRole("button", { name: /Try V2/i })).toBeInTheDocument();
  });
});
