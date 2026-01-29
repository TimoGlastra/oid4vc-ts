# Coding Conventions

**Analysis Date:** 2026-01-29

## Naming Patterns

**Files:**
- **Schema/validation files**: Prefix with `z-` followed by descriptive name (e.g., `z-authorization-request.ts`, `z-oauth2-error.ts`)
  - These files export Zod schema objects and inferred types
- **Feature functions**: Verb-based names starting with action (e.g., `parse-authorization-request.ts`, `create-access-token.ts`, `verify-access-token-request.ts`)
- **Class files**: PascalCase matching the exported class (e.g., `Oauth2AuthorizationServer.ts`, `Oauth2Client.ts`)
- **Nested directories**: Use kebab-case for directory names, organize by feature domain
  - Examples: `authorization-request/`, `access-token/`, `client-attestation/`, `interactive-authorization/`

**Functions:**
- camelCase for all function names
- Verb-based naming conventions:
  - `parse*` - Extract and validate input data
  - `create*` - Generate output objects/responses
  - `verify*` - Validate and confirm data integrity
  - `retrieve*` - Fetch remote data
  - `extract*` - Helper functions to pull specific data from larger objects
- Example pattern from `Oauth2AuthorizationServer.ts`:
  ```typescript
  public parseAccessTokenRequest(options: ParseAccessTokenRequestOptions)
  public verifyPreAuthorizedCodeAccessTokenRequest(options: ...)
  public createAccessTokenResponse(options: ...)
  ```

**Variables:**
- camelCase for all variables and constants
- snake_case for protocol-specific parameters (OAuth2/OpenID4VC spec names)
  - Examples: `dpop_jkt`, `request_uri`, `expires_in`, `client_id`, `code_challenge`
  - These map directly to spec field names
- PascalCase for constants that represent enum-like values (e.g., `HashAlgorithm`, `Oauth2ErrorCodes`)

**Types:**
- PascalCase for interfaces, types, and classes
- Zod schemas: `z` prefix followed by PascalCase type name
  - Examples: `zAuthorizationRequest`, `zOauth2ErrorResponse`, `zJwk`
- Inferred types follow the schema name without `z` prefix
  - Example: `type AuthorizationRequest = z.infer<typeof zAuthorizationRequest>`
- Interface naming patterns:
  - `*Options` for function parameter interfaces
  - `*Result` for function return value interfaces
  - `*Return` for verification/validation return types
  - `*Response` for API response structures
  - `*Request` for API request structures
  - `*Error*` for error-related types

## Code Style

**Formatting:**
- Line width: 120 characters (enforced by biome.json)
- Indent style: space (2 spaces per indent level)
- Quote style: single quotes (e.g., `'string'` not `"string"`)
- Semicolons: asNeeded (semicolons added only where required by syntax)
- Trailing commas: es5 (trailing commas in multiline arrays/objects, but not in function parameters)

**Linting:**
- Tool: Biome v2.3.11 (configured in `biome.json`)
- Rules enabled:
  - `recommended` ruleset enabled for linter
  - `noUnusedImports`: error - all imports must be used
  - `noRestrictedGlobals`: error - enforces imports from `@openid4vc/utils` for: URL, URLSearchParams, fetch, Response, Headers
  - `correctness` rules enabled (catches common bugs)
  - `style` rules enabled (enforces consistent code style)

**Run commands:**
```bash
biome check --unsafe              # Check code style/lint
biome check --write --unsafe      # Fix code style/lint
```

## Import Organization

**Order:**
1. External dependencies from npm (e.g., `import z from 'zod'`)
2. Scoped packages from Animo (e.g., `import { ... } from '@openid4vc/utils'`)
3. Relative imports from same package (e.g., `import { ... } from '../callbacks'`)
4. Type-only imports are organized with `import type { ... } from 'package'`

**Path Aliases:**
- No explicit path aliases configured in tsconfig.json
- All imports use relative paths (e.g., `'../callbacks'`, `'./z-authorization-request'`)
- Root package imports via npm scopes: `@openid4vc/oauth2`, `@openid4vc/utils`, `@openid4vc/openid4vci`, `@openid4vc/openid4vp`

**Barrel Files:**
- Used extensively for public API exports (see `index.ts` files)
- Pattern from `packages/oauth2/src/index.ts` (219 lines):
  - Re-export public types and interfaces only (not implementation details)
  - Some re-exports from `@openid4vc/utils` to avoid external dependency leakage
  - Grouped by functional area (access-token, authorization-request, etc.)
  - Implementation files not exported directly; only interfaces and public functions

## Error Handling

**Patterns:**
- Create custom error classes extending a base error class
  - Base: `Oauth2Error` in `packages/oauth2/src/error/Oauth2Error.ts`
  - Specialized: `Oauth2ServerErrorResponseError`, `Oauth2ClientErrorResponseError`, `Oauth2JwtVerificationError`
  - All extend `Oauth2Error` or `OpenId4VcBaseError` (from utils)
