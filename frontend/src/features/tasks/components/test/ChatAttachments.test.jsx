import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import ChatField from "../chat/ChatField";
const files = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/services/attachmentService", () => ({
  attachmentService: files,
}));
vi.mock("@/shared/services/aiService", () => ({
  aiService: { listConversations: vi.fn().mockResolvedValue([]) },
}));
const chat = {
  conversationId: "conversation",
  locked: false,
  mode: "auto",
  setMode: vi.fn(),
  loading: false,
};
describe("chat attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:private-image"),
        revokeObjectURL: vi.fn(),
      }),
    );
    files.get.mockResolvedValue(new Blob(["image"], { type: "image/png" }));
  });
  afterEach(() => vi.unstubAllGlobals());
  it("selects and removes files, requires text, and passes files to send", async () => {
    const user = userEvent.setup();
    const send = vi.fn().mockResolvedValue(true);
    render(<ChatField messages={[]} onSendMessage={send} chat={chat} />);
    const input = screen.getByLabelText("Choose files");
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await user.upload(input, file);
    expect(screen.getByText("notes.txt")).toBeVisible();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Remove notes.txt" }));
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
    await user.upload(input, file);
    await user.type(
      screen.getByRole("textbox", { name: "Message" }),
      "Keep this",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(send).toHaveBeenCalledWith("Keep this", undefined, [file]);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Remove notes.txt" }),
      ).not.toBeInTheDocument(),
    );
  });
  it("preserves the draft if upload/send is not accepted and rejects too many files", async () => {
    const user = userEvent.setup();
    const send = vi.fn().mockResolvedValue(false);
    render(<ChatField messages={[]} onSendMessage={send} chat={chat} />);
    await user.upload(
      screen.getByLabelText("Choose files"),
      new File(["hello"], "notes.txt", { type: "text/plain" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Message" }),
      "Keep this",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
      "Keep this",
    );
    expect(screen.getByText("notes.txt")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Choose files"), {
      target: {
        files: Array.from({ length: 4 }, (_, i) => new File(["x"], `${i}.txt`)),
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("4 files");
  });
  it("restores a private image through the API and revokes its URL on unmount", async () => {
    const { unmount } = render(
      <ChatField
        chat={chat}
        onSendMessage={vi.fn()}
        messages={[
          {
            id: "message",
            sender: "user",
            text: "Saved",
            timestamp: new Date().toISOString(),
            attachments: [
              { id: "file", name: "photo.png", size: 5, mimeType: "image/png" },
            ],
          },
        ]}
      />,
    );
    expect(
      await screen.findByRole("img", { name: "photo.png" }),
    ).toHaveAttribute("src", "blob:private-image");
    expect(files.get).toHaveBeenCalledWith(
      "conversation",
      "file",
      expect.anything(),
    );
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-image");
  });
  it("offers retry of the existing pending request without creating another upload", async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(
      <ChatField
        messages={[]}
        onSendMessage={vi.fn()}
        chat={{
          ...chat,
          error: "Connection interrupted",
          pending: { requestId: "same-request", attachmentIds: ["same-file"] },
          send,
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Retry message" }));
    expect(send).toHaveBeenCalledWith();
  });
});
