# Language Selection Implementation Plan

> Execute with the subagent-driven-development workflow; independent translation namespaces may be delegated. Keep all work in the existing feature branch and do not commit unrelated files.

**Goal:** Switch the existing application between Vietnamese and English without losing state.
**Architecture:** Shared i18next instance, bundled namespace resources, useTranslation subscriptions, reusable selector using CustomSelect.
**Tech stack:** React 19, TypeScript/JSX, i18next, react-i18next, Vitest/Testing Library, Playwright, pnpm.
**Spec:** docs/superpowers/specs/2026-11-07-language-selection.md

## Global constraints
Only en/vi; default English; persist orbit.language; use en-US/vi-VN for display. Keep API enum values and user content unchanged. Preserve form state and existing architecture. pnpm only. No changes to backend contracts or real environment files.

## Task 1: Core and selector
- [ ] Add dependency packages with pnpm, preserving lockfile.
- [ ] Write `frontend/src/shared/i18n/test/language.test.tsx`: assert default English, restored vi, invalid storage fallback, storage failures, translated selector options, immediate updates and document.lang, reload preference, input preservation, English fallback, date locale.
- [ ] Run `pnpm test -- src/shared/i18n/test/language.test.tsx` and record the expected missing-module failure.
- [ ] Implement `shared/i18n/index.ts`, `locales/{en,vi}/common.json`, `shared/components/LanguageSelect.tsx`, wire initialization in main.tsx and testing setup.
- [ ] Integrate selector and common translations in Topbar, Sidebar, shared components. Translate display date helpers without changing input serializers.
- [ ] Rerun focused tests.

Interface: default export i18n; named `getLocale(): string` returns en-US or vi-VN; `setLanguage(language: string): Promise<void>` validates language; resources use namespaces common, workspace, account, agent. Components use `const {t, i18n} = useTranslation("workspace")` and semantic keys such as `t("tasks.title")`. Do not evaluate t at module scope; translate metadata labels at render time.

## Task 2: Account and public screens
- [ ] First write behavior tests demonstrating login text changes and entered text survives language changes; run red.
- [ ] Translate `features/auth`, `features/profile`, `features/landing` with account namespace JSON files. Add selector to AuthLayout and landing Navbar. Preserve user content and validation logic.
- [ ] Run covering tests; format touched files and inspect translations for missing keys.

## Task 3: Workspace screens
- [ ] First write representative task/calendar localization tests and run red.
- [ ] Translate `features/tasks` (excluding chat), `features/categories`, `features/calendar`, `features/statistics` and `features/projects` if present using workspace namespace JSON files.
- [ ] Localize static arrays at render time, not module initialization. Add language dependencies to memoized labels/date computations. Preserve API payloads.
- [ ] Run covering tests and format touched files.

## Task 4: Agent and chat controls
- [ ] First write a language-switch behavior test for a representative agent/chat control; run red.
- [ ] Translate `features/agent`, `features/tasks/components/chat`, and app-owned shared A2UI controls with agent namespace JSON files. Do not translate message bodies, generated schemas, code, or stored names.
- [ ] Run covering tests and format touched files.

## Task 5: Integration review and verification
- [ ] Check matching en/vi namespace keys, interpolation tokens, untranslated literals, locale assumptions and live subscription behavior.
- [ ] Run `cd frontend && pnpm test`, `pnpm run lint`, scoped `pnpm exec prettier --check <changed files>`, and `pnpm run build`.
- [ ] Run `cd backend && pnpm run build && pnpm test`.
- [ ] Browser verify public/login and mocked authenticated flows in both languages, mobile layout, keyboard selection, reload persistence and preserved inputs.
- [ ] Review diff for unrelated changes and record test results and any limitations.
