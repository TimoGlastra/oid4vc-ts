# Phase 2: Implementation & Integration - Research

**Researched:** 2026-01-29
**Domain:** OAuth2 authorization flows, PKCE security, OpenID4VP integration, session management
**Confidence:** HIGH

## Summary

Phase 2 implements the IAE protocol logic across 22 requirements spanning PKCE security, follow-up flows, client authentication, session management, OpenID4VP integration, and error handling. This phase builds on Phase 1's schema foundation to add the behavioral logic that makes IAE work securely.

The standard approach for implementing secure authorization protocols follows RFC 9700 (OAuth 2.0 Security BCP, published January 2025): PKCE is mandatory for public clients and recommended for confidential clients, session fixation attacks are prevented through nonce binding, and client authentication follows RFC 9126 (PAR) rules. The IAE specification extends these patterns with two interaction types: `openid4vp_presentation` for credential verification and `redirect_to_web` for browser-based flows.

**Key technical considerations:**
- PKCE (RFC 7636) must be enforced for `redirect_to_web` flows per RFC 8252 Section 7.2
- Session fixation prevention requires nonce-to-auth_session binding for OpenID4VP flows
- Client authentication inherits from PAR endpoint rules (RFC 9126 + RFC 6749 Section 2.3)
- `expected_url` parameter prevents replay attacks in signed OpenID4VP requests (Patch 3)
- Response modes `iae_post` and `iae_post.jwt` are IAE-specific (not standard OpenID4VP modes)

**Primary recommendation:** Implement PKCE enforcement first (foundational security), then follow-up flow logic (core protocol), then OpenID4VP integration (most complex due to cross-library coordination), finishing with error handling. Leverage existing `verifyPkce()`, client authentication, and DPoP infrastructure from the codebase.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.3.5 | Runtime validation (already in use) | Schema validation for request/response parsing |
| TypeScript | 5.9.3 | Type safety (already in use) | Static analysis prevents protocol bugs |
| RFC 7636 | Standard | PKCE implementation | OAuth 2.0 Security BCP (RFC 9700) mandates PKCE for public clients |
| RFC 9126 | Standard | PAR client authentication | IAE reuses PAR authentication rules |
| RFC 9700 | 2025 | OAuth 2.0 Security BCP | Latest security best practices (published January 2025) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jose | 5.9.6 | JWT signing/verification | Already in codebase for client attestation, DPoP |
| Existing PKCE utils | Current | `createPkce()`, `verifyPkce()` | Already implemented in `packages/oauth2/src/pkce.ts` |
| Existing client auth | Current | Client authentication verification | Already implemented in `packages/oauth2/src/client-authentication.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PKCE enforcement | State parameter only | PKCE prevents code injection; state only prevents CSRF. RFC 9700 requires both. |
| Nonce binding | Custom session token | Nonce is standard OpenID4VP mechanism; custom approach reduces interoperability |
| PAR-style auth | Custom IAE auth | Reusing PAR rules reduces implementation complexity and leverages existing code |

**Installation:**
No new dependencies needed - all functionality exists in current codebase.

## Architecture Patterns

### Recommended Implementation Structure
Current structure is sound and should be extended:
```
packages/oauth2/src/interactive-authorization/
├── z-interactive-authorization.ts          # Schemas (Phase 1 - complete)
├── create-interactive-authorization-response.ts  # Response builders (Phase 1 - complete)
├── parse-interactive-authorization-request.ts    # Request parsing (needs PKCE validation)
├── send-interactive-authorization-request.ts     # Client request logic (needs PKCE generation)
├── verify-interactive-authorization-request.ts   # Server verification (needs auth_session logic)
```

### Pattern 1: PKCE Enforcement for redirect_to_web
**What:** Include `code_challenge` in initial requests when `redirect_to_web` supported; verify `code_verifier` in follow-up
**When to use:** PKCE-01, PKCE-02, PKCE-03, FLOW-03 requirements
**Example:**
```typescript
// Source: PKCE-01 requirement + existing createPkce() in pkce.ts
// Client side (sendInteractiveAuthorizationEndpointRequest):

// Check if redirect_to_web is in interaction_types_supported
const supportsRedirectToWeb = request.interaction_types_supported
  ?.split(',')
  .includes('redirect_to_web')

if (supportsRedirectToWeb) {
  // Generate PKCE for the session
  const pkce = await createPkce({
    allowedCodeChallengeMethods: ['S256'], // Prefer S256 per RFC 9700
    callbacks: options.callbacks,
  })

  // Include in request
  request.code_challenge = pkce.codeChallenge
  request.code_challenge_method = pkce.codeChallengeMethod

  // Return for follow-up use
  return { pkce, ... }
}
```

### Pattern 2: Session Fixation Prevention with Nonce Binding
**What:** Associate nonce from OpenID4VP request with auth_session; verify match in presentation
**When to use:** SESS-01, SESS-02, SESS-03 requirements
**Example:**
```typescript
// Source: SESS-02, SESS-03 requirements + RFC 9700 Section 4.8
// Authorization Server side:

