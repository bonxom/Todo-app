import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { skillService } from "@/shared/services/skillService";
import type { SkillDetail } from "@/shared/types/skill";
import {
  useCreateSkillMutation,
  useToggleSkillMutation,
} from "../useSkillQueries";

vi.mock("@/shared/services/skillService", () => ({
  skillService: { create: vi.fn(), get: vi.fn(), update: vi.fn() },
}));
const original = useAuthStore.getState();
afterEach(() => {
  useAuthStore.setState(original);
  vi.resetAllMocks();
});
const skill: SkillDetail = {
  id: "one",
  name: "Private",
  description: "Desc",
  instructions: "Secret",
  enabled: true,
  version: 1,
  updatedAt: "now",
};
function harness() {
  const queryClient = new QueryClient();
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}
it("does not recreate old private caches after logout while a create finishes", async () => {
  let resolve!: (skill: SkillDetail) => void;
  vi.mocked(skillService.create).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const { wrapper, queryClient } = harness();
  const { result } = renderHook(() => useCreateSkillMutation(), { wrapper });
  let pending!: Promise<SkillDetail>;
  act(() => {
    pending = result.current.mutateAsync(skill);
  });
  await waitFor(() => expect(skillService.create).toHaveBeenCalled());
  act(() => {
    useAuthStore.getState().clearSession();
    queryClient.clear();
  });
  await act(async () => {
    resolve(skill);
    await pending;
  });
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
});
it("does not issue the second request with another account after toggle GET completes", async () => {
  let resolve!: (skill: SkillDetail) => void;
  vi.mocked(skillService.get).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const { wrapper } = harness();
  const { result } = renderHook(() => useToggleSkillMutation(), { wrapper });
  let pending!: Promise<unknown>;
  act(() => {
    pending = result.current
      .mutateAsync({ skill, enabled: false })
      .catch((error: unknown) => error);
  });
  await waitFor(() => expect(skillService.get).toHaveBeenCalled());
  act(() => useAuthStore.getState().clearSession());
  await act(async () => {
    resolve(skill);
    await pending;
  });
  expect(skillService.update).not.toHaveBeenCalled();
});
