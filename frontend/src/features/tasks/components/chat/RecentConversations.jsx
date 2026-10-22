import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { aiService } from "@/shared/services/aiService";

function relativeTime(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export default function RecentConversations({ onOpen, disabled }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const viewAllRef = useRef(null);
  const searchRef = useRef(null);
  const closeHistory = () => {
    setShowAll(false);
    setQuery("");
    requestAnimationFrame(() => viewAllRef.current?.focus());
  };
  useEffect(() => {
    if (showAll) searchRef.current?.focus();
  }, [showAll]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    aiService.listConversations().then((items) => {
      if (active) setConversations(items);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [attempt]);

  if (loading) return <p role="status" className="py-4 text-sm text-[var(--color-text-muted)]">Đang tải hội thoại…</p>;
  if (error) return (
    <div className="space-y-2 py-4 text-sm text-[var(--color-text-muted)]">
      <p>Không tải được hội thoại cũ.</p>
      <button type="button" className="ui-focus-ring rounded text-[var(--color-accent)]" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button>
    </div>
  );
  if (!conversations.length) return <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">No messages yet. Start a conversation!</div>;

  return (
    <section aria-label="Hội thoại gần đây" className="flex h-full min-h-0 flex-col py-2" onKeyDown={(event) => {
      if (showAll && event.key === "Escape") {
        event.stopPropagation();
        closeHistory();
      }
    }}>
      <h2 className="ui-chat-history-label mb-2">Chats</h2>
      <div className={showAll ? "flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-2" : ""}>
      {showAll && <>
        <div className="mx-1 flex shrink-0 items-center gap-2 border-b border-[var(--color-line)] px-2 py-3">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <input ref={searchRef} type="search" aria-label="Search recent chats" placeholder="Search recent chats"
            value={query} onChange={(event) => setQuery(event.target.value)}
            className="ui-focus-ring min-w-0 flex-1 rounded bg-transparent px-1 py-1 text-sm text-[var(--color-text)] outline-none" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">All chats</span>
          <button type="button" onClick={closeHistory} aria-label="Close chat history" title="Close chat history"
            className="ui-focus-ring rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </>}
      <ul className={showAll ? "min-h-0 space-y-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]" : "space-y-1"}>
        {(showAll ? conversations.filter((item) => item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : conversations.slice(0, 3)).map((conversation) => (
          <li key={conversation.id}>
            <button type="button" disabled={disabled} onClick={() => onOpen(conversation.id)}
              className="ui-focus-ring flex w-full items-center gap-4 rounded-lg px-2 py-2.5 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-50">
              <span className="min-w-0 flex-1 truncate" title={conversation.title}>{conversation.title}</span>
              <time dateTime={conversation.updatedAt} title={new Date(conversation.updatedAt).toLocaleString()} className="shrink-0 text-xs text-[var(--color-text-muted)]">{relativeTime(conversation.updatedAt)}</time>
            </button>
          </li>
        ))}
      </ul>
      {showAll && !conversations.some((item) => item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) && <p role="status" className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">No matching chats</p>}
      </div>
      {!showAll && conversations.length > 3 && <button ref={viewAllRef} type="button" className="ui-chat-history-label ui-focus-ring mt-2 self-start" onClick={() => setShowAll(true)}>View all ({conversations.length})</button>}
    </section>
  );
}
