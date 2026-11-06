import { useEffect, useState } from "react";
import { MessageSquare, Plus, Search, Loader2 } from "lucide-react";
import { aiService } from "@/shared/services/aiService";

interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface AgentHistoryListProps {
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  disabled?: boolean;
}

export function AgentHistoryList({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  disabled = false,
}: AgentHistoryListProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = loadedFor !== (activeConversationId ?? "latest");

  useEffect(() => {
    let active = true;
    aiService
      .listConversations()
      .then((items) => {
        if (active) setConversations(items || []);
      })
      .catch(() => {
        if (active) setConversations([]);
      })
      .finally(() => {
        if (active) setLoadedFor(activeConversationId ?? "latest");
      });
    return () => {
      active = false;
    };
  }, [activeConversationId]);

  const filtered = conversations.filter((c) =>
    (c.title || "Cuộc trò chuyện mới")
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          disabled={disabled}
          className="ui-btn-primary agent-new-chat-button"
        >
          <Plus className="h-4 w-4" />
          <span>Cuộc trò chuyện mới</span>
        </button>

        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm hội thoại..."
            aria-label="Tìm kiếm hội thoại"
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-1.5 pl-8 pr-3 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-hidden"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading && conversations.length === 0 ? (
          <div className="flex justify-center py-6 text-[var(--color-text-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
            {searchQuery ? "Không tìm thấy hội thoại" : "Chưa có hội thoại nào"}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((item) => {
              const isActive = item.id === activeConversationId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectConversation(item.id)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="truncate">
                    {item.title || "Cuộc trò chuyện mới"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