// When creating openid4vp_presentation interaction:
const nonce = await generateNonce() // Cryptographically random
const authSession = await generateAuthSession() // Distinct per response (SESS-01)

// Store binding (implementation-specific storage)
await storeSessionBinding({
  authSession,
  nonce,
  expiresAt: Date.now() + 600_000, // 10 minute expiry
})

// Return in response
return createInteractiveAuthorizationEndpointOpenid4vpInteraction({
  authSession,
  openid4vpRequest: {
    nonce, // Will be in VP presentation
    response_mode: 'iae_post',
    // ... other fields
  },
})

// When receiving follow-up with openid4vp_response:
const binding = await getSessionBinding(request.auth_session)
if (!binding) {
  throw new Error('Invalid or expired auth_session')
}

const vpPresentation = JSON.parse(request.openid4vp_response)
const presentationNonce = extractNonceFromVP(vpPresentation)

if (presentationNonce !== binding.nonce) {
  // SESS-03: Verify presentation uses same nonce
  throw new Error('Nonce mismatch - potential session fixation attack')
}
```

### Pattern 3: Client Authentication Following PAR Rules
**What:** Apply RFC 9126 (PAR) + RFC 6749 Section 2.3 client authentication to IAE endpoint
**When to use:** AUTH-01, AUTH-02 requirements
**Example:**
```typescript
// Source: RFC 9126 Section 2.1 + existing verifyInteractiveAuthorizationEndpointRequest
// Authorization Server side:

// Reuse existing client authentication infrastructure
const { clientAttestation, dpop } = await verifyInteractiveAuthorizationEndpointRequest({
  interactiveAuthorizationRequest: request,
  isFollowUpRequest: false,
  authorizationServerMetadata,
  // ... other options
})

// Client authentication methods from token_endpoint_auth_methods_supported:
// - client_secret_basic (HTTP Basic, RFC 6749 Section 2.3.1)
// - client_secret_post (body parameters, RFC 6749 Section 2.3.1)
// - client_secret_jwt (JWT assertion, RFC 7523)
// - private_key_jwt (JWT assertion, RFC 7523)
// - attest_jwt_client_auth (Client Attestation, OAuth Client Attestation spec)
// - tls_client_auth (mTLS, RFC 8705)

// Pattern already implemented in:
// - packages/oauth2/src/client-authentication.ts
// - packages/oauth2/src/client-attestation/client-attestation.ts
```

### Pattern 4: expected_url Validation for Signed Requests
**What:** Require `expected_url` in signed OpenID4VP requests; wallet validates against follow-up URL
**When to use:** PROT-05, PROT-06, VP-02, VP-03, VP-04 requirements
**Example:**
```typescript
// Source: PROT-05, VP-03 requirements + Patch 3 specification
// Authorization Server side (creating signed request):

const openid4vpRequest = {
  request: await signJWT({
    response_type: 'vp_token',
    response_mode: 'iae_post',
    nonce: 'n-0S6_WzA2Mj',
    expected_url: 'https://example.com/interactive-authorization', // PROT-05
    // ... presentation_definition or dcql_query
  }),
}

// Wallet side (verifying signed request):
const decodedRequest = await verifyJWT(openid4vpRequest.request)

// PROT-06: Ignore expected_url for unsigned requests
if (openid4vpRequest.request && decodedRequest.expected_url) {
  // VP-03: Validate expected_url matches follow-up request URL
  if (decodedRequest.expected_url !== followUpRequestUrl) {
    // VP-04: Return error if mismatch
    return {
      error: 'invalid_request',
      error_description: 'expected_url does not match follow-up request URL',
    }
  }
}
```

### Pattern 5: Follow-up Request with auth_session
**What:** Return `auth_session` in interaction responses; include in follow-up requests; support code or auth_session in redirect
**When to use:** FLOW-01, FLOW-02, FLOW-03 requirements
**Example:**
```typescript
// Source: FLOW-01, FLOW-02 requirements + existing response builders
// Authorization Server side:

// After redirect_to_web completes, can return EITHER:
// 1. Authorization code directly (traditional flow)
return createInteractiveAuthorizationEndpointCodeResponse({
  authorizationCode: 'code-123',
})

// 2. Or auth_session for follow-up (FLOW-01)
// (e.g., if additional interaction needed after redirect)
return createInteractiveAuthorizationEndpointOpenid4vpInteraction({
  authSession: 'session-456',
  openid4vpRequest: { /* ... */ },
})

// Wallet side (FLOW-02):
// If redirect response contains code, flow complete
if (redirectResponse.code) {
  return exchangeCodeForToken(redirectResponse.code)
}

// If redirect response contains auth_session, make follow-up
if (redirectResponse.auth_session) {
  return sendInteractiveAuthorizationRequest({
    request: {
      auth_session: redirectResponse.auth_session,
      // FLOW-03: Include code_verifier if PKCE was used
      code_verifier: savedPkce?.codeVerifier,
    },
  })
}
```

### Pattern 6: Response Mode Handling for OpenID4VP
**What:** Use `iae_post` for unencrypted, `iae_post.jwt` for encrypted OpenID4VP responses
**When to use:** VP-01, VP-05, VP-06 requirements
**Example:**
```typescript
// Source: VP-01, VP-06 requirements + Patch 1 specification
// Authorization Server side:

