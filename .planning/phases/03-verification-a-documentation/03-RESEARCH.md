# Phase 3: Verification & Documentation - Research

**Researched:** 2026-01-29
**Domain:** TypeScript Testing & Documentation (Vitest, JSDoc, Integration Testing)
**Confidence:** HIGH

## Summary

This research covers verification and documentation patterns for TypeScript libraries using Vitest as the test framework. The oid4vc-ts project uses Vitest 4.0.17 with a well-established testing architecture: co-located tests in `__tests__/` directories, interoperability tests in separate `tests/` folders, and Zod schema validation for runtime type safety.

The IAE (Interactive Authorization Endpoint) implementation has already been migrated from IAR naming in Phase 1, and client-side/server-side protocol updates were completed in Phase 2. Phase 3 focuses on updating the existing 886-line test suite (`packages/oauth2/tests/interactive-authorization.test.mts`) to cover new features (PKCE flows, expected_url validation, auth_session handling), updating JSDoc comments to reference IAE specification, and ensuring documentation consistency.

The codebase follows TypeScript strict mode with comprehensive JSDoc documentation including `@param`, `@returns`, `@throws`, and `@example` tags. Tests use the AAA pattern (Arrange-Act-Assert) with descriptive test names starting with "should".

**Primary recommendation:** Update existing test file incrementally, add focused unit tests for new features (PKCE, expected_url, auth_session), verify JSDoc references to IAE spec, and document migration notes for external consumers.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.0.17 | Test runner and assertion framework | Native ESM support, TypeScript integration, Jest-compatible API, 10-20x faster than Jest on large codebases |
| TypeScript | ^5.9.3 | Type checking and compilation | Strict mode enabled, provides compile-time type safety |
| Zod | 4.x | Runtime schema validation | Already used throughout codebase for request/response validation |
| MSW | v2.12.7 | HTTP request mocking | Industry standard for API mocking in tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jose | latest | JWT/JWK operations in tests | Already used in test fixtures for key generation |
| c8/Istanbul | native | Code coverage reporting | Vitest uses c8 by default, outputs lcov/html/json formats |
| TypeDoc | latest (optional) | Documentation generation | If auto-generating docs from JSDoc/TypeScript |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest has larger ecosystem but Vitest is faster and better for ESM/Vite projects |
| c8 | Istanbul (nyc) | c8 uses Node native coverage, Istanbul is more configurable but slower |

**Installation:**
```bash
# Already installed in project
pnpm test  # Run existing test suite
```

## Architecture Patterns

### Recommended Project Structure
The project already follows this pattern:
```
packages/
├── oauth2/
│   ├── src/
│   │   ├── interactive-authorization/
│   │   │   ├── send-interactive-authorization-request.ts
│   │   │   ├── verify-interactive-authorization-request.ts
│   │   │   ├── parse-interactive-authorization-request.ts
│   │   │   ├── create-interactive-authorization-response.ts
│   │   │   ├── z-interactive-authorization.ts
│   │   │   └── __tests__/                    # Unit tests (if needed)
│   │   │       └── module.test.ts
│   │   └── index.ts
│   └── tests/
│       └── interactive-authorization.test.mts  # Integration tests (886 lines)
├── openid4vp/
│   └── src/authorization-response/__tests__/
│       └── parse-authorization-response-payload.test.ts
└── openid4vci/
    └── tests/interoperability/
        ├── eidas2sandkasse.test.ts
        └── provicis.test.ts
```

### Pattern 1: Test Organization - Integration Tests
**What:** Package-level integration tests in `tests/` directory
**When to use:** Testing flows across multiple modules or full request/response cycles
**Example:**
```typescript
// packages/oauth2/tests/interactive-authorization.test.mts
import { describe, expect, test } from 'vitest'
import { Oauth2Client, Oauth2AuthorizationServer } from '../src/index.js'

describe('Interactive Authorization Endpoint - Client', () => {
  test('should send initial interactive authorization request', async () => {
    // Arrange: Setup client with mocked fetch
    const client = new Oauth2Client({
      callbacks: {
        ...callbacks,
        fetch: async (url, init) => {
          // Assert request format
          expect(body.get('response_type')).toBe('code')
          // Return mocked response
          return new Response(JSON.stringify({ status: 'require_interaction' }))
        }
      }
    })

    // Act: Send request
    const result = await client.sendInteractiveAuthorizationRequest({ ... })

    // Assert: Verify response handling
    expect(result.response?.status).toBe('require_interaction')
  })
})
```

