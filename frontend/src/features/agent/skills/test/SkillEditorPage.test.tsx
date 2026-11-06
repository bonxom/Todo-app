import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ApiError } from "@/shared/services/apiError";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SkillEditorPage } from "../SkillEditorPage";
import { skillService } from "@/shared/services/skillService";
import type { SkillDetail } from "@/shared/types/skill";

vi.mock("@/shared/services/skillService", () => ({
  skillService: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

function renderEditor(initialEntries = ["/agent/skills/new"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: "/agent/skills/new", element: <SkillEditorPage /> },
      { path: "/agent/skills/:skillId", element: <SkillEditorPage /> },
      { path: "/agent/skills", element: <p>Skill list destination</p> },
    ],
    { initialEntries },
  );
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, queryClient, router };
}

describe("SkillEditorPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("validates form fields and disables submit if name or instructions are missing", async () => {
    renderEditor(["/agent/skills/new"]);

    const saveButton = screen.getByRole("button", { name: /Lưu kỹ năng/i });
    expect(saveButton).toBeDisabled();

    const nameInput = screen.getByLabelText(/Tên kỹ năng/i);
    const instructionsInput = screen.getByLabelText(/Hướng dẫn chi tiết/i);

    const user = userEvent.setup();
    await user.type(nameInput, "My Skill");
    await user.type(instructionsInput, "Do something useful");

    expect(saveButton).toBeDisabled();
    await user.type(screen.getByLabelText(/Mô tả kỹ năng/i), "When writing");
    expect(saveButton).not.toBeDisabled();
  });

  it("creates a new skill successfully", async () => {
    const user = userEvent.setup();
    const createdSkill: SkillDetail = {
      id: "new-uuid",
      name: "Vocabulary Helper",
      description: "Suggests words",
      instructions: "Always suggest 3 C1 words",
      enabled: true,
      version: 1,
      updatedAt: "2026-11-06T00:00:00.000Z",
    };
    vi.mocked(skillService.create).mockResolvedValueOnce(createdSkill);

    renderEditor(["/agent/skills/new"]);

    await user.type(screen.getByLabelText(/Tên kỹ năng/i), "Vocabulary Helper");
    await user.type(screen.getByLabelText(/Mô tả kỹ năng/i), "Suggests words");
    await user.type(
      screen.getByLabelText(/Hướng dẫn chi tiết/i),
      "Always suggest 3 C1 words",
    );

    const saveButton = screen.getByRole("button", { name: /Lưu kỹ năng/i });
    await user.click(saveButton);

    expect(skillService.create).toHaveBeenCalledWith({
      name: "Vocabulary Helper",
      description: "Suggests words",
      instructions: "Always suggest 3 C1 words",
      enabled: true,
    });
  });

  it("retains user draft in textarea when update responds with 409 conflict", async () => {
    const user = userEvent.setup();
    const existingSkill: SkillDetail = {
      id: "skill-123",
      name: "Writing Guide",
      description: "General guide",
      instructions: "Original instructions",
      enabled: true,
      version: 1,
      updatedAt: "2026-11-06T00:00:00.000Z",
    };
    vi.mocked(skillService.get).mockResolvedValueOnce(existingSkill);
    vi.mocked(skillService.update).mockRejectedValueOnce(
      new ApiError("Conflict", 409, "http"),
    );

    renderEditor(["/agent/skills/skill-123"]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Writing Guide")).toBeInTheDocument();
    });

    const instructionsInput = screen.getByLabelText(/Hướng dẫn chi tiết/i);
    await user.clear(instructionsInput);
    await user.type(
      instructionsInput,
      "Newly edited instructions that conflicted",
    );

    const saveButton = screen.getByRole("button", { name: /Lưu thay đổi/i });
    await user.click(saveButton);

    // 409 conflict alert must be shown
    await waitFor(() => {
      expect(
        screen.getByText(/Phiên bản kỹ năng đã thay đổi trên máy chủ/i),
      ).toBeInTheDocument();
    });

    // The user's unsaved draft must be preserved in the textarea!
    expect(instructionsInput).toHaveValue(
      "Newly edited instructions that conflicted",
    );
  });

  it("confirms before deleting a skill with expectedVersion", async () => {
    const user = userEvent.setup();
    const existingSkill: SkillDetail = {
      id: "skill-to-delete",
      name: "Obsolete Skill",
      description: "To be removed",
      instructions: "Do not use",
      enabled: true,
      version: 2,
      updatedAt: "2026-11-06T00:00:00.000Z",
    };
    vi.mocked(skillService.get).mockResolvedValueOnce(existingSkill);
    vi.mocked(skillService.remove).mockResolvedValueOnce({
      id: "skill-to-delete",
    });

    renderEditor(["/agent/skills/skill-to-delete"]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Obsolete Skill")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /Xóa kỹ năng/i });
    await user.click(deleteButton);

    // Confirm dialog appears
    const confirmButton = screen.getByRole("button", {
      name: /Xác nhận xóa/i,
    });
    await user.click(confirmButton);

    expect(skillService.remove).toHaveBeenCalledWith("skill-to-delete", 2);
  });
  it("blocks browser navigation and preserves drafts on server refetch", async () => {
    const original = {
      id: "one",
      name: "Original",
      description: "Desc",
      instructions: "Initial",
      enabled: true,
      version: 1,
      updatedAt: "now",
    };
    vi.mocked(skillService.get).mockResolvedValue(original);
    const { queryClient, router } = renderEditor(["/agent/skills/one"]);
    const input = await screen.findByDisplayValue("Initial");
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, "Unsaved draft");
    vi.mocked(skillService.get).mockResolvedValue({
      ...original,
      instructions: "Remote version",
      version: 2,
    });
    await queryClient.refetchQueries();
    expect(input).toHaveValue("Unsaved draft");
    await router.navigate("/agent/skills");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Tiếp tục chỉnh sửa" }),
    );
    expect(input).toHaveValue("Unsaved draft");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(skillService.update).toHaveBeenCalledWith(
      "one",
      expect.objectContaining({ expectedVersion: 1 }),
    );
  });

  it("confirms draft discard then fetches the latest version after a conflict", async () => {
    const original = {
      id: "one",
      name: "Original",
      description: "Desc",
      instructions: "Initial",
      enabled: true,
      version: 1,
      updatedAt: "now",
    };
    vi.mocked(skillService.get).mockResolvedValue(original);
    vi.mocked(skillService.update).mockRejectedValue(
      new ApiError("Conflict", 409, "http"),
    );
    renderEditor(["/agent/skills/one"]);
    const input = await screen.findByDisplayValue("Initial");
    const user = userEvent.setup();
    await user.type(input, " draft");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await user.click(
      await screen.findByRole("button", { name: "Tải bản mới" }),
    );
    expect(input).toHaveValue("Initial draft");
    vi.mocked(skillService.get).mockResolvedValue({
      ...original,
      instructions: "Remote",
      version: 2,
    });
    await user.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
    await waitFor(() => expect(input).toHaveValue("Remote"));
  });
});
