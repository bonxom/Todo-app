import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/styles/index.css"),
  "utf8",
);

describe("landing stylesheet boundaries", () => {
  it("keeps landing-specific OrbitMark styling scoped to its page", () => {
    const unscopedOrbitMarkSelectors = Array.from(
      stylesheet.matchAll(
        /(?:^|[}\n])\s*(\.orbit-mark(?:__[\w-]+)?(?![\w-])[^,{]*)\{/g,
      ),
      ([, selector]) => selector.trim(),
    ).filter((selector) => selector !== ".orbit-mark");

    expect(unscopedOrbitMarkSelectors).toEqual([]);
  });
});
