---
phase: 02-implementation-and-integration
plan: 01
subsystem: auth
tags: [pkce, oauth2, openid4vp, interactive-authorization, iae, wallet, jwt, jwe]

# Dependency graph
requires:
  - phase: 01-schema-type-foundation
    provides: IAE schemas, types, and verification infrastructure
provides:
  - PKCE generation for redirect_to_web flows with follow-up support
  - expected_url validation for OpenID4VP replay attack prevention
  - VP response encoding helpers for wallet implementations (JSON and encrypted JWT)
affects: [03-server-implementation, wallet-implementations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PKCE flow: generate on initial request, verify on follow-up"
    - "expected_url validation: skip unsigned, validate signed OpenID4VP requests"
    - "VP response encoding: JSON for iae_post, JARM encryption for iae_post.jwt"

key-files:
  created: []
  modified:
    - packages/oauth2/src/interactive-authorization/send-interactive-authorization-request.ts
    - packages/oauth2/src/interactive-authorization/z-interactive-authorization.ts
    - packages/oauth2/src/interactive-authorization/verify-interactive-authorization-request.ts
    - packages/oauth2/src/interactive-authorization/parse-interactive-authorization-request.ts
    - packages/oauth2/src/interactive-authorization/create-interactive-authorization-response.ts

key-decisions:
  - "PKCE generated only for initial requests with redirect_to_web, not for follow-ups"
  - "expected_url validation is informational for wallets - they decode JWT but don't verify signature (signature verification is wallet's responsibility)"
  - "VP response encoding uses ECDH-ES with A256GCM for iae_post.jwt mode per JARM spec"

patterns-established:
  - "Client-side IAE flow: generate PKCE → send initial request → store codeVerifier → use in follow-up after redirect"
  - "Wallet OpenID4VP flow: validate expected_url → respond with VP → encode per response_mode"
  - "Auto-fix pattern: Fix pre-existing bugs blocking compilation (missing return fields, callback type mismatches)"

# Metrics
duration: 8min
completed: 2025-01-29
---

# Phase 2 Plan 1: Client-Side IAE Protocol Updates Summary

**PKCE generation for redirect_to_web flows, expected_url validation for OpenID4VP replay protection, and VP response encoding helpers**

## Performance

- **Duration:** 8 min (456 seconds)
- **Started:** 2025-01-29T19:49:31Z
- **Completed:** 2025-01-29T19:57:07Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Client generates PKCE when redirect_to_web in interaction_types_supported, returns codeVerifier for follow-up
- Wallet can validate expected_url in signed OpenID4VP requests to prevent replay attacks
- Wallet can encode VP responses as JSON (iae_post) or encrypted JWT (iae_post.jwt) per response_mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PKCE generation for redirect_to_web flows with follow-up support** - `4144d42` (feat)
2. **Task 2: Add expected_url validation and OpenID4VP response handling for wallets** - `955b89a` (feat)

## Files Created/Modified

- `packages/oauth2/src/interactive-authorization/send-interactive-authorization-request.ts` - Added PKCE generation, validateOpenid4vpExpectedUrl, and encodeOpenid4vpResponse functions
- `packages/oauth2/src/interactive-authorization/z-interactive-authorization.ts` - Added code_challenge, code_challenge_method, and code_verifier fields to schemas
- `packages/oauth2/src/interactive-authorization/verify-interactive-authorization-request.ts` - Fixed missing pkceVerified field and callbacks type mismatch (bug from Phase 1)
- `packages/oauth2/src/interactive-authorization/parse-interactive-authorization-request.ts` - Auto-added PKCE state extraction for server storage
- `packages/oauth2/src/interactive-authorization/create-interactive-authorization-response.ts` - Auto-added generateAuthSession helper

## Decisions Made

- **PKCE flow detection:** Use presence of `auth_session` parameter to distinguish follow-up requests from initial requests
- **expected_url validation scope:** Wallet helper validates URL match but doesn't verify JWT signature (wallet's responsibility to verify AS signature separately)
- **VP response encryption:** Use ECDH-ES + A256GCM for iae_post.jwt per JARM spec (OpenID4VP Section 8.3)
- **Return value:** sendInteractiveAuthorizationEndpointRequest returns pkce object only for initial requests (undefined for follow-ups)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing pkceVerified field in verify function return**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** VerifyInteractiveAuthorizationEndpointRequestReturn interface required pkceVerified boolean, but function didn't return it
- **Fix:** Added pkceVerified field to all return statements, implemented PKCE verification logic for follow-up requests
- **Files modified:** packages/oauth2/src/interactive-authorization/verify-interactive-authorization-request.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 4144d42 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed callbacks type mismatch in verify interface**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Interface extended VerifyAuthorizationRequestOptions which requires `Pick<CallbackContext, 'hash' | 'verifyJwt'>`, but override made callbacks optional and only included 'hash'
- **Fix:** Changed interface to omit 'callbacks' from parent, redefined as optional with both 'hash' and 'verifyJwt', added validation to require callbacks for initial requests
- **Files modified:** packages/oauth2/src/interactive-authorization/verify-interactive-authorization-request.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 4144d42 (Task 1 commit)

**3. [Linter auto-fix] Added PKCE state extraction in parse function**
- **Found during:** Task 1 (automatic linter run)
- **Issue:** Parse function didn't extract PKCE state from initial requests for server to store
- **Fix:** Extract code_challenge and code_challenge_method into pkce object in ParseResult
- **Files modified:** packages/oauth2/src/interactive-authorization/parse-interactive-authorization-request.ts
- **Verification:** Aligns with server-side flow requirements
- **Committed in:** 4144d42 (Task 1 commit)

**4. [Linter auto-fix] Added generateAuthSession helper**
- **Found during:** Task 2 (automatic linter run)
- **Issue:** Needed utility for generating secure session identifiers (SESS-01 requirement)
- **Fix:** Added generateAuthSession function using 256-bit random values
- **Files modified:** packages/oauth2/src/interactive-authorization/create-interactive-authorization-response.ts
- **Verification:** Follows SESS-01 security requirement
- **Committed in:** 955b89a (Task 2 commit)

---

**Total deviations:** 4 (2 bugs, 2 linter auto-fixes)
**Impact on plan:** All fixes necessary for correctness. Bugs from Phase 1 blocked compilation. Linter auto-fixes improved completeness. No scope creep.

## Issues Encountered

- **Import resolution:** decodeJwt not in @openid4vc/utils - found in local ../common/jwt/decode-jwt module
- **Callback signature:** encryptJwe callback requires JweEncryptor object (with method, publicJwk, alg, enc) and string data, returns { encryptionJwk, jwe }
- **JWT decoding:** decodeJwt requires options object with jwt field, not just string parameter

All issues resolved via code inspection and type checking.

## Next Phase Readiness

**Ready for server-side implementation:**
- Client can generate and send PKCE challenges
- Client can receive and use PKCE codeVerifier in follow-ups
- Wallet has helpers for expected_url validation and VP response encoding

**Server-side next steps (Plan 02-02):**
- Validate code_challenge in initial requests
- Store PKCE state with auth_session
- Verify code_verifier in follow-up requests
- Generate signed OpenID4VP requests with expected_url

**No blockers.**

---
*Phase: 02-implementation-and-integration*
*Completed: 2025-01-29*
