#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const isDryRun = args.includes('--dry-run');
const featureName = args.find((arg) => !arg.startsWith('--'));

if (!featureName) {
  console.error('Usage: pnpm create-feature <feature-name> [--dry-run]');
  process.exit(1);
}

const KEBAB_REGEX = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
if (!KEBAB_REGEX.test(featureName)) {
  console.error(
    `Error: Invalid feature name "${featureName}". Feature name must be in kebab-case (e.g. "task-management", "notifications").`
  );
  process.exit(1);
}

const toPascalCase = (str) =>
  str
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');

const toCamelCase = (str) => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const pascalName = toPascalCase(featureName);
const camelName = toCamelCase(featureName);

const targetDir = path.join(rootDir, 'src', 'features', featureName);

if (!isDryRun && fs.existsSync(targetDir)) {
  console.error(`Error: Feature directory already exists at "${targetDir}".`);
  process.exit(1);
}

const filesToGenerate = [
  {
    filePath: path.join(targetDir, `${pascalName}Page.tsx`),
    content: `import React from 'react';

export const ${pascalName}Page: React.FC = () => {
  return (
    <div className="ui-page-shell">
      <header className="ui-page-header">
        <p className="ui-page-kicker">${pascalName}</p>
        <h1 className="ui-page-title">${pascalName}</h1>
      </header>
      <section className="ui-section-card ui-card-padding">
        <p className="text-sm text-[var(--color-text-muted)]">
          Welcome to the ${pascalName} feature module.
        </p>
      </section>
    </div>
  );
};

export default ${pascalName}Page;
`,
  },
  {
    filePath: path.join(targetDir, 'api', 'index.ts'),
    content: `// Export feature API queries, mutations, and query key factories here
export {};
`,
  },
  {
    filePath: path.join(targetDir, 'components', 'index.ts'),
    content: `// Export feature-specific UI components here
export {};
`,
  },
  {
    filePath: path.join(targetDir, 'routes.tsx'),
    content: `import type { RouteObject } from 'react-router-dom';

export const ${camelName}Routes: RouteObject[] = [
  {
    path: '${featureName}',
    lazy: async () => {
      const Component = (await import('./${pascalName}Page')).default;
      return { Component };
    },
  },
];
`,
  },
  {
    filePath: path.join(targetDir, 'index.ts'),
    content: `export { default } from './${pascalName}Page';
export * from './routes';
`,
  },
];

console.log(`${isDryRun ? '[DRY RUN] Would generate' : 'Generating'} feature "${featureName}":`);
for (const { filePath, content } of filesToGenerate) {
  const relativePath = path.relative(rootDir, filePath);
  console.log(` - ${relativePath}`);

  if (!isDryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

console.log(`\n${isDryRun ? '[DRY RUN] Completed successfully.' : 'Feature created successfully!'}`);
