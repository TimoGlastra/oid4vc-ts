# Codebase Structure

**Analysis Date:** 2026-01-29

## Directory Layout

```
oid4vc-ts/
├── packages/
│   ├── oauth2/                  # OAuth2 foundation layer
│   │   ├── src/
│   │   │   ├── access-token/               # Token endpoint (create/parse/verify)
│   │   │   ├── authorization-request/      # Authorization request building/parsing
│   │   │   ├── authorization-response/     # Authorization response parsing/verification
│   │   │   ├── authorization-challenge/    # Challenge endpoint (interactive auth)
│   │   │   ├── client-authentication.ts    # Client auth methods (secret, assertion, etc.)
│   │   │   ├── client-attestation/         # Client attestation JWT handling
│   │   │   ├── common/                     # Shared: JWT, JWK, algorithms
│   │   │   ├── dpop/                       # DPoP (proof of possession)
│   │   │   ├── error/                      # Error classes
│   │   │   ├── id-token/                   # OpenID Connect id_token validation
│   │   │   ├── interactive-authorization/  # Interactive authorization endpoint
│   │   │   ├── jar/                        # JAR (JWT Secured Authorization Request)
│   │   │   ├── metadata/                   # Authorization server metadata fetching
│   │   │   ├── resource-request/           # Resource server protection
│   │   │   ├── Oauth2AuthorizationServer.ts   # Server-side orchestrator
│   │   │   ├── Oauth2Client.ts                # Client-side orchestrator
│   │   │   ├── Oauth2ResourceServer.ts       # Resource server helper
│   │   │   ├── pkce.ts                       # PKCE helper
│   │   │   └── index.ts                      # Public API exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── openid4vci/              # Credential issuance (OID4VCI)
│   │   ├── src/
│   │   │   ├── credential-offer/            # Credential offer resolution
│   │   │   ├── credential-request/          # Credential request/response handling
│   │   │   ├── formats/                     # Credential formats
│   │   │   │   ├── credential/              # Credential format handlers
│   │   │   │   │   ├── w3c-vc/             # W3C VC JSON, JSON-LD, SD-JWT
│   │   │   │   │   ├── sd-jwt-vc/          # SD-JWT-VC format
│   │   │   │   │   ├── sd-jwt-dc/          # SD-JWT-DC format
│   │   │   │   │   └── mso-mdoc/           # MSO-mdoc format
│   │   │   │   └── proof-type/              # Proof type handlers
│   │   │   │       ├── jwt/                 # JWT proof type
│   │   │   │       └── attestation/         # Attestation proof type
│   │   │   ├── key-attestation/             # Key attestation JWT handling
│   │   │   ├── metadata/                    # Issuer metadata handling
│   │   │   ├── nonce/                       # Nonce endpoint
│   │   │   ├── notification/                # Notification endpoint
│   │   │   ├── error/                       # Error classes
│   │   │   ├── Openid4vciClient.ts          # Wallet/client orchestrator
│   │   │   ├── Openid4vciIssuer.ts          # Issuer orchestrator
│   │   │   ├── Openid4vciWalletProvider.ts  # Wallet metadata provider
│   │   │   ├── version.ts                   # Version info
│   │   │   └── index.ts                     # Public API exports
│   │   ├── tests/                           # Integration tests (Provicis, eIDAS2 Sandboks)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── openid4vp/               # Presentation (OID4VP)
│   │   ├── src/
│   │   │   ├── authorization-request/       # Authorization request building/parsing
│   │   │   ├── authorization-response/      # Response creation/parsing/validation
│   │   │   ├── client-identifier-prefix/    # Client ID prefix handling (x509 hash)
│   │   │   ├── jar/                         # JAR (JWT request objects)
│   │   │   ├── jarm/                        # JARM (response encryption/signing)
│   │   │   ├── models/                      # Data models (client metadata, credential formats)
│   │   │   ├── transaction-data/            # Transaction data validation
│   │   │   ├── vp-token/                    # VP token parsing (PEX, DCQL)
│   │   │   ├── fetch-client-metadata.ts     # Client metadata resolution
│   │   │   ├── Openid4vpClient.ts           # Wallet/holder orchestrator
│   │   │   ├── Openid4vpVerifier.ts         # Verifier orchestrator
│   │   │   ├── version.ts                   # Version info
│   │   │   └── index.ts                     # Public API exports
│   │   ├── src/**/__tests__/                # Co-located unit tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── utils/                   # Cross-cutting utilities
│       ├── src/
│       │   ├── error/                    # Base error classes
│       │   ├── encoding.ts               # Base64, UTF-8 encode/decode
│       │   ├── validation.ts             # Zod schemas (URL, HTTP method, etc.)
│       │   ├── fetcher.ts                # Fetch wrapper with Zod validation
│       │   ├── content-type.ts           # Content-Type header parsing
│       │   ├── url.ts                    # URL/query string utilities
│       │   ├── path.ts                   # Path joining utilities
│       │   ├── array.ts                  # Array utilities
│       │   ├── object.ts                 # Object utilities (merge, isObject)
│       │   ├── date.ts                   # Date utilities
│       │   ├── parse.ts                  # JSON parsing with error handling
│       │   ├── globals.ts                # Cross-platform globals (fetch, URL, Headers)
│       │   ├── type.ts                   # TypeScript utility types
│       │   ├── config.ts                 # Global configuration
│       │   ├── www-authenticate.ts       # WWW-Authenticate header parsing
│       │   ├── zod-error.ts              # Zod error formatting
│       │   └── index.ts                  # Public API exports
│       ├── package.json
│       └── tsconfig.json
│
├── .planning/
│   └── codebase/                # This analysis
│
├── .github/
│   └── workflows/               # CI/CD pipelines
│
├── .changeset/                  # Changesets for version management
├── package.json                 # Root workspace configuration
├── pnpm-workspace.yaml          # PNPM workspace definition
├── tsconfig.json                # Root TypeScript config
└── biome.json                   # Biome linting/formatting config
```

