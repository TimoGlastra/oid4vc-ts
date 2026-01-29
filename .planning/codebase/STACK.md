# Technology Stack

**Analysis Date:** 2026-01-29

## Languages

**Primary:**
- TypeScript 5.9.3 - Implementation of OpenID4VC specifications in all packages

**Target Output:**
- JavaScript (ES2020) - Compiled output from TypeScript

## Runtime

**Environment:**
- Node.js 18+ - Required runtime (specified in `package.json` engines field)

**Module System:**
- ESM (ES Modules) - Node16 module resolution with ESM output format

**Package Manager:**
- pnpm 10.18.3 - Monorepo package manager (specified in `packageManager` field)
- Lockfile: `pnpm-lock.yaml` - Present and maintained

## Frameworks & Core Libraries

**Build/Compilation:**
- tsdown 0.19.0 - TypeScript bundler for building packages to ESM with source maps
  - Used in all packages: `packages/oauth2`, `packages/utils`, `packages/openid4vci`, `packages/openid4vp`
  - Build command: `tsdown src/index.ts --format esm --dts --sourcemap`
  - Produces `.mjs` files with `.d.mts` type definitions

**Code Quality:**
- Biome 2.3.11 - Unified linter, formatter, and code analyzer
  - Config: `biome.json` with `biome check --unsafe` for checking
  - Semicolons: asNeeded
  - Quotes: single quotes
  - Line width: 120 characters
  - Trailing commas: ES5 style
  - Organized imports: enabled

**Testing:**
- Vitest 4.0.17 - Unit test runner
  - Config: `vite.config.js` (watch: false)
  - Test files: `*.test.mts` or `*.test.ts`
  - Run: `vitest`

**Type Checking:**
- TypeScript 5.9.3 - Strict type checking enabled
  - Target: ES2020
  - Strict mode: enabled
  - Module resolution: Node16
  - Source maps: enabled
  - Declaration files: generated

## Key Dependencies

**Validation & Schema:**
- zod 4.3.5 - Runtime schema validation (across all packages)
  - Used for parsing and validating OAuth2, OpenID4VC, and credential formats
  - Located in: `packages/utils`, `packages/oauth2`, `packages/openid4vci`, `packages/openid4vp`
- zod-validation-error 5.0.0 - Human-readable zod error formatting
  - Located in: `packages/utils`

**JWT & Cryptography:**
- jose 6.1.3 - JSON Object Signing and Encryption library
  - Used for JWT operations: signing, verifying, encryption/decryption
  - DevDependency in: `packages/oauth2`, `packages/openid4vci`
  - For testing and JWT operations

**Utilities:**
- buffer 6.0.3 - Node.js Buffer polyfill for cross-platform compatibility
  - Located in: `packages/utils`
  - Enables use in browser and React Native environments

## Workspace Structure

**Type:** pnpm monorepo

**Packages:**
- `packages/oauth2` - OAuth2 authorization framework implementation (v0.4.4)
- `packages/utils` - Shared utilities including fetch, validation, encoding (v0.4.4)
- `packages/openid4vci` - OpenID4VC Credential Issuance implementation (v0.4.4)
- `packages/openid4vp` - OpenID4VC Verifiable Presentation implementation (v0.4.4)

**Exports:**
- Each package exports from `src/index.ts` via tsdown
- Published as ESM modules: `.mjs` with `.d.mts` type declarations
- All packages published to npm under `@openid4vc` scope

## Configuration

**TypeScript:**
- File: `tsconfig.json` (root level)
- Strict type checking enabled
- Skip lib check: enabled
- ESM with Node16 module resolution
- DOM and DOM.Iterable included in lib for compatibility

**Biome:**
- File: `biome.json`
- Linting rules enforced:
  - Custom linting rule: Forces imports of `URL`, `URLSearchParams`, `fetch`, `Response`, `Headers` from `@openid4vc/utils` instead of globals
  - No unused imports: error level
  - Recommended rules: enabled
  - Test file overrides: `**/*.test.ts`, `**/tests/**/*`, `**/*.test.mts`

**Vite/Vitest:**
- File: `vite.config.js`
- Watch mode: disabled

## Build & Distribution

**Build Process:**
- Root command: `pnpm -r build` (builds all packages recursively)
- Each package uses tsdown to build from TypeScript source to ESM

**Release Process:**
- Changeset CLI (@changesets/cli 2.29.8) for version management
- Command: `pnpm release` - builds and publishes to npm
- No git tags created during publish

**Source Maps:**
- Enabled during build for debugging

## Environment & Compatibility

**Browser Support:**
- Global fetch, URL, URLSearchParams, Headers, Response used
- Polyfilled via `@openid4vc/utils` exports for cross-platform compatibility

**React Native:**
- Supported via buffer polyfill and fetch abstraction

**Node.js:**
- Minimum version: 18

## Development Scripts

```bash
pnpm types:check        # TypeScript type checking
pnpm style:check        # Biome linting
pnpm style:fix          # Biome auto-fix
pnpm build              # Build all packages
pnpm test               # Run vitest tests
pnpm release            # Build and publish to npm
pnpm changeset-version  # Version bump and style fix
```

---

*Stack analysis: 2026-01-29*
