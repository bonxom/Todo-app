import { useTranslation } from "react-i18next";
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus } from "lucide-react";

type ParsedOption = {
  value: string;
  label: string;
  disabled: boolean;
  isAction: boolean;
};

function flattenText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(flattenText).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return flattenText(node.props.children);
  }
  return "";
}

function parseOptions(children: ReactNode): ParsedOption[] {
  const result: ParsedOption[] = [];

  const visit = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (
        !isValidElement<{
          value?: string | number;
          disabled?: boolean;
          children?: ReactNode;
        }>(child)
      ) {
        return;
      }

      if (child.type === "option") {
        const label = flattenText(child.props.children).trim();
        const rawValue =
          child.props.value !== undefined ? String(child.props.value) : label;
        const isAction =
          rawValue.startsWith("__add_") || label.startsWith("+ ");

        result.push({
          value: rawValue,
          label,
          disabled: Boolean(child.props.disabled),
          isAction,
        });
        return;
      }

      if (child.props?.children) {
        visit(child.props.children);
      }
    });
  };

  visit(children);
  return result;
}

export type CustomSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
  maxHeight: number;
};

export default function CustomSelect({
  id,
  value,
  onChange,
  disabled = false,
  className = "",
  wrapperClassName = "",
  children,
  ...rest
}: CustomSelectProps) {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition>({
    top: 0,
    left: 0,
    minWidth: 160,
    maxHeight: 260,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  const options = useMemo(() => parseOptions(children), [children]);
  const stringValue =
    value !== undefined && value !== null ? String(value) : "";

  const selectedOption = useMemo(() => {
    return (
      options.find((opt) => opt.value === stringValue) ??
      options[0] ?? { value: "", label: "", disabled: false, isAction: false }
    );
  }, [options, stringValue]);

  const updateMenuPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl || typeof window === "undefined") return;

    const rect = triggerEl.getBoundingClientRect();
    const viewportW = window.innerWidth || 1024;
    const viewportH = window.innerHeight || 768;
    const spaceBelow = viewportH - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

    const minWidth = Math.max(Math.round(rect.width), 148);
    const clampedLeft = Math.max(
      8,
      Math.min(Math.round(rect.left), viewportW - minWidth - 8),
    );

    if (openUpward) {
      setMenuPos({
        bottom: Math.round(viewportH - rect.top + 6),
        left: clampedLeft,
        minWidth,
        maxHeight: Math.max(140, Math.min(280, Math.round(spaceAbove - 8))),
      });
    } else {
      setMenuPos({
        top: Math.round(rect.bottom + 6),
        left: clampedLeft,
        minWidth,
        maxHeight: Math.max(140, Math.min(280, Math.round(spaceBelow - 8))),
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    updateMenuPosition();

    const handleOutsidePointer = (event: PointerEvent | MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (event: Event) => {
      if (
        event.type === "scroll" &&
        event.target instanceof Node &&
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      updateMenuPosition();
    };

    window.addEventListener("pointerdown", handleOutsidePointer);
    window.addEventListener("mousedown", handleOutsidePointer);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("pointerdown", handleOutsidePointer);
      window.removeEventListener("mousedown", handleOutsidePointer);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updateMenuPosition]);

  const emitChange = (nextValue: string) => {
    if (selectRef.current) {
      selectRef.current.value = nextValue;
    }
    const syntheticEvent = {
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as unknown as ChangeEvent<HTMLSelectElement>;

    onChange?.(syntheticEvent);
  };

  const handleNativeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setIsOpen(false);
    onChange?.(event);
  };

  const handleNativeKeyDown = (
    event: ReactKeyboardEvent<HTMLSelectElement>,
  ) => {
    if (disabled) return;
    if (
      event.key === " " ||
      event.key === "Enter" ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const handleTriggerClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleOptionClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    option: ParsedOption,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (option.disabled) return;
    setIsOpen(false);
    emitChange(option.value);
  };

  const isInlineAutoWidth = className.includes("!w-auto");

  return (
    <div
      ref={containerRef}
      className={`ui-custom-select ${isInlineAutoWidth ? "ui-custom-select--inline" : ""} ${wrapperClassName}`.trim()}
      data-open={isOpen ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
    >
      <select
        ref={selectRef}
        id={id}
        value={value}
        disabled={disabled}
        onChange={handleNativeChange}
        onKeyDown={handleNativeKeyDown}
        className="ui-custom-select-native"
        {...rest}
      >
        {children}
      </select>

      <button
        ref={triggerRef}
        type="button"
        tabIndex={-1}
        disabled={disabled}
        data-testid="custom-select-trigger"
        data-cursor-target="control"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={handleTriggerClick}
        className={`ui-custom-select-trigger ${className}`.trim()}
      >
        <span className="ui-custom-select-value">{selectedOption.label}</span>
        <ChevronDown
          size={15}
          className="ui-custom-select-chevron"
          aria-hidden="true"
        />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={
              rest["aria-label"] || selectedOption.label || t("options")
            }
            className="ui-custom-select-menu"
            style={{
              top: menuPos.top !== undefined ? `${menuPos.top}px` : undefined,
              bottom:
                menuPos.bottom !== undefined
                  ? `${menuPos.bottom}px`
                  : undefined,
              left: `${menuPos.left}px`,
              minWidth: `${menuPos.minWidth}px`,
              maxHeight: `${menuPos.maxHeight}px`,
            }}
          >
            {options.map((opt) => {
              const isSelected =
                !opt.isAction && opt.value === selectedOption.value;
              const cleanActionLabel = opt.isAction
                ? opt.label.replace(/^\+\s*/, "")
                : opt.label;

              return (
                <button
                  key={`${opt.value}-${opt.label}`}
                  type="button"
                  role="option"
                  disabled={opt.disabled}
                  aria-selected={isSelected}
                  data-selected={isSelected ? "true" : "false"}
                  data-action={opt.isAction ? "true" : "false"}
                  data-cursor-target="control"
                  className="ui-custom-select-option"
                  onClick={(e) => handleOptionClick(e, opt)}
                >
                  <span className="ui-custom-select-option-label">
                    {opt.isAction && (
                      <Plus
                        size={14}
                        className="ui-custom-select-option-plus"
                        aria-hidden="true"
                      />
                    )}
                    <span>{cleanActionLabel}</span>
                  </span>
                  {isSelected && (
                    <Check
                      size={14}
                      className="ui-custom-select-option-check"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
