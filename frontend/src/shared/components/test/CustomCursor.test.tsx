import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CustomCursor from "../CustomCursor";

type MatchMediaConfig = {
  finePointer?: boolean;
  reducedMotion?: boolean;
};

function mockMatchMedia({
  finePointer = true,
  reducedMotion = false,
}: MatchMediaConfig = {}) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const matches =
        query === "(hover: hover) and (pointer: fine)"
          ? finePointer
          : query === "(prefers-reduced-motion: reduce)"
            ? reducedMotion
            : false;

      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

describe("CustomCursor", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("has-custom-cursor");
    mockMatchMedia({ finePointer: true, reducedMotion: false });
  });

  afterEach(() => {
    document.documentElement.classList.remove("has-custom-cursor");
    vi.restoreAllMocks();
  });

  it("does not render or set root class on coarse pointers or when reduced motion is enabled", () => {
    mockMatchMedia({ finePointer: false, reducedMotion: false });
    const { unmount } = render(<CustomCursor />);
    expect(screen.queryByTestId("custom-cursor")).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass("has-custom-cursor");
    unmount();

    mockMatchMedia({ finePointer: true, reducedMotion: true });
    render(<CustomCursor />);
    expect(screen.queryByTestId("custom-cursor")).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass("has-custom-cursor");
  });

  it("tracks pointer movement as a solid circular dot and manages root class lifecycle", () => {
    const { container, unmount } = render(
      <div id="root-shell">
        <CustomCursor />
        <div data-testid="plain-area">Plain content</div>
      </div>,
    );

    const cursor = screen.getByTestId("custom-cursor");
    // Cursor must be portaled to document.body outside #root stacking context
    expect(cursor.parentElement).toBe(document.body);
    expect(container.querySelector('[data-testid="custom-cursor"]')).toBeNull();
    expect(document.documentElement).toHaveClass("has-custom-cursor");
    expect(cursor).toHaveAttribute("data-visible", "false");

    const plainArea = screen.getByTestId("plain-area");
    fireEvent.mouseMove(plainArea, { clientX: 120, clientY: 240 });

    expect(cursor).toHaveAttribute("data-visible", "true");
    expect(cursor).toHaveAttribute("data-mode", "dot");
    expect(cursor.style.getPropertyValue("--cursor-x")).toBe("120px");
    expect(cursor.style.getPropertyValue("--cursor-y")).toBe("240px");
    expect(cursor.style.getPropertyValue("--cursor-w")).toBe("14px");
    expect(cursor.style.getPropertyValue("--cursor-h")).toBe("14px");
    expect(cursor.style.getPropertyValue("--cursor-radius")).toBe("9999px");

    unmount();
    expect(document.documentElement).not.toHaveClass("has-custom-cursor");
  });

  it("morphs and snaps to cards and prioritizes nested buttons inside cards", () => {
    render(
      <div>
        <CustomCursor />
        <article className="ui-task-card" data-testid="task-card">
          <h3>Write specification</h3>
          <button type="button" data-testid="card-button">
            Complete
          </button>
        </article>
      </div>,
    );

    const cursor = screen.getByTestId("custom-cursor");
    const card = screen.getByTestId("task-card");
    const button = screen.getByTestId("card-button");

    card.style.borderRadius = "14px";
    button.style.borderRadius = "8px";

    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      x: 40,
      y: 80,
      left: 40,
      top: 80,
      width: 300,
      height: 120,
      right: 340,
      bottom: 200,
      toJSON: () => ({}),
    });

    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      x: 220,
      y: 100,
      left: 220,
      top: 100,
      width: 96,
      height: 36,
      right: 316,
      bottom: 136,
      toJSON: () => ({}),
    });

    // Hover on the card body
    fireEvent.mouseMove(card, { clientX: 80, clientY: 110 });
    expect(cursor).toHaveAttribute("data-mode", "snap");
    expect(cursor).toHaveAttribute("data-snap-kind", "card");
    expect(cursor.style.getPropertyValue("--cursor-x")).toBe("190px");
    expect(cursor.style.getPropertyValue("--cursor-y")).toBe("140px");
    expect(cursor.style.getPropertyValue("--cursor-w")).toBe("300px");
    expect(cursor.style.getPropertyValue("--cursor-h")).toBe("120px");
    expect(cursor.style.getPropertyValue("--cursor-radius")).toBe("14px");

    // Hover on the nested button inside the card -> snaps to the button
    fireEvent.mouseMove(button, { clientX: 250, clientY: 115 });
    expect(cursor).toHaveAttribute("data-mode", "snap");
    expect(cursor).toHaveAttribute("data-snap-kind", "control");
    expect(cursor.style.getPropertyValue("--cursor-x")).toBe("268px");
    expect(cursor.style.getPropertyValue("--cursor-y")).toBe("118px");
    expect(cursor.style.getPropertyValue("--cursor-w")).toBe("96px");
    expect(cursor.style.getPropertyValue("--cursor-h")).toBe("36px");
    expect(cursor.style.getPropertyValue("--cursor-radius")).toBe("8px");
  });

  it("switches to text mode over editable inputs and tracks press/leave states", () => {
    render(
      <div>
        <CustomCursor />
        <input type="text" data-testid="text-input" />
      </div>,
    );

    const cursor = screen.getByTestId("custom-cursor");
    const input = screen.getByTestId("text-input");

    fireEvent.mouseMove(input, { clientX: 60, clientY: 75 });
    expect(cursor).toHaveAttribute("data-mode", "text");

    fireEvent.mouseDown(input);
    expect(cursor).toHaveAttribute("data-pressed", "true");

    fireEvent.mouseUp(input);
    expect(cursor).toHaveAttribute("data-pressed", "false");

    fireEvent.mouseLeave(document.documentElement);
    expect(cursor).toHaveAttribute("data-visible", "false");
  });

  it("yields to native cursor and hides custom cursor on resize handles and native cursor targets", () => {
    render(
      <div role="button" data-testid="column">
        <CustomCursor />
        <button type="button" data-testid="task-card-button">
          Task title
        </button>
        <div
          role="slider"
          data-testid="resize-handle"
          className="calendar-resize-handle"
          data-edge="start"
        />
      </div>,
    );

    const cursor = screen.getByTestId("custom-cursor");
    const button = screen.getByTestId("task-card-button");
    const handle = screen.getByTestId("resize-handle");

    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 100,
      left: 100,
      top: 100,
      width: 120,
      height: 60,
      right: 220,
      bottom: 160,
      toJSON: () => ({}),
    });

    // Hovering the card body snaps to the button
    fireEvent.mouseMove(button, { clientX: 110, clientY: 130 });
    expect(cursor).toHaveAttribute("data-mode", "snap");
    expect(cursor).toHaveAttribute("data-visible", "true");

    const pointer = screen.getByTestId("custom-cursor-pointer");
    expect(pointer).toHaveAttribute("data-mode", "snap");
    expect(pointer).toHaveAttribute("data-visible", "true");
    expect(pointer.style.getPropertyValue("--pointer-x")).toBe("110px");
    expect(pointer.style.getPropertyValue("--pointer-y")).toBe("130px");

    // Hovering the resize handle switches to native mode and hides custom cursor
    fireEvent.mouseMove(handle, { clientX: 110, clientY: 102 });
    expect(cursor).toHaveAttribute("data-mode", "native");
    expect(cursor).toHaveAttribute("data-visible", "false");
    expect(pointer).toHaveAttribute("data-visible", "false");

    // Moving back to the card body restores snap
    fireEvent.mouseMove(button, { clientX: 110, clientY: 130 });
    expect(cursor).toHaveAttribute("data-mode", "snap");
    expect(cursor).toHaveAttribute("data-visible", "true");
    expect(pointer).toHaveAttribute("data-visible", "true");
  });

  it("updates snapped bounds on scroll and falls back to dot when target is removed from DOM", () => {
    render(
      <div>
        <CustomCursor />
        <button type="button" data-testid="action-btn">
          Save
        </button>
      </div>,
    );

    const cursor = screen.getByTestId("custom-cursor");
    const button = screen.getByTestId("action-btn");

    const rectSpy = vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 200,
      left: 100,
      top: 200,
      width: 80,
      height: 40,
      right: 180,
      bottom: 240,
      toJSON: () => ({}),
    });

    fireEvent.mouseMove(button, { clientX: 120, clientY: 210 });
    expect(cursor).toHaveAttribute("data-mode", "snap");
    expect(cursor.style.getPropertyValue("--cursor-y")).toBe("220px");

    rectSpy.mockReturnValue({
      x: 100,
      y: 150,
      left: 100,
      top: 150,
      width: 80,
      height: 40,
      right: 180,
      bottom: 190,
      toJSON: () => ({}),
    });

    fireEvent.scroll(window);
    expect(cursor.style.getPropertyValue("--cursor-y")).toBe("170px");

    button.remove();
    fireEvent.scroll(window);
    expect(cursor).toHaveAttribute("data-mode", "dot");
    expect(cursor.style.getPropertyValue("--cursor-x")).toBe("120px");
    expect(cursor.style.getPropertyValue("--cursor-y")).toBe("210px");
  });
});