### Pattern 2: Test Organization - Unit Tests
**What:** Co-located unit tests in `__tests__/` subdirectories
**When to use:** Testing individual parser/validation functions in isolation
**Example:**
```typescript
// packages/openid4vp/src/authorization-response/__tests__/parse-authorization-response-payload.test.ts
import { describe, expect, test } from 'vitest'
import { parseOpenid4VpAuthorizationResponsePayload } from '../parse-authorization-response-payload'

describe('parseOpenid4VpAuthorizationResponsePayload', () => {
  test('should correctly handle stringified arguments due to response submitted as query', () => {
    // Arrange
    const parsedPayload = Object.fromEntries(new URLSearchParams('...').entries())

    // Act
    const result = parseOpenid4VpAuthorizationResponsePayload(parsedPayload)

    // Assert
    expect(result).toEqual({ expires_in: 6000, state: '...' })
  })
})
```

### Pattern 3: JSDoc Documentation Style
**What:** Comprehensive JSDoc with specification references
**When to use:** All exported functions, types, and interfaces
**Example:**
```typescript
// Source: packages/oauth2/src/interactive-authorization/send-interactive-authorization-request.ts
/**
 * Send an Interactive Authorization Request to the Authorization Server
 *
 * Implements the Interactive Authorization Endpoint flow from OpenID4VCI 1.1.
 * This endpoint enables complex authentication and authorization flows where
 * interaction occurs directly with the Wallet rather than being intermediated
 * by a browser.
 *
 * The request can be either:
 * - Initial request: Contains authorization parameters and interaction_types_supported
 * - Follow-up request: Contains auth_session and interaction-specific parameters
 *
 * @param options - Configuration options for the request
 * @returns The interactive authorization response and updated DPoP config
 * @throws {Oauth2Error} if the authorization server doesn't support interactive authorization
 *
 * @example Initial request
 * ```ts
 * const result = await sendInteractiveAuthorizationEndpointRequest({
 *   callbacks,
 *   authorizationServerMetadata,
 *   request: {
 *     response_type: 'code',
 *     client_id: 'my-client',
 *     interaction_types_supported: 'openid4vp_presentation,redirect_to_web',
 *     authorization_details: [...]
 *   }
 * })
 * ```
 *
 * @example Follow-up request with OpenID4VP response
 * ```ts
 * const result = await sendInteractiveAuthorizationEndpointRequest({
 *   callbacks,
 *   authorizationServerMetadata,
 *   request: {
 *     auth_session: 'session-123',
 *     openid4vp_response: JSON.stringify({ vp_token: '...' })
 *   }
 * })
 * ```
 */
export async function sendInteractiveAuthorizationEndpointRequest(
  options: SendInteractiveAuthorizationEndpointRequestOptions
): Promise<SendInteractiveAuthorizationEndpointRequestReturn> {
  // ...
}
```

### Pattern 4: Zod Schema Testing
**What:** Use Zod's `.safeParse()` for validation testing without mocking
**When to use:** Testing request/response schemas and metadata parsing
**Example:**
```typescript
// Source: packages/openid4vci/tests/interoperability/eidas2sandkasse.test.ts
describe('Interoperability | eidas2sandkasse.net', () => {
  test('should correctly parse and validate credential issuer metadata', () => {
    const result = zCredentialIssuerMetadataWithDraftVersion.safeParse(metadata)

    expect(result).toEqual({
      success: true,
      data: {
        credentialIssuerMetadata: metadata,
        originalDraftVersion: 'V1',
      },
    })
  })
})
```

