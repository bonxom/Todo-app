import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTranslation } from "react-i18next";
import i18n, { getLocale, getSavedLanguage, setLanguage } from "../index";
import LanguageSelect from "../../components/LanguageSelect";
import { formatDateOnly, toDateTimeInputValue } from "../../utils/dateTime";

function Example() {
  const { t } = useTranslation("common");
  return (
    <>
      <LanguageSelect />
      <p>{t("navigation.calendar")}</p>
      <input aria-label="Draft" defaultValue="My task" />
    </>
  );
}

beforeEach(async () => {
  localStorage.clear();
  await setLanguage("en");
});

describe("language selection", () => {
  it("uses English by default and restores only supported preferences", () => {
    localStorage.removeItem("orbit.language");
    expect(getSavedLanguage()).toBe("en");
    localStorage.setItem("orbit.language", "vi");
    expect(getSavedLanguage()).toBe("vi");
    localStorage.setItem("orbit.language", "fr");
    expect(getSavedLanguage()).toBe("en");
  });

  it("updates text and document language immediately while preserving input", async () => {
    render(<Example />);
    fireEvent.change(screen.getByLabelText("Draft"), {
      target: { value: "Unfinished work" },
    });
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
        target: { value: "vi" },
      });
    });
    expect(screen.getByText("Lịch")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("vi");
    expect(localStorage.getItem("orbit.language")).toBe("vi");
    expect(getSavedLanguage()).toBe("vi");
    expect(screen.getByLabelText("Draft")).toHaveValue("Unfinished work");
    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: "Ngôn ngữ" }), {
        target: { value: "en" },
      });
    });
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });

  it("keeps switching functional when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getSavedLanguage()).toBe("en");
    await setLanguage("vi");
    expect(i18n.language).toBe("vi");
    expect(document.documentElement.lang).toBe("vi");
    await setLanguage("unsupported");
    expect(i18n.language).toBe("vi");
  });

  it("falls back to English for a missing Vietnamese key", async () => {
    i18n.addResource("en", "common", "fallbackTest", "English fallback");
    await setLanguage("vi");
    expect(i18n.t("fallbackTest")).toBe("English fallback");
    delete i18n.getResourceBundle("en", "common").fallbackTest;
  });

  it("localizes date display without changing datetime input serialization", async () => {
    const date = new Date(2026, 10, 7, 15, 30);
    const inputValue = toDateTimeInputValue(date);
    await setLanguage("vi");
    expect(getLocale()).toBe("vi-VN");
    expect(formatDateOnly(date)).toBe(
      new Intl.DateTimeFormat("vi-VN").format(date),
    );
    await setLanguage("en");
    expect(getLocale()).toBe("en-US");
    expect(formatDateOnly(date)).toBe(
      new Intl.DateTimeFormat("en-US").format(date),
    );
    expect(toDateTimeInputValue(date)).toBe(inputValue);
  });
});
