# Testing Patterns

**Analysis Date:** 2026-01-29

## Test Framework

**Runner:**
- Vitest v4.0.17
- Config: Not explicitly configured; uses defaults from `package.json` script

**Assertion Library:**
- Vitest built-in expect API (chai-like assertions)
- Imported as `import { expect } from 'vitest'`

**Run Commands:**
```bash
pnpm test              # Run all tests with vitest
```

**Test Configuration:**
- Uses MSW (Mock Service Worker) v2.12.7 for HTTP mocking in dev dependencies
- TypeScript strict mode enabled in tsconfig.json for test type checking
- Biome linter has test-specific overrides in `biome.json` (lines 57-74):
  - Test files match patterns: `**/*.test.ts`, `**/tests/**/*`, `**/*.test.mts`
  - `noUnusedVariables` disabled in tests (allows setup/helper variables)
  - `noRestrictedGlobals` set to info level (relaxed for test utilities)

## Test File Organization

**Location:**
- Co-located pattern: Tests placed adjacent to source files in `__tests__/` directories
- Alternative pattern: Separate `tests/` directory at package level
- Examples:
  - `packages/openid4vp/src/authorization-response/__tests__/parse-authorization-response-payload.test.ts`
  - `packages/openid4vci/tests/interoperability/eidas2sandkasse.test.ts`

**Naming:**
- `.test.ts` or `.test.mts` suffix for test files
- Filename matches the module being tested with `.test` inserted
- Example: Testing `parse-authorization-response-payload.ts` creates `parse-authorization-response-payload.test.ts`

**Structure:**
```
packages/
├── oauth2/
│   ├── src/
│   │   ├── feature/
│   │   │   ├── module.ts
│   │   │   └── __tests__/
│   │   │       └── module.test.ts
│   │   └── index.ts
│   └── package.json
├── openid4vci/
│   ├── src/
│   │   ├── feature/
│   │   │   └── module.ts
│   │   └── index.ts
│   ├── tests/
│   │   ├── interoperability/
│   │   │   ├── eidas2sandkasse.test.ts
│   │   │   └── provicis.test.ts
│   │   └── fixtures/
│   └── package.json
```

## Test Structure

**Suite Organization:**
All tests use `describe` and `test` from Vitest:

```typescript
import { describe, expect, test } from 'vitest'

describe('Feature | Context', () => {
  test('should do specific thing', () => {
    // Arrange
    const input = { ... }

    // Act
    const result = functionUnderTest(input)

    // Assert
    expect(result).toEqual({ ... })
  })
})
```

**Patterns:**
- **Setup**: Imports and test data defined within test functions (no `beforeEach` found)
- **Teardown**: Not typically needed; tests are isolated and stateless
- **Assertion**: Single or multiple expect statements per test; one logical assertion per test

## Test Examples from Codebase

**Example 1: Schema Validation Test** (`packages/openid4vci/tests/interoperability/eidas2sandkasse.test.ts`):
```typescript
import { jwaSignatureAlgorithmArrayToFullySpecifiedCoseAlgorithmArray } from '@openid4vc/oauth2'
import { describe, expect, test } from 'vitest'
import { zCredentialIssuerMetadataWithDraftVersion } from '../../src/metadata/credential-issuer/z-credential-issuer-metadata'
import { eidas2sandkasseCredentialIssuerMetadataJson } from './eidas2sandkasse-credential-issuer-metadata-json'

describe('Interoperability | eidas2sandkasse.net', () => {
  test('should correctly parse and validate credential issuer metadata', () => {
    const result = zCredentialIssuerMetadataWithDraftVersion.safeParse(eidas2sandkasseCredentialIssuerMetadataJsonFixes)

    expect(result).toEqual({
      success: true,
      data: {
        credentialIssuerMetadata: eidas2sandkasseCredentialIssuerMetadataJsonFixes,
        originalDraftVersion: 'V1',
      },
    })
  })
})
```

**Example 2: Parser Test** (`packages/openid4vp/src/authorization-response/__tests__/parse-authorization-response-payload.test.ts`):
```typescript
import { describe, expect, test } from 'vitest'
import { parseOpenid4VpAuthorizationResponsePayload } from '../parse-authorization-response-payload'

describe('parseOpenid4VpAuthorizationResponsePayload', () => {
  test('should correctly handle stringified arguments due to response submitted as query', () => {
    const parsedPayload = Object.fromEntries(
      new URLSearchParams(
        'expires_in=6000&state=126781532216424167140483&...'
      ).entries()
    )

    expect(parseOpenid4VpAuthorizationResponsePayload(parsedPayload)).toEqual({
      expires_in: 6000,
      state: '126781532216424167140483',
      vp_token: 'vptoken',
      presentation_submission: { ... }
    })
  })
})
```