// VP-01: response_mode MUST be iae_post or iae_post.jwt
const openid4vpRequest = {
  response_type: 'vp_token',
  response_mode: 'iae_post', // or 'iae_post.jwt' for encryption
  nonce: 'n-0S6_WzA2Mj',
  // ... presentation_definition
}

// Wallet side (follow-up with presentation):
const vpResponse = {
  vp_token: '...', // The verifiable presentation
  presentation_submission: { /* ... */ },
}

// VP-05: openid4vp_response contains JSON-encoded response
let openid4vpResponseParam = JSON.stringify(vpResponse)

// VP-06: Encrypt when response_mode is iae_post.jwt
if (openid4vpRequest.response_mode === 'iae_post.jwt') {
  openid4vpResponseParam = await encryptJWE(
    vpResponse,
    authorizationServerPublicKey,
    // ... encryption params per OpenID4VP Section 8.3
  )
}

// Include in follow-up request
return sendInteractiveAuthorizationRequest({
  request: {
    auth_session: savedAuthSession,
    openid4vp_response: openid4vpResponseParam,
  },
})
```

### Pattern 7: Error Handling with RFC 9126 Error Codes
**What:** Use PAR error codes + `missing_interaction_type` for IAE-specific errors
**When to use:** ERR-01, ERR-02 requirements
**Example:**
```typescript
// Source: ERR-01, ERR-02 requirements + RFC 9126 Section 2.3
// Authorization Server side:

// Standard OAuth2 error codes (RFC 6749):
// - invalid_request
// - invalid_client
// - invalid_grant
// - unauthorized_client
// - unsupported_grant_type
// - invalid_scope

// PAR-specific error codes (RFC 9126):
// - invalid_request (also used for PAR)
// - invalid_client (authentication failed)
// - request_not_supported (server doesn't support feature)

// IAE-specific error code (ERR-02):
// - missing_interaction_type (no supported interaction type in request)

// Example: Missing required interaction type
const supportedInteractionTypes = request.interaction_types_supported?.split(',') || []
const serverRequiresOpenid4vp = true // Example server policy

if (serverRequiresOpenid4vp && !supportedInteractionTypes.includes('openid4vp_presentation')) {
  return createInteractiveAuthorizationEndpointErrorResponse({
    error: 'missing_interaction_type', // ERR-02
    errorDescription: 'Server requires openid4vp_presentation but wallet does not support it',
  })
}