### Pattern 5: Callback-Based Testing
**What:** Test through callback injection without mocking framework internals
**When to use:** Testing cryptographic operations, HTTP requests, random generation
**Example:**
```typescript
const client = new Oauth2Client({
  callbacks: {
    fetch: async (url, init) => {
      // Verify request
      expect(url).toBe('https://example.com/endpoint')
      // Return mock response
      return new Response(JSON.stringify({ ... }))
    },
    signJwt: getSignJwtCallback([privateKey]),
    hash: async (alg, data) => { /* ... */ },
    generateRandom: async (length) => { /* ... */ }
  }
})
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Test behavior, not internal state. Focus on what users see and do.
- **Over-mocking:** Only mock what's necessary to isolate the unit under test. Use real Zod schemas, real parsers.
- **Coupled tests:** Each test should be independent. Avoid shared state between tests.
- **Vague test names:** Use descriptive names starting with "should" that document expected behavior.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test runner setup | Custom test harness | Vitest (already installed) | Native ESM, TypeScript support, 10-20x faster than Jest |
| Code coverage | Manual coverage tracking | c8 (Vitest default) | Node native coverage, outputs lcov/html/json |
| HTTP mocking | Manual fetch mocking | MSW v2.12.7 (installed) | Browser-native design, intercepts at network level |
| Schema validation testing | Custom validators | Zod `.safeParse()` | Already used throughout codebase, type-safe |
| JWT testing | Custom JWT creation | jose library (in tests) | Already used in test fixtures, well-tested |
| Test fixtures | Inline test data | Separate fixture files | Improves readability, enables reuse across tests |

**Key insight:** The project already has a well-established testing infrastructure. Don't replace or rebuild existing patterns—extend them to cover new IAE features (PKCE, expected_url, auth_session).

## Common Pitfalls

### Pitfall 1: Breaking Existing Tests During Updates
**What goes wrong:** Updating tests to new IAE naming/protocol breaks unrelated test scenarios
**Why it happens:** The 886-line test file covers multiple flows; changes ripple across tests
**How to avoid:**
- Run tests frequently during updates (`pnpm test`)
- Update tests incrementally: naming first, then add new assertions, then new test cases
- Use TypeScript compiler to catch type errors before running tests
**Warning signs:** Multiple test failures after a single change, unexpected assertion failures in unrelated tests

### Pitfall 2: Missing Coverage for New Protocol Features
**What goes wrong:** Tests pass but don't verify new IAE features (PKCE, expected_url, auth_session)
**Why it happens:** Existing tests focus on basic flow; new requirements not explicitly tested
**How to avoid:**
- Map requirements to test cases:
  - TEST-02: expected_url validation tests
  - TEST-03: auth_session in redirect response tests
  - TEST-04: PKCE in redirect_to_web flow tests
  - TEST-05: New metadata parameters tests
- Add dedicated test cases for each new feature, not just update existing tests
**Warning signs:** No test failures when new features are disabled, requirements marked complete without corresponding tests

### Pitfall 3: JSDoc References to Outdated Specification
**What goes wrong:** JSDoc comments reference "IAR" or old draft versions instead of "IAE" and OpenID4VCI 1.1
**Why it happens:** Phase 1 updated code but JSDoc might have been missed or partially updated
**How to avoid:**
- Search for "IAR" references: `grep -r "IAR" packages/ --include="*.ts"`
- Update specification references: "OpenID4VCI 1.1" not "draft XX"
- Reference specific requirements: "Implements PKCE-02 from IAE specification"
**Warning signs:** JSDoc mentions "Interactive Authorization Request", old draft numbers, conflicting terminology

### Pitfall 4: Test Data Using Old Response Modes
**What goes wrong:** Tests use old response modes (`iar-post`, `iar-post.jwt`) instead of new (`iae_post`, `iae_post.jwt`)
**Why it happens:** Test fixtures created before Phase 1 migration
**How to avoid:**
- Search test files for old modes: `grep -r "iar-post\|iar_post" packages/oauth2/tests/`
- Update all mock responses to use `iae_post` and `iae_post.jwt`
- Verify schema validation catches old modes
**Warning signs:** Tests passing with invalid response modes, schema validation not triggered in tests

### Pitfall 5: Insufficient Error Testing
**What goes wrong:** Happy path works but error cases (invalid PKCE, missing expected_url, downgrade attacks) not tested
**Why it happens:** Focus on successful flows during implementation, error paths deferred
**How to avoid:**
- Test error cases explicitly:
  - PKCE downgrade attack (missing code_verifier when PKCE used)
  - PKCE downgrade attack (unexpected code_verifier when PKCE not used)
  - Invalid expected_url in signed requests
  - Missing auth_session in follow-up requests
- Use `expect(() => fn()).toThrowError()` pattern for error assertions
- Verify error codes match PAR specification (ERR-01, ERR-02)
**Warning signs:** Only success cases tested, no `toThrowError` assertions, error paths commented out

### Pitfall 6: Documentation Examples Out of Sync
**What goes wrong:** JSDoc examples show old parameter names or missing new fields
**Why it happens:** Examples written before new features added, not updated during implementation
**How to avoid:**
- Review all `@example` blocks in JSDoc
- Ensure examples compile (TypeScript checks examples in JSDoc)
- Include new parameters: `code_challenge`, `code_challenge_method`, `expected_url`, `auth_session`
- Show both initial and follow-up request examples where applicable
**Warning signs:** TypeScript errors in JSDoc examples, examples missing new required fields, copy-paste from old IAR documentation

## Code Examples

Verified patterns from official sources and project codebase:

### Test Case: PKCE Validation
```typescript
// Source: Project requirements TEST-04
describe('Interactive Authorization Endpoint - Server PKCE', () => {
  test('should validate code_verifier in follow-up request', async () => {
    // Arrange: Initial request generates PKCE challenge
    const initialRequest = {
      response_type: 'code',
      client_id: 'test-client',
      interaction_types_supported: 'redirect_to_web',
      code_challenge: 'challenge-hash',
      code_challenge_method: 'S256'
    }

    // Store auth_session with PKCE state
    const pkceState = { code_challenge: 'challenge-hash', method: 'S256' }

    // Act: Follow-up request with code_verifier
    const followUpRequest = {
      auth_session: 'session-123',
      code_verifier: 'original-verifier'
    }

    const result = await server.verifyInteractiveAuthorizationRequest({
      request: followUpRequest,
      pkceState  // Retrieved from session storage
    })

    // Assert: PKCE verified successfully
    expect(result.pkceVerified).toBe(true)
  })

  test('should reject follow-up when code_verifier missing (downgrade attack)', async () => {
    // Arrange: PKCE was used in initial request
    const pkceState = { code_challenge: 'challenge-hash', method: 'S256' }

    // Act: Follow-up request missing code_verifier
    const followUpRequest = {
      auth_session: 'session-123'
      // Missing: code_verifier
    }

    // Assert: Throws error for missing verifier
    await expect(() =>
      server.verifyInteractiveAuthorizationRequest({
        request: followUpRequest,
        pkceState
      })
    ).rejects.toThrow(Oauth2ServerErrorResponseError)
  })
})
```

### Test Case: expected_url Validation
```typescript
// Source: Project requirements TEST-02
describe('OpenID4VP expected_url validation', () => {
  test('should validate expected_url in signed OpenID4VP request', async () => {
    // Arrange: Signed request JWT with expected_url claim
    const requestJwt = await createSignedRequest({
      client_id: 'https://verifier.example.com',
      response_mode: 'iae_post.jwt',
      expected_url: 'https://wallet.example.com/authorize'
    })

    // Act: Wallet validates expected_url
    const validation = await validateOpenid4vpExpectedUrl({
      requestJwt,
      actualUrl: 'https://wallet.example.com/authorize'
    })

    // Assert: Validation succeeds
    expect(validation.valid).toBe(true)
  })

  test('should detect expected_url mismatch (replay attack)', async () => {
    // Arrange: Signed request with different expected_url
    const requestJwt = await createSignedRequest({
      expected_url: 'https://wallet.example.com/authorize'
    })

    // Act: Wallet at different URL
    const validation = await validateOpenid4vpExpectedUrl({
      requestJwt,
      actualUrl: 'https://attacker.example.com/authorize'
    })

    // Assert: Validation fails
    expect(validation.valid).toBe(false)
    expect(validation.error).toContain('expected_url mismatch')
  })
})
```

### Test Case: auth_session in Redirect Response
```typescript
// Source: Project requirements TEST-03
describe('Interactive Authorization Endpoint - auth_session handling', () => {
  test('should include auth_session in redirect response when flag set', async () => {
    // Arrange: Server creates redirect response with auth_session
    const response = await createInteractiveAuthorizationResponse({
      type: 'redirect_to_web',
      redirect_uri: 'https://example.com/auth',
      returnAuthSessionInRedirect: true,  // FLOW-01
      auth_session: 'session-abc-123'
    })

    // Assert: Response includes auth_session parameter
    expect(response.redirect_uri).toContain('auth_session=session-abc-123')
  })

  test('should accept auth_session in follow-up after redirect', async () => {
    // Arrange: User completed redirect_to_web flow
    const followUpRequest = {
      auth_session: 'session-abc-123',
      // Redirect completed, user authenticated
    }

    // Act: Process follow-up request
    const result = await server.handleInteractiveAuthorizationRequest({
      request: followUpRequest
    })

    // Assert: Session recognized, authorization proceeds
    expect(result.status).toBe('ok')
    expect(result.code).toBeDefined()
  })
})
```

### Test Case: New Metadata Parameters
```typescript
// Source: Project requirements TEST-05
describe('Authorization Server Metadata - IAE parameters', () => {
  test('should include interactive_authorization_endpoint in metadata', () => {
    const metadata: AuthorizationServerMetadata = {
      issuer: 'https://as.example.com',
      authorization_endpoint: 'https://as.example.com/authorize',
      token_endpoint: 'https://as.example.com/token',
      interactive_authorization_endpoint: 'https://as.example.com/interactive-authorization'
    }

    const result = zAuthorizationServerMetadata.safeParse(metadata)

    expect(result.success).toBe(true)
    expect(result.data?.interactive_authorization_endpoint).toBe(
      'https://as.example.com/interactive-authorization'
    )
  })

  test('should validate require_interactive_authorization_request flag', () => {
    const metadata: AuthorizationServerMetadata = {
      // ... other fields
      require_interactive_authorization_request: true
    }

    const result = zAuthorizationServerMetadata.safeParse(metadata)

    expect(result.success).toBe(true)
    expect(result.data?.require_interactive_authorization_request).toBe(true)
  })
})
```

### JSDoc Update Example
```typescript
// BEFORE (IAR reference):
/**
 * Send an Interactive Authorization Request to the Authorization Server
 *
 * @deprecated Use IAE terminology
 */

