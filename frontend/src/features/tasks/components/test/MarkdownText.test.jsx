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
