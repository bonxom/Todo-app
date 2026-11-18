import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "../router";
import { useAuthStore } from "@/stores/useAuthStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteLoadError from "../RouteLoadError";

function renderWithRouter(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("versionRoutes route integration", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useAuthStore.getState().setSession({ accessToken: "test-token" });
    useAuthStore.getState().setAuthReady(true);
  });

  it("renders V2 dashboard scaffold when navigating to /v2/dashboard", async () => {
    renderWithRouter(["/v2/dashboard"]);

    await waitFor(
      () => {
        expect(screen.getByTestId("v2-layout")).toBeInTheDocument();
        expect(screen.getByTestId("v2-dashboard-page")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("replaces /v2 with /v2/dashboard", async () => {
    renderWithRouter(["/v2"]);

    await waitFor(
      () => {
        expect(screen.getByTestId("v2-layout")).toBeInTheDocument();
        expect(screen.getByTestId("v2-dashboard-page")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("renders V2 404 page for unknown /v2 route", async () => {
    renderWithRouter(["/v2/missing-route"]);

    await waitFor(() => {
      expect(screen.getByTestId("v2-not-found-page")).toBeInTheDocument();
    });
  });

  it("RouteLoadError renders recovery controls including plain anchor to /dashboard", () => {
    render(<RouteLoadError error={new Error("Chunk load failed")} />);

    expect(screen.getByRole("button", { name: /Reload/i })).toBeInTheDocument();
    const anchor = screen.getByRole("link", { name: /Back to V1/i });
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute("href", "/dashboard");
  });
});