// AFTER (IAE reference):
/**
 * Send a request to the Interactive Authorization Endpoint (IAE)
 *
 * Implements the Interactive Authorization Endpoint flow from OpenID4VCI 1.1
 * specification. The IAE enables complex authentication and authorization flows
 * where interaction occurs directly with the Wallet.
 *
 * Supports:
 * - PKCE for redirect_to_web flows (PKCE-01, PKCE-02, PKCE-03)
 * - expected_url validation for OpenID4VP replay protection
 * - auth_session handling for multi-step interactions (SESS-01, SESS-02, SESS-03)
 * - Response modes: iae_post, iae_post.jwt (VP-01)
 *
 * @param options - Configuration options for the IAE request
 * @param options.request - Initial request or follow-up with auth_session
 * @param options.authorizationServerMetadata - Must include interactive_authorization_endpoint
 * @param options.codeVerifier - Required for follow-up after redirect_to_web with PKCE
 * @returns IAE response with status, type, and interaction-specific data
 * @throws {Oauth2Error} if interactive_authorization_endpoint not in metadata
 *
 * @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html
 */
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IAR (Interactive Authorization Request) naming | IAE (Interactive Authorization Endpoint) naming | Phase 1 (2026-01-29) | All code updated, tests need verification |
| response_mode: `iar-post`, `iar-post.jwt` | response_mode: `iae_post`, `iae_post.jwt` | Phase 1 | Schema validation enforces new modes |
| Prefix `iar:` for binding | Prefix `iae:` for binding | Phase 1 | Binding mechanism updated |
| expected_origins parameter | expected_url parameter | Phase 2 | OpenID4VP replay attack prevention |
| Manual PKCE handling | Automatic PKCE generation for redirect_to_web | Phase 2 | Client generates, server verifies |
| No auth_session in redirects | Optional auth_session in redirect responses | Phase 2 | Enables multi-step flows |
| Generic OAuth2 errors | PAR-aligned error codes + missing_interaction_type | Phase 2 | Better error reporting |

