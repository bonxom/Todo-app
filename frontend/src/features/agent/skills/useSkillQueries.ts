import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { skillService } from "@/shared/services/skillService";
import { skillKeys } from "./skillKeys";
import type {
  SkillSummary,
  SkillCreateInput,
  SkillUpdateInput,
} from "@/shared/types/skill";

export function currentSessionKey(): string {
  const { user, sessionRevision } = useAuthStore.getState();
  return `${user?._id || user?.id || "anon"}:${sessionRevision}`;
}

export function useSessionKey(): string {
  const user = useAuthStore((state) => state.user);
  const revision = useAuthStore((state) => state.sessionRevision);
  const userId = user?._id || user?.id || "anon";
  return `${userId}:${revision}`;
}

export function useSkills() {
  const sessionKey = useSessionKey();
  return useQuery({
    queryKey: skillKeys.all(sessionKey),
    queryFn: () => skillService.list(),
  });
}

export function useSkill(id?: string) {
  const sessionKey = useSessionKey();
  return useQuery({
    queryKey: skillKeys.detail(sessionKey, id ?? ""),
    queryFn: () => skillService.get(id!),
    enabled: Boolean(id),
  });
}

export function useSkillTemplates(enabled = true) {
  return useQuery({
    enabled,
    queryKey: skillKeys.templates(),
    queryFn: () => skillService.templates(),
  });
}

export function useSkillTemplate(templateId?: string) {
  return useQuery({
    queryKey: skillKeys.templateDetail(templateId ?? ""),
    queryFn: () => skillService.template(templateId!),
    enabled: Boolean(templateId),
  });
}

export function useCreateSkillMutation() {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();

  return useMutation({
    retry: false,
    mutationKey: ["skills", sessionKey, "create"],
    mutationFn: (input: SkillCreateInput) => skillService.create(input),
    onSuccess: (created) => {
      if (currentSessionKey() !== sessionKey) return;
      queryClient.invalidateQueries({ queryKey: skillKeys.all(sessionKey) });
      queryClient.setQueryData(
        skillKeys.detail(sessionKey, created.id),
        created,
      );
    },
  });
}

export function useUpdateSkillMutation() {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();

  return useMutation({
    retry: false,
    mutationKey: ["skills", sessionKey, "update"],
    mutationFn: ({ id, input }: { id: string; input: SkillUpdateInput }) =>
      skillService.update(id, input),
    onSuccess: (updated) => {
      if (currentSessionKey() !== sessionKey) return;
      queryClient.invalidateQueries({ queryKey: skillKeys.all(sessionKey) });
      queryClient.setQueryData(
        skillKeys.detail(sessionKey, updated.id),
        updated,
      );
    },
    onError: () => {
      if (currentSessionKey() !== sessionKey) return;
      // Invalidate list to refresh versions, but caller handles preserving draft
      queryClient.invalidateQueries({ queryKey: skillKeys.all(sessionKey) });
    },
  });
}

export function useToggleSkillMutation() {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();

  return useMutation({
    retry: false,
    mutationKey: ["skills", sessionKey, "toggle"],
    mutationFn: async ({
      skill,
      enabled,
    }: {
      skill: SkillSummary;
      enabled: boolean;
    }) => {
      if (currentSessionKey() !== sessionKey)
        throw new Error("Session changed");
      const full = await skillService.get(skill.id);
      if (currentSessionKey() !== sessionKey)
        throw new Error("Session changed");
      return skillService.update(skill.id, {
        expectedVersion: full.version,
        name: full.name,
        description: full.description,
        instructions: full.instructions,
        enabled,
      });
    },
    onMutate: async ({ skill, enabled }) => {
      await queryClient.cancelQueries({ queryKey: skillKeys.all(sessionKey) });
      if (currentSessionKey() !== sessionKey) return;
      const previous = queryClient.getQueryData<SkillSummary[]>(
        skillKeys.all(sessionKey),
      );

      if (previous) {
        queryClient.setQueryData<SkillSummary[]>(
          skillKeys.all(sessionKey),
          previous.map((s) => (s.id === skill.id ? { ...s, enabled } : s)),
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (currentSessionKey() !== sessionKey) return;
      if (context?.previous) {
        queryClient.setQueryData(skillKeys.all(sessionKey), context.previous);
      }
      queryClient.invalidateQueries({ queryKey: skillKeys.all(sessionKey) });
    },
    onSuccess: (updated) => {
      if (currentSessionKey() !== sessionKey) return;
      queryClient.setQueryData(
        skillKeys.detail(sessionKey, updated.id),
        updated,
      );
    },
    onSettled: () => {
      if (currentSessionKey() !== sessionKey) return;
      queryClient.invalidateQueries({ queryKey: skillKeys.all(sessionKey) });
    },
  });
}

export function useDeleteSkillMutation() {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();

  return useMutation({
    retry: false,
    mutationKey: ["skills", sessionKey, "delete"],
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string;
      expectedVersion: number;
    }) => skillService.remove(id, expectedVersion),
    onSuccess: (_, { id }) => {
      if (currentSessionKey() !== sessionKey) return;
      queryClient.invalidateQueries({ queryKey: skillKeys.all(sessionKey) });
      queryClient.removeQueries({ queryKey: skillKeys.detail(sessionKey, id) });
    },
    onError: () => {
      if (currentSessionKey() !== sessionKey) return;
      queryClient.invalidateQueries({ queryKey: skillKeys.all(sessionKey) });
    },
  });
}

export function useImportTemplateMutation() {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();

  return useMutation({
    retry: false,
    mutationKey: ["skills", sessionKey, "import-template"],
    mutationFn: ({
      templateId,
      expectedTemplateVersion,
    }: {
      templateId: string;
      expectedTemplateVersion: string;
    }) => skillService.importTemplate(templateId, expectedTemplateVersion),
    onSuccess: (imported) => {
      if (currentSessionKey() !== sessionKey) return;
      queryClient.invalidateQueries({ queryKey: skillKeys.all(sessionKey) });
      queryClient.setQueryData(
        skillKeys.detail(sessionKey, imported.id),
        imported,
      );
    },
  });
}
