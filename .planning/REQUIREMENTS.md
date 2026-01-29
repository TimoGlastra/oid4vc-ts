# Requirements: IAE Update

**Defined:** 2026-01-29
**Core Value:** IAE implementation must fully conform to OpenID4VCI 1.1 spec for interoperability

## v1 Requirements

### Naming Migration

- [ ] **NAME-01**: All TypeScript types rename IAR → IAE (InteractiveAuthorization*)
- [ ] **NAME-02**: All file names rename interactive-authorization → interactive-authorization-endpoint
- [ ] **NAME-03**: All function names update to use IAE terminology
- [ ] **NAME-04**: All Zod schema names update (zInteractiveAuthorizationEndpoint*)
- [ ] **NAME-05**: All exported symbols update in index files

### Protocol Changes

- [ ] **PROT-01**: Response mode `iar-post` changes to `iae_post`
- [ ] **PROT-02**: Response mode `iar-post.jwt` changes to `iae_post.jwt`
- [ ] **PROT-03**: Audience/domain prefix `iar:` changes to `iae:`
- [ ] **PROT-04**: `expected_origins` parameter removed from signed requests
- [ ] **PROT-05**: `expected_url` parameter added for signed requests with validation
- [ ] **PROT-06**: `expected_url` ignored in unsigned requests (per spec)

### Metadata Updates

- [ ] **META-01**: `interactive_authorization_endpoint` added to Authorization Server metadata schema
- [ ] **META-02**: `require_interactive_authorization_request` boolean added to AS metadata
- [ ] **META-03**: `require_interactive_authorization_request` validation (must not be present if endpoint omitted)
- [ ] **META-04**: Metadata description indicates SHOULD use IAE when present

### PKCE & Security

- [ ] **PKCE-01**: `code_challenge` and `code_challenge_method` included when `redirect_to_web` supported
- [ ] **PKCE-02**: Authorization Server enforces `code_verifier` in follow-up after `redirect_to_web`
- [ ] **PKCE-03**: Redirect URI must be HTTPS (per RFC 8252 Section 7.2)
- [ ] **PKCE-04**: Wallet must not use embedded user-agent for redirect_to_web

### Follow-up Flow

- [ ] **FLOW-01**: Authorization Server can return `auth_session` in redirect response (not just `code`)
- [ ] **FLOW-02**: Wallet makes follow-up request with `auth_session` when redirect doesn't include `code`
- [ ] **FLOW-03**: Follow-up request after redirect_to_web includes `code_verifier` if PKCE used

### Client Authentication

- [ ] **AUTH-01**: Client authentication rules match PAR requirements (RFC 9126, RFC 6749)
- [ ] **AUTH-02**: Applicable authentication methods same as PAR

### Session Security

- [ ] **SESS-01**: `auth_session` value must be distinct for each interactive authorization response
- [ ] **SESS-02**: Authorization Server associates nonce with auth_session for OpenID4VP presentation
- [ ] **SESS-03**: Authorization Server verifies presentation uses same nonce

### OpenID4VP Integration

- [ ] **VP-01**: `response_mode` in OpenID4VP request must be `iae_post` or `iae_post.jwt`
- [ ] **VP-02**: `expected_url` parameter present in signed OpenID4VP requests
- [ ] **VP-03**: Wallet validates `expected_url` matches follow-up request URL
- [ ] **VP-04**: Wallet returns error if `expected_url` doesn't match
- [ ] **VP-05**: `openid4vp_response` parameter contains JSON-encoded response
- [ ] **VP-06**: Response encrypted when `response_mode` is `iae_post.jwt`

### Error Handling

- [ ] **ERR-01**: Error codes consistent with RFC 9126 (PAR errors)
- [ ] **ERR-02**: `missing_interaction_type` error code properly handled

### Testing

- [ ] **TEST-01**: All existing tests updated to use IAE naming
- [ ] **TEST-02**: Tests cover `expected_url` validation
- [ ] **TEST-03**: Tests cover auth_session in redirect response
- [ ] **TEST-04**: Tests cover PKCE in redirect_to_web flow
- [ ] **TEST-05**: Tests cover new metadata parameters

### Documentation

- [ ] **DOC-01**: Update JSDoc comments to reference IAE
- [ ] **DOC-02**: Update examples to use new naming and protocol
- [ ] **DOC-03**: Add migration notes for any external consumers

## v2 Requirements

### Format-Specific Binding

- **BIND-01**: Document IAE binding requirements for JWT-VC (aud claim with iae: prefix)
- **BIND-02**: Document IAE binding requirements for LDP-VC (domain claim with iae: prefix)
- **BIND-03**: Document IAE binding requirements for SD-JWT-VC (aud in Key Binding JWT)
- **BIND-04**: Document IAE binding requirements for mso_mdoc (SessionTranscript structure)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backward compatibility for IAR | Feature not released; clean break acceptable |
| Format-specific binding implementation | Outside library scope; implementers handle credential formats |
| OpenID4VP response_mode registration | Handled by OpenID4VP specification/library |
| Browser/platform redirect implementation | Application-level responsibility |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAME-01 | Phase 1 | Pending |
| NAME-02 | Phase 1 | Pending |
| NAME-03 | Phase 1 | Pending |
| NAME-04 | Phase 1 | Pending |
| NAME-05 | Phase 1 | Pending |
| PROT-01 | Phase 1 | Pending |
| PROT-02 | Phase 1 | Pending |
| PROT-03 | Phase 1 | Pending |
| PROT-04 | Phase 1 | Pending |
| PROT-05 | Phase 1 | Pending |
| PROT-06 | Phase 1 | Pending |
| META-01 | Phase 1 | Pending |
| META-02 | Phase 1 | Pending |
| META-03 | Phase 1 | Pending |
| META-04 | Phase 1 | Pending |
| PKCE-01 | Phase 2 | Pending |
| PKCE-02 | Phase 2 | Pending |
| PKCE-03 | Phase 2 | Pending |
| PKCE-04 | Phase 2 | Pending |
| FLOW-01 | Phase 2 | Pending |
| FLOW-02 | Phase 2 | Pending |
| FLOW-03 | Phase 2 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| SESS-01 | Phase 2 | Pending |
| SESS-02 | Phase 2 | Pending |
| SESS-03 | Phase 2 | Pending |
| VP-01 | Phase 2 | Pending |
| VP-02 | Phase 2 | Pending |
| VP-03 | Phase 2 | Pending |
| VP-04 | Phase 2 | Pending |
| VP-05 | Phase 2 | Pending |
| VP-06 | Phase 2 | Pending |
| ERR-01 | Phase 2 | Pending |
| ERR-02 | Phase 2 | Pending |
| TEST-01 | Phase 3 | Pending |
| TEST-02 | Phase 3 | Pending |
| TEST-03 | Phase 3 | Pending |
| TEST-04 | Phase 3 | Pending |
| TEST-05 | Phase 3 | Pending |
| DOC-01 | Phase 3 | Pending |
| DOC-02 | Phase 3 | Pending |
| DOC-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36/36 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-01-29 after roadmap creation*
