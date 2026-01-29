# Architecture

**Analysis Date:** 2026-01-29

## Pattern Overview

**Overall:** Modular monorepo using layered, specification-driven architecture. This is a TypeScript implementation of OpenID for Verifiable Credentials (OID4VC) specifications with domain-separated packages that depend on OAuth2 foundations.

**Key Characteristics:**
- Specification-driven: Code organized around OpenID4VC and OAuth2 protocol flows
- Callback-based: Core crypto operations abstracted behind callback interfaces for environment agnosticity
- Zod validation: Runtime schema validation for all request/response objects
- Class-based abstractions: High-level Client and Server classes encapsulate complexity
- Function-first helpers: Lower-level utility functions for create/parse/verify operations
- Error-typed exceptions: Custom error classes for different failure scenarios

## Layers

**Utilities Layer:**
- Purpose: Cross-cutting utilities for encoding, validation, fetching, error handling
- Location: `packages/utils/src`
- Contains: Encoding functions, URL parsing, fetcher abstraction, error base classes, Zod utilities
- Depends on: Nothing (leaf dependency)
- Used by: All other packages

**OAuth2 Foundation Layer:**
- Purpose: Core OAuth2 flows (authorization, token, PKCE, DPoP, client authentication, resource protection)
- Location: `packages/oauth2/src`
- Contains: Authorization/token endpoints, JWT/JWK handling, client/server classes, callback interfaces
- Depends on: Utils
- Used by: OpenID4VCI, OpenID4VP

**OpenID4VCI (Credential Issuance) Layer:**
- Purpose: Credential offer handling, credential request/response, proof types, issuer metadata
- Location: `packages/openid4vci/src`
- Contains: Credential client/issuer classes, credential format handlers (W3C VC, SD-JWT, MSO-mdoc), nonce/notification endpoints
- Depends on: OAuth2, Utils
- Used by: Applications implementing wallet/issuer roles

**OpenID4VP (Presentation) Layer:**
- Purpose: Authorization request/response handling for verifiable presentations
- Location: `packages/openid4vp/src`
- Contains: Presentation client/verifier classes, authorization request validation, JARM (response encryption), VP token parsing
- Depends on: OAuth2, Utils
- Used by: Applications implementing wallet/verifier roles

## Data Flow

**Credential Issuance Flow (Wallet/Client perspective):**

1. Wallet resolves credential offer (`Openid4vciClient.resolveCredentialOffer()`)
2. Wallet determines authorization server from offer metadata
3. Wallet initiates authorization via OAuth2 (`Oauth2Client.initiateAuthorization()`)
4. Server responds with authorization challenge or redirect (possible interactive authorization flow)
5. Wallet handles authorization response (`Oauth2Client.handleAuthorizationResponse()`)
6. Wallet exchanges authorization code/pre-authorized code for access token (`Oauth2Client.retrieveAccessToken()`)
7. Wallet requests credential(s) with access token and proof (`Openid4vciClient.retrieveCredentials()`)
8. Issuer responds with credential(s) or deferred credential notification

**Presentation Flow (Wallet/Holder perspective):**

1. Wallet receives authorization request (URI parameter or direct)
2. Wallet parses request (`Openid4vpClient.parseOpenid4vpAuthorizationRequest()`)
3. Wallet resolves request (fetch referenced objects) (`Openid4vpClient.resolveOpenId4vpAuthorizationRequest()`)
4. Wallet validates scope/requirements match held credentials
5. Wallet creates presentation (selectively disclose) (`Openid4vpClient.createOpenid4vpAuthorizationResponse()`)
6. Wallet submits presentation to response endpoint (`Openid4vpClient.submitOpenid4vpAuthorizationResponse()`)
7. Verifier parses and validates response (`Openid4vpVerifier.parseOpenid4vpAuthorizationResponse()`)
8. Verifier validates VP token and transaction data (`Openid4vpVerifier.validateOpenid4vpAuthorizationResponsePayload()`)

**Verification Flow (Server perspective):**

1. Server receives HTTP request to authorize/token/credential endpoint
2. Server parses request body/params (e.g., `Oauth2AuthorizationServer.parseAuthorizationRequest()`)
3. Server verifies request integrity and authenticity
4. Server applies business logic (user consent, credential matching, access control)
5. Server creates response (e.g., `Oauth2AuthorizationServer.createAuthorizationResponse()`)
6. Server returns HTTP response

**State Management:**
- Stateless: No session storage required. State parameter used for request/response correlation
- Callback-based: All cryptographic operations delegated to caller-provided callbacks
- Immutable validation: Request/response objects validated once, treated as immutable

## Key Abstractions

**CallbackContext:**
- Purpose: Abstract cryptographic operations for environment portability
- Examples: `packages/oauth2/src/callbacks.ts`, line 1-80
- Pattern: TypeScript callback types for signing, hashing, JWE encryption/decryption
- Implementations: Caller provides concrete implementations (e.g., using jose library in Node.js, Web Crypto in browsers)

