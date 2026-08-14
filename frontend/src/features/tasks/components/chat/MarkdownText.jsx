const MarkdownText = ({ text }) => {
  // Parse markdown formatting
  const parseMarkdown = (text) => {
    const parts = [];
    let lastIndex = 0;
    let key = 0;

    // Pattern for **bold**
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        parts.push(
          <span key={key++}>{text.slice(lastIndex, match.index)}</span>
        );
      }

      // Add bold text
      parts.push(
        <strong key={key++} className="font-semibold">
          {match[1]}
        </strong>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  // Split by newlines and parse each line
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, index) => (
        <span key={index}>
          {parseMarkdown(line)}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
};

export default MarkdownText;
