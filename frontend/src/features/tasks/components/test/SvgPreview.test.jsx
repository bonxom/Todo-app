import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SvgPreview from "../chat/SvgPreview";

describe("SvgPreview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const validSvg =
    '<svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

  const userErdSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 860"><rect width="1440" height="860" fill="#f8fafc"/><text x="40" y="34">ERD</text></svg>';

  it("renders preview tab by default with sanitized SVG element", () => {
    const { container } = render(<SvgPreview code={validSvg} />);

    const previewTab = screen.getByRole("tab", { name: /preview/i });
    expect(previewTab).toHaveAttribute("aria-selected", "true");

    const circle = container.querySelector(
      "[data-testid='svg-preview-canvas'] circle",
    );
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute("fill", "red");
  });

  it("injects width=100% when width attribute is missing to prevent flex collapse", () => {
    const { container } = render(<SvgPreview code={userErdSvg} />);

    const svgEl = container.querySelector(
      "[data-testid='svg-preview-canvas'] svg",
    );
    expect(svgEl).toBeInTheDocument();
    expect(svgEl).toHaveAttribute("width", "100%");
  });

  it("supports zooming in, zooming out, and resetting zoom", () => {
    const { container } = render(<SvgPreview code={userErdSvg} />);

    const zoomInBtn = screen.getByRole("button", { name: /zoom in/i });
    const zoomOutBtn = screen.getByRole("button", { name: /zoom out/i });

    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.click(zoomInBtn);
    expect(screen.getByText("125%")).toBeInTheDocument();
    const canvas = container.querySelector(
      "[data-testid='svg-preview-canvas']",
    );
    expect(canvas).toHaveStyle({ width: "125%" });

    fireEvent.click(zoomOutBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("triggers download when clicking download button", () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(<SvgPreview code={validSvg} />);

    const downloadBtn = screen.getByRole("button", { name: /download svg/i });
    fireEvent.click(downloadBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it("switches to code tab and shows code content with copy button", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<SvgPreview code={validSvg} />);

    const codeTab = screen.getByRole("tab", { name: /code/i });
    fireEvent.click(codeTab);

    expect(codeTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/circle cx="50"/)).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: /copy code/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(validSvg);
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("sanitizes dangerous script tags from SVG before rendering", () => {
    const maliciousSvg =
      '<svg><script>alert("xss")</script><rect width="50" height="50" fill="blue" /></svg>';
    const { container } = render(<SvgPreview code={maliciousSvg} />);

    const canvas = container.querySelector(
      "[data-testid='svg-preview-canvas']",
    );
    expect(canvas.querySelector("script")).toBeNull();
    expect(canvas.querySelector("rect")).toBeInTheDocument();
  });
});
