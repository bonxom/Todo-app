import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CodeBlock from "../chat/CodeBlock";

describe("CodeBlock", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders code content and language tag", () => {
    render(<CodeBlock code="const foo = 'bar';" language="typescript" />);
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("const foo = 'bar';")).toBeInTheDocument();
  });

  it("copies code to clipboard when copy button is clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<CodeBlock code="print('hello')" language="python" />);
    const copyButton = screen.getByRole("button", { name: /copy/i });
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith("print('hello')");
    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
  });
});