**Deprecated/outdated:**
- **IAR terminology**: Replaced with IAE per OpenID4VCI 1.1 specification
- **expected_origins**: Replaced with expected_url for OpenID4VP requests
- **Old response modes**: `iar-post` and `iar-post.jwt` no longer valid, use `iae_post` and `iae_post.jwt`

## Open Questions

Things that couldn't be fully resolved:

1. **Test Coverage Targets**
   - What we know: No coverage requirements currently enforced, TypeScript strict mode provides compile-time safety
   - What's unclear: Should Phase 3 introduce coverage targets? What percentage is appropriate?
   - Recommendation: Focus on requirement coverage (TEST-01 through TEST-05) rather than percentage targets. If coverage needed, use Vitest's built-in c8 with `vitest --coverage`

2. **Migration Notes Audience**
   - What we know: DOC-03 requires migration notes for external consumers
   - What's unclear: Who are the external consumers? Are there published integrations using the old IAR API?
   - Recommendation: Document breaking changes in CHANGELOG.md and README.md. Since feature wasn't released (per PROJECT.md), migration notes may be minimal or N/A

3. **Documentation Generation**
   - What we know: JSDoc comments are comprehensive, README.md exists but doesn't show API docs
   - What's unclear: Should API documentation be auto-generated from JSDoc (e.g., with TypeDoc)?
   - Recommendation: Manual documentation updates sufficient for Phase 3. If auto-generation desired, add TypeDoc as future enhancement

