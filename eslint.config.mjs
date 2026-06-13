import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tsParser from "@typescript-eslint/parser";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Pin the TypeScript parser + a modern ECMAScript target for all TS/TSX so
    // ES2019+ syntax (e.g. optional catch binding `catch {}`, used throughout) is
    // parsed consistently. CI was otherwise erroring on a .tsx file's `catch {}`.
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaVersion: 2023, sourceType: "module" },
    },
  },
  {
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