**Example 3: Error Validation Test** (`packages/openid4vci/tests/interoperability/provicis.test.ts`):
```typescript
describe('Interoperability | Provicis', () => {
  test('should correctly parse and validate credential issuer metadata', () => {
    expect(() =>
      parseWithErrorHandling(zCredentialIssuerMetadataWithDraftVersion, findyProvicisCredentialIssuerMetadataJson)
    ).toThrowError(
      '✖ Expected object, received null at "credential_configurations_supported...'
    )
  })
})
```

## Mocking

**Framework:** MSW (Mock Service Worker) v2.12.7

**Patterns:**
- HTTP mocking via MSW for integration tests
- Not heavily used in visible test files (most tests are unit tests)
- Zod `.safeParse()` used for schema validation testing without additional mocking
- Direct function calling for unit tests (no mocks needed due to callback pattern)

**What to Mock:**
- HTTP requests/responses (via MSW)
- JWT signing/verification (via callbacks in options)
- Encryption/decryption (via callbacks)
- Random value generation (via callbacks)

**What NOT to Mock:**
- Zod schema validation (use real schemas)
- Parser functions (test with real data)
- Type transformations (test directly)

## Fixtures and Factories

**Test Data:**
Pattern shows test data imported directly from separate files:

```typescript
import { eidas2sandkasseCredentialIssuerMetadataJson } from './eidas2sandkasse-credential-issuer-metadata-json'
```

**Location:**
- Test data files placed adjacent to tests in same directory
- Large JSON/metadata objects extracted to separate `.ts` files
- Example: `eidas2sandkasse-credential-issuer-metadata-json.ts` (1416 lines) contains fixture data

**Pattern:**
- Export data as named constant with descriptive name
- Data files mirror the structure of the entity being tested
- For interoperability tests, real metadata from external services is used

## Coverage

**Requirements:** None enforced at this time

**View Coverage:**
- No coverage command configured in package.json
- TypeScript strict mode provides compile-time type safety

## Test Types

**Unit Tests:**
- Scope: Individual functions and schema validation
- Approach: Direct function calls with test input
- Files: Distributed throughout src with `__tests__/` subdirectories
- Examples:
  - `parseOpenid4VpAuthorizationResponsePayload()` tests
  - Schema validation with `zod.safeParse()`

**Integration Tests:**
- Scope: Interoperability testing with external systems/specifications
- Approach: Real-world metadata from credential issuers
- Files: `packages/openid4vci/tests/interoperability/*.test.ts`
- Examples:
  - eidas2sandkasse.net metadata validation
  - Provicis credential issuer metadata parsing
  - Tests verify library can handle real-world data from different implementations

**E2E Tests:**
- Not found in current test suite

## Common Patterns

**Async Testing:**
Not extensively used in current test suite; most tests are synchronous. When async operations are tested, they would use async/await:

```typescript
test('async operation', async () => {
  const result = await someAsyncFunction()
  expect(result).toBeDefined()
})
```

**Error Testing:**
Two approaches observed:

1. Throwing error expectation:
```typescript
expect(() =>
  parseWithErrorHandling(zCredentialIssuerMetadataWithDraftVersion, invalidData)
).toThrowError('expected error message')
```

2. Zod safe parsing:
```typescript
const result = zCredentialIssuerMetadataWithDraftVersion.safeParse(data)
expect(result.success).toBe(false)
expect(result.error).toBeDefined()
```

## Test Naming Conventions

- Test names start with "should" and describe the expected behavior
- Include context in describe blocks (e.g., 'Interoperability | eidas2sandkasse.net')
- Names are descriptive and implementation-agnostic
- Examples:
  - "should correctly parse and validate credential issuer metadata"
  - "should correctly handle stringified arguments due to response submitted as query"

## Dependencies for Testing

**Dev Dependencies:**
- `vitest`: v4.0.17 - Test runner
- `@types/node`: ^25.0.9 - Node.js type definitions
- `msw`: v2.12.7 - HTTP request mocking
- `typescript`: ^5.9.3 - TypeScript compiler
- `tsdown`: ^0.19.0 - Build tool
- `@biomejs/biome`: 2.3.11 - Linter/formatter

---

*Testing analysis: 2026-01-29*