- Error constructor pattern with optional `cause` parameter:
  ```typescript
  export class Oauth2Error extends Error {
    public constructor(message?: string, options?: Oauth2ErrorOptions) {
      super(`${errorMessage}${causeMessage}`)
      this.cause = options?.cause
    }
  }
  ```
- Errors are thrown for validation failures and parsing errors
- Server response errors use specific error codes from `Oauth2ErrorCodes` enum
- Client-side operations wrap errors with `Oauth2ServerErrorResponseError` for responses

## Logging

**Framework:** console (no dedicated logging library)

**Patterns:**
- Not heavily used in library code; functions are designed to be composed
- Error messages are passed through error objects
- When logging is needed, it's done at the application level using the consumer's logging system

## Comments

**When to Comment:**
- JSDoc comments for public APIs (functions, classes, interfaces)
- Inline comments for complex logic or non-obvious workarounds
- TODO/FIXME comments for known issues or future improvements (examples found: 20+ instances)
  - Example: `// TODO: we should revamp this to generic client authentication so we can support other methods`

**JSDoc/TSDoc:**
- Used for public exports (see `Oauth2AuthorizationServer.ts`, lines 71-87)
- Pattern includes:
  - Multi-line comment blocks starting with `/**`
  - Description of what the method does
  - `@throws` tags for exceptions
  - `@param` tags where complex parameter structures need explanation
  - `@returns` tags for complex return values
  - Example from `Oauth2AuthorizationServer.ts`:
    ```typescript
    /**
     * Parse access token request and extract the grant specific properties.
     *
     * If something goes wrong, such as the grant is not supported, missing parameters, etc,
     * it will throw `Oauth2ServerErrorResponseError` containing an error response object
     * that can be returned to the client.
     */
    ```

## Function Design

**Size:** Functions are typically 20-80 lines for core logic, with clear separation of concerns

**Parameters:**
- Functions use an `options` object pattern rather than multiple parameters
- Options are typed with dedicated `*Options` interfaces
- Example from `Oauth2AuthorizationServer.ts`:
  ```typescript
  public async createAccessTokenResponse(
    options: Pick<CreateAccessTokenOptions, ...> & Pick<CreateAccessTokenResponseOptions, ...>
  )
  ```
- Complex options are built using `Pick` and `Omit` for type composition

**Return Values:**
- Functions return either:
  - Typed objects (`AuthorizationRequest`, `AccessTokenResponse`, etc.)
  - Validation results with `success` boolean and `data` properties (from Zod)
  - Promise-wrapped values for async operations
- No `null` returns; use typed unions instead (e.g., `{ jwt?: string }`)

## Module Design

**Exports:**
- Barrel files (`index.ts`) export public API only
- Implementation details kept in module files
- Type exports use `export type { ... }` to avoid runtime imports
- Example pattern from `packages/oauth2/src/index.ts`:
  - Lines 1-8: Re-exports from utils
  - Lines 9-200+: Organized export groups by feature

**Barrel Files:**
- Every package has a root `index.ts` serving as public API surface
- Organized into logical groups (access-token, authorization-request, etc.)
- Implementation subdirectories are not exported; only public interfaces and functions
- Pattern: `export type { SomeType } from './subdir/file'`

## TypeScript Configuration

**Compiler Options** (from `tsconfig.json`):
- Module: "Node16" - ES module syntax with Node resolution
- Target: "ES2020" - Modern JavaScript target
- strict: true - Strict type checking enabled
- declaration: true - Generate .d.ts files
- sourceMap: true - Source maps for debugging
- noEmitOnError: true - Fail compilation if errors exist
- lib: ["ES2020", "DOM.Iterable", "DOM"] - Include DOM types for broader compatibility
- skipLibCheck: true - Skip type checking of declaration files

## Zod Schema Patterns

- All schemas named with `z` prefix
- Schemas use `.loose()` to allow additional properties for flexibility
- Type inference pattern:
  ```typescript
  export const zAuthorizationRequest = z.object({ ... }).loose()
  export type AuthorizationRequest = z.infer<typeof zAuthorizationRequest>
  ```
- Optional fields use `z.optional()` not `?.optional`
- Primitive validation uses specific types (e.g., `z.base64url()`, `z.url()`)

## Callback Pattern

- Functions accept a `callbacks` object for dependency injection
- Callbacks contain: JWT verification, encryption, random generation, signing
- Pattern from `Oauth2AuthorizationServer` constructor:
  ```typescript
  export interface Oauth2AuthorizationServerOptions {
    callbacks: Omit<CallbackContext, 'decryptJwe' | 'encryptJwe'>
  }
  public constructor(private options: Oauth2AuthorizationServerOptions) {}
  ```
- Methods forward callbacks to underlying functions

---

*Convention analysis: 2026-01-29*
