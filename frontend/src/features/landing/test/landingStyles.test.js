import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const landingStylesPath = resolve(process.cwd(), 'src/styles/landing.css');
const landingStyles = readFileSync(landingStylesPath, 'utf8');

describe('landing stylesheet boundaries', () => {
  it('does not expose OrbitMark selectors outside the landing page', () => {
    const unscopedOrbitMarkSelectors = landingStyles.match(/(?:^|[}\n])\s*\.orbit-mark(?:__[\w-]+)?[^,{]*\{/g) ?? [];

    expect(unscopedOrbitMarkSelectors).toEqual([]);
  });
});