// Example: Invalid PKCE
if (hasRedirectToWeb && !request.code_challenge) {
  return createInteractiveAuthorizationEndpointErrorResponse({
    error: 'invalid_request',
    errorDescription: 'code_challenge required when redirect_to_web is supported',
  })
}
```

### Anti-Patterns to Avoid
- **Don't skip PKCE for redirect_to_web:** RFC 9700 mandates PKCE for authorization code flows. Always include `code_challenge` and verify `code_verifier`.
- **Don't reuse auth_session across multiple interactions:** SESS-01 requires distinct values per response to prevent replay attacks.
- **Don't skip expected_url validation for signed requests:** PROT-05 makes it required; skipping enables replay attacks from malicious verifiers.
- **Don't use standard OpenID4VP response modes:** `iae_post` and `iae_post.jwt` are IAE-specific; `direct_post` is standard OpenID4VP (different protocol).
- **Don't accept code_verifier without code_challenge:** RFC 9700 requires rejecting this (PKCE downgrade attack).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PKCE generation/verification | Custom crypto for code challenge | `createPkce()`, `verifyPkce()` in `pkce.ts` | Already implements S256 and Plain methods per RFC 7636 |
| Client authentication | Custom auth parsing | `verifyInteractiveAuthorizationEndpointRequest()` | Reuses PAR authentication infrastructure (client attestation, DPoP, mTLS) |
| Nonce generation | `Math.random()` or timestamps | `callbacks.generateRandom()` | Cryptographically secure randomness required for session security |
| Session storage | In-memory JavaScript object | Implementation-specific storage (DB, Redis) | Sessions must survive server restarts; need expiry, cleanup |
| JWT signing/verification | Custom JWT library | `callbacks.signJwt`, `callbacks.verifyJwt` | Already integrated with jose library, supports all required algorithms |
| Error response formatting | Manual object creation | `createInteractiveAuthorizationEndpointErrorResponse()` | Consistent error structure, schema validation |
| OpenID4VP response parsing | JSON.parse() without validation | Zod schema validation | Prevents injection attacks, validates required fields |

**Key insight:** OAuth2 security requires cryptographic primitives (PKCE, nonces, JWTs) that are already implemented in the codebase. Reusing existing utilities prevents introducing security bugs and maintains consistency with the rest of the library.

## Common Pitfalls

### Pitfall 1: Missing PKCE Enforcement for redirect_to_web
**What goes wrong:** Wallet includes `redirect_to_web` in `interaction_types_supported` but doesn't send `code_challenge`, or server doesn't verify `code_verifier` in follow-up.
**Why it happens:** PKCE-01 requirement is easy to miss; developers assume PKCE is optional like in older OAuth specs.
**How to avoid:**
1. Check for `redirect_to_web` in `interaction_types_supported` before sending initial request
2. Always call `createPkce()` when `redirect_to_web` is present
3. Require `code_verifier` in follow-up requests after redirect_to_web interaction
4. Store PKCE `code_challenge` and `code_challenge_method` with auth_session on server
5. Call `verifyPkce()` before returning authorization code in follow-up response
**Warning signs:**
- Tests pass without PKCE but fail against conformant servers
- Authorization code can be stolen via interception (no binding to original client)
- Server accepts follow-up after redirect_to_web without `code_verifier`

### Pitfall 2: Reusing auth_session Values Across Interactions
**What goes wrong:** Server generates same `auth_session` value for multiple interactions, enabling session fixation attacks.
**Why it happens:** SESS-01 requirement for "distinct" values is subtle; developers use predictable patterns (counter, timestamp) or reuse values for convenience.
**How to avoid:**
1. Generate `auth_session` using cryptographically secure random function (`callbacks.generateRandom()`)
2. Ensure each call to `createInteractiveAuthorizationEndpointOpenid4vpInteraction()` or `createInteractiveAuthorizationEndpointRedirectToWebInteraction()` gets fresh value
3. Store `auth_session` with short expiry (10 minutes typical)
4. Invalidate `auth_session` after successful code issuance
5. Never reuse `auth_session` after it's been consumed
**Warning signs:**
- Same `auth_session` appears in multiple test runs
- `auth_session` has predictable pattern (sequential numbers, timestamps)
- Session doesn't expire after successful completion
- Multiple clients can use same `auth_session` value

### Pitfall 3: Forgetting Nonce-to-Session Binding for OpenID4VP
**What goes wrong:** Server generates nonce for OpenID4VP request but doesn't associate it with `auth_session`, enabling session fixation where attacker can inject their presentation into victim's session.
**Why it happens:** SESS-02, SESS-03 requirements span multiple operations (create interaction → receive follow-up); binding storage is implementation-specific and easy to forget.
**How to avoid:**
1. When creating `openid4vp_presentation` interaction, store binding: `{ authSession, nonce, expiresAt }`
2. When receiving follow-up with `openid4vp_response`, retrieve binding by `auth_session`
3. Extract nonce from VP presentation (implementation depends on credential format)
4. Compare extracted nonce to stored nonce; reject if mismatch
5. Delete binding after successful verification (one-time use)
**Warning signs:**
- Server accepts any VP presentation regardless of nonce
- Tests pass without checking nonce at all
- Nonce validation happens but isn't tied to `auth_session`
- Old/expired nonces are accepted

### Pitfall 4: Missing expected_url Validation in Wallet
**What goes wrong:** Wallet receives signed OpenID4VP request with `expected_url` but doesn't validate it matches follow-up URL, enabling replay attacks from malicious verifier.
**Why it happens:** PROT-05, VP-03, VP-04 requirements are wallet-side; server can't enforce this. Easy to skip validation if tests don't cover malicious verifier scenario.
**How to avoid:**
1. After receiving `openid4vp_presentation` interaction, decode JWT from `request` parameter
2. Check if `expected_url` claim is present in decoded JWT (PROT-05)
3. Compare `expected_url` to the URL where follow-up will be sent (exact string match)
4. Return error with `invalid_request` code if mismatch (VP-04)
5. PROT-06: Skip validation for unsigned requests (no JWT in `request` parameter)
**Warning signs:**
- Wallet accepts OpenID4VP requests without `expected_url` in signed requests
- Wallet doesn't check URL at all
- Tests don't cover malicious verifier with wrong `expected_url`
- Wallet sends VP to URL different from `expected_url`

### Pitfall 5: Using Standard OpenID4VP Response Modes
**What goes wrong:** Developer uses `direct_post` or `direct_post.jwt` (standard OpenID4VP) instead of `iae_post` or `iae_post.jwt` (IAE-specific).
**Why it happens:** VP-01 requirement is easy to miss; `direct_post` is standard in OpenID4VP spec, but IAE defines its own modes.
**How to avoid:**
1. Always use `iae_post` for unencrypted VP responses in IAE flow
2. Always use `iae_post.jwt` for encrypted VP responses in IAE flow
3. Validate `response_mode` in received OpenID4VP requests (reject if not iae_post*)
4. Document clearly that IAE response modes are different from standard OpenID4VP
5. Add constants `RESPONSE_MODE_IAE_POST` and `RESPONSE_MODE_IAE_POST_JWT` (already in Phase 1)
**Warning signs:**
- OpenID4VP request uses `direct_post` in IAE flow
- Verifier expects `direct_post` callback but receives `iae_post` format
- Tests use `direct_post` and pass (wrong expectation)
- Confusion about where VP response should be sent

### Pitfall 6: Accepting code_verifier Without code_challenge
**What goes wrong:** Server accepts `code_verifier` in follow-up request even though no `code_challenge` was in initial request, enabling PKCE downgrade attack.
**Why it happens:** PKCE-02 enforcement requires tracking whether PKCE was used in initial request; easy to only check "is code_verifier present?" without checking "was code_challenge present?"
**How to avoid:**
1. Store whether PKCE was used (`code_challenge` present) with auth_session
2. In follow-up request verification, check stored PKCE state
3. If PKCE was used, require `code_verifier` (PKCE-02)
4. If PKCE was NOT used, reject request if `code_verifier` present (RFC 9700 downgrade prevention)
5. Always verify PKCE before issuing authorization code
**Warning signs:**
- Server accepts `code_verifier` when it shouldn't
- Initial request without PKCE but follow-up with `code_verifier` succeeds
- No storage of PKCE usage state with session
- Tests don't cover downgrade attack scenario

### Pitfall 7: Wrong Client Authentication for Follow-up Requests
**What goes wrong:** Server requires full client authentication (client attestation, DPoP) for follow-up requests, breaking protocol flow.
**Why it happens:** AUTH-01, AUTH-02 apply to "requests to the Interactive Authorization Endpoint" but spec clarifies follow-up requests are lighter (already authenticated in initial request).
**How to avoid:**
1. Distinguish initial requests from follow-up requests (presence of `auth_session` parameter)
2. For initial requests: full client authentication per PAR rules (AUTH-01, AUTH-02)
3. For follow-up requests: minimal authentication (validate `auth_session` is valid/unexpired)
4. Don't require client attestation or DPoP in follow-up (already verified in initial request)
5. See existing pattern in `verify-interactive-authorization-request.ts` (isFollowUpRequest flag)
**Warning signs:**
- Follow-up requests require OAuth-Client-Attestation headers
- Follow-up requests fail if DPoP proof is missing
- Tests include full auth for follow-up (over-engineering)
- Spec compliance tests fail on follow-up requests

## Code Examples

Verified patterns from official sources:

### PKCE for redirect_to_web Flow
```typescript
// Source: PKCE-01, PKCE-02 requirements + existing pkce.ts + Patch -1
// packages/oauth2/src/interactive-authorization/send-interactive-authorization-request.ts

