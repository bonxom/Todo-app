import CodeBlock from "./CodeBlock";
import MermaidDiagram from "./MermaidDiagram";
import SvgPreview from "./SvgPreview";

const MarkdownText = ({ text }) => {
  if (!text) return null;

  // Parse inline markdown formatting: code, bold, italic
  const parseMarkdown = (rawText) => {
    if (!rawText) return rawText;
    const parts = [];
    let lastIndex = 0;
    let key = 0;

    // Pattern for `code`, **bold**, *italic*, _italic_
    const tokenRegex = /(?:`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_)/g;
    let match;

    while ((match = tokenRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={key++}>{rawText.slice(lastIndex, match.index)}</span>,
        );
      }

      if (match[1] !== undefined) {
        // Inline code
        parts.push(
          <code
            key={key++}
            className="rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-accent-strong)] border border-[var(--color-line)]"
          >
            {match[1]}
          </code>,
        );
      } else if (match[2] !== undefined) {
        // Bold
        parts.push(
          <strong key={key++} className="font-semibold">
            {match[2]}
          </strong>,
        );
      } else if (match[3] !== undefined) {
        // Italic with *
        parts.push(
          <em key={key++} className="italic">
            {match[3]}
          </em>,
        );
      } else if (match[4] !== undefined) {
        // Italic with _
        parts.push(
          <em key={key++} className="italic">
            {match[4]}
          </em>,
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < rawText.length) {
      parts.push(<span key={key++}>{rawText.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : rawText;
  };

  const lines = text.split(/\r?\n/);
  const splitRow = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/(?<!\\)\|$/, "")
      .split(/(?<!\\)\|/)
      .map((cell) => cell.trim().replace(/\\\|/g, "|"));

  const blocks = [];
  let blockKey = 0;
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index];

    // 1. Fenced Code Block: ```[lang]
    const codeBlockMatch = currentLine.match(/^```(\w*)/);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || "text";
      const codeLines = [];
      index++;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index++;
      }
      if (index < lines.length && lines[index].startsWith("```")) {
        index++; // Skip closing ```
      }
      const codeContent = codeLines.join("\n");
      const langLower = language.toLowerCase();
      if (langLower === "mermaid") {
        blocks.push(<MermaidDiagram key={blockKey++} code={codeContent} />);
      } else if (
        langLower === "svg" ||
        ((langLower === "xml" ||
          langLower === "html" ||
          langLower === "text" ||
          !language) &&
          /<svg[\s>]/i.test(codeContent))
      ) {
        blocks.push(<SvgPreview key={blockKey++} code={codeContent} />);
      } else {
        blocks.push(
          <CodeBlock key={blockKey++} code={codeContent} language={language} />,
        );
      }
      continue;
    }

    // 2. Markdown Table
    const headers = splitRow(currentLine);
    const separator = splitRow(lines[index + 1] ?? "");
    if (
      currentLine.includes("|") &&
      separator.length === headers.length &&
      separator.every((cell) => /^:?-{3,}:?$/.test(cell))
    ) {
      const tableKey = blockKey++;
      const alignments = separator.map((cell) =>
        cell.endsWith(":")
          ? cell.startsWith(":")
            ? "center"
            : "right"
          : "left",
      );
      const rows = [];
      index += 2;
      while (
        index < lines.length &&
        lines[index].trim() &&
        lines[index].includes("|")
      ) {
        rows.push(splitRow(lines[index]));
        index++;
      }
      blocks.push(
        <div
          key={tableKey}
          className="my-2 max-w-full overflow-x-auto rounded-lg border border-[var(--color-line)]"
        >
          <table className="w-full border-collapse whitespace-normal text-sm">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                {headers.map((cell, column) => (
                  <th
                    key={column}
                    scope="col"
                    style={{ textAlign: alignments[column] }}
                    className="border-b border-[var(--color-line)] px-3 py-2 font-semibold"
                  >
                    {parseMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-[var(--color-line)] last:border-b-0"
                >
                  {headers.map((_, column) => (
                    <td
                      key={column}
                      style={{ textAlign: alignments[column] }}
                      className="min-w-24 px-3 py-2 align-top"
                    >
                      {parseMarkdown(row[column] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // 3. Headings: #, ##, ###, ####
    const h1Match = currentLine.match(/^#\s+(.+)$/);
    if (h1Match) {
      blocks.push(
        <h1
          key={blockKey++}
          className="my-2 text-base font-bold text-[var(--color-text)]"
        >
          {parseMarkdown(h1Match[1])}
        </h1>,
      );
      index++;
      continue;
    }

    const h2Match = currentLine.match(/^##\s+(.+)$/);
    if (h2Match) {
      blocks.push(
        <h2
          key={blockKey++}
          className="my-1.5 text-sm font-bold text-[var(--color-text)]"
        >
          {parseMarkdown(h2Match[1])}
        </h2>,
      );
      index++;
      continue;
    }

    const h3Match = currentLine.match(/^###\s+(.+)$/);
    if (h3Match) {
      blocks.push(
        <h3
          key={blockKey++}
          className="my-1 text-xs font-semibold text-[var(--color-text)]"
        >
          {parseMarkdown(h3Match[1])}
        </h3>,
      );
      index++;
      continue;
    }

    const h4Match = currentLine.match(/^####\s+(.+)$/);
    if (h4Match) {
      blocks.push(
        <h4
          key={blockKey++}
          className="my-0.5 text-xs font-semibold text-[var(--color-text-muted)]"
        >
          {parseMarkdown(h4Match[1])}
        </h4>,
      );
      index++;
      continue;
    }

    // 4. Blockquotes: > line
    if (/^>\s?/.test(currentLine)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index++;
      }
      blocks.push(
        <blockquote
          key={blockKey++}
          className="my-1.5 border-l-2 border-[var(--color-accent)] pl-2.5 italic text-[var(--color-text-muted)]"
        >
          {quoteLines.map((qLine, qIdx) => (
            <span key={qIdx}>
              {parseMarkdown(qLine)}
              {qIdx < quoteLines.length - 1 && <br />}
            </span>
          ))}
        </blockquote>,
      );
      continue;
    }

    // 5. Lists: Unordered (- or *)
    if (/^[-*]\s+(.+)$/.test(currentLine)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+(.+)$/.test(lines[index])) {
        const itemMatch = lines[index].match(/^[-*]\s+(.+)$/);
        if (itemMatch) items.push(itemMatch[1]);
        index++;
      }
      blocks.push(
        <ul
          key={blockKey++}
          className="my-1.5 ml-4 list-disc space-y-0.5 text-sm"
        >
          {items.map((item, itemIdx) => (
            <li key={itemIdx}>{parseMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list: \d+\.
    if (/^\d+\.\s+(.+)$/.test(currentLine)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+(.+)$/.test(lines[index])) {
        const itemMatch = lines[index].match(/^\d+\.\s+(.+)$/);
        if (itemMatch) items.push(itemMatch[1]);
        index++;
      }
      blocks.push(
        <ol
          key={blockKey++}
          className="my-1.5 ml-4 list-decimal space-y-0.5 text-sm"
        >
          {items.map((item, itemIdx) => (
            <li key={itemIdx}>{parseMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // 6. Regular text line
    blocks.push(
      <span key={blockKey++}>
        {parseMarkdown(currentLine)}
        {index < lines.length - 1 && <br />}
      </span>,
    );
    index++;
  }

  return <>{blocks}</>;
};

export default MarkdownText;