## Directory Purposes

**packages/oauth2/src:**
- Purpose: OAuth2 protocol implementation. Classes and functions for authorization, token, PKCE, DPoP, resource server validation.
- Contains: Classes (`Oauth2Client`, `Oauth2AuthorizationServer`, `Oauth2ResourceServer`), endpoint handlers, callback interfaces
- Key files: `Oauth2Client.ts` (client orchestrator), `Oauth2AuthorizationServer.ts` (server orchestrator), `callbacks.ts` (callback interface definitions)

**packages/oauth2/src/access-token:**
- Purpose: Token endpoint (OAuth2 `/token` endpoint) - exchange authorization code/pre-authorized code for access token
- Contains: Functions to parse requests, verify token requests, create responses; JWT access token creation
- Key operations: `parseAccessTokenRequest()`, `verifyAuthorizationCodeAccessTokenRequest()`, `createAccessTokenResponse()`

**packages/oauth2/src/authorization-request:**
- Purpose: Authorization request building and parsing for OAuth2 authorization endpoint
- Contains: PKCE, request object (JAR), pushed authorization request (PAR) handling
- Key operations: `createAuthorizationRequest()`, `parseAuthorizationRequest()`, `verifyAuthorizationRequest()`

**packages/oauth2/src/authorization-challenge:**
- Purpose: Authorization challenge endpoint for interactive authorization flows (e.g., when user authentication is needed)
- Contains: Challenge request parsing, challenge response creation

**packages/oauth2/src/common:**
- Purpose: Shared JWT, JWK, and algorithm handling
- Key files: `jwt/decode-jwt.ts` (JWT parsing), `jwt/z-jwt.ts` (JWT schema), `jwk/z-jwk.ts` (JWK schema), `algorithm/algorithm-transform.ts` (algorithm conversion)

**packages/oauth2/src/dpop:**
- Purpose: DPoP (Demonstration of Proof of Possession) - proves client possesses a key for access token requests
- Contains: DPoP JWT creation, verification, nonce retry logic
- Key operations: `createDpopHeadersForRequest()`, `verifyDpopJwt()`

