import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatField from "../chat/ChatField";

describe("ChatField", () => {
  const defaultChat = {
    mode: "auto",
    setMode: vi.fn(),
    locked: false,
    loading: false,
    sending: false,
  };

  it("renders collapsed options menu (>) on the left of textarea and expands on click", async () => {
    const user = userEvent.setup();
    const setMode = vi.fn();
    render(
      <ChatField
        messages={[]}
        onSendMessage={vi.fn()}
        chat={{ ...defaultChat, setMode }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: "Mở rộng tùy chọn" });
    expect(toggleBtn).toBeVisible();
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    // Click > to expand
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    // Options are visible
    expect(screen.getByRole("button", { name: "Đính kèm ảnh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đính kèm file" })).toBeInTheDocument();
    const botBtn = screen.getByRole("button", { name: "Agent mode: auto" });
    expect(botBtn).toBeInTheDocument();

    // Clicking Bot toggles mode
    await user.click(botBtn);
    expect(setMode).toHaveBeenCalledWith("ask");
  });

  it("automatically collapses the menu back to > when clicking or focusing on the textarea", async () => {
    const user = userEvent.setup();
    render(
      <ChatField
        messages={[]}
        onSendMessage={vi.fn()}
        chat={defaultChat}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: "Mở rộng tùy chọn" });
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    // Focus/click into textarea
    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.click(textarea);

    // Menu collapses back to >
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("renders Bot with ask outline style when mode is ask and toggles to auto", async () => {
    const user = userEvent.setup();
    const setMode = vi.fn();
    render(
      <ChatField
        messages={[]}
        onSendMessage={vi.fn()}
        chat={{ ...defaultChat, mode: "ask", setMode }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: "Mở rộng tùy chọn" });
    await user.click(toggleBtn);

    const botBtn = screen.getByRole("button", { name: "Agent mode: ask" });
    expect(botBtn).toBeInTheDocument();
    await user.click(botBtn);
    expect(setMode).toHaveBeenCalledWith("auto");
  });
});
