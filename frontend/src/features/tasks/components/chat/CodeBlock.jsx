import { useState } from "react";
import { Check, Copy } from "lucide-react";

const CodeBlock = ({ code, language = "text" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const displayLanguage = (language || "text").trim().toLowerCase();

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs">
      <div className="chat-rich-header flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
        <span className="font-mono font-medium lowercase">
          {displayLanguage}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="ui-focus-ring flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors hover:bg-[var(--color-line)] hover:text-[var(--color-text)] cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-[var(--color-text)]">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
