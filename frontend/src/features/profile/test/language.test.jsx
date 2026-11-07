import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { setLanguage } from "@/shared/i18n";
import ProfileInfo from "../components/ProfileInfo";

afterEach(async () => {
  await setLanguage("en");
});
it("updates profile dates and labels without translating user data", async () => {
  await setLanguage("en");
  render(
    <ProfileInfo
      user={{
        name: "Personal",
        email: "test@example.com",
        dob: "2000-01-15T12:00:00Z",
        role: "admin",
      }}
    />,
  );
  expect(screen.getByText("Jan 15, 2000")).toBeVisible();
  await act(async () => {
    await setLanguage("vi");
  });
  expect(
    screen.getByText(
      new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date("2000-01-15T12:00:00Z")),
    ),
  ).toBeVisible();
  expect(screen.getByText("Personal")).toBeVisible();
  expect(screen.getByText("Quản trị viên")).toBeVisible();
});