import { createPkce } from '../pkce.js'

// Client side - generating PKCE when redirect_to_web supported
const interactionTypes = options.request.interaction_types_supported?.split(',') || []
const supportsRedirectToWeb = interactionTypes.includes('redirect_to_web')

let pkce: { codeVerifier: string; codeChallenge: string; codeChallengeMethod: string } | undefined

if (supportsRedirectToWeb) {
  // PKCE-01: Include code_challenge and code_challenge_method
  pkce = await createPkce({
    allowedCodeChallengeMethods: ['S256', 'plain'], // Prefer S256
    callbacks: options.callbacks,
  })

  // Add to request body
  requestBody.code_challenge = pkce.codeChallenge
  requestBody.code_challenge_method = pkce.codeChallengeMethod
}

// Return PKCE for later use in follow-up
return {
  response: parsedResponse,
  pkce, // Caller stores this for follow-up after redirect_to_web
}
```

### Server-Side PKCE Verification
```typescript
// Source: PKCE-02, PKCE-03 requirements + existing verifyPkce()
// packages/oauth2/src/interactive-authorization/verify-interactive-authorization-request.ts

import { verifyPkce } from '../pkce.js'

// Authorization Server side - verifying PKCE in follow-up
interface StoredSession {
  authSession: string
  pkceCodeChallenge?: string
  pkceCodeChallengeMethod?: 'S256' | 'plain'
  // ... other session data
}

// When receiving follow-up request after redirect_to_web:
const session = await retrieveStoredSession(request.auth_session)

// PKCE-02: Enforce code_verifier in follow-up
if (session.pkceCodeChallenge) {
  if (!request.code_verifier) {
    throw new Oauth2ServerErrorResponseError({
      error: 'invalid_request',
      error_description: 'code_verifier required for this session',
    })
  }

  // Verify PKCE
  await verifyPkce({
    codeVerifier: request.code_verifier,
    codeChallenge: session.pkceCodeChallenge,
    codeChallengeMethod: session.pkceCodeChallengeMethod as PkceCodeChallengeMethod,
    callbacks: options.callbacks,
  })
}

// PKCE-03: Redirect URI must be HTTPS (RFC 8252 Section 7.2)
// This should be validated when storing the redirect_uri in the session
if (session.redirectUri && !session.redirectUri.startsWith('https://')) {
  throw new Oauth2ServerErrorResponseError({
    error: 'invalid_request',
    error_description: 'redirect_uri must use HTTPS scheme per RFC 8252',
  })
}
```

### Session Fixation Prevention
```typescript
// Source: SESS-01, SESS-02, SESS-03 requirements + RFC 9700 Section 4.8
// packages/oauth2/src/interactive-authorization/create-interactive-authorization-response.ts

// Authorization Server side - creating interaction with nonce binding
import { encodeToBase64Url } from '@openid4vc/utils'

