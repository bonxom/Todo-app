# Cinematic Orbit Landing Design

## Context

`frontend/src/features/landing` currently provides a guest-only marketing surface at `/`. It uses a light, restrained product UI and a static CSS dashboard preview. The page successfully routes visitors to sign-in and registration, but it does not represent the frontend's visual potential for a portfolio or product demonstration.

This redesign makes the landing page a cinematic product showcase. Its visual direction is **Orbit Control**: a deep navy and indigo environment, layered interface panels with CSS perspective, luminous SVG orbital tracks, and deliberate scroll-based choreography. It will use CSS, SVG, and browser-native APIs rather than WebGL or a new animation runtime.

## Goals

- Create a high-end, memorable landing page suitable for a product portfolio or live demo.
- Establish a coherent Orbit Control art direction from navigation through the final CTA.
- Make the product proposition legible while visual effects provide progressive enhancement rather than substitute for content.
- Use a cinematic scroll narrative to demonstrate capture, organization, and focus.
- Preserve the guest-only root-route behavior and existing paths to `/login` and `/register`.
- Meet responsive, keyboard, and reduced-motion accessibility requirements.
- Keep the landing route lazy-loaded and avoid new 3D or animation dependencies.

## Non-Goals

- Introducing WebGL, Three.js, React Three Fiber, or a full animation library.
- Changing backend APIs, authentication behavior, dashboard behavior, or other application routes.
- Adding a CMS, analytics, testimonials, pricing, or new product capabilities.
- Using continuous scroll event listeners for visual animation.
- Reusing unrelated video or image assets as landing-page decoration.

## Experience Direction

### Visual System

The new page will move from the shared light canvas to a landing-scoped dark presentation system:

- **Canvas:** near-black navy with layered radial indigo illumination, a subtle spatial grid, and restrained particle/starlight texture.
- **Surfaces:** midnight glass panels with low-opacity borders, controlled blur, diffuse shadow, and indigo edge light.
- **Accent:** electric indigo and blue-violet are primary action and orbital-light colors. A cool cyan accent appears sparingly for status, progress, and directional detail.
- **Typography:** retain the existing system typography stack for performance and consistency. Increase display scale, tracking, and line-height contrast in headlines rather than introducing a font dependency.
- **Brand mark:** replace the current image mark with a landing-local CSS/SVG Orbit Control mark: indigo orbital rings surrounding a restrained cyan core. It uses no image asset.
- **Depth:** use CSS `perspective`, 3D transforms, layered z-index planes, shadow, and lighting gradients to create dimensionality. No decorative element may obscure a text block or action.

### Narrative

The content follows a visual story from scattered work to controlled progress:

1. **Orbital Hero — Control the day.** Visitors encounter an editorial headline, concise product statement, clear registration and login actions, and a dimensional command deck floating within SVG orbital paths.
2. **Capture — Bring work into orbit.** Incoming task modules transition from scattered elements into an intentional system. The content describes fast capture and clarity.
3. **Organize — Shape the workspace.** Category, project, calendar, and priority layers assemble into a cohesive workflow visual.
4. **Focus — Turn progress into momentum.** A larger product exhibit demonstrates focus state, completion, progress, and a project timeline.
5. **Launch CTA — Start with a clear orbit.** The dimensional modules visually converge into a workspace portal and end with one primary registration action.

Sections will use the product's existing feature concepts: tasks, categories/projects, calendar planning, progress, search, and AI assistance. Copy should be concise and demo-oriented rather than feature-list prose.

## Architecture

`LandingPage` remains the feature's composition shell. It retains the skip link, imports the landing stylesheet, and composes the following landing-owned components:

```text
LandingPage
├── Navbar
├── main#landing-main
│   ├── Hero
│   │   └── OrbitScene
│   ├── NarrativeSection (Capture)
│   ├── NarrativeSection (Organize)
│   ├── ProductExhibit (Focus)
│   └── LaunchCTA
└── Footer
```

### Component Responsibilities

- **`Navbar`:** Renders brand, section navigation, and authentication links. It begins visually integrated with the hero and gains a readable glass surface once the hero has been passed. It does not own routing state.
- **`Hero`:** Owns headline, supporting copy, semantic CTA links, product proof chips, and composition of the decorative `OrbitScene`.
- **`OrbitScene`:** Is an isolated visual component. It renders presentation-only background layers, SVG orbit tracks, a perspective dashboard deck, and a limited set of floating product modules. It enhances the hero but has no required interaction or routing responsibility.
- **`NarrativeSection`:** Is a reusable structural component for the Capture and Organize chapters. It renders semantic text content, an optional kicker, heading, body, and one chapter-specific visual composition.
- **`ProductExhibit`:** Renders the Focus chapter's large product demonstration: a dashboard panel, project metric, progress ring, focus tasks, and timeline. Its data-like content is static representative UI, never live application data.
- **`LaunchCTA`:** Provides the final conversion message, registration link, and presentation-only portal composition.
- **`Footer`:** Retains current product/account links and copyright information in the revised visual system.

Two small landing-scoped hooks will keep browser effects out of component markup:

- **`useInView`:** Wraps `IntersectionObserver` and exposes an `isVisible` state after a threshold is met. It supports an `once` option and will be used for reveal states and exhibit metric animation. It does not attach a scroll listener.
- **`usePointerTilt`:** On devices with a fine primary pointer and without reduced-motion preference, calculates bounded pointer displacement and writes CSS custom properties through a `requestAnimationFrame` update. The deck tilt resets on pointer exit. It returns static behavior for touch/coarse pointers and reduced-motion contexts.

