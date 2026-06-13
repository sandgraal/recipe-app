import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Force a modern ECMAScript target so the parser accepts ES2019+ syntax such
    // as optional catch binding (`catch {}`), which is used throughout. (CI was
    // intermittently parsing one file with a lower default and erroring on it.)
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaVersion: 2023, sourceType: 'module' },
    },
    rules: {
      // Perf hint, not a correctness bug: several client components legitimately
      // sync state in an effect (e.g. fetch-on-filter, post-mount cookie read).
      // Keep it visible as a warning rather than failing the CI gate. Revisit
      // with the Phase 4 component refactor.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
