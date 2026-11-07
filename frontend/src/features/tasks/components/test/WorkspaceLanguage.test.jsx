import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { it, expect } from "vitest";
import userEvent from "@testing-library/user-event";
import SearchBar from "../SearchBar";

it("updates workspace search labels without losing the entered query", async () => {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      en: {
        workspace: {
          searchTasks: "Search tasks",
          searchTasksPlaceholder: "Search tasks…",
          clearSearch: "Clear search",
        },
      },
      vi: {
        workspace: {
          searchTasks: "Tìm công việc",
          searchTasksPlaceholder: "Tìm công việc…",
          clearSearch: "Xóa tìm kiếm",
        },
      },
    },
  });
  function Search() {
    const [value, setValue] = useState("");
    return <SearchBar searchTerm={value} onSearchChange={setValue} />;
  }
  render(
    <I18nextProvider i18n={i18n}>
      <Search />
    </I18nextProvider>,
  );
  await userEvent.type(
    screen.getByRole("textbox", { name: "Search tasks" }),
    "My own project",
  );
  await act(() => i18n.changeLanguage("vi"));
  expect(screen.getByRole("textbox", { name: "Tìm công việc" })).toHaveValue(
    "My own project",
  );
  expect(
    screen.getByRole("button", { name: "Xóa tìm kiếm" }),
  ).toBeInTheDocument();
});
