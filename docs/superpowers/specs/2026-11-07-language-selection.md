# Vietnamese and English language selection

## Agreed direction
Support Vietnamese (`vi`) and English (`en`) using i18next and react-i18next. The user approved this direction and browser persistence in conversation. This is a frontend localization feature spanning existing screens.

## Behavior and acceptance criteria
- English is the default, preserving the current default UI. A valid saved `orbit.language` preference overrides it. Invalid or unavailable storage falls back to English without crashing.
- A reusable, accessible language selector appears in the authenticated top bar, authentication header, and landing navigation. It displays native names Tiếng Việt and English.
- Selecting a language updates mounted UI immediately without reload, navigation, lost form edits, or query-cache/auth resets. The choice survives reload and logout on this browser.
- `document.documentElement.lang` tracks the active language.
- Application-owned text in navigation, authentication, task forms/lists, categories/projects, calendar, statistics, profile, agent controls, and landing pages has English and Vietnamese resources. Accessible labels and empty/loading/error states are included.
- Dates and numbers displayed by application controls follow the selected locale (`en-US` or `vi-VN`). ISO values, API enums, identifiers, datetime-local values, routes and persisted user data do not change.
- English is the fallback for missing Vietnamese keys. Interpolated user strings remain React-escaped. Counts use complete translated phrases and plural handling where needed.
- User-entered task/category/project names, descriptions, messages, model-generated content and arbitrary backend error text remain unchanged. Frontend fallback messages are translated. No automated translation API is used.

## Architecture
`frontend/src/shared/i18n/index.ts` initializes bundled resources before rendering. Namespace files under `locales/en` and `locales/vi` separate common, workspace, account and agent text. React components subscribe with useTranslation; utilities use the shared instance at call time. No module-scope translated constants that would become stale after switching.
`LanguageSelect.tsx` reuses the existing CustomSelect styling. Existing component layout and themes remain consistent. No backend/API/schema changes or account synchronization.

## Alternatives
A custom dictionary would add maintenance for pluralization and React updates. Account-backed persistence would require backend contract changes; browser persistence meets the agreed initial scope. Use i18next with bundled resources and browser persistence.

## Errors and edge cases
Catch storage access failures; retain in-memory language switching. Restrict selection to en/vi. Test invalid saved values, missing resources fallback, malicious-looking interpolation as text, switching back and forth, form preservation, and accessible keyboard interaction. Preserve local date-input serialization.

## Validation
Write behavioral tests before implementation and observe expected failures. Test provider initialization, persisted selection, document lang, live translation, date locale and preserving input. Run frontend regression tests, lint, scoped Prettier check, build/typecheck, backend build/tests, and browser checks at desktop/mobile widths. Report limitations honestly.

## Non-goals
Additional languages, automatic browser-language detection, cross-device sync, translating stored user content or changing AI response language, redesigning screens, translating demo code and third-party dynamic schemas.
