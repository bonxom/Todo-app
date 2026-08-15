# Cinematic Orbit Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the guest landing page with an accessible, responsive Orbit Control product showcase that communicates Capture → Organize → Focus while preserving existing account routes and root guarding.

**Architecture:** Keep the lazy `landingRoutes` entry and `RootGuard` unchanged. `LandingPage` becomes a landing-owned composition shell for small presentational components; browser enhancement stays inside two feature-local hooks, and all no-JavaScript/reduced-motion states remain readable through final-state markup and CSS. A single landing stylesheet supplies the dark visual system without changing global application theme tokens.

**Tech Stack:** React 19 JSX, React Router 7, Lucide React, CSS/SVG, browser-native `IntersectionObserver`, `matchMedia`, `requestAnimationFrame`, Vitest 4, React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-15-cinematic-orbit-landing-design.md`

## Global Constraints

- Keep `frontend/src/features/landing/routes.tsx` lazy-loaded and do not change `RootGuard` / public root behavior.
- Do not add WebGL, Three.js, React Three Fiber, an animation library, image/video decoration, a CMS, analytics, testimonials, pricing, or backend/API work.
- Use CSS, inline presentation-only SVG, and browser-native APIs only; do not attach continuous scroll listeners.
- Preserve normal DOM text and links for all meaningful copy/actions; `/register` is the primary account-creation destination and `/login` is the sign-in destination.
- Decorative SVG and product-mockup accents must use `aria-hidden="true"`; preserve the skip link to `#landing-main`, landmarks, semantic headings, labels, and visible keyboard focus states.
- Use `IntersectionObserver` reveal state with visible fallbacks when the API is unavailable. Pointer tilt runs only for a fine primary pointer when reduced motion is not requested and must write CSS variables in a `requestAnimationFrame` callback.
- `prefers-reduced-motion: reduce` disables decorative animation/tilt/reveal displacement and renders all content/mockups in final visible positions.
- At about 900px stack the hero and constrain the scene; at about 700px simplify distant tracks, particles, and nonessential modules without hiding meaningful content or creating horizontal overflow.
- Use the existing system type stack. Orbit Control’s brand mark is landing-local CSS/SVG orbital rings with a cyan core; do not retain `/ech.jpeg`.
- Use pnpm from `frontend/`. Do not edit generated output, lockfile internals, global theme files, real environment files, or unrelated feature code.
- Do not commit unless the user explicitly asks for a commit.

---

## File Structure

| Path | Change | Responsibility |
| --- | --- | --- |
| `frontend/src/features/landing/hooks/useInView.js` | Create | Safe, one-shot/continuous `IntersectionObserver` state for landing reveal choreography. |
| `frontend/src/features/landing/hooks/usePointerTilt.js` | Create | Fine-pointer, non-reduced-motion CSS custom-property tilt handlers with rAF throttling and reset. |
| `frontend/src/features/landing/components/OrbitMark.jsx` | Create | Reusable decorative SVG brand mark for the nav/footer. |
| `frontend/src/features/landing/components/Navbar.jsx` | Modify | Orbit mark, section anchors, account links, and hero-passed glass state. |
| `frontend/src/features/landing/components/Hero.jsx` | Modify | Orbital hero copy, proof chips, normal CTA links, and `OrbitScene` composition. |
| `frontend/src/features/landing/components/OrbitScene.jsx` | Create | Decorative orbit SVG, tilt-able command deck, and floating static product modules. |
| `frontend/src/features/landing/components/NarrativeSection.jsx` | Create | Shared semantic Capture/Organize chapter shell and visible-on-fallback reveal state. |
| `frontend/src/features/landing/components/CaptureScene.jsx` | Create | Static task capture composition that assembles through CSS reveal classes. |
| `frontend/src/features/landing/components/OrganizeScene.jsx` | Create | Static category/project/calendar/priority composition that aligns through CSS reveal classes. |
| `frontend/src/features/landing/components/ProductExhibit.jsx` | Create | Focus chapter’s static dashboard, metric, progress ring, tasks, and timeline. |
| `frontend/src/features/landing/components/LaunchCTA.jsx` | Create | Final register CTA plus presentation-only portal composition. |
| `frontend/src/features/landing/components/Footer.jsx` | Modify | Orbit Control footer presentation and product/account anchor links. |
| `frontend/src/features/landing/LandingPage.jsx` | Modify | New page composition, chapter data, skip link, and `hero-passed` navigation state. |
| `frontend/src/styles/landing.css` | Replace | Landing-scoped visual tokens, layout, 3D surfaces, responsive rules, reduced-motion fallback, and focus treatment. |
| `frontend/src/features/landing/test/LandingPage.test.jsx` | Create | Structural, link contract, and no-browser-API fallback tests. |
| `frontend/e2e/landing.spec.ts` | Create | Guest desktop/mobile/reduced-motion landing validation and console-error checks. |
| `frontend/e2e/app.spec.ts` | Modify | Leave existing root-guard regression coverage intact; only adjust an assertion if the redesigned heading selector requires it. |

