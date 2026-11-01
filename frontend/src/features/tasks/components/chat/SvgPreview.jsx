import { useState, useMemo } from "react";
import {
  AlertCircle,
  Check,
  Code,
  Copy,
  Download,
  Eye,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/**
 * Sanitizes SVG code to prevent XSS attacks while keeping valid graphic elements.
 */
const sanitizeSvg = (rawSvg) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawSvg.trim(), "image/svg+xml");

    // Check parser errors
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      return { valid: false, error: "Invalid SVG format", sanitized: "" };
    }

    const svgElement = doc.documentElement;
    if (svgElement.tagName.toLowerCase() !== "svg") {
      return {
        valid: false,
        error: "Root element must be <svg>",
        sanitized: "",
      };
    }

    // Remove dangerous elements
    const dangerousTags = ["script", "iframe", "object", "embed", "link"];
    dangerousTags.forEach((tag) => {
      const elements = svgElement.querySelectorAll(tag);
      elements.forEach((el) => el.remove());
    });

    // Remove dangerous on* attributes and javascript: urls
    const allElements = [
      svgElement,
      ...Array.from(svgElement.querySelectorAll("*")),
    ];
    allElements.forEach((el) => {
      const attrs = Array.from(el.attributes);
      attrs.forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value.toLowerCase().replace(/\s+/g, "");
        if (
          name.startsWith("on") ||
          value.startsWith("javascript:") ||
          value.startsWith("data:text/html")
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // Auto-inject viewBox if missing so the browser can calculate aspect ratio and scale properly
    const viewBox = svgElement.getAttribute("viewBox");
    const widthAttr = svgElement.getAttribute("width");
    const heightAttr = svgElement.getAttribute("height");

    if (!viewBox && widthAttr && heightAttr) {
      const w = parseFloat(widthAttr);
      const h = parseFloat(heightAttr);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        svgElement.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }
    }

    // Ensure width is set to 100% if no width attribute is defined, to prevent flex collapse to 0x0
    if (!svgElement.getAttribute("width")) {
      svgElement.setAttribute("width", "100%");
    }

    return { valid: true, error: null, sanitized: svgElement.outerHTML };
  } catch (err) {
    return {
      valid: false,
      error: err?.message || "Failed to parse SVG",
      sanitized: "",
    };
  }
};

const SvgPreview = ({ code }) => {
  const [activeTab, setActiveTab] = useState("preview");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);

  const { valid, error, sanitized } = useMemo(() => sanitizeSvg(code), [code]);

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

  const handleDownload = () => {
    try {
      const blob = new Blob([sanitized || code], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "diagram.svg";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // Ignore download error
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(300, z + 25));
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "preview"}
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "preview"
                ? "bg-[var(--color-surface)] text-[var(--color-accent-strong)] shadow-xs"
                : "hover:text-[var(--color-text)]"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
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

        <div className="flex items-center gap-2">
          {activeTab === "preview" && valid && (
            <div className="flex items-center gap-1 border-r border-[var(--color-line)] pr-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                aria-label="Zoom out"
                title="Zoom out"
                className="ui-focus-ring flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-line)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ZoomOut className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                aria-label="Reset zoom"
                title="Reset zoom to 100%"
                className="ui-focus-ring px-1 font-mono text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                {zoom}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 300}
                aria-label="Zoom in"
                title="Zoom in"
                className="ui-focus-ring flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-line)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ZoomIn className="h-3 w-3" />
              </button>

              {zoom !== 100 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  aria-label="Reset zoom"
                  title="Reset zoom"
                  className="ui-focus-ring flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-line)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}

              <button
                type="button"
                onClick={handleDownload}
                aria-label="Download SVG"
                title="Download SVG file"
                className="ui-focus-ring flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-line)] hover:text-[var(--color-text)] cursor-pointer ml-1"
              >
                <Download className="h-3 w-3" />
              </button>
            </div>
          )}

          <span className="font-mono text-[11px] text-[var(--color-text-muted)] lowercase">
            svg
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

      {/* Body */}
      {activeTab === "preview" ? (
        <div className="p-4 flex min-h-[140px] items-center justify-center overflow-auto max-h-[600px] bg-white/50 dark:bg-black/20">
          {!valid ? (
            <div className="flex flex-col items-center gap-1.5 text-center text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error || "Could not parse SVG. Check the code tab."}</span>
            </div>
          ) : (
            <div
              data-testid="svg-preview-canvas"
              style={
                zoom !== 100
                  ? { width: `${zoom}%`, minWidth: `${zoom}%` }
                  : undefined
              }
              className="w-full max-w-full overflow-x-auto flex justify-center transition-all duration-150 [&>svg]:mx-auto [&>svg]:w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block"
              dangerouslySetInnerHTML={{ __html: sanitized }}
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

export default SvgPreview;
