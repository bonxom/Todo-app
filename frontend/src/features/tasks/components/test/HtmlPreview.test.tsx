import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MarkdownText from "../chat/MarkdownText";

const html =
  '<!doctype html><h1>Dashboard & details</h1><script>document.body.dataset.ready="yes"</script>';
const markdown = (code: string) => "```html\n" + code + "\n```";
it("keeps exact source, copies it and unmounts preview while viewing code", async () => {
  const user = userEvent.setup();
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(<MarkdownText text={markdown(html)} />);
  expect(screen.getByTitle("HTML preview")).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.queryByTitle("HTML preview")).not.toBeInTheDocument();
  expect(document.querySelectorAll(".chat-rich-header")).toHaveLength(1);
  expect(document.querySelector("pre code")?.textContent).toBe(html);
  await user.click(screen.getByRole("button", { name: "Copy code" }));
  expect(copy).toHaveBeenCalledWith(html);
  await user.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByTitle("HTML preview")).toBeInTheDocument();
});
it("encodes untrusted source inside a second sandbox and installs outer CSP first", () => {
  const hostile =
    '</iframe><script>parent.document.body.innerHTML="escape"</script><meta http-equiv="refresh" content="0;url=https://example.test">';
  render(<MarkdownText text={markdown(hostile)} />);
  const frame = screen.getByTitle("HTML preview");
  expect(frame).toHaveAttribute("sandbox", "allow-scripts");
  expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
  const outer = new DOMParser().parseFromString(
    frame.getAttribute("srcdoc")!,
    "text/html",
  );
  expect(
    outer
      .querySelector("meta[http-equiv='Content-Security-Policy']")
      ?.getAttribute("content"),
  ).toContain("frame-src 'none'");
  expect(outer.querySelectorAll("script")).toHaveLength(0);
  expect(outer.querySelector("iframe")?.getAttribute("sandbox")).toBe(
    "allow-scripts",
  );
  expect(outer.querySelector("iframe")?.getAttribute("srcdoc")).toBe(hostile);
});
it("uses source-only fallback over 128 KiB including multi-byte characters", () => {
  render(<MarkdownText text={markdown("界".repeat(44000))} />);
  expect(screen.queryByTitle("HTML preview")).not.toBeInTheDocument();
  expect(document.querySelectorAll(".chat-rich-header")).toHaveLength(1);
  expect(screen.getByText(/too large/i)).toBeVisible();
  expect(screen.getByRole("button", { name: "Copy code" })).toBeVisible();
});
it("supports keyboard tabs and independent multiple HTML panels", async () => {
  const user = userEvent.setup();
  render(
    <MarkdownText text={markdown(html) + "\n" + markdown("<b>Second</b>")} />,
  );
  const tabs = screen.getAllByRole("tab", { name: "Preview" });
  tabs[0].focus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getAllByRole("tab", { name: "Code" })[0]).toHaveFocus();
  expect(screen.getAllByTitle("HTML preview")).toHaveLength(1);
  await user.keyboard("{Home}");
  expect(screen.getAllByTitle("HTML preview")).toHaveLength(2);
});
