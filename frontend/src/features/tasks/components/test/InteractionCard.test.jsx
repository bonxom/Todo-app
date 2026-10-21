import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InteractionCard from "../chat/InteractionCard";

describe("InteractionCard", () => {
  const baseInteraction = {
    id: "interaction-123",
    kind: "clarification",
    question: "Thứ 2 bạn làm cả ngày — xử lý buổi Push thế nào?",
    options: [
      {
        id: "opt-1",
        label: "Dời Push thứ 2 lên 18:00–19:00",
        description: "Đồng bộ với thứ 6: tan làm 17:00...",
      },
      {
        id: "opt-2",
        label: "Giữ Push thứ 2 lúc 17:30–18:30",
        description: "Chỉ đổi nếu phòng gym gần chỗ làm...",
      },
    ],
    allowCustomAnswer: true,
    status: "pending",
  };

  it("renders pending interactive card with options and coding-agent style header", () => {
    render(<InteractionCard interaction={baseInteraction} />);

    expect(screen.getByText("Câu hỏi từ Agent")).toBeVisible();
    expect(
      screen.getByText("Thứ 2 bạn làm cả ngày — xử lý buổi Push thế nào?"),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: "Dời Push thứ 2 lên 18:00–19:00" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Giữ Push thứ 2 lúc 17:30–18:30" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Other answer" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send answer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("immediately hides the card and displays natural selected text upon choosing option 2", async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();

    render(
      <InteractionCard interaction={baseInteraction} onAnswer={onAnswer} />,
    );

    const opt2Radio = screen.getByRole("radio", {
      name: "Giữ Push thứ 2 lúc 17:30–18:30",
    });
    await user.click(opt2Radio);

    const sendBtn = screen.getByRole("button", { name: "Send answer" });
    expect(sendBtn).toBeEnabled();
    await user.click(sendBtn);

    expect(onAnswer).toHaveBeenCalledWith({ optionId: "opt-2" });

    // The form inputs and options are hidden
    expect(
      screen.queryByRole("radio", { name: "Giữ Push thứ 2 lúc 17:30–18:30" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Other answer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send answer" }),
    ).not.toBeInTheDocument();

    // Natural coding-agent summary is shown
    expect(
      screen.getByText("Thứ 2 bạn làm cả ngày — xử lý buổi Push thế nào?"),
    ).toBeVisible();
    expect(screen.getByText("Bạn đã chọn")).toBeVisible();
    expect(screen.getByText("Giữ Push thứ 2 lúc 17:30–18:30")).toBeVisible();
  });

  it("immediately hides the card and displays natural text upon submitting custom answer", async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();

    render(
      <InteractionCard interaction={baseInteraction} onAnswer={onAnswer} />,
    );

    const customInput = screen.getByRole("textbox", { name: "Other answer" });
    await user.type(customInput, "Tập vào sáng sớm thứ 7");

    const sendBtn = screen.getByRole("button", { name: "Send answer" });
    expect(sendBtn).toBeEnabled();
    await user.click(sendBtn);

    expect(onAnswer).toHaveBeenCalledWith({
      customAnswer: "Tập vào sáng sớm thứ 7",
    });

    // Form inputs hidden
    expect(
      screen.queryByRole("textbox", { name: "Other answer" }),
    ).not.toBeInTheDocument();

    // Natural text displayed
    expect(
      screen.getByText("Thứ 2 bạn làm cả ngày — xử lý buổi Push thế nào?"),
    ).toBeVisible();
    expect(screen.getByText("Bạn đã trả lời:")).toBeVisible();
    expect(screen.getByText("Tập vào sáng sớm thứ 7")).toBeVisible();
  });

  it("renders pre-resolved interaction from history without bulky form, supporting collapsible details", async () => {
    const user = userEvent.setup();
    const resolvedInteraction = {
      ...baseInteraction,
      status: "answered",
      answer: { optionId: "opt-2" },
    };

    render(<InteractionCard interaction={resolvedInteraction} disabled />);

    // No radio or textarea
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    // Clean summary
    expect(
      screen.getByText("Thứ 2 bạn làm cả ngày — xử lý buổi Push thế nào?"),
    ).toBeVisible();
    expect(screen.getByText("Bạn đã chọn")).toBeVisible();
    expect(screen.getByText("Giữ Push thứ 2 lúc 17:30–18:30")).toBeVisible();

    // Details can be toggled
    const toggleBtn = screen.getByRole("button", {
      name: "Xem chi tiết câu hỏi",
    });
    expect(toggleBtn).toBeVisible();
    await user.click(toggleBtn);

    expect(screen.getByText("Ẩn chi tiết câu hỏi")).toBeVisible();
    expect(screen.getByText("Đồng bộ với thứ 6: tan làm 17:00...")).toBeVisible();
  });

  it("renders pre-resolved cancelled interaction naturally", () => {
    const cancelledInteraction = {
      ...baseInteraction,
      status: "cancelled",
    };

    render(<InteractionCard interaction={cancelledInteraction} disabled />);

    expect(
      screen.getByText("Thứ 2 bạn làm cả ngày — xử lý buổi Push thế nào?"),
    ).toBeVisible();
    expect(screen.getByText("(Đã hủy)")).toBeVisible();
  });

  it("supports docked mode and onSwitchToMessage button", async () => {
    const onSwitch = vi.fn();
    const user = userEvent.setup();

    render(
      <InteractionCard
        interaction={baseInteraction}
        docked
        onSwitchToMessage={onSwitch}
      />,
    );

    const switchBtn = screen.getByRole("button", { name: "Nhắn tin →" });
    expect(switchBtn).toBeVisible();
    await user.click(switchBtn);
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });
});
