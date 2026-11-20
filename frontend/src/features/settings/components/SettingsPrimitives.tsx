import type { PropsWithChildren, ReactNode } from "react";
import type { SettingsVersion } from "../types";
import {
  settingsBorderClass,
  settingsSurfaceClass,
  settingsTextClass,
} from "./settingsStyles";

export function SettingsCard({
  version,
  title,
  description,
  action,
  children,
}: PropsWithChildren<{
  version: SettingsVersion;
  title?: string;
  description?: string;
  action?: ReactNode;
}>) {
  return (
    <section className={settingsSurfaceClass(version)}>
      {(title || description || action) && (
        <div
          className={`flex flex-wrap items-start justify-between gap-3 pb-4 mb-5 border-b ${settingsBorderClass(version)}`}
        >
          <div className="min-w-0 space-y-1">
            {title && (
              <h2
                className={`m-0 text-base sm:text-lg font-semibold tracking-tight ${settingsTextClass(version, "primary")}`}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                className={`m-0 text-sm leading-relaxed ${settingsTextClass(version, "muted")}`}
              >
                {description}
              </p>
            )}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function SettingsToggleRow({
  version,
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  version: SettingsVersion;
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const isV2 = version === "v2";
  const trackActive = isV2
    ? "bg-[var(--v2-accent)] border-transparent"
    : "bg-[var(--color-accent)] border-transparent";
  const trackIdle = isV2
    ? "bg-[var(--v2-input-fill)] border-[var(--v2-border)]"
    : "bg-[var(--color-surface-muted)] border-[var(--color-line)]";
  const thumbColor = checked
    ? isV2
      ? "bg-[var(--v2-accent-ink)]"
      : "bg-[var(--color-surface)]"
    : isV2
      ? "bg-[var(--v2-muted)]"
      : "bg-[var(--color-text-muted)]";

  return (
    <div
      className={`flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0 border-b last:border-b-0 ${settingsBorderClass(version)}`}
    >
      <div className="min-w-0 space-y-0.5">
        <label
          htmlFor={id}
          className={`block text-sm font-semibold cursor-pointer ${settingsTextClass(version, "primary")}`}
        >
          {label}
        </label>
        <p
          className={`m-0 text-xs sm:text-sm leading-relaxed ${settingsTextClass(version, "muted")}`}
        >
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="inline-flex min-h-[44px] min-w-[52px] shrink-0 items-center justify-center p-1 cursor-pointer bg-transparent border-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span
          className={`relative inline-flex h-7 w-12 items-center rounded-full border p-0.5 transition-colors duration-150 ${
            checked ? trackActive : trackIdle
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-150 ${thumbColor} ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </button>
    </div>
  );
}

export function SettingsSegmentedControl<T extends string>({
  version,
  label,
  value,
  options,
  onChange,
}: {
  version: SettingsVersion;
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (next: T) => void;
}) {
  const isV2 = version === "v2";
  const wrapperClass = isV2
    ? "inline-flex flex-wrap gap-1.5 p-1 rounded-[14px] border border-[var(--v2-border)] bg-[var(--v2-shell-fill)]"
    : "inline-flex flex-wrap gap-1.5 p-1 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-muted)]";

  return (
    <div role="group" aria-label={label} className={wrapperClass}>
      {options.map((option) => {
        const active = option.value === value;
        const activeClass = isV2
          ? "bg-[var(--v2-accent)] !text-[var(--v2-accent-ink)] shadow-sm"
          : "bg-[var(--color-accent)] !text-white shadow-xs";
        const idleClass = isV2
          ? "bg-transparent !text-[var(--v2-ink)] hover:bg-[var(--v2-input-fill)]"
          : "bg-transparent !text-[var(--color-text)] hover:bg-[var(--color-surface)]";

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[10px] px-3.5 py-2 text-xs sm:text-sm font-semibold border-0 cursor-pointer transition-colors duration-150 ${
              active ? activeClass : idleClass
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SettingsFeedbackBanner({
  version,
  tone,
  message,
}: {
  version: SettingsVersion;
  tone: "success" | "error";
  message: string;
}) {
  if (!message) return null;
  const isV2 = version === "v2";
  const toneClass =
    tone === "success"
      ? isV2
        ? "border-[color-mix(in_srgb,var(--v2-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--v2-success)_12%,var(--v2-surface-solid))] text-[var(--v2-ink)]"
        : "border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-line))] bg-[var(--color-success-soft)] text-[var(--color-success)]"
      : isV2
        ? "border-[rgb(190_68_62_/_35%)] bg-[rgb(190_68_62_/_12%)] text-[var(--v2-ink)]"
        : "border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-line))] bg-[var(--color-danger-soft)] text-[var(--color-danger)]";

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`m-0 rounded-[12px] border px-3.5 py-2.5 text-sm font-medium ${toneClass}`}
    >
      {message}
    </p>
  );
}