**packages/openid4vci/src/credential-offer:**
- Purpose: Parse and resolve credential offers (starting point for credential issuance flow)
- Contains: Credential offer resolution from URI, authorization code/pre-authorized code flow detection
- Key operations: `resolveCredentialOffer()`, `determineAuthorizationServerForCredentialOffer()`

**packages/openid4vci/src/credential-request:**
- Purpose: Credential request/response handling (exchange access token for actual credentials)
- Contains: Request parsing, response creation, deferred credential handling
- Key files: `retrieve-credentials.ts`, `credential-request-configurations.ts`, `z-credential-request.ts`

**packages/openid4vci/src/formats/credential:**
- Purpose: Pluggable credential format handlers for different formats (W3C VC, SD-JWT, MSO-mdoc)
- Pattern: Each format has schema file (`z-*.ts`) and optional handlers
- Extensibility: New formats can be added in parallel directories

**packages/openid4vci/src/formats/proof-type:**
- Purpose: Proof type handlers (JWT, attestation) for proving credential request authenticity
- Pattern: JWT proof type builds JWT with proof claims, attestation type delegates to platform

**packages/openid4vp/src/authorization-request:**
- Purpose: Parse and validate OpenID4VP authorization requests (verifier asks for presentations)
- Contains: Request parsing, presentation scope/format requirements extraction
- Key operations: `parseOpenid4vpAuthorizationRequest()`, `resolveOpenid4vpAuthorizationRequest()`, `validateOpenid4vpAuthorizationRequestPayload()`

**packages/openid4vp/src/authorization-response:**
- Purpose: Build, validate, and submit OpenID4VP responses (wallet provides presentations)
- Contains: Presentation selection, credential selectors (PEX, DCQL) handling, signature/encryption
- Key operations: `createOpenid4vpAuthorizationResponse()`, `validateOpenid4vpAuthorizationResponsePayload()`, `submitOpenid4vpAuthorizationResponse()`

**packages/openid4vp/src/vp-token:**
- Purpose: Parse and validate VP token (verifiable presentation token) in authorization response
- Contains: Handlers for different VP token formats (PEX with VC objects, DCQL)

**packages/utils/src:**
- Purpose: Cross-cutting utilities available to all packages
- Pattern: No dependencies on other packages
- Key categories: Encoding (base64), URLs, content-type, validation (Zod), fetching with validation, error base classes, globals

## Key File Locations

**Entry Points:**
- `packages/oauth2/src/index.ts`: OAuth2 public API (classes, types, validators, errors)
- `packages/openid4vci/src/index.ts`: OID4VCI public API (credential classes, types)
- `packages/openid4vp/src/index.ts`: OID4VP public API (presentation classes, types)
- `packages/utils/src/index.ts`: Utils public API (encoding, validation, fetching, errors)

**Configuration:**
- `package.json`: Root workspace definition, dev dependencies (biome, typescript, vitest)
- `tsconfig.json`: Root TypeScript config (shared by all packages)
- `biome.json`: Linting and formatting rules
- `pnpm-workspace.yaml`: PNPM workspace definition

**Core Logic:**
- `packages/oauth2/src/Oauth2Client.ts`: Client-side OAuth2 orchestrator (initiateAuthorization, handleAuthorizationResponse, retrieveAccessToken)
- `packages/oauth2/src/Oauth2AuthorizationServer.ts`: Server-side OAuth2 orchestrator (parseAuthorizationRequest, verifyAuthorizationRequest, createAuthorizationResponse, etc.)
- `packages/openid4vci/src/Openid4vciClient.ts`: Wallet-side credential issuance orchestrator
- `packages/openid4vci/src/Openid4vciIssuer.ts`: Issuer-side credential issuance orchestrator
- `packages/openid4vp/src/Openid4vpClient.ts`: Wallet-side presentation orchestrator
- `packages/openid4vp/src/Openid4vpVerifier.ts`: Verifier-side presentation orchestrator

**Testing:**
- `packages/openid4vp/src/**/__tests__/`: Co-located unit tests for authorization-request, authorization-response
- `packages/openid4vci/tests/`: Integration tests (external service interoperability)