**Client Classes:**
- Purpose: High-level, opinionated request builders with orchestration
- Examples: `Oauth2Client` (`packages/oauth2/src/Oauth2Client.ts`), `Openid4vciClient` (`packages/openid4vci/src/Openid4vciClient.ts`), `Openid4vpClient` (`packages/openid4vp/src/Openid4vpClient.ts`)
- Pattern: Constructor accepts callbacks and metadata, public methods orchestrate multi-step flows
- Benefits: Handles error recovery (e.g., DPoP nonce retry), flow branching (e.g., authorization challenge detection)

**Server Classes:**
- Purpose: Request parsing, verification, response creation for server-side flows
- Examples: `Oauth2AuthorizationServer` (`packages/oauth2/src/Oauth2AuthorizationServer.ts`), `Openid4vciIssuer` (`packages/openid4vci/src/Openid4vciIssuer.ts`)
- Pattern: Methods for each OAuth2/OpenID endpoint (authorization, token, credential, etc.)
- Benefits: Encapsulates spec-mandated validations, handles response serialization

**Function Trio Pattern:**
- Purpose: Decompose protocol operations into testable, composable steps
- Pattern: `create*` (builds request), `parse*` (extracts from HTTP), `verify*` (validates structure/authenticity)
- Examples:
  - `createAuthorizationRequest()`, `parseAuthorizationRequest()`, `verifyAuthorizationRequest()`
  - `createAccessTokenResponse()`, `parseAccessTokenRequest()`, `verifyAccessTokenRequest()`
- Benefits: Can use lower-level functions if higher-level orchestration not needed

**Zod Validation Schemas:**
- Purpose: Runtime validation of request/response structures
- Pattern: Exported as `z*` constants (e.g., `zAccessTokenRequest`, `zAuthorizationResponse`)
- Examples: `packages/oauth2/src/access-token/z-access-token.ts`
- Composition: Schemas compose for complex objects, use `.transform()` for normalization

**Error Classes:**
- Purpose: Typed exception handling for different failure modes
- Examples: `Oauth2Error`, `Oauth2JwtVerificationError`, `Oauth2ClientErrorResponseError`, `Openid4vciRetrieveCredentialsError`
- Pattern: Extend from `OpenId4VcBaseError`, include original error as `cause`
- Benefits: Catch specific errors to handle recovery (e.g., authorization challenge, HTTP 401 retry with DPoP nonce)

## Entry Points

**OAuth2 Foundation:**
- Location: `packages/oauth2/src/index.ts`
- Triggers: Applications implementing OAuth2 client/server/resource server
- Responsibilities: Expose all OAuth2 classes, error types, validation schemas, helper functions

**OpenID4VCI Client/Issuer:**
- Location: `packages/openid4vci/src/index.ts`
- Triggers: Wallets receiving credential offers, issuers issuing credentials
- Responsibilities: Export credential client/issuer classes, credential offer resolution, credential formats

**OpenID4VP Client/Verifier:**
- Location: `packages/openid4vp/src/index.ts`
- Triggers: Wallets receiving authorization requests, verifiers creating/validating presentations
- Responsibilities: Export presentation client/verifier classes, authorization request/response handling

## Error Handling

**Strategy:** Typed errors with discriminated unions for flow control. Errors include original cause for debugging.

**Patterns:**
- Custom error classes extend `Oauth2Error` or `Openid4vciError` (base from utils)
- Errors include `cause` field for error chain propagation
- Errors for OAuth2 protocol errors (e.g., `invalid_grant`) vs. application errors (e.g., network failure)
- Example: `Oauth2ClientAuthorizationChallengeError` wraps `insufficient_authorization` response to trigger interactive flow

**Key Error Types:**
- `Oauth2JwtVerificationError`: JWT signature verification failed
- `Oauth2ClientErrorResponseError`: Server returned OAuth2 error response (e.g., `invalid_scope`)
- `Oauth2ResourceUnauthorizedError`: Resource server returned 401 with WWW-Authenticate header (for DPoP nonce retry)
- `Openid4vciRetrieveCredentialsError`: Credential issuance failed (wraps issuer error response)
- `ValidationError` (from utils): Zod validation failure

## Cross-Cutting Concerns

**Logging:** No built-in logging. Caller provides `fetch` callback that can log requests/responses. All significant operations throw typed errors.

**Validation:** All request/response objects validated via Zod before use. Validation errors thrown immediately. No partial parsing.

**Authentication:** Multiple methods supported:
- Client secret (basic or POST body)
- Client assertion (JWT signed by client key)
- DPoP (Demonstration of Proof of Possession) - proof of key ownership
- None (public client)
- Caller chooses via callbacks at authorization request time

**JWT/JWK:**
- All JWTs handled via callback (`signJwt`, `verifyJwt` callbacks)
- JWK operations (thumbprint calculation, JWKS validation) provided as utilities
- No hard-coded key material in library

**Fetch Abstraction:**
- `fetch` callback allows HTTP client customization (logging, timeout, cert pinning, etc.)
- Used for metadata fetching, token endpoint requests, credential requests
- Allows cross-environment support (Node.js, browser, React Native)