4. **Example Code Location**
   - What we know: No `/examples` directory exists, examples only in JSDoc
   - What's unclear: Should runnable examples be added for IAE flows?
   - Recommendation: JSDoc `@example` blocks sufficient for Phase 3. If standalone examples needed, create in future phase

## Sources

### Primary (HIGH confidence)
- Project codebase analysis:
  - `/packages/oauth2/tests/interactive-authorization.test.mts` - Existing 886-line test suite using Vitest
  - `/packages/oauth2/src/interactive-authorization/*.ts` - JSDoc patterns and implementation
  - `/packages/openid4vp/src/authorization-response/__tests__/parse-authorization-response-payload.test.ts` - Unit test example
  - `/packages/openid4vci/tests/interoperability/*.test.ts` - Integration test examples
  - `/.planning/codebase/TESTING.md` - Project testing patterns documentation
  - `/.planning/phases/02-*/02-*-SUMMARY.md` - Phase 2 implementation details
  - `/package.json` - Vitest 4.0.17, MSW 2.12.7, TypeScript 5.9.3 versions confirmed

### Secondary (MEDIUM confidence)
- [Vitest Best Practices and Coding Standards - Project Rules](https://www.projectrules.ai/rules/vitest) - AAA pattern, test organization
- [Vitest Guide | Web Patterns](https://underwood-inc.github.io/web-patterns/tests/frameworks/vitest) - TypeScript integration patterns
- [TypeScript: Documentation - JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) - Official JSDoc support in TypeScript
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) - JSDoc documentation best practices

### Tertiary (LOW confidence)
- [Testing in 2026: Jest, React Testing Library, and Full Stack Testing Strategies](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies) - General 2026 testing trends (not TypeScript-specific)
- [8 Best Unit Test Code Coverage Tools for 2026](https://zencoder.ai/blog/unit-test-code-coverage-tools) - Coverage tool overview (c8/Istanbul already in use)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified from project package.json and codebase inspection
- Architecture: HIGH - Patterns extracted directly from existing test files and implementation
- Pitfalls: HIGH - Based on project requirements (TEST-01 through TEST-05) and Phase 2 implementation changes

**Research date:** 2026-01-29
**Valid until:** 60 days (stable testing frameworks, TypeScript patterns evolve slowly)
