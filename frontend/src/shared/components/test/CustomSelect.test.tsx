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
