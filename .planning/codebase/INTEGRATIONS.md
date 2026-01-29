# External Integrations

**Analysis Date:** 2026-01-29

## APIs & External Services

**HTTP/Fetch:**
- Fetch API - Core communication mechanism for all external HTTP requests
  - Usage: OAuth2 metadata discovery, token endpoints, credential requests, wallet interactions
  - Abstraction: `@openid4vc/utils` package exports custom fetch implementation
  - Client-provided: Via `callbacks.fetch` in `CallbackContext`
  - Default fallback: Global `fetch` if not provided

**Authorization Server Endpoints:**
- `.well-known/oauth-authorization-server` - OAuth2 metadata discovery
  - Implementation: `packages/oauth2/src/metadata/fetch-well-known-metadata.ts`
  - Usage: Fetches `AuthorizationServerMetadata` (issuer, endpoints, supported algorithms)

- Token Endpoint - Access token exchange and refresh
  - Location: `packages/oauth2/src/access-token/retrieve-access-token.ts`
  - Methods: Authorization code flow, pre-authorized code flow, refresh token flow

- JWKS Endpoint - Fetch JSON Web Key Sets
  - Implementation: `packages/oauth2/src/metadata/fetch-jwks-uri.ts`
  - Usage: Key verification for JWT validation

**Credential Issuance (OpenID4VCI):**
- Credential Offer Endpoints - Initiate credential issuance
  - Location: `packages/openid4vci/src/credential-offer/credential-offer.ts`

- Credential Endpoint - Request credentials from issuer
  - Location: `packages/openid4vci/src/credential-request/`
  - Uses: Proof of possession, credential format selection

- Credential Issuer Metadata - Well-known endpoint
  - Location: `packages/openid4vci/src/metadata/credential-issuer/`
  - Discovery: `.well-known/openid-credential-issuer`

**Presentation (OpenID4VP):**
- Authorization Request Endpoint - Request presentation
  - Location: `packages/openid4vp/src/authorization-request/`
  - Supports: Direct requests and URI-based indirect requests

- Verifier Endpoints - Receive presentation responses
  - Response modes: direct_post, form_post, redirect, fragment
  - Location: `packages/openid4vp/src/authorization-response/`

## Data Storage

**Databases:**
- Not applicable - Library is environment agnostic
- No built-in database integration
- Applications using this library handle data persistence externally

**File Storage:**
- Not applicable - Library does not manage file storage

**Caching:**
- Not implemented at library level
- Metadata and JWKs caching: handled by consuming application
- Suggestion: Cache `.well-known/oauth-authorization-server` and JWKS endpoints

## Authentication & Identity

**Auth Provider:**
- Custom (callback-based) - No external auth provider dependency
  - JWT signing/verification: `CallbackContext.signJwt`, `CallbackContext.verifyJwt`
  - JWE encryption/decryption: `CallbackContext.decryptJwe`, `CallbackContext.encryptJwe`
  - Hashing: `CallbackContext.hash`
  - Random generation: `CallbackContext.generateRandom`

**Authentication Methods:**
- Client authentication:
  - `clientAuthenticationClientSecretPost` - Client ID + secret in body
  - `clientAuthenticationClientSecretBasic` - HTTP Basic auth
  - `clientAuthenticationClientAttestationJwt` - Certificate attestation
  - `clientAuthenticationNone` - Public clients
  - `clientAuthenticationAnonymous` - Wallets

**JWT/JWE Support:**
- Jose library (6.1.3) used in tests and examples
- IANA hash algorithms supported (sha-256, sha-384, sha-512)
- All cryptographic operations via callbacks - no built-in crypto library required

## Monitoring & Observability

**Error Tracking:**
- Not integrated - Error handling is custom within library
- Custom error classes:
  - `packages/oauth2/src/error/Oauth2ServerErrorResponseError.ts`
  - `packages/oauth2/src/error/Oauth2ClientErrorResponseError.ts`
  - `packages/oauth2/src/error/Oauth2InvalidFetchResponseError.ts`
  - `packages/utils/src/error/InvalidFetchResponseError.ts`
  - `packages/utils/src/error/FetchError.ts`
  - `packages/utils/src/error/ValidationError.ts`

