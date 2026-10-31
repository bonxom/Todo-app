export default function AttachmentComposer({
  files,
  disabled,
  onRemove,
}: {
  files: File[];
  disabled: boolean;
  onRemove: (index: number) => void;
}) {
  if (!files.length) return null;
  return (
    <div className="shrink-0 space-y-2 px-3 pb-3 sm:px-4">
      <ul aria-label="Selected attachments" className="flex flex-wrap gap-2">
        {files.map((file, index) => (
          <li
            key={`${index}-${file.name}`}
            className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs"
          >
            <span className="truncate" title={file.name}>
              {file.name}
            </span>
            <span className="shrink-0 text-[var(--color-text-muted)]">
              {Math.max(1, Math.ceil(file.size / 1024))} KB
            </span>
            <button
              type="button"
              className="ui-focus-ring shrink-0 rounded px-1"
              aria-label={`Remove ${file.name}`}
              disabled={disabled}
              onClick={() => onRemove(index)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--color-text-muted)]">
        Add a message to send. Files are saved for reference; the assistant
        cannot read them yet.
      </p>
    </div>
  );
}
