import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AgentDiscardDialog } from "../AgentDiscardDialog";
import { setLanguage } from "@/shared/i18n";

afterEach(async () => {
  await setLanguage("en");
});
it("updates mounted agent controls when the language changes", async () => {
  await setLanguage("en");
  render(
    <AgentDiscardDialog isOpen onConfirm={() => {}} onCancel={() => {}} />,
  );
  expect(
    screen.getByRole("button", { name: "Keep editing" }),
  ).toBeInTheDocument();
  await act(async () => {
    await setLanguage("vi");
  });
  expect(
    screen.getByRole("button", { name: "Tiếp tục chỉnh sửa" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Bỏ các thay đổi hiện tại?" }),
  ).toBeInTheDocument();
});
