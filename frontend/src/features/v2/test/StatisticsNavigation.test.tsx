import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import V2Sidebar from "../components/V2Sidebar";
import V2Topbar from "../components/V2Topbar";
import { renderWithProviders, resetTestSession } from "./testSupport";

describe("Statistics Navigation integration", () => {
  it("renders statistics link in V2Sidebar with active state on /v2/statistics", () => {
    resetTestSession();
    renderWithProviders(<V2Sidebar />, {
      initialEntries: ["/v2/statistics"],
    });

    const statsLink = screen.getByRole("link", { name: /statistics/i });
    expect(statsLink).toBeInTheDocument();
    expect(statsLink).toHaveAttribute("href", "/v2/statistics");
    expect(statsLink).toHaveAttribute("data-active", "true");
    expect(statsLink).toHaveAttribute("aria-current", "page");
  });

  it("renders statistics section title in V2Topbar on /v2/statistics", () => {
    resetTestSession();
    renderWithProviders(<V2Topbar onOpenNavigation={() => {}} />, {
      initialEntries: ["/v2/statistics"],
    });

    expect(screen.getByText(/statistics/i)).toBeInTheDocument();
  });
});
