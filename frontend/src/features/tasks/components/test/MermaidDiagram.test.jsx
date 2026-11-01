import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MermaidDiagram from "../chat/MermaidDiagram";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockImplementation(async (id, code) => {
      if (code.includes("INVALID")) {
        throw new Error("Syntax error in graph");
      }
      return { svg: `<svg data-testid="mock-svg"><text>${code}</text></svg>` };
    }),
  },
}));

describe("MermaidDiagram", () => {
  it("renders diagram tab by default and generates SVG", async () => {
    render(<MermaidDiagram code="graph TD; A-->B;" />);

    const diagramTab = screen.getByRole("tab", { name: /diagram/i });
    expect(diagramTab).toHaveAttribute("aria-selected", "true");

    await waitFor(() => {
      expect(screen.getByTestId("mock-svg")).toBeInTheDocument();
    });
  });

  it("allows switching to code tab and viewing raw code", async () => {
    render(<MermaidDiagram code="graph TD; A-->B;" />);

    const codeTab = screen.getByRole("tab", { name: /code/i });
    fireEvent.click(codeTab);

    expect(codeTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("graph TD; A-->B;")).toBeInTheDocument();
  });

  it("handles syntax error gracefully by falling back to code tab with warning", async () => {
    render(<MermaidDiagram code="INVALID GRAPH CODE" />);

    await waitFor(() => {
      expect(screen.getByText(/Syntax error in graph/i)).toBeInTheDocument();
      expect(screen.getByText("INVALID GRAPH CODE")).toBeInTheDocument();
    });
  });
});
