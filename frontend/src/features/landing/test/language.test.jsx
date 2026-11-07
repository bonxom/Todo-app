import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { setLanguage } from "@/shared/i18n";
import WorkspacePreview from "../components/WorkspacePreview";

afterEach(async () => {
  await setLanguage("en");
});
it("preserves demo tasks and filters while translating the active view", async () => {
  await setLanguage("en");
  render(<WorkspacePreview />);
  fireEvent.click(screen.getByRole("button", { name: "Add task" }));
  const input = screen.getByRole("textbox", { name: "New demo task" });
  fireEvent.change(input, { target: { value: "My own task" } });
  await act(async () => {
    await setLanguage("vi");
  });
  expect(
    screen.getByRole("textbox", { name: "Công việc dùng thử mới" }),
  ).toHaveValue("My own task");
  fireEvent.submit(input.closest("form"));
  fireEvent.click(screen.getByRole("button", { name: "Cần làm" }));
  expect(
    screen.queryByText("Tạo nên điều đáng chia sẻ"),
  ).not.toBeInTheDocument();
  expect(screen.getByText("My own task")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Dự án" }));
  expect(
    screen.getByRole("heading", { name: /Bức tranh tổng thể/ }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Hôm nay/ }));
  expect(screen.getByText("My own task")).toBeVisible();
});