// SESS-01: Generate distinct auth_session for each response
async function generateAuthSession(callbacks: Pick<CallbackContext, 'generateRandom'>): Promise<string> {
  const random = await callbacks.generateRandom(32) // 256 bits
  return encodeToBase64Url(random)
}

// SESS-02: Associate nonce with auth_session
async function createOpenid4vpInteractionWithBinding(options: {
  callbacks: CallbackContext
  presentationDefinition: unknown
  responseMode: 'iae_post' | 'iae_post.jwt'
}) {
  const authSession = await generateAuthSession(options.callbacks)
  const nonce = encodeToBase64Url(await options.callbacks.generateRandom(32))

  // Store binding (implementation-specific - could be Redis, DB, in-memory)
  await storeSessionBinding({
    authSession,
    nonce,
    expiresAt: Date.now() + 600_000, // 10 minutes
  })

  return createInteractiveAuthorizationEndpointOpenid4vpInteraction({
    authSession,
    openid4vpRequest: {
      response_type: 'vp_token',
      response_mode: options.responseMode,
      nonce, // This nonce must appear in VP presentation
      presentation_definition: options.presentationDefinition,
    },
  })
}

// SESS-03: Verify presentation uses same nonce
async function verifyOpenid4vpResponse(options: {
  authSession: string
  openid4vpResponse: string
}) {
  const binding = await retrieveSessionBinding(options.authSession)
  if (!binding) {
    throw new Oauth2ServerErrorResponseError({
      error: 'invalid_request',
      error_description: 'Invalid or expired auth_session',
    })
  }

  const vpResponse = JSON.parse(options.openid4vpResponse)

  // Extract nonce from VP (format-specific - this is pseudocode)
  const presentationNonce = extractNonceFromVP(vpResponse.vp_token)

  if (presentationNonce !== binding.nonce) {
    throw new Oauth2ServerErrorResponseError({
      error: 'invalid_request',
      error_description: 'Nonce mismatch - potential session fixation attack',
    })
  }

  // Delete binding after successful verification (one-time use)
  await deleteSessionBinding(options.authSession)

  return vpResponse
}
```

### expected_url Validation
```typescript
// Source: PROT-05, PROT-06, VP-02, VP-03, VP-04 requirements + Patch 3
// Client side (Wallet) - validating expected_url

async function validateOpenid4vpRequest(options: {
  openid4vpRequest: Openid4vpRequest
  followUpRequestUrl: string
  callbacks: Pick<CallbackContext, 'verifyJwt'>
}) {
  // Check if request is signed (JWT present)
  if (!options.openid4vpRequest.request) {
    // PROT-06: expected_url ignored in unsigned requests
    return { valid: true }
  }

  // Decode and verify JWT
  const decoded = await options.callbacks.verifyJwt({
    jwt: options.openid4vpRequest.request,
    // ... verification options
  })

  // PROT-05: expected_url REQUIRED for signed requests
  if (!decoded.expected_url) {
    return {
      valid: false,
      error: 'invalid_request',
      error_description: 'expected_url is required for signed OpenID4VP requests',
    }
  }

  // VP-03: Validate expected_url matches follow-up request URL
  if (decoded.expected_url !== options.followUpRequestUrl) {
    // VP-04: Return error if mismatch
    return {
      valid: false,
      error: 'invalid_request',
      error_description: `expected_url mismatch: expected ${decoded.expected_url}, got ${options.followUpRequestUrl}`,
    }
  }

  return { valid: true }
}
```

### Follow-up Flow with auth_session or code
```typescript
// Source: FLOW-01, FLOW-02, FLOW-03 requirements + existing response builders
// Authorization Server side - returning auth_session vs code

// FLOW-01: Can return auth_session in redirect response (not just code)
async function handleRedirectToWebCompletion(options: {
  authSession: string
  additionalInteractionNeeded: boolean
}) {
  if (options.additionalInteractionNeeded) {
    // Return auth_session to request more interaction
    return createInteractiveAuthorizationEndpointOpenid4vpInteraction({
      authSession: options.authSession,
      openid4vpRequest: { /* ... */ },
    })
  } else {
    // Traditional flow - return code directly
    return createInteractiveAuthorizationEndpointCodeResponse({
      authorizationCode: await generateAuthorizationCode(),
    })
  }
}

// Client side (Wallet) - handling redirect completion
// FLOW-02: Make follow-up with auth_session when redirect doesn't include code
async function handleRedirectCompletion(options: {
  redirectParams: URLSearchParams
  authSession?: string
  pkce?: { codeVerifier: string }
}) {
  // Check what redirect returned
  const code = redirectParams.get('code')
  const authSession = redirectParams.get('auth_session') || options.authSession

  if (code) {
    // Flow complete - exchange code for token
    return { authorizationCode: code }
  }

  if (authSession) {
    // FLOW-02: Need follow-up request
    const followUpRequest: InteractiveAuthorizationEndpointFollowUpRequest = {
      auth_session: authSession,
    }

    // FLOW-03: Include code_verifier if PKCE was used
    if (options.pkce) {
      followUpRequest.code_verifier = options.pkce.codeVerifier
    }

    return sendInteractiveAuthorizationRequest({
      request: followUpRequest,
      // ...
    })
  }

  throw new Error('Redirect returned neither code nor auth_session')
}
```

### OpenID4VP Response Mode Handling
```typescript
// Source: VP-01, VP-05, VP-06 requirements + Patch 1
// Authorization Server side - creating OpenID4VP request

