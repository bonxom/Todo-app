import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InteractionCard from "../chat/InteractionCard";

const interaction = {
  id: "question-1",
  kind: "clarification",
  question: "Bạn muốn tập vào lúc nào?",
  options: [
    { id: "morning", label: "Buổi sáng", description: "Bắt đầu ngày mới sớm." },
    { id: "evening", label: "Buổi tối", description: "Sau giờ làm việc." },
  ],
  allowCustomAnswer: true,
  status: "pending",
};

describe("InteractionCard", () => {
  it("offers custom answers without selecting any option automatically", () => {
    render(<InteractionCard interaction={interaction} />);
    expect(
      screen.getByRole("radio", { name: "Write my own answer" }),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: "Buổi sáng" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Send answer" })).toBeDisabled();
  });

  it("heads one labelled radio group and custom option focuses textarea without hiding options", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<InteractionCard interaction={interaction} onAnswer={onAnswer} />);
    const ownAnswer = screen.getByRole("radio", {
      name: "Write my own answer",
    });
    expect(
      screen.getByRole("radiogroup", { name: interaction.question }),
    ).toContainElement(ownAnswer);
    await user.click(ownAnswer);
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Buổi sáng" })).toBeVisible();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("associates each radio with its own description across multiple questions", () => {
    render(
      <>
        <InteractionCard interaction={interaction} />
        <InteractionCard
          interaction={{
            ...interaction,
            id: "question-2",
            options: [
              {
                ...interaction.options[0],
                description: "A different morning plan.",
              },
            ],
          }}
        />
      </>,
    );
    const radios = screen.getAllByRole("radio", { name: "Buổi sáng" });
    expect(radios[0]).toHaveAccessibleDescription("Bắt đầu ngày mới sớm.");
    expect(radios[1]).toHaveAccessibleDescription("A different morning plan.");
  });

  it("keeps answers pending until server confirmation and supports retry/edit after failure", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const { rerender } = render(
      <InteractionCard interaction={interaction} onAnswer={onAnswer} />,
    );
    await user.click(screen.getByRole("radio", { name: "Buổi sáng" }));
    await user.click(screen.getByRole("button", { name: "Send answer" }));
    expect(onAnswer).toHaveBeenCalledWith({ optionId: "morning" });
    expect(screen.queryByText("You selected")).not.toBeInTheDocument();
    rerender(
      <InteractionCard
        interaction={interaction}
        onAnswer={onAnswer}
        disabled
        sending
      />,
    );
    expect(screen.getByRole("button", { name: "Send answer" })).toBeDisabled();
    expect(screen.getByText("Sending…")).toBeVisible();
    rerender(
      <InteractionCard interaction={{ ...interaction }} onAnswer={onAnswer} />,
    );
    expect(screen.getByRole("radio", { name: "Buổi sáng" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Buổi tối" }));
    await user.click(screen.getByRole("button", { name: "Send answer" }));
    expect(onAnswer).toHaveBeenLastCalledWith({ optionId: "evening" });
    rerender(
      <InteractionCard
        interaction={{
          ...interaction,
          status: "answered",
          answer: { optionId: "evening" },
        }}
      />,
    );
    expect(screen.getByText("You selected")).toBeVisible();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("retains custom draft during failure and sends custom text without an optionId", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const { rerender } = render(
      <InteractionCard interaction={interaction} onAnswer={onAnswer} />,
    );
    await user.click(screen.getByRole("radio", { name: "Buổi sáng" }));
    await user.click(
      screen.getByRole("radio", { name: "Write my own answer" }),
    );
    expect(screen.getByRole("radio", { name: "Buổi sáng" })).toBeVisible();
    await user.type(
      screen.getByRole("textbox", { name: "Your answer" }),
      "Chỉ cuối tuần",
    );
    await user.click(screen.getByRole("button", { name: "Send answer" }));
    expect(onAnswer).toHaveBeenCalledWith({ customAnswer: "Chỉ cuối tuần" });
    expect(screen.queryByText("Your answer:")).not.toBeInTheDocument();
    rerender(<InteractionCard interaction={interaction} disabled />);
    rerender(<InteractionCard interaction={{ ...interaction }} />);
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue(
      "Chỉ cuối tuần",
    );
  });

  it("keeps custom draft when switching methods but submits only the active method", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<InteractionCard interaction={interaction} onAnswer={onAnswer} />);
    await user.click(
      screen.getByRole("radio", { name: "Write my own answer" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Your answer" }),
      "Cuối tuần",
    );
    await user.click(screen.getByRole("radio", { name: "Buổi sáng" }));
    await user.click(screen.getByRole("button", { name: "Send answer" }));
    expect(onAnswer).toHaveBeenCalledWith({ optionId: "morning" });
    await user.click(
      screen.getByRole("radio", { name: "Write my own answer" }),
    );
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue(
      "Cuối tuần",
    );
  });

  it("does not claim cancellation before the server resolves it", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<InteractionCard interaction={interaction} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByText("(Cancelled)")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Buổi sáng" })).toBeVisible();
  });

  it("does not submit by double clicking a choice", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<InteractionCard interaction={interaction} onAnswer={onAnswer} />);
    await user.dblClick(screen.getByText("Buổi sáng"));
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("shows an answered clarification whose option ID is cancel", () => {
    render(
      <InteractionCard
        interaction={{
          ...interaction,
          options: [{ id: "cancel", label: "Cancel the meeting" }],
          status: "answered",
          answer: { optionId: "cancel" },
        }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("You selected");
    expect(screen.getByRole("status")).toHaveTextContent("Cancel the meeting");
  });

  it("uses a direct action for a single confirmation option", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <InteractionCard
        interaction={{
          ...interaction,
          kind: "confirmation",
          allowCustomAnswer: false,
          options: [
            { id: "confirm", label: "Tạo 3 công việc" },
            { id: "cancel", label: "Cancel" },
          ],
        }}
        onAnswer={onAnswer}
      />,
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toHaveTextContent("Tạo 3 công việc");
    await user.click(confirm);
    expect(onAnswer).toHaveBeenCalledWith({ optionId: "confirm" });
  });

  it("renders saved answers, original details and cancelled history", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <InteractionCard
        interaction={{
          ...interaction,
          status: "answered",
          answer: { optionId: "evening" },
        }}
        disabled
      />,
    );
    expect(screen.getByText("You selected")).toBeVisible();
    const summary = screen.getByText("You selected").closest("summary");
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent("Buổi tối");
    expect(screen.getByText(interaction.question)).not.toBeVisible();
    await user.click(summary);
    expect(screen.getByText(interaction.question)).toBeVisible();
    expect(screen.getByText("Bắt đầu ngày mới sớm.")).toBeVisible();
    await user.click(summary);
    expect(screen.getByText(interaction.question)).not.toBeVisible();
    rerender(
      <InteractionCard
        interaction={{
          ...interaction,
          status: "answered",
          answer: { customAnswer: "Cuối tuần" },
        }}
      />,
    );
    expect(screen.getByText("Your answer:")).toBeVisible();
    expect(screen.getByText("Cuối tuần")).toBeVisible();
    rerender(
      <InteractionCard interaction={{ ...interaction, status: "cancelled" }} />,
    );
    expect(screen.getByText("(Cancelled)")).toBeVisible();
  });

  it("blocks mutations while sending and permits replacing the question after sending", async () => {
    const user = userEvent.setup();
    const onSwitch = vi.fn();
    const { rerender } = render(
      <InteractionCard
        interaction={interaction}
        sending
        onSwitchToMessage={onSwitch}
      />,
    );
    expect(screen.getByRole("button", { name: "Send answer" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Change request" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("radio", { name: "Write my own answer" }),
    ).toBeDisabled();
    rerender(
      <InteractionCard
        interaction={interaction}
        onSwitchToMessage={onSwitch}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Change request" }));
    expect(onSwitch).toHaveBeenCalledOnce();
  });
});
