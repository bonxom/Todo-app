import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DateTimeInput from "../DateTimeInput";
import { setLanguage } from "../../i18n";

afterEach(async () => {
  await setLanguage("en");
});

it("uses locale date order but keeps the datetime-local value unchanged", async () => {
  const onChange = vi.fn();
  render(
    <DateTimeInput
      aria-label="Deadline"
      value="2026-11-07T15:30"
      onChange={onChange}
    />,
  );
  const input = screen.getByLabelText("Deadline");
  expect(input).toHaveValue("11/07/2026 15:30");
  await act(() => setLanguage("vi"));
  expect(input).toHaveValue("07/11/2026 15:30");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "08/11/2026 15:30" } });
  expect(onChange).toHaveBeenLastCalledWith("2026-11-08T15:30");
  await act(() => setLanguage("en"));
  expect(input).toHaveValue("08/11/2026 15:30");
  fireEvent.change(input, { target: { value: "09/11/2026 15:30" } });
  expect(onChange).toHaveBeenLastCalledWith("2026-11-09T15:30");
});
