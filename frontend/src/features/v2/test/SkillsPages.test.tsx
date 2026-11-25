import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import "@/shared/i18n";
import SkillsPage from "../pages/SkillsPage";
import SkillEditorPage from "../pages/SkillEditorPage";
import {
  createTestQueryClient,
  renderWithProviders,
  resetTestSession,
} from "./testSupport";

const mocks = vi.hoisted(() => {
  const skills = [
    {
      id: "s1",
      name: "Writing Guide",
      description: "Style tactics",
      enabled: true,
      version: 3,
      updatedAt: "2026-11-14T00:00:00.000Z",
    },
    {
      id: "s2",
      name: "Standup",
      description: "Daily summary",
      enabled: false,
      version: 1,
      updatedAt: "2026-11-14T00:00:00.000Z",
    },
  ];
  return {
    skills,
    detail: { ...skills[0], instructions: "Write clearly and briefly." },
    toggle: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    create: vi.fn(),
    refetch: vi.fn(),
  };
});

vi.mock("@/features/agent/skills/useSkillQueries", () => ({
  useSessionKey: () => "test-session",
  currentSessionKey: () => "test-session",
  useSkills: () => ({
    data: mocks.skills,
    isLoading: false,
    error: null,
    refetch: mocks.refetch,
  }),
  useSkill: (id?: string) => ({
    data: id ? mocks.detail : undefined,
    isLoading: false,
    error: null,
    refetch: mocks.refetch,
  }),
  useSkillTemplates: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: mocks.refetch,
  }),
  useImportTemplateMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateSkillMutation: () => ({
    mutateAsync: mocks.create,
    isPending: false,
  }),
  useUpdateSkillMutation: () => ({
    mutateAsync: mocks.update,
    isPending: false,
  }),
  useToggleSkillMutation: () => ({
    mutateAsync: mocks.toggle,
    isPending: false,
  }),
  useDeleteSkillMutation: () => ({
    mutateAsync: mocks.remove,
    isPending: false,
  }),
}));

function renderEditor(initialEntry: string) {
  const router = createMemoryRouter(
    [
      { path: "/v2/agents/skills/new", element: <SkillEditorPage /> },
      { path: "/v2/agents/skills/:skillId", element: <SkillEditorPage /> },
      { path: "/v2/agents/skills", element: <p>skills list</p> },
    ],
    { initialEntries: [initialEntry] },
  );
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe("V2 skills library", () => {
  beforeEach(() => {
    resetTestSession();
    mocks.toggle.mockReset().mockResolvedValue({});
  });

  it("lists skills, filters by search and toggles availability", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SkillsPage />, {
      initialEntries: ["/v2/agents/skills"],
    });

    expect(screen.getByText("Writing Guide")).toBeInTheDocument();
    expect(screen.getByText("Standup")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "writing");
    expect(screen.getByText("Writing Guide")).toBeInTheDocument();
    expect(screen.queryByText("Standup")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    await user.click(
      screen.getByRole("switch", { name: "Enable skill: Standup" }),
    );

    expect(mocks.toggle).toHaveBeenCalledWith({
      skill: mocks.skills[1],
      enabled: true,
    });
  });

  it("links the active tab and the create action", () => {
    renderWithProviders(<SkillsPage />, {
      initialEntries: ["/v2/agents/skills"],
    });

    expect(
      screen.getByRole("link", { name: /Skills/i, current: "page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Chat/i })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: /Create skill/i })).toHaveAttribute(
      "href",
      "/v2/agents/skills/new",
    );
  });
});

describe("V2 skill editor", () => {
  beforeEach(() => {
    resetTestSession();
    mocks.update.mockReset().mockResolvedValue({
      ...mocks.detail,
      version: 4,
    });
    mocks.create.mockReset().mockResolvedValue({ id: "new-skill" });
    mocks.remove.mockReset().mockResolvedValue({ id: "s1" });
  });

  it("keeps save disabled until every field is valid, then creates", async () => {
    const user = userEvent.setup();
    renderEditor("/v2/agents/skills/new");

    const save = screen.getByRole("button", { name: "Save skill" });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText("Skill name"), "Interview prep");
    expect(save).toBeDisabled();

    await user.type(
      screen.getByLabelText("Description"),
      "Questions to rehearse",
    );
    await user.type(
      screen.getByLabelText("Instructions"),
      "Ask one question at a time.",
    );
    expect(save).toBeEnabled();

    await user.click(save);
    expect(mocks.create).toHaveBeenCalledWith({
      name: "Interview prep",
      description: "Questions to rehearse",
      instructions: "Ask one question at a time.",
      enabled: true,
    });
  });

  it("saves an existing skill with its server version", async () => {
    const user = userEvent.setup();
    renderEditor("/v2/agents/skills/s1");

    const name = screen.getByLabelText("Skill name");
    expect(name).toHaveValue("Writing Guide");

    await user.type(name, " v2");
    await user.click(screen.getByRole("button", { name: "Save skill" }));

    expect(mocks.update).toHaveBeenCalledWith({
      id: "s1",
      input: {
        expectedVersion: 3,
        name: "Writing Guide v2",
        description: "Style tactics",
        instructions: "Write clearly and briefly.",
        enabled: true,
      },
    });
  });

  it("deletes after an explicit confirmation", async () => {
    const user = userEvent.setup();
    renderEditor("/v2/agents/skills/s1");

    await user.click(screen.getByRole("button", { name: "Delete skill" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Delete this skill/ }));
    expect(mocks.remove).toHaveBeenCalledWith({
      id: "s1",
      expectedVersion: 3,
    });
  });

  it("toggles markdown preview for the instructions", async () => {
    const user = userEvent.setup();
    renderEditor("/v2/agents/skills/s1");

    expect(screen.getByLabelText("Instructions")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.queryByLabelText("Instructions")).not.toBeInTheDocument();
    expect(screen.getByText(/Write clearly and briefly/)).toBeInTheDocument();
  });
});
