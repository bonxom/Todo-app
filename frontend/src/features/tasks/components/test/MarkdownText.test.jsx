import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import MarkdownText from "../chat/MarkdownText";

it("renders task tables with bold cells and preserves surrounding text", () => {
  render(
    <MarkdownText
      text={
        "Tasks today\n| Task | Priority | Due |\n|---|:---:|---:|\n| **Workout** | High | 22/10/2026 |\n| Rest | Medium | |\n\nTotal: 2 tasks\n\n| Task | Priority |\n|---|---|\n| Sleep | Low |"
      }
    />,
  );
  const tables = screen.getAllByRole("table");
  expect(tables).toHaveLength(2);
  expect(within(tables[0]).getAllByRole("columnheader")).toHaveLength(3);
  expect(within(tables[0]).getAllByRole("row")).toHaveLength(3);
  expect(screen.getByText("Workout").tagName).toBe("STRONG");
  expect(screen.getByRole("cell", { name: "High" })).toHaveStyle({
    textAlign: "center",
  });
  expect(screen.getByRole("cell", { name: "22/10/2026" })).toHaveStyle({
    textAlign: "right",
  });
  expect(screen.getByText("Tasks today")).toBeVisible();
  expect(screen.getByText("Total: 2 tasks")).toBeVisible();
});

it("keeps ordinary pipes as text and supports escaped pipes in table cells", () => {
  render(
    <MarkdownText
      text={"One | two\n\nTask | Priority\n--- | ---\nRead \\| write | High"}
    />,
  );
  expect(screen.getByText("One | two")).toBeVisible();
  expect(screen.getByRole("cell", { name: "Read | write" })).toBeVisible();
});

it("renders inline code, italic and bold formatting together", () => {
  render(
    <MarkdownText
      text={
        "Run `orbit_create_task` with *high* priority and **urgent** deadline and _daily_ recurrence."
      }
    />,
  );
  const code = screen.getByText("orbit_create_task");
  expect(code.tagName).toBe("CODE");
  expect(screen.getByText("high").tagName).toBe("EM");
  expect(screen.getByText("daily").tagName).toBe("EM");
  expect(screen.getByText("urgent").tagName).toBe("STRONG");
});

it("renders headings, blockquotes, and lists", () => {
  render(
    <MarkdownText
      text={
        "# Main Title\n## Section 1\n### Subsection\n> Notable quote\n- Bullet 1\n- Bullet 2\n1. Number 1\n2. Number 2"
      }
    />,
  );
  const h1 = screen.getByRole("heading", { level: 1, name: "Main Title" });
  expect(h1).toBeVisible();
  const h2 = screen.getByRole("heading", { level: 2, name: "Section 1" });
  expect(h2).toBeVisible();
  const h3 = screen.getByRole("heading", { level: 3, name: "Subsection" });
  expect(h3).toBeVisible();
  expect(
    screen.getByText("Notable quote").closest("blockquote"),
  ).toBeInTheDocument();
  expect(screen.getByText("Bullet 1").closest("li")).toBeInTheDocument();
  expect(screen.getByText("Number 1").closest("li")).toBeInTheDocument();
});

it("renders multi-line fenced code blocks with language badge and copy button", () => {
  render(
    <MarkdownText
      text={"Intro\n```javascript\nconst a = 1;\nconsole.log(a);\n```\nOutro"}
    />,
  );
  expect(screen.getByText("Intro")).toBeVisible();
  expect(screen.getByText("Outro")).toBeVisible();
  expect(screen.getByText("javascript")).toBeVisible();
  expect(screen.getByRole("button", { name: /copy/i })).toBeVisible();
  expect(screen.getByText(/const a = 1;/)).toBeVisible();
});

it("renders mermaid fenced code blocks in diagram container", () => {
  render(
    <MarkdownText
      text={"Schema:\n```mermaid\nerDiagram\n  USER ||--o{ TASK : has\n```"}
    />,
  );
  expect(screen.getByText("Schema:")).toBeVisible();
  expect(screen.getByRole("tab", { name: /diagram/i })).toBeVisible();
  expect(screen.getByRole("tab", { name: /code/i })).toBeVisible();
});

it("renders svg fenced code blocks in svg preview container", () => {
  render(
    <MarkdownText
      text={
        'Vector:\n```svg\n<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>\n```'
      }
    />,
  );
  expect(screen.getByText("Vector:")).toBeVisible();
  expect(screen.getByRole("tab", { name: /preview/i })).toBeVisible();
  expect(screen.getByRole("tab", { name: /code/i })).toBeVisible();
});

it("previews a completed HTML document containing SVG as HTML", () => {
  render(
    <MarkdownText
      text={
        "```HTML\n<!doctype html><html><body><h1>Weekly dashboard</h1><svg></svg></body></html>\n```"
      }
    />,
  );
  expect(screen.getByTitle("HTML preview")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  expect(screen.queryByTestId("svg-preview-canvas")).not.toBeInTheDocument();
});

it("keeps incomplete HTML fences as code until closed", () => {
  const { rerender } = render(
    <MarkdownText text={"```html\n<h1>Loading</h1>"} />,
  );
  expect(screen.queryByTitle("HTML preview")).not.toBeInTheDocument();
  rerender(<MarkdownText text={"```html\n<h1>Loading</h1>\n```"} />);
  expect(screen.getByTitle("HTML preview")).toBeInTheDocument();
});

it("renders safe external links with target blank and rel noopener noreferrer", () => {
  render(
    <MarkdownText text="Nguồn: [Docs](https://example.org/docs?q=react#intro)" />,
  );
  const link = screen.getByRole("link", { name: "Docs" });
  expect(link).toHaveAttribute(
    "href",
    "https://example.org/docs?q=react#intro",
  );
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

it("supports URLs containing balanced parentheses", () => {
  render(
    <MarkdownText text="Xem thêm: [React Wiki](https://en.wikipedia.org/wiki/React_(software))" />,
  );
  const link = screen.getByRole("link", { name: "React Wiki" });
  expect(link).toHaveAttribute(
    "href",
    "https://en.wikipedia.org/wiki/React_(software)",
  );
});

it("renders an unterminated link promptly as text", () => {
  const text = "[x](" + "a".repeat(28);
  const started = performance.now();
  const { container } = render(<MarkdownText text={text} />);
  expect(performance.now() - started).toBeLessThan(500);
  expect(container.textContent).toBe(text);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("supports nested URL parentheses without truncating the destination", () => {
  render(<MarkdownText text="[Docs](https://example.org/a_(b_(c)))" />);
  expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
    "href",
    "https://example.org/a_(b_(c))",
  );
});

it("rejects unsafe URLs and renders them as plain text instead of links", () => {
  const { container } = render(
    <MarkdownText
      text={
        "Dangerous: [Bad JS](javascript:alert(1)) and [Bad Creds](https://user:pass@example.com/api) and [Data](data:text/html,bad) and [Proto](//example.com)"
      }
    />,
  );
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(container.textContent).toContain("[Bad JS](javascript:alert(1))");
  expect(container.textContent).toContain(
    "[Bad Creds](https://user:pass@example.com/api)",
  );
});

it("does not render link syntax inside inline code or fenced code blocks", () => {
  render(
    <MarkdownText
      text={
        "Inline: `[Docs](https://example.org)`\n\n```text\n[Fenced](https://example.org)\n```"
      }
    />,
  );
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText("[Docs](https://example.org)").tagName).toBe("CODE");
});
