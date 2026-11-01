import { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";
import { generateUUID } from "@/shared/utils/id";
import { AlertCircle, Check, Code, Copy, Eye } from "lucide-react";

let mermaidInitialized = false;

const initMermaid = () => {
  if (mermaidInitialized) return;
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily: "inherit",
  });
  mermaidInitialized = true;
};

const MermaidDiagram = ({ code }) => {
  const [activeTab, setActiveTab] = useState("diagram");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(null);
  const [rendering, setRendering] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

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

  useEffect(() => {
    let isCancelled = false;

    const renderChart = async () => {
      setRendering(true);
      setError(null);
      try {
        initMermaid();
        const cleanedCode = code.trim();
        const id = `mermaid-${generateUUID().replace(/[^a-zA-Z0-9]/g, "")}`;
        const { svg: renderedSvg } = await mermaid.render(id, cleanedCode);
        if (!isCancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err?.message || "Invalid Mermaid syntax");
          setActiveTab("code");
        }
      } finally {
        if (!isCancelled) {
          setRendering(false);
        }
      }
    };

    renderChart();

    return () => {
      isCancelled = true;
    };
  }, [code]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs">
      {/* Single clean top header */}
      <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "diagram"}
            onClick={() => setActiveTab("diagram")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "diagram"
                ? "bg-[var(--color-surface)] text-[var(--color-accent-strong)] shadow-xs"
                : "hover:text-[var(--color-text)]"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Diagram</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "code"}
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "code"
                ? "bg-[var(--color-surface)] text-[var(--color-accent-strong)] shadow-xs"
                : "hover:text-[var(--color-text)]"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Code</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[var(--color-text-muted)] lowercase">
            mermaid
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
                <span className="text-emerald-500 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content body - direct pre/code, no nested CodeBlock */}
      {activeTab === "diagram" ? (
        <div className="p-4 flex min-h-[140px] items-center justify-center overflow-x-auto bg-white/50 dark:bg-black/20">
          {rendering ? (
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              <span>Rendering diagram…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-1.5 text-center text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>Could not render diagram. Switching to code view.</span>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="max-w-full overflow-x-auto [&>svg]:mx-auto [&>svg]:max-w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      ) : (
        <div>
          {error && (
            <div className="m-3 flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-[var(--color-text)]">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default MermaidDiagram;
