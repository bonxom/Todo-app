import { useEffect, useRef, useState } from "react";
import { attachmentService } from "@/shared/services/attachmentService";
import type { ChatAttachment } from "@/shared/types/domain";
function AttachmentItem({
  conversationId,
  file,
}: {
  conversationId: string;
  file: ChatAttachment;
}) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const downloads = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const isImage = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ].includes(file.mimeType);
  useEffect(() => {
    if (!isImage) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void attachmentService
      .get(conversationId, file.id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [conversationId, file.id, isImage, revision]);
  useEffect(() => {
    const active = downloads.current;
    return () => {
      for (const [link, timer] of active) {
        clearTimeout(timer);
        URL.revokeObjectURL(link);
      }
      active.clear();
    };
  }, []);
  const download = async () => {
    setLoading(true);
    setError(false);
    try {
      const blob = await attachmentService.get(conversationId, file.id);
      const link = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = link;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      downloads.current.set(
        link,
        setTimeout(() => {
          URL.revokeObjectURL(link);
          downloads.current.delete(link);
        }, 1000),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <li className="mt-2 min-w-0 rounded-xl border border-current/20 p-2">
      {isImage && url && (
        <img
          src={url}
          alt={file.name}
          className="mb-2 max-h-48 max-w-full rounded-lg object-contain"
        />
      )}
      <button
        type="button"
        className="ui-focus-ring block max-w-full truncate rounded text-left text-xs underline"
        disabled={loading}
        onClick={download}
        aria-label={`Download ${file.name}`}
      >
        {loading ? "Downloading…" : file.name} ·{" "}
        {Math.max(1, Math.ceil(file.size / 1024))} KB
      </button>
      {error && (
        <div role="alert" className="mt-1 text-xs">
          Could not load file.{" "}
          <button
            type="button"
            className="ui-focus-ring underline"
            onClick={() =>
              isImage ? setRevision((value) => value + 1) : void download()
            }
          >
            Retry
          </button>
        </div>
      )}
    </li>
  );
}
export default function AttachmentList({
  conversationId,
  files,
}: {
  conversationId?: string;
  files?: ChatAttachment[];
}) {
  if (!conversationId || !files?.length) return null;
  return (
    <ul aria-label="Message attachments">
      {files.map((file) => (
        <AttachmentItem
          key={`${conversationId}-${file.id}`}
          conversationId={conversationId}
          file={file}
        />
      ))}
    </ul>
  );
}