## Task 1: Add safe landing browser-effect hooks

**Files:**
- Create: `frontend/src/features/landing/hooks/useInView.js`
- Create: `frontend/src/features/landing/hooks/usePointerTilt.js`
- Test: `frontend/src/features/landing/test/LandingHooks.test.jsx`

**Interfaces:**
- Produces `useInView(options?)`, returning `{ ref, isVisible }`, where `ref` is attached to an observed element and `isVisible` defaults to `true` when `IntersectionObserver` is unsupported.
- Produces `usePointerTilt({ maxTilt = 7, maxShift = 10 }?)`, returning `{ onPointerMove, onPointerLeave }`, which writes `--tilt-x`, `--tilt-y`, `--pointer-x`, and `--pointer-y` on `event.currentTarget` only when the effect is supported.
- Later components consume these exact exports; no component owns observer/rAF lifecycle code.

- [ ] **Step 1: Write the failing hook fallback tests**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useInView } from '../hooks/useInView';
import { usePointerTilt } from '../hooks/usePointerTilt';

const InViewProbe = () => {
  const { ref, isVisible } = useInView();
  return <div ref={ref} data-testid="probe" data-visible={isVisible} />;
};

const TiltProbe = () => {
  const tilt = usePointerTilt();
  return <div data-testid="tilt" {...tilt} />;
};

describe('landing enhancement hooks', () => {
  it('keeps content visible without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<InViewProbe />);
    expect(screen.getByTestId('probe')).toHaveAttribute('data-visible', 'true');
  });

  it('does not write tilt variables for a coarse pointer', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })));
    render(<TiltProbe />);
    expect(screen.getByTestId('tilt')).not.toHaveAttribute('style');
  });
});
```

- [ ] **Step 2: Run the hook test to verify it fails**

Run: `cd frontend && pnpm test -- src/features/landing/test/LandingHooks.test.jsx`

Expected: FAIL because the hook modules do not exist.

- [ ] **Step 3: Implement `useInView` with an explicit visible fallback**

```js
import { useEffect, useRef, useState } from 'react';

export const useInView = ({ threshold = 0.2, once = true, rootMargin = '0px' } = {}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (!once) setIsVisible(false);
        return;
      }
      setIsVisible(true);
      if (once) observer.unobserve(entry.target);
    }, { threshold, rootMargin });

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return { ref, isVisible };
};
```

- [ ] **Step 4: Implement `usePointerTilt` with guarded rAF writes and cleanup**

```js
import { useEffect, useRef } from 'react';

const effectIsSupported = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(pointer: fine)').matches
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  && typeof window.requestAnimationFrame === 'function'
);

