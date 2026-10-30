import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SlashCommandMenu from "../chat/SlashCommandMenu";

describe("SlashCommandMenu", () => {
  it("renders skills when query is empty and shows correct count", () => {
    render(<SlashCommandMenu query="" onSelect={vi.fn()} />);
    expect(screen.getByText(/Suggested skills/i)).toBeInTheDocument();
    expect(screen.getByText("gym")).toBeInTheDocument();
    expect(screen.getByText("ielts")).toBeInTheDocument();
  });

  it("filters skills matching query", () => {
    render(<SlashCommandMenu query="gym" onSelect={vi.fn()} />);
    expect(screen.getByText("gym")).toBeInTheDocument();
    expect(screen.queryByText("ielts")).not.toBeInTheDocument();
  });

  it("calls onSelect when an item is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SlashCommandMenu query="ielts" onSelect={onSelect} />);
    const ieltsOption = screen.getByRole("option", { name: /ielts/i });
    await user.click(ieltsOption);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ielts", category: "skill" }),
    );
  });

  it("shows empty state when no skill matches query", () => {
    render(<SlashCommandMenu query="nonexistent123" onSelect={vi.fn()} />);
    expect(
      screen.getByText(/No skills matching/i),
    ).toBeInTheDocument();
  });
});
