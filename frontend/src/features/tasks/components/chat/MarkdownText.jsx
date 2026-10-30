const MarkdownText = ({ text }) => {
  // Parse markdown formatting: code, bold, italic
  const parseMarkdown = (text) => {
    if (!text) return text;
    const parts = [];
    let lastIndex = 0;
    let key = 0;

    // Pattern for `code`, **bold**, *italic*, _italic_
    const tokenRegex = /(?:`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_)/g;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={key++}>{text.slice(lastIndex, match.index)}</span>,
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

    if (lastIndex < text.length) {
      parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
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

  for (let index = 0; index < lines.length; index++) {
    const headers = splitRow(lines[index]);
    const separator = splitRow(lines[index + 1] ?? "");
    if (
      lines[index].includes("|") &&
      separator.length === headers.length &&
      separator.every((cell) => /^:?-{3,}:?$/.test(cell))
    ) {
      const tableKey = index;
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
      index--;
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
    } else {
      blocks.push(
        <span key={index}>
          {parseMarkdown(lines[index])}
          {index < lines.length - 1 && <br />}
        </span>,
      );
    }
  }

  return <>{blocks}</>;
};

export default MarkdownText;
