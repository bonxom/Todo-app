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
        className="chat-avatar chat-avatar--fallback"
        role="img"
        aria-label={label}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
    );
  return (
    <img
      className="chat-avatar"
      src={current}
      alt={label}
      width={28}
      height={28}
      referrerPolicy="no-referrer"
      onError={() => setFailed((previous) => [...previous, current])}
    />
  );
}