export const usePointerTilt = ({ maxTilt = 7, maxShift = 10 } = {}) => {
  const frameRef = useRef(0);

  useEffect(() => () => {
    if (frameRef.current && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(frameRef.current);
    }
  }, []);

  const reset = (element) => {
    element.style.setProperty('--tilt-x', '0deg');
    element.style.setProperty('--tilt-y', '0deg');
    element.style.setProperty('--pointer-x', '0px');
    element.style.setProperty('--pointer-y', '0px');
  };

  return {
    onPointerMove: (event) => {
      if (!effectIsSupported()) return;
      const element = event.currentTarget;
      const { left, top, width, height } = element.getBoundingClientRect();
      const x = (event.clientX - left) / width - 0.5;
      const y = (event.clientY - top) / height - 0.5;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(() => {
        element.style.setProperty('--tilt-x', `${(-y * maxTilt).toFixed(2)}deg`);
        element.style.setProperty('--tilt-y', `${(x * maxTilt).toFixed(2)}deg`);
        element.style.setProperty('--pointer-x', `${(x * maxShift).toFixed(2)}px`);
        element.style.setProperty('--pointer-y', `${(y * maxShift).toFixed(2)}px`);
      });
    },
    onPointerLeave: (event) => reset(event.currentTarget),
  };
};
```

- [ ] **Step 5: Run the hook test to verify it passes**

Run: `cd frontend && pnpm test -- src/features/landing/test/LandingHooks.test.jsx`

Expected: PASS. The no-observer probe is visible and coarse-pointer movement remains static.

- [ ] **Step 6: Run lint for the new hook modules**

Run: `cd frontend && pnpm run lint`

Expected: PASS with no hook-dependency or unused-value errors.

## Task 2: Build the reusable Orbit visual primitives and hero scene

**Files:**
- Create: `frontend/src/features/landing/components/OrbitMark.jsx`
- Create: `frontend/src/features/landing/components/OrbitScene.jsx`
- Modify: `frontend/src/features/landing/components/Hero.jsx`
- Modify: `frontend/src/styles/landing.css`
- Test: `frontend/src/features/landing/test/LandingPage.test.jsx`

**Interfaces:**
- Consumes `usePointerTilt` from Task 1.
- Produces `<OrbitMark className?: string />` as an `aria-hidden` inline SVG with orbital rings and a cyan core.
- Produces `<OrbitScene />`, which owns decorative `aria-hidden` SVG tracks and invokes `usePointerTilt` only on the noninteractive deck wrapper.
- Produces `<Hero />` with the `Control the day.` h1, concise product copy, links to `/register` and `/login`, proof chips, and `<OrbitScene />`.

- [ ] **Step 1: Write failing hero and visual-semantics tests**

```jsx
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import Hero from '../components/Hero';

