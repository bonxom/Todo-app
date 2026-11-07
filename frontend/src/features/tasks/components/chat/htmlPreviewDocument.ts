export const HTML_PREVIEW_MAX_BYTES = 128 * 1024;

// This policy belongs to the trusted OUTER document. Generated code cannot
// remove it. In particular frame-src blocks navigation of the inner frame;
// sandbox alone does not block a document from navigating its own frame.
const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "worker-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export const PREVIEW_PERMISSIONS =
  "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; fullscreen 'none'";

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export function buildHtmlPreviewDocument(code: string): string | null {
  if (new TextEncoder().encode(code).byteLength > HTML_PREVIEW_MAX_BYTES)
    return null;
  // Do not parse generated HTML in the host document or add allow-same-origin.
  // srcdoc inherits the outer policy, including when it supplies its own CSP.
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${escapeAttribute(PREVIEW_CSP)}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:white}iframe{display:block;width:100%;height:100%;border:0}</style></head><body><iframe title="HTML content" sandbox="allow-scripts" referrerpolicy="no-referrer" allow="${escapeAttribute(PREVIEW_PERMISSIONS)}" srcdoc="${escapeAttribute(code)}"></iframe></body></html>`;
}