The actual component file names may be adjusted to match the current landing feature conventions, but no cross-feature visual primitives are introduced unless another feature adopts them.

## Motion and Interaction Contract

### Motion Model

- Entrance and chapter choreography is state-based: an `is-visible` data attribute or class activates transitions after `IntersectionObserver` signals visibility.
- Visual animation is limited to `transform` and `opacity` whenever possible. Color and glow transitions are secondary and must not change layout geometry.
- The hero deck may tilt by a small bounded angle and shift its foreground cards at different depths. The effect must not interfere with button targeting.
- SVG orbit paths may have slow, non-essential rotation or a discreet travelling highlight. Decorative rotation must be independent of document scrolling.
- The Capture and Organize modules use individual transforms to assemble, separate, or align when revealed. These states tell the narrative without moving semantic content offscreen permanently.
- The product exhibit animates its progress ring and representative values once after entering the viewport. Its final readable values are present in markup before the animation begins.
- Navigation may transition from transparent to glass after the hero intersection state changes; it must remain readable at every scroll position.

### Reduced Motion and Input Fallbacks

`prefers-reduced-motion: reduce` is a hard visual fallback:

- Disable orbital rotation, shimmer, parallax, reveal movement, pointer tilt, and CTA magnetic movement.
- Render all semantic content and UI mockups fully visible in their final arrangement.
- Avoid opacity-only reveal states that could leave content hidden if JavaScript is unavailable.

Pointer tilt and pointer-driven effects must be disabled for coarse/touch input. On smaller screens, the command deck adopts a stable, flatter visual treatment and hides or simplifies decorative modules before text or CTA readability is compromised.

## Responsive Design

- The desktop hero pairs content with the full OrbitScene.
- At the existing tablet transition (approximately 900px), hero content becomes a single-column flow and the scene follows it at a constrained height.
- At narrow mobile widths (approximately 700px and below), the most distant orbit tracks, dense particle treatment, and non-essential floating modules are removed. The primary deck remains as a static visual anchor.
- Narrative chapters use a one-column content-first layout on mobile. Visual blocks remain visible but simplified instead of being clipped.
- All actions retain adequate target dimensions. Text uses fluid sizing with explicit minimum/maximum bounds to avoid oversized mobile headlines.

## Accessibility

- Preserve the existing skip link targeting `#landing-main`, landmark structure, labelled navigation, semantic headings, and visible focus indicators.
- Keep all meaningful copy and CTA links as normal DOM content; decorative SVG and icon layers use `aria-hidden="true"`.
- CTA destination behavior remains unchanged: primary account creation goes to `/register`; sign-in links go to `/login`.
- Do not use text solely within a product mockup to communicate required information. Supporting copy must explain each chapter.
- Maintain contrast for all text and interactive controls against the dark visual system, including keyboard focus states and the post-scroll glass navbar state.
- The landing's public-route guard remains untouched: guests can view `/`; signed-in visitors are redirected to `/dashboard` by the existing root guard.

## Error Handling and Progressive Enhancement

The redesign has no new server requests, client data dependencies, or API contract changes. Browser effects are optional enhancements:

- If `IntersectionObserver` is unavailable, content remains in its final visible state.
- If pointer events or `requestAnimationFrame` are unavailable, the command deck remains static.
- If JavaScript fails after the document renders, links, semantic structure, and static CSS composition continue to provide a complete marketing page.
- Rendering errors remain covered by the application's existing root error boundary.

## Testing and Verification

### Automated Tests

Add focused landing tests using the existing Vitest and Testing Library setup:

- Guest route behavior renders the landing page; authenticated root navigation continues to redirect to `/dashboard`.
- The primary and secondary CTA links target `/register` and `/login` as designed.
- The page contains the skip link, main landmark, chapter headings, and final CTA.
- The landing visual components render without requiring browser-only APIs; hook fallbacks leave content visible.

Existing route-guard tests remain the regression boundary for public/root behavior. Tests should mock or gracefully accommodate browser APIs used by landing hooks.

### Browser Validation

Use Playwright to validate the public route in:

- Desktop viewport: hero dimensional composition, navigation transition, chapter order, visible final CTA, and no console errors.
- Mobile viewport: readable hero, reachable CTAs, no horizontal overflow, simplified composition, and correctly stacked narrative sections.
- Reduced-motion context: all narrative content visible, no blocked animation states, and usable navigation/actions.

Final frontend verification commands:

```bash
cd frontend
pnpm run lint
pnpm test
pnpm run build
```

## Success Criteria

- `/` feels like a cohesive cinematic, premium product demonstration rather than a conventional static SaaS landing page.
- Orbit Control visuals are recognizable across hero, narrative chapters, product exhibit, final CTA, navigation, and footer.
- The hero has perceptible but bounded CSS 3D depth and desktop pointer responsiveness without a WebGL runtime.
- The page tells a clear Capture → Organize → Focus story and retains immediately understandable conversion paths.
- Guest/root guarding and `/login`, `/register`, and `/dashboard` behavior do not regress.
- Full content, CTA access, and readability remain intact with reduced motion, no supported pointer tilt, or unavailable observer APIs.
- Desktop and mobile layouts avoid horizontal overflow and preserve keyboard/focus accessibility.
- No new animation/3D dependency is added; the landing route remains lazy-loaded.
- Frontend lint, unit tests, production build, and Playwright validation pass.
