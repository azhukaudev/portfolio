// @ts-check
import astro from 'eslint-plugin-astro';
import reactDoctor from 'eslint-plugin-react-doctor';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { ignores: ['dist/', '.astro/', '.wrangler/'] },
  // https://github.com/millionco/react-doctor/tree/main/packages/eslint-plugin-react-doctor
  {
    files: ['src/**/*.{ts,tsx}'],
    // React Doctor ships rules only; this parser lets ESLint read TypeScript and JSX.
    languageOptions: { parser: tseslint.parser },
    extends: [reactDoctor.configs.recommended],
    // React Compiler is on (astro.config.mjs), so manual-memoization rules don't apply.
    settings: { 'react-doctor': { capabilities: ['react-compiler'] } },
  },
  // https://ota-meshi.github.io/eslint-plugin-astro/
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    // Lets the Astro parser read TypeScript in component frontmatter.
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
]);
