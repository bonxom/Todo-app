import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  currentSessionKey,
  useImportTemplateMutation,
  useSessionKey,
  useSkillTemplates,
} from "@/features/agent/skills/useSkillQueries";
import V2Dialog from "./V2Dialog";

export interface SkillTemplateDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SkillTemplateDialog({
  open,
  onClose,
}: SkillTemplateDialogProps) {
  const { t } = useTranslation("v2");
  const { t: tAgent } = useTranslation("agent");
  const navigate = useNavigate();
  const sessionKey = useSessionKey();
  const {
    data: templates,
    isLoading,
    error,
    refetch,
  } = useSkillTemplates(open);
  const importMutation = useImportTemplateMutation();
  const [importError, setImportError] = useState<string | null>(null);

  const handleImport = async (templateId: string, version: string) => {
    setImportError(null);
    try {
      const created = await importMutation.mutateAsync({
        templateId,
        expectedTemplateVersion: version,
      });
      if (currentSessionKey() !== sessionKey) return;
      onClose();
      navigate(`/v2/agents/skills/${created.id}`);
    } catch (err) {
      if (currentSessionKey() !== sessionKey) return;
      setImportError(
        err instanceof Error
          ? err.message
          : tAgent("anErrorOccurredWhileSavingTheSkill"),
      );
    }
  };

  return (
    <V2Dialog
      open={open}
      title={tAgent("addFromTemplate")}
      onClose={onClose}
      className="v2-skills-dialog"
    >
      {isLoading ? (
        <p
          className="v2-skills-status flex flex-col items-center gap-[12px] p-[36px_16px] text-[var(--v2-muted)] text-[13px] text-center [&_>_svg]:flex-[0_0_auto]"
          role="status"
        >
          <Loader2
            size={18}
            className="v2-spin animate-[v2-spin_900ms_linear_infinite] [@media(prefers-reduced-motion:reduce)]:animate-none"
            aria-hidden="true"
          />
          {tAgent("loadingTemplates")}
        </p>
      ) : error ? (
        <div
          className="v2-skills-status flex flex-col items-center gap-[12px] p-[36px_16px] text-[var(--v2-muted)] text-[13px] text-center [&_>_svg]:flex-[0_0_auto]"
          role="alert"
        >
          <p>{tAgent("anErrorOccurredWhileSavingTheSkill")}</p>
          <button
            type="button"
            className="v2-btn"
            onClick={() => void refetch()}
          >
            {t("retry")}
          </button>
        </div>
      ) : (
        <ul className="v2-template-list flex flex-col gap-[12px] m-[0] p-[0] [list-style:none]">
          {(templates ?? []).map((template) => (
            <li
              key={template.id}
              className="v2-template-row flex items-center justify-between gap-[14px] flex-wrap p-[12px] [border:1px_solid_var(--v2-border)] rounded-[16px]"
            >
              <div>
                <p className="v2-template-name text-[14px] [font-weight:600]">
                  {template.name}
                </p>
                <p className="v2-template-description mt-[2px] text-[12px] text-[var(--v2-muted)]">
                  {template.description}
                </p>
                <p className="v2-template-version mt-[4px] text-[11px] text-[var(--v2-muted)] [font-variant-numeric:tabular-nums]">
                  {tAgent("currentVersionV")} {template.version}
                </p>
              </div>
              <button
                type="button"
                className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)]"
                disabled={importMutation.isPending}
                onClick={() => void handleImport(template.id, template.version)}
              >
                <ArrowUpRight size={15} aria-hidden="true" />
                <span>{tAgent("addToMySkills")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {importError && (
        <p className="v2-form-error text-[13px]" role="alert">
          {importError}
        </p>
      )}
    </V2Dialog>
  );
}
