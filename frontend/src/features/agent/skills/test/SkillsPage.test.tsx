import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SkillsPage } from "../SkillsPage";
import { skillService } from "@/shared/services/skillService";
import type { SkillSummary } from "@/shared/types/skill";

vi.mock("@/shared/services/skillService", () => ({
  skillService: {
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    templates: vi.fn(),
  },
}));

const mockSkills: SkillSummary[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "IELTS Speaking",
    description: "Speaking part 1, 2, 3 guidelines",
    enabled: true,
    version: 1,
    updatedAt: "2026-11-06T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Gym Workout",
    description: "Daily workout routine",
    enabled: false,
    version: 2,
    updatedAt: "2026-11-05T00:00:00.000Z",
  },
];

function renderSkillsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SkillsPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe("SkillsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when user has no skills", async () => {
    vi.mocked(skillService.list).mockResolvedValueOnce([]);

    renderSkillsPage();

    await waitFor(() => {
      expect(
        screen.getByText(/Chưa có kỹ năng cá nhân nào/i),
      ).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Tạo kỹ năng/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Thêm từ mẫu/i).length).toBeGreaterThan(0);
  });

  it("renders list of skills and filters by search query", async () => {
    const user = userEvent.setup();
    vi.mocked(skillService.list).mockResolvedValue(mockSkills);

    renderSkillsPage();

    await waitFor(() => {
      expect(screen.getByText("IELTS Speaking")).toBeInTheDocument();
      expect(screen.getByText("Gym Workout")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm kỹ năng/i);
    await user.type(searchInput, "IELTS");

    expect(screen.getByText("IELTS Speaking")).toBeInTheDocument();
    expect(screen.queryByText("Gym Workout")).not.toBeInTheDocument();
  });

  it("toggles skill enabled state optimistically", async () => {
    const user = userEvent.setup();
    vi.mocked(skillService.list).mockResolvedValue(mockSkills);
    vi.mocked(skillService.get).mockResolvedValueOnce({
      ...mockSkills[0],
      instructions: "Sample instructions",
    });
    vi.mocked(skillService.update).mockResolvedValueOnce({
      ...mockSkills[0],
      enabled: false,
      version: 2,
      instructions: "Sample instructions",
    });

    renderSkillsPage();

    await waitFor(() => {
      expect(screen.getByText("IELTS Speaking")).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole("switch", {
      name: /Bật\/tắt IELTS Speaking/i,
    });
    expect(toggleButton).toHaveAttribute("aria-checked", "true");

    vi.mocked(skillService.list).mockResolvedValue([
      { ...mockSkills[0], enabled: false },
      mockSkills[1],
    ]);
    await user.click(toggleButton);
    await waitFor(() =>
      expect(toggleButton).toHaveAttribute("aria-checked", "false"),
    );
    expect(skillService.update).toHaveBeenCalledWith(
      mockSkills[0].id,
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});
