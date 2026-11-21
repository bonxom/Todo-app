import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, BotMessageSquare, Sparkles } from "lucide-react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { SettingsVersion } from "../types";
import {
  SettingsCard,
  SettingsSegmentedControl,
  SettingsToggleRow,
} from "./SettingsPrimitives";
import {
  settingsBorderClass,
  settingsSecondaryButtonClass,
  settingsTextClass,
} from "./settingsStyles";

export default function AgentSettingsSection({
  version,
}: {
  version: SettingsVersion;
}) {
  const { t } = useTranslation("settings");
  const agent = useSettingsStore((state) => state.agent);
  const updateAgent = useSettingsStore((state) => state.updateAgent);

  const agentsPath = version === "v2" ? "/v2/agents" : "/agent";
  const skillsPath = version === "v2" ? "/v2/agents/skills" : "/agent/skills";

  return (
    <div className="space-y-5">
      <SettingsCard
        version={version}
        title={t("agent.heading")}
        description={t("agent.description")}
      >
        <div className="space-y-1">
          <SettingsToggleRow
            version={version}
            id="settings-agent-bubble"
            label={t("agent.showBubbleLabel")}
            description={t("agent.showBubbleHint")}
            checked={agent.showFloatingBubble}
            onChange={(showFloatingBubble) =>
              updateAgent({ showFloatingBubble })
            }
          />

          <div
            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t ${settingsBorderClass(version)}`}
          >
            <div className="space-y-0.5">
              <p
                className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
              >
                {t("agent.bubbleModeLabel")}
              </p>
              <p
                className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
              >
                {t("agent.bubbleModeHint")}
              </p>
            </div>

            <SettingsSegmentedControl
              version={version}
              label={t("agent.bubbleModeLabel")}
              value={agent.defaultBubbleMode}
              onChange={(defaultBubbleMode) =>
                updateAgent({ defaultBubbleMode })
              }
              options={[
                { value: "compact", label: t("agent.modeCompact") },
                { value: "docked", label: t("agent.modeDocked") },
              ]}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard version={version} title={t("agent.linksHeading")}>
        <div className="flex flex-wrap gap-3">
          <Link
            to={agentsPath}
            className={`${settingsSecondaryButtonClass(version)} [text-decoration:none]`}
          >
            <BotMessageSquare size={16} aria-hidden="true" />
            <span>{t("agent.openAgents")}</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <Link
            to={skillsPath}
            className={`${settingsSecondaryButtonClass(version)} [text-decoration:none]`}
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>{t("agent.manageSkills")}</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </SettingsCard>
    </div>
  );
}
