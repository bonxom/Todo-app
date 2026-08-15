import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const landingStyles = readFileSync(new URL('../../../styles/landing.css', import.meta.url), 'utf8');

describe('landing stylesheet boundaries', () => {
  it('does not expose OrbitMark selectors outside the landing page', () => {
    const unscopedOrbitMarkSelectors = landingStyles.match(/(?:^|[}\n])\s*\.orbit-mark(?:__[\w-]+)?[^,{]*\{/g) ?? [];

    expect(unscopedOrbitMarkSelectors).toEqual([]);
  });
});
