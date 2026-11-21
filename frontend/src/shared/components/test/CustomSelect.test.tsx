import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import CustomSelect from "../CustomSelect";

function StatefulHarness({ onSelect }: { onSelect?: (val: string) => void }) {
  const [value, setValue] = useState("health");

  return (
    <div>
      <label htmlFor="category-select">Category</label>
      <CustomSelect
        id="category-select"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onSelect?.(e.target.value);
        }}
        className="ui-input"
      >
        <option value="health">Health</option>
        <option value="study">Study</option>
        <option value="archived" disabled>
          Archived (completed)
        </option>
        <option value="__add_more__">+ Add more</option>
      </CustomSelect>
    </div>
  );
}

describe("CustomSelect", () => {
  it("displays the selected option label, opens portaled listbox on trigger click, and selects an option", () => {
    const onSelect = vi.fn();
    render(<StatefulHarness onSelect={onSelect} />);

    const trigger = screen.getByTestId("custom-select-trigger");
    expect(trigger).toHaveTextContent("Health");
    expect(trigger).toHaveAttribute("data-cursor-target", "control");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(trigger);

    const listbox = screen.getByRole("listbox");
    expect(listbox.parentElement).toBe(document.body);

    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[2]).toBeDisabled();
    expect(options[3]).toHaveAttribute("data-action", "true");

    fireEvent.click(options[1]);
    expect(onSelect).toHaveBeenCalledWith("study");
    expect(trigger).toHaveTextContent("Study");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on Escape and outside pointerdown, and stays compatible with selectOptions", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <div>
        <StatefulHarness onSelect={onSelect} />
        <button type="button" data-testid="outside-btn">
          Outside
        </button>
      </div>,
    );

    const trigger = screen.getByTestId("custom-select-trigger");
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside-btn"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Category"), "__add_more__");
    expect(onSelect).toHaveBeenCalledWith("__add_more__");
  });
});
it("keeps locally scoped theme values on its body portal", () => {
  render(<StatefulHarness />);
  const trigger = screen.getByTestId("custom-select-trigger");
  trigger.style.setProperty("--color-surface", "rgb(242, 248, 247)");
  trigger.style.setProperty("--color-accent", "rgb(20, 103, 95)");
  fireEvent.click(trigger);
  const menu = screen.getByRole("listbox");
  expect(menu.style.getPropertyValue("--color-surface")).toBe(
    "rgb(242, 248, 247)",
  );
  expect(menu.style.getPropertyValue("--color-accent")).toBe(
    "rgb(20, 103, 95)",
  );
});

it("forwards V2 Liquid Glass tokens and marks menu data-ui-version=v2 inside .v2-app", () => {
  const { container } = render(
    <div className="v2-app">
      <StatefulHarness />
    </div>,
  );
  const v2Root = container.querySelector(".v2-app") as HTMLElement;
  v2Root.style.setProperty("--v2-accent", "#0c5da8");
  v2Root.style.setProperty("--v2-glass-fill", "rgb(245 251 255 / 72%)");

  const trigger = screen.getByTestId("custom-select-trigger");
  fireEvent.click(trigger);

  const menu = screen.getByRole("listbox");
  expect(menu).toHaveAttribute("data-ui-version", "v2");
  expect(menu.style.getPropertyValue("--v2-accent")).toBe("#0c5da8");
});
