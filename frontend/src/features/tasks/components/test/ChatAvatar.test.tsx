import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import ChatAvatar, { DEFAULT_CHAT_AVATAR } from "../chat/ChatAvatar";
it("uses the profile image and falls back to the supplied default on load error", () => {
  render(<ChatAvatar src="https://example.test/avatar.jpg" isUser />);
  const image = screen.getByRole("img", { name: "Your avatar" });
  expect(image).toHaveAttribute("src", "https://example.test/avatar.jpg");
  fireEvent.error(image);
  expect(image).toHaveAttribute("src", DEFAULT_CHAT_AVATAR);
});
it("updates when the profile avatar changes", () => {
  const { rerender } = render(
    <ChatAvatar src="https://example.test/one.jpg" isUser />,
  );
  rerender(<ChatAvatar src="https://example.test/two.jpg" isUser />);
  expect(screen.getByRole("img", { name: "Your avatar" })).toHaveAttribute(
    "src",
    "https://example.test/two.jpg",
  );
});
it("uses local icons for the Orbit appearance without replacing a profile image", () => {
  const { rerender } = render(<ChatAvatar appearance="orbit" />);
  expect(screen.getByRole("img", { name: "Agent avatar" }).tagName).toBe(
    "SPAN",
  );
  rerender(
    <ChatAvatar
      appearance="orbit"
      src="https://example.test/profile.jpg"
      isUser
    />,
  );
  expect(screen.getByRole("img", { name: "Your avatar" })).toHaveAttribute(
    "src",
    "https://example.test/profile.jpg",
  );
  fireEvent.error(screen.getByRole("img", { name: "Your avatar" }));
  expect(screen.getByRole("img", { name: "Your avatar" }).tagName).toBe("SPAN");
});