**Logs:**
- Not integrated - No logging framework used
- Consuming application responsible for logging
- Error messages available via exception properties

## CI/CD & Deployment

**Hosting:**
- npm registry - Published as public packages
- Repository: GitHub `openwallet-foundation-labs/oid4vc-ts`

**CI Pipeline:**
- GitHub Actions (inferred from git repository)
- Changesets CLI for release management

**Publishing:**
- npm packages under `@openid4vc` scope:
  - `@openid4vc/oauth2`
  - `@openid4vc/utils`
  - `@openid4vc/openid4vci`
  - `@openid4vc/openid4vp`

## Environment Configuration

**Required env vars:**
- Not required at library level
- Applications must configure:
  - Authorization server URLs
  - Client credentials (if using secret-based authentication)
  - Issuer/verifier endpoints

**Secrets location:**
- Not applicable - Library is agnostic
- Application must handle:
  - Client secrets
  - Private keys for JWT signing
  - Encryption keys

**Configuration Approach:**
- Global config support via `@openid4vc/utils`:
  - `setGlobalConfig(config)` - Set global configuration
  - `getGlobalConfig()` - Retrieve configuration
  - Location: `packages/utils/src/config.ts`

## Webhooks & Callbacks

**Incoming:**
- Authorization response callback handling: `packages/openid4vp/src/authorization-response/`
- Interactive authorization responses: `packages/oauth2/src/interactive-authorization/`

**Outgoing:**
- Webhook notifications (OpenID4VCI):
  - Credential notification endpoint
  - Location: `packages/openid4vci/src/notification/`
  - Schema: `packages/openid4vci/src/notification/z-notification.ts`

**Callback System:**
- Core callback interface: `packages/oauth2/src/callbacks.ts`
- `CallbackContext` provides:
  - `fetch(url, init)` - HTTP requests
  - `hash(data, alg)` - Cryptographic hashing
  - `signJwt(signer, jwt)` - JWT signing
  - `verifyJwt(signer, jwt)` - JWT verification
  - `decryptJwe(jwe, options)` - JWE decryption
  - `encryptJwe(encryptor, data)` - JWE encryption
  - `generateRandom(byteLength)` - Random bytes
  - `clientAuthentication(request, options)` - Client auth
  - `getX509CertificateMetadata(certificate)` - Certificate parsing (optional)

## Request/Response Patterns

**Fetch Abstraction:**
- Location: `packages/utils/src/fetcher.ts`
- `createFetcher(fetcher?)` - Wraps platform fetch
- `createZodFetcher(fetcher?)` - Typed fetch with zod schema validation
- Handles:
  - Content-Type validation
  - JSON and JWT response parsing
  - Error handling and status codes

**Supported Response Types:**
- `application/json` - Standard JSON responses
- `application/oauth-authz-req+jwt` - OAuth Authorization Request JWT
- `application/jwt` - Generic JWT

**Error Response Handling:**
- Location: `packages/oauth2/src/common/z-oauth2-error.ts`
- OAuth2 error codes: `error` and `error_description` fields
- HTTP status code mapping: Non-200 responses parsed as errors

## Cross-Package Integration Points

**Utils Package** (`@openid4vc/utils`):
- Provides: Fetch abstraction, encoding/decoding, URL/query param helpers, zod error formatting
- Used by: All other packages

**OAuth2 Package** (`@openid4vc/oauth2`):
- Provides: Base authorization framework, token handling, client authentication
- Used by: `openid4vci`, `openid4vp`
- Exposes: `Oauth2Client`, `Oauth2AuthorizationServer`, `Oauth2ResourceServer`

**OpenID4VCI Package** (`@openid4vc/openid4vci`):
- Provides: Credential issuance implementation
- Depends on: `oauth2`, `utils`
- Exposes: Credential request/response handling, credential offer parsing

**OpenID4VP Package** (`@openid4vc/openid4vp`):
- Provides: Verifiable presentation implementation
- Depends on: `oauth2`, `utils`
- Exposes: Authorization request/response handling, presentation definition support

---

*Integration audit: 2026-01-29*
