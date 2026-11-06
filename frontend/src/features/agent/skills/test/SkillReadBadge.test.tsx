import { ApiError } from "@/shared/services/apiError";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SkillReadBadge } from "../SkillReadBadge";
import { skillService } from "@/shared/services/skillService";

vi.mock("@/shared/services/skillService", () => ({
  skillService: {
    get: vi.fn(),
  },
}));

function renderBadge(skill: { id: string; name: string; version: number }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SkillReadBadge skill={skill} />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe("SkillReadBadge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders read badge with skill name from metadata", () => {
    vi.mocked(skillService.get).mockResolvedValueOnce({
      id: "11111111-1111-4111-8111-111111111111",
      name: "IELTS Writing",
      description: "Rubric",
      instructions: "Focus on Cohesion",
      enabled: true,
      version: 1,
      updatedAt: "2026-11-06T00:00:00.000Z",
    });

    renderBadge({
      id: "11111111-1111-4111-8111-111111111111",
      name: "IELTS Writing",
      version: 1,
    });

    expect(screen.getByText(/Đã đọc: IELTS Writing/i)).toBeInTheDocument();
  });

  it("indicates when skill version has changed since it was read", async () => {
    const user = userEvent.setup();
    vi.mocked(skillService.get).mockResolvedValueOnce({
      id: "11111111-1111-4111-8111-111111111111",
      name: "IELTS Writing",
      description: "Rubric",
      instructions: "Focus on Cohesion",
      enabled: true,
      version: 3, // Current version is 3, but read version was 1
      updatedAt: "2026-11-06T00:00:00.000Z",
    });

    renderBadge({
      id: "11111111-1111-4111-8111-111111111111",
      name: "IELTS Writing",
      version: 1,
    });

    const badge = screen.getByRole("link", { name: /Đã đọc: IELTS Writing/i });
    expect(badge).toBeInTheDocument();

    await user.hover(badge);
    await waitFor(() => {
      expect(
        screen.getByText(/Hội thoại dùng phiên bản 1/i),
      ).toBeInTheDocument();
    });
  });

  it("handles deleted skill gracefully", async () => {
    const user = userEvent.setup();
    vi.mocked(skillService.get).mockRejectedValueOnce(
      new ApiError("Not found", 404, "http"),
    );

    renderBadge({
      id: "deleted-skill-id",
      name: "Old Removed Skill",
      version: 2,
    });

    const badge = screen.getByText(/Đã đọc: Old Removed Skill/i);
    expect(badge).toBeInTheDocument();

    await user.hover(badge);
    await waitFor(() => {
      expect(screen.getByText(/Skill không còn khả dụng/i)).toBeInTheDocument();
    });
  });
});