function createOpenid4vpRequest(options: {
  encrypted: boolean
  nonce: string
  presentationDefinition: unknown
}) {
  // VP-01: response_mode MUST be iae_post or iae_post.jwt
  const responseMode = options.encrypted ? 'iae_post.jwt' : 'iae_post'

  return {
    response_type: 'vp_token',
    response_mode: responseMode,
    nonce: options.nonce,
    presentation_definition: options.presentationDefinition,
  }
}

// Client side (Wallet) - sending VP response
async function sendVpResponse(options: {
  authSession: string
  vpToken: string
  presentationSubmission: unknown
  responseMode: 'iae_post' | 'iae_post.jwt'
  encryptionKey?: Jwk
  callbacks: Pick<CallbackContext, 'encryptJwe'>
}) {
  const vpResponse = {
    vp_token: options.vpToken,
    presentation_submission: options.presentationSubmission,
  }

  // VP-05: openid4vp_response contains JSON-encoded response
  let openid4vpResponseParam = JSON.stringify(vpResponse)

  // VP-06: Encrypt when response_mode is iae_post.jwt
  if (options.responseMode === 'iae_post.jwt') {
    if (!options.encryptionKey) {
      throw new Error('Encryption key required for iae_post.jwt response mode')
    }

    openid4vpResponseParam = await options.callbacks.encryptJwe({
      payload: vpResponse,
      recipientKey: options.encryptionKey,
      // ... encryption algorithm per OpenID4VP Section 8.3
    })
  }

  return sendInteractiveAuthorizationRequest({
    request: {
      auth_session: options.authSession,
      openid4vp_response: openid4vpResponseParam,
    },
  })
}
```

### Error Handling with PAR Error Codes
```typescript
// Source: ERR-01, ERR-02 requirements + RFC 9126 Section 2.3
// Authorization Server side - returning appropriate errors

