import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import i18n, { setLanguage } from "@/shared/i18n";
import LoginForm from "../components/LoginForm";

afterEach(async () => {
  await setLanguage("en");
});
it("updates login labels without discarding entered credentials", async () => {
  await setLanguage("en");
  const onSubmit = vi.fn();
  render(<LoginForm onSubmit={onSubmit} isLoading={false} />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "person@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "secret123" },
  });
  await act(async () => {
    await setLanguage("vi");
  });
  expect(i18n.language).toBe("vi");
  expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeVisible();
  expect(screen.getByLabelText("Email")).toHaveValue("person@example.com");
  expect(screen.getByLabelText("Mật khẩu")).toHaveValue("secret123");
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  expect(onSubmit).toHaveBeenCalledWith(
    { email: "person@example.com", password: "secret123" },
    expect.any(Function),
  );
});

it("updates existing validation errors when language changes", async () => {
  await setLanguage("en");
  render(<LoginForm onSubmit={vi.fn()} isLoading={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
  expect(screen.getByText("Email is required")).toBeVisible();
  await act(async () => {
    await setLanguage("vi");
  });
  expect(screen.getByText("Vui lòng nhập email")).toBeVisible();
  expect(screen.getByText("Vui lòng nhập mật khẩu")).toBeVisible();
});