## Naming Conventions

**Files:**
- **Functional utilities:** `verb-noun.ts` (e.g., `create-authorization-request.ts`, `parse-access-token-request.ts`, `verify-jwt.ts`)
- **Schema validators:** `z-noun.ts` (e.g., `z-access-token.ts`, `z-authorization-request.ts`) - Zod prefix convention
- **Error classes:** `Noun.ts` or `NounError.ts` (e.g., `Oauth2Error.ts`, `Openid4vciRetrieveCredentialsError.ts`)
- **Index files:** `index.ts` - barrel exports for directory
- **Type-only files:** Same as content (no `-types` suffix)

**Directories:**
- **Plural for collections:** `access-token/`, `authorization-request/`, `formats/`
- **Kebab-case:** All directory names use kebab-case
- **Tests colocated:** `__tests__/` subdirectory next to source files

**Functions:**
- `create*()`: Build request/JWT/response from parameters
- `parse*()`: Extract object from HTTP body/params/string
- `verify*()`: Validate structure and authenticity, throws on failure
- `resolve*()`: Fetch or derive, often async
- `get*()`: Return computed value synchronously
- `is*()`: Return boolean

**Types:**
- PascalCase for exported types (e.g., `Oauth2ClientOptions`, `AuthorizationRequest`)
- Append suffix for variants: `*Options` (function options), `*Return`/`*Result` (function return), `*Error`/`*ErrorResponse` (errors)

**Constants:**
- Enum values in UPPER_SNAKE_CASE (e.g., `HashAlgorithm.Sha256`, `Oauth2ErrorCodes.InvalidScope`)
- Zod schemas in camelCase with `z` prefix (e.g., `zAccessTokenRequest`)

## Where to Add New Code

**New Feature:**
- Determine which package: oauth2 (if pure OAuth2), openid4vci (if credential-related), openid4vp (if presentation-related)
- Primary code: Create new directory under `src/feature-name/` with `*.ts` files
- Tests: Create `__tests__` subdirectory in feature directory
- Export: Add public exports to package `index.ts`

**New Component/Module:**
- Implementation: `packages/*/src/module-name/implementation.ts`
- Validation schemas: `packages/*/src/module-name/z-module-name.ts`
- Tests: `packages/*/src/module-name/__tests__/implementation.test.ts` or `implementation.spec.ts`
- Barrel export: `packages/*/src/module-name/index.ts` (if directory contains multiple files)

**Utilities:**
- Shared by multiple packages: Add to `packages/utils/src/category-name.ts`
- Package-specific: Add to `packages/package-name/src/common/` or existing utility file
- Error classes: Add to `packages/package-name/src/error/ErrorName.ts`

**New Error Type:**
- File: `packages/package-name/src/error/NewError.ts`
- Pattern: Extend from `Oauth2Error` or `Openid4vciError` (which extend `OpenId4VcBaseError`)
- Include `cause` field for error chain
- Export from package `index.ts`

**New Zod Schema:**
- File: `packages/package-name/src/feature/z-feature-name.ts`
- Pattern: Export `zFeatureName` const with Zod schema
- Use composition: `z.intersection()`, `z.union()`, `.refine()`, `.transform()`
- Export type-inferred types with `z.infer<typeof zSchema>`

## Special Directories

**packages/oauth2/src/__tests__:**
- Purpose: Fixture data and shared test utilities
- Generated: No (committed to repo)
- Committed: Yes

**packages/openid4vci/tests:**
- Purpose: Integration tests with external services (Provicis, eIDAS2 Sandboks)
- Pattern: Real-world interoperability testing
- Committed: Yes

**node_modules:**
- Generated: Yes (via `pnpm install`)
- Committed: No

**.changeset:**
- Purpose: Changesets for version management (semantic versioning)
- Pattern: Run `changeset add` to document changes before release
- Committed: Yes

**.planning/codebase:**
- Purpose: Generated codebase analysis documents (this file, ARCHITECTURE.md, etc.)
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: No (ignored)