function validateInteractionTypes(request: InteractiveAuthorizationEndpointRequest) {
  const supportedInteractionTypes = request.interaction_types_supported?.split(',') || []

  // ERR-02: missing_interaction_type error
  const serverRequiredTypes = ['openid4vp_presentation'] // Example policy
  const hasRequiredType = serverRequiredTypes.some(t => supportedInteractionTypes.includes(t))

  if (!hasRequiredType) {
    return createInteractiveAuthorizationEndpointErrorResponse({
      error: 'missing_interaction_type',
      errorDescription: `Server requires one of: ${serverRequiredTypes.join(', ')}`,
    })
  }

  // ERR-01: Use standard OAuth2/PAR error codes
  if (!request.client_id) {
    return createInteractiveAuthorizationEndpointErrorResponse({
      error: 'invalid_request',
      errorDescription: 'client_id is required',
    })
  }

  // Other error examples:
  // - invalid_client (client authentication failed)
  // - invalid_scope (scope not supported)
  // - unauthorized_client (client not authorized for IAE)

  return null // No error
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PKCE optional | PKCE mandatory for public clients | RFC 9700 (January 2025) | All `redirect_to_web` flows must use PKCE |
| State-only CSRF protection | PKCE + state parameter | RFC 9700 (January 2025) | PKCE prevents code injection, state prevents CSRF |
| expected_origins (array) | expected_url (single string) | Patch 3 (January 2026) | Simpler validation, exact URL match prevents replay |
| Plain PKCE acceptable | S256 PKCE preferred | RFC 9700 (January 2025) | SHA-256 code challenge more secure than plain |
| Nonce optional | Nonce required for session binding | RFC 9700 Section 4.8 (2025) | Prevents session fixation attacks in OpenID4VP flow |
| Direct_post response mode | iae_post/iae_post.jwt | Patch 1 (October 2025) | IAE-specific modes distinguish from standard OpenID4VP |

**Deprecated/outdated:**
- **expected_origins parameter:** Replaced by `expected_url` in Patch 3 (PROT-04, PROT-05)
- **Optional PKCE:** Now mandatory per RFC 9700 for authorization code flows
- **iar-post / iar-post.jwt:** Old naming, changed to `iae_post` / `iae_post.jwt` in Phase 1
- **Implicit grant flow:** Deprecated in OAuth 2.1 / RFC 9700, not applicable to IAE

## Open Questions

Things that couldn't be fully resolved:

1. **How should nonce be extracted from VP presentations?**
   - What we know: SESS-03 requires verifying nonce in presentation; extraction is format-specific (JWT-VC, SD-JWT-VC, mso_mdoc have different structures)
   - What's unclear: Library doesn't handle credential format internals (out of scope per PROJECT.md). Where does extraction logic live?
   - Recommendation: Document that implementers must extract nonce based on credential format. Provide example pseudocode in comments but don't implement format-specific logic. Consider adding callback: `extractNonceFromPresentation(vpToken, format) => string`.

2. **Should auth_session be opaque or structured (JWT)?**
   - What we know: SESS-01 requires distinct values; typical implementation is opaque random string
   - What's unclear: Whether JWT-encoded auth_session provides benefits (self-contained, includes expiry, signed)
   - Recommendation: Keep auth_session opaque (random string). Simpler implementation, no JWT overhead, server controls format. If implementers want JWT, they can generate JWT and use it as auth_session value.

3. **How long should auth_session be valid?**
   - What we know: Should be short-lived to prevent abuse; OpenID4VP presentations need time for user interaction
   - What's unclear: Spec doesn't mandate specific expiry; varies by use case
   - Recommendation: Default to 10 minutes (600 seconds) for OpenID4VP flows, 5 minutes for redirect_to_web. Make expiry configurable per session. Document recommended values.

4. **Can redirect_to_web and openid4vp_presentation both be required?**
   - What we know: Wallet declares supported types in comma-separated string; server chooses one
   - What's unclear: Can server require BOTH in sequence (redirect_to_web → returns auth_session → openid4vp_presentation)?
   - Recommendation: Yes, this is valid per FLOW-01 (auth_session after redirect). Implementation should support chaining interactions. Add test for multi-step flow.

5. **Should PKCE be enforced even for confidential clients?**
   - What we know: RFC 9700 recommends PKCE for all clients; PKCE-01 says "when redirect_to_web supported"
   - What's unclear: Whether confidential clients (with client_secret) also need PKCE
   - Recommendation: Enforce PKCE for ALL clients when redirect_to_web is used, regardless of client type. RFC 9700 states PKCE provides "strong protection" even for confidential clients. Simpler implementation (no client type checking).

6. **How should iae_post response mode be registered with OpenID4VP?**
   - What we know: `iae_post` and `iae_post.jwt` are IAE-specific response modes (VP-01)
   - What's unclear: These modes aren't in standard OpenID4VP spec. How should they be registered/documented?
   - Recommendation: Document that these are OpenID4VCI 1.1 IAE-specific modes (not general OpenID4VP). Wallet implementations supporting IAE must recognize these modes. Consider proposing to OpenID4VP spec as extension point.

## Sources

### Primary (HIGH confidence)
- [RFC 9126: OAuth 2.0 Pushed Authorization Requests](https://datatracker.ietf.org/doc/html/rfc9126) - PAR client authentication rules
- [RFC 6749: The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749) - Client authentication methods (Section 2.3)
- [RFC 9700: OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700/) - PKCE requirements, session fixation prevention (January 2025)
- [RFC 8252: OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252) - HTTPS redirect URI requirement (Section 7.2)
- [RFC 7636: Proof Key for Code Exchange by OAuth Public Clients](https://datatracker.ietf.org/doc/html/rfc7636) - PKCE specification
- IAE Specification Patches (iae_changes/ directory) - Patch -1 (PKCE), Patch 1 (response modes), Patch 3 (expected_url)
- Existing codebase (packages/oauth2/src/) - PKCE implementation, client authentication, schemas

### Secondary (MEDIUM confidence)
- [OAuth 2.0 Pushed Authorization Requests (oauth.net)](https://oauth.net/2/pushed-authorization-requests/) - PAR overview
- [RFC 9700 Security BCP Web Search Results](https://datatracker.ietf.org/doc/rfc9700/) - PKCE and nonce requirements
- [OpenID4VP Specification](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) - Standard response_mode values (direct_post)
- Existing tests (packages/oauth2/tests/interactive-authorization.test.mts) - Current implementation patterns

### Tertiary (LOW confidence)
- [OWASP OAuth2 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html) - Session fixation attack patterns (general, not IAE-specific)
- Web search results on OpenID4VP response modes (2026) - Confirmed iae_post is NOT standard OpenID4VP

## Metadata

**Confidence breakdown:**
- PKCE requirements: HIGH - RFC 9700 (January 2025) is authoritative, existing pkce.ts implementation verified
- Client authentication: HIGH - RFC 9126 and RFC 6749 are authoritative, existing implementation matches
- Session security: HIGH - RFC 9700 Section 4.8 is authoritative, nonce binding is standard practice
- OpenID4VP integration: MEDIUM - Specification patches (Patch 1, 3) verified, but iae_post modes not in standard OpenID4VP spec
- Follow-up flows: HIGH - FLOW-01, FLOW-02 from REQUIREMENTS.md match specification patches
- Error handling: HIGH - RFC 9126 Section 2.3 defines PAR errors, ERR-01, ERR-02 requirements clear

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable domain, RFCs are stable, specification patches are recent)

**Notes:**
- No Context7 queries needed - RFCs and specification patches are authoritative
- All 22 Phase 2 requirements (PKCE-01 through ERR-02) mapped to implementation patterns
- Existing codebase has 90% of needed infrastructure (PKCE, client auth, JWT handling)
- Main implementation work is gluing existing pieces together with IAE-specific logic
