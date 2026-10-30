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
      text={"Run `orbit_create_task` with *high* priority and **urgent** deadline and _daily_ recurrence."}
    />,
  );
  const code = screen.getByText("orbit_create_task");
  expect(code.tagName).toBe("CODE");
  expect(screen.getByText("high").tagName).toBe("EM");
  expect(screen.getByText("daily").tagName).toBe("EM");
  expect(screen.getByText("urgent").tagName).toBe("STRONG");
});
