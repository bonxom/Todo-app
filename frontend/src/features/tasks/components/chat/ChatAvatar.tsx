import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Bot, UserRound } from "lucide-react";

export const DEFAULT_CHAT_AVATAR =
  "https://i.pinimg.com/236x/16/d0/98/16d098f6a7b93394765e45962c0fb2d0.jpg";

export default function ChatAvatar({
  src,
  isUser = false,
  appearance = "default",
}: {
  src?: string;
  isUser?: boolean;
  appearance?: "default" | "orbit";
}) {
  const { t } = useTranslation("agent");

  const [failed, setFailed] = useState<string[]>([]);
  const preferred = src?.trim() || DEFAULT_CHAT_AVATAR;
  const current = failed.includes(preferred) ? DEFAULT_CHAT_AVATAR : preferred;
  const label = isUser ? t("yourAvatar") : t("agentAvatar");
  const Icon = isUser ? UserRound : Bot;
  if (
    (appearance === "orbit" && (!src?.trim() || failed.includes(preferred))) ||
    failed.includes(current)
  )
    return (
      <span
        className="chat-avatar w-[28px] h-[28px] flex-[0_0_28px] rounded-[50%] object-cover [border:1px_solid_var(--color-line)]
          [background:var(--color-surface-muted)] mt-[4px] chat-avatar--fallback flex items-center justify-center"
        role="img"
        aria-label={label}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
    );
  return (
    <img
      className="chat-avatar w-[28px] h-[28px] flex-[0_0_28px] rounded-[50%] object-cover [border:1px_solid_var(--color-line)] [background:var(--color-surface-muted)] mt-[4px]"
      src={current}
      alt={label}
      width={28}
      height={28}
      referrerPolicy="no-referrer"
      onError={() => setFailed((previous) => [...previous, current])}
    />
  );
}