it('renders normal account links alongside the orbital scene', () => {
  render(<MemoryRouter><Hero /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: /control the day/i })).toBeVisible();
  expect(screen.getByRole('link', { name: /start your orbit/i })).toHaveAttribute('href', '/register');
  expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  expect(screen.getByLabelText(/todoapp command deck preview/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the hero test to verify it fails**

Run: `cd frontend && pnpm test -- src/features/landing/test/LandingPage.test.jsx`

Expected: FAIL because the headline, CTA label, and OrbitScene are not implemented.

- [ ] **Step 3: Create the image-free `OrbitMark`**

```jsx
const OrbitMark = ({ className = '' }) => (
  <svg className={`orbit-mark ${className}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <circle className="orbit-mark__ring orbit-mark__ring--one" cx="20" cy="20" r="14" />
    <ellipse className="orbit-mark__ring orbit-mark__ring--two" cx="20" cy="20" rx="17" ry="8" />
    <circle className="orbit-mark__core" cx="20" cy="20" r="4" />
  </svg>
);

export default OrbitMark;
```

Add CSS for `stroke`, cyan core glow, and a fixed size; never reference `/ech.jpeg`.

- [ ] **Step 4: Create `OrbitScene` as a decorative-but-labelled product preview**

Use a semantic `<div className="orbit-scene" aria-label="TodoApp command deck preview">` for the preview as a whole. Inside it, render all track SVG/background mesh layers with `aria-hidden="true"`, then render a static command-deck panel with DOM text for representative "Focus queue", "68%", task rows, and a small search/AI module. Attach `onPointerMove` and `onPointerLeave` from `usePointerTilt()` to the deck wrapper, not to a link/button. Set the CSS variables’ default values inline only through CSS:

```jsx
const tilt = usePointerTilt();

return (
  <div className="orbit-scene" aria-label="TodoApp command deck preview">
    <svg className="orbit-scene__tracks" viewBox="0 0 600 500" aria-hidden="true" focusable="false">...</svg>
    <div className="orbit-scene__deck-wrap" {...tilt}>
      <div className="orbit-scene__deck">...</div>
    </div>
  </div>
);
```

- [ ] **Step 5: Rewrite `Hero` around the approved copy and normal CTAs**

Use the following stable copy/labels so tests and E2E are intent-based:

```jsx
<p className="orbit-kicker">Orbit Control / Daily planning</p>
<h1 className="hero-title">Control the day. Keep work in orbit.</h1>
<p className="hero-description">Capture the next action, shape a working system, and turn steady progress into momentum.</p>
<Link className="orbit-button orbit-button--primary" to="/register">Start your orbit <ArrowRight aria-hidden="true" /></Link>
<Link className="orbit-button orbit-button--secondary" to="/login">Sign in</Link>
```

Keep proof chips concise and drawn from actual product concepts: "AI task assist", "Calendar planning", and "Progress clarity". Compose `<OrbitScene />` beside this content.

- [ ] **Step 6: Add base Orbit Control scene styles**

In `landing.css`, create landing-local custom properties (e.g. `--orbit-bg`, `--orbit-panel`, `--orbit-indigo`, `--orbit-cyan`), dark canvas lighting, `.orbit-scene` dimensions, the CSS perspective deck transform using `var(--tilt-x)`/`var(--tilt-y)`, and `@keyframes` only for nonessential track rotation. Set `pointer-events: none` on decorative layers, keep deck text contrast high, and use `@media (prefers-reduced-motion: reduce)` to disable animation and flatten transforms.

- [ ] **Step 7: Run the hero test and lint**

Run: `cd frontend && pnpm test -- src/features/landing/test/LandingPage.test.jsx && pnpm run lint`

Expected: PASS. The browser-independent hero has normal links, the scene label, no image asset, and no lint errors.

## Task 3: Add reusable Capture and Organize narrative chapters

**Files:**
- Create: `frontend/src/features/landing/components/NarrativeSection.jsx`
- Create: `frontend/src/features/landing/components/CaptureScene.jsx`
- Create: `frontend/src/features/landing/components/OrganizeScene.jsx`
- Modify: `frontend/src/features/landing/LandingPage.jsx`
- Modify: `frontend/src/styles/landing.css`
- Modify: `frontend/src/features/landing/test/LandingPage.test.jsx`

**Interfaces:**
- Consumes `useInView` from Task 1.
- Produces `<NarrativeSection id, chapter, kicker, title, description, visual, reverse?>`; it marks the visual/text region with `data-visible={isVisible}` without making initial markup hidden.
- Produces `<CaptureScene />` and `<OrganizeScene />`, each presentation-only (`aria-hidden="true"`) and styled through their enclosing narrative state.
- `LandingPage` consumes these components with `id="capture"` and `id="organize"` in narrative order.

- [ ] **Step 1: Extend the page test with the required chapter structure**

```jsx
expect(screen.getByRole('heading', { name: /bring work into orbit/i })).toBeVisible();
expect(screen.getByRole('heading', { name: /shape the workspace/i })).toBeVisible();
expect(document.querySelector('#capture')).toBeTruthy();
expect(document.querySelector('#organize')).toBeTruthy();
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `cd frontend && pnpm test -- src/features/landing/test/LandingPage.test.jsx`

Expected: FAIL because the Capture and Organize chapters are absent.

- [ ] **Step 3: Implement `NarrativeSection` as the only reveal-state owner**

```jsx
import { useInView } from '../hooks/useInView';

const NarrativeSection = ({ id, chapter, kicker, title, description, visual, reverse = false }) => {
  const { ref, isVisible } = useInView({ threshold: 0.18 });
  return (
    <section id={id} className={`narrative-section${reverse ? ' narrative-section--reverse' : ''}`}>
      <div ref={ref} className="narrative-section__inner" data-visible={isVisible}>
        <div className="narrative-section__copy">
          <p className="orbit-kicker">{chapter} / {kicker}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="narrative-section__visual">{visual}</div>
      </div>
    </section>
  );
};

export default NarrativeSection;
```

- [ ] **Step 4: Create the two noninteractive visual compositions**

`CaptureScene` renders a compact task-inbox module, plus three incoming task cards with labels such as "Reply to design notes", "Outline sprint scope", and "Book review time". `OrganizeScene` renders connected category, project, calendar, and priority panels labelled "Work", "Orbit launch", "Thursday", and "High priority". Each component wraps its content in a root element with `aria-hidden="true"`; no button, link, or required explanatory text appears only inside the illustration.

- [ ] **Step 5: Compose both chapters in `LandingPage`**

```jsx
<NarrativeSection
  id="capture"
  chapter="01"
  kicker="Capture"
  title="Bring work into orbit."
  description="Turn passing ideas into clear next actions before they scatter across the day."
  visual={<CaptureScene />}
/>
<NarrativeSection
  id="organize"
  chapter="02"
  kicker="Organize"
  title="Shape the workspace."
  description="Layer categories, projects, due dates, and priority into a system that stays easy to scan."
  visual={<OrganizeScene />}
  reverse
/>
```

- [ ] **Step 6: Add visible-first choreography CSS**

Set every visual/copy to its final layout by default. Apply transforms/opacities only inside an enhancement selector such as `.js .narrative-section__inner[data-visible="false"]` if the implementation deliberately adds a root JS marker; otherwise keep non-visible state semantically and visually readable. On `data-visible="true"`, transition individual cards with staggered `transform`/`opacity` only. At `max-width: 900px`, switch to content-first one-column layout; at `max-width: 700px`, reduce card count/density without removing the visual block.

- [ ] **Step 7: Run the chapter test and lint**

Run: `cd frontend && pnpm test -- src/features/landing/test/LandingPage.test.jsx && pnpm run lint`

Expected: PASS. Both chapter headings exist in order and content remains visible without observer support.

## Task 4: Implement Focus exhibit, launch portal, navigation, footer, and full page composition

**Files:**
- Create: `frontend/src/features/landing/components/ProductExhibit.jsx`
- Create: `frontend/src/features/landing/components/LaunchCTA.jsx`
- Modify: `frontend/src/features/landing/components/Navbar.jsx`
- Modify: `frontend/src/features/landing/components/Footer.jsx`
- Modify: `frontend/src/features/landing/LandingPage.jsx`
- Modify: `frontend/src/styles/landing.css`
- Modify: `frontend/src/features/landing/test/LandingPage.test.jsx`

**Interfaces:**
- Consumes `useInView` from Task 1 and `OrbitMark` from Task 2.
- Produces `<ProductExhibit />` with `id="focus"`, static final readable metric values, and `data-visible` enhancement state.
- Produces `<LaunchCTA />` with one visible register link named `Launch your workspace`.
- `Navbar` accepts `heroPassed` boolean and applies `data-scrolled={heroPassed}`; it owns no routing state.
- `LandingPage` detects hero visibility once with `useInView({ threshold: 0.1, once: false })` and passes `heroPassed={!heroVisible}` to `Navbar`.

- [ ] **Step 1: Add failing focus/final CTA/navigation tests**

```jsx
expect(screen.getByRole('heading', { name: /turn progress into momentum/i })).toBeVisible();
expect(screen.getByText('68%')).toBeVisible();
expect(screen.getByRole('heading', { name: /start with a clear orbit/i })).toBeVisible();
expect(screen.getByRole('link', { name: /launch your workspace/i })).toHaveAttribute('href', '/register');
expect(screen.getByRole('navigation', { name: /landing navigation/i })).toBeVisible();
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `cd frontend && pnpm test -- src/features/landing/test/LandingPage.test.jsx`

Expected: FAIL because the Focus chapter and final CTA do not exist.

- [ ] **Step 3: Implement `ProductExhibit` with complete static information**

Use `useInView({ threshold: 0.25 })` and render a `<section id="focus">` whose copy states why the focus view helps. Include a labelled static product display with the final textual values present immediately: project name "Orbit launch", metric `68%`, three task titles/statuses, a progress ring whose circumference is set in CSS/SVG, and a compact timeline. Give all internal decorative progress geometry `aria-hidden="true"`; the `68%` text remains normal DOM content. CSS may animate `stroke-dashoffset` only after `data-visible="true"`, and must show the completed ring under reduced motion.

- [ ] **Step 4: Implement `LaunchCTA` portal composition**

Render a semantic final `<section className="launch-cta">` containing the heading "Start with a clear orbit.", concise supporting copy, and exactly one primary `Link` to `/register` labelled "Launch your workspace". Render the surrounding orbital portal and convergence modules as `aria-hidden="true"` siblings/backgrounds with no pointer interaction.

- [ ] **Step 5: Update Navbar and Footer for Orbit Control**

Replace the existing `<img src="/ech.jpeg">` block with `<OrbitMark />`. Use anchors for `#capture`, `#organize`, and `#focus`, plus existing normal React Router links to `/login` and `/register`. Keep `aria-label="Landing navigation"`. Add `data-scrolled={heroPassed}` to allow CSS-only transparent-to-glass transition. Update the footer’s Product links to those new anchors, retain account links and dynamic year, and include `<OrbitMark />` beside the brand name.

- [ ] **Step 6: Finalize `LandingPage` composition and hero observer**

Keep the skip link and `main#landing-main`. Wrap `Hero` in a ref-bearing hero region, derive the navbar state from its `isVisible` value, then compose chapters in this exact order: Hero, Capture, Organize, ProductExhibit, LaunchCTA. Remove imports/usages of `Features`, `HowItWorks`, and legacy `CTA`; leave their unused files untouched until a separate cleanup request, or remove them in this task only after confirming they have no other imports with `grep -R`.

- [ ] **Step 7: Replace remaining landing CSS with the coherent system**

Ensure the stylesheet covers the dark navy canvas, grid/starlight texture, glass navbar states, elevated panels, high-contrast orbit buttons, all chapter compositions, portal, footer, responsive breakpoints, `overflow-x: clip`/safe width constraints, and `:focus-visible` styles that remain bright against the dark canvas. In the reduced-motion block, explicitly set chapter visual opacity to `1`, transforms to `none`, and progress ring to final state, while disabling all landing keyframes/transitions.

- [ ] **Step 8: Run all landing unit tests and lint**

Run: `cd frontend && pnpm test -- src/features/landing/test && pnpm run lint`

Expected: PASS. The finished page has semantic narrative chapters, proper CTA routes, visible fallback values, dark-surface navigation, and no lint errors.

## Task 5: Add route/semantic regression coverage and Playwright viewport validation

**Files:**
- Modify: `frontend/src/features/landing/test/LandingPage.test.jsx`
- Modify: `frontend/src/app/test/routeGuards.test.tsx`
- Create: `frontend/e2e/landing.spec.ts`
- Modify: `frontend/e2e/app.spec.ts` only if a generic heading selector fails after the redesign

**Interfaces:**
- Consumes all finished landing components and existing guard decision helpers.
- Produces automated proof that guest root access remains landing, authenticated root decisions remain `/dashboard`, links remain routable, and the landing is usable on desktop, mobile, and reduced-motion contexts.

- [ ] **Step 1: Complete the landing unit test fixture and assertions**

Render `LandingPage` under `MemoryRouter`, stub `IntersectionObserver` as unavailable for the fallback case, and assert all of the following:

```jsx
expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#landing-main');
expect(screen.getByRole('main')).toHaveAttribute('id', 'landing-main');
expect(screen.getByRole('heading', { name: /control the day/i })).toBeVisible();
expect(screen.getByRole('heading', { name: /bring work into orbit/i })).toBeVisible();
expect(screen.getByRole('heading', { name: /shape the workspace/i })).toBeVisible();
expect(screen.getByRole('heading', { name: /turn progress into momentum/i })).toBeVisible();
expect(screen.getByRole('heading', { name: /start with a clear orbit/i })).toBeVisible();
expect(screen.getAllByRole('link', { name: /start your orbit|launch your workspace/i }).every((link) => link.getAttribute('href') === '/register')).toBe(true);
expect(screen.getByRole('link', { name: /^sign in$/i })).toHaveAttribute('href', '/login');
```

- [ ] **Step 2: Preserve/strengthen root guard assertions**

In `routeGuards.test.tsx`, retain the existing pure decision tests and add no component-level dependency on landing visuals. The required assertions are:

```ts
expect(getRootDecision({ isAuthReady: true, token: null })).toBe('landing');
expect(getRootDecision({ isAuthReady: true, token: 'token-abc' })).toBe('/dashboard');
```

- [ ] **Step 3: Run the relevant unit tests**

Run: `cd frontend && pnpm test -- src/features/landing/test/LandingPage.test.jsx src/features/landing/test/LandingHooks.test.jsx src/app/test/routeGuards.test.tsx`

Expected: PASS.

- [ ] **Step 4: Create browser tests for the public landing**

```ts
import { test, expect } from '@playwright/test';

const expectNoConsoleErrors = (page) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return () => expect(errors).toEqual([]);
};

test('guest desktop landing tells the Orbit Control story', async ({ page }) => {
  const assertNoConsoleErrors = expectNoConsoleErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /control the day/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /start your orbit/i })).toHaveAttribute('href', '/register');
  await page.locator('#focus').scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: /turn progress into momentum/i })).toBeVisible();
  await page.locator('.launch-cta').scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: /launch your workspace/i })).toBeVisible();
  assertNoConsoleErrors();
});

test('mobile guest landing has no horizontal overflow and reachable CTA', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /control the day/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /start your orbit/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('reduced motion keeps all narrative content visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const name of [/bring work into orbit/i, /shape the workspace/i, /turn progress into momentum/i, /start with a clear orbit/i]) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  await expect(page.getByText('68%')).toBeVisible();
});
```

- [ ] **Step 5: Run Playwright landing validation**

Run: `cd frontend && pnpm run test:e2e -- landing.spec.ts`

Expected: PASS in Chromium with no uncaught errors, visible desktop/mobile/reduced-motion content, and no horizontal overflow at 390px.

- [ ] **Step 6: Run existing E2E suite if its selector was changed**

Run: `cd frontend && pnpm run test:e2e`

Expected: PASS. The existing guest/protected/authenticated routing tests remain green.

## Task 6: Run final quality gate and inspect the finished public route

**Files:**
- Modify only files identified by failing verification from Tasks 1–5.

**Interfaces:**
- Consumes the completed landing implementation and tests.
- Produces verified lint, unit, production-build, and browser-validation evidence without modifying routing or application behavior outside the landing feature.

- [ ] **Step 1: Run complete frontend verification**

Run:

```bash
cd frontend
pnpm run lint
pnpm test
pnpm run build
pnpm run test:e2e
```

Expected: every command exits 0. Report exact commands and any warnings verbatim if they remain.

- [ ] **Step 2: Inspect desktop composition manually through Playwright**

Run: `cd frontend && pnpm exec playwright test landing.spec.ts --project=chromium`

Then inspect a captured screenshot or the live page at desktop width for: readable initial transparent navigation, visible glass state after the hero, no decorative overlap over hero copy/CTA, clear Capture → Organize → Focus order, and legible final portal CTA.

Expected: the CSS/SVG depth is visible but bounded; no visual is required to understand the CTAs or chapter meaning.

- [ ] **Step 3: Inspect keyboard and responsive constraints manually**

At a 390px viewport, tab from the page start and confirm the skip link receives visible focus, action targets are reachable, no horizontal scrolling appears, and scene simplifications retain the main deck. Re-run with `prefers-reduced-motion: reduce` and confirm all visual content is in final visible state.

Expected: keyboard focus has contrast against the dark presentation and no interactive target is hidden behind decorative layers.

- [ ] **Step 4: Review the final diff for scope compliance**

Run: `git diff --check && git diff -- frontend/src/features/landing frontend/src/styles/landing.css frontend/e2e frontend/src/app/test/routeGuards.test.tsx`

Expected: no whitespace errors, no dependency/lockfile changes, no `/ech.jpeg` reference in landing, no scroll listeners, no global-theme changes, and no unrelated feature changes.

- [ ] **Step 5: Report completion without committing**

Summarize changed files, confirmation that guest root and authenticated root behavior remain intact, every verification command and result, and any genuinely untested browser path. Do not create a commit unless the user asks.

## Plan Self-Review

- **Spec coverage:** Task 1 handles safe browser enhancement and fallbacks. Task 2 implements hero depth, pointer tilt, orbit SVG, and image-free Orbit Control mark. Task 3 implements Capture and Organize. Task 4 implements Focus, final CTA, glass navigation, footer, responsive/reduced-motion styling, and retained routes. Task 5 verifies semantic/route/accessibility contracts, desktop/mobile/reduced-motion browser behavior, and console errors. Task 6 runs the full quality gate and manual visual/keyboard inspection.
- **Placeholder scan:** No `TBD`, `TODO`, deferred implementation wording, or unspecified tests remain. All component/hook interfaces are defined before consumer tasks.
- **Type consistency:** `useInView` always returns `{ ref, isVisible }`; `usePointerTilt` always returns pointer handler props; `NarrativeSection` receives `id`, `chapter`, `kicker`, `title`, `description`, `visual`, and optional `reverse`; `Navbar` receives `heroPassed`.
