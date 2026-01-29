# Requirements: IAE Update

**Defined:** 2026-01-29
**Core Value:** IAE implementation must fully conform to OpenID4VCI 1.1 spec for interoperability

## v1 Requirements

### Naming Migration

- [x] **NAME-01**: All TypeScript types rename IAR -> IAE (InteractiveAuthorization*)
- [ ] **NAME-02**: All file names rename interactive-authorization -> interactive-authorization-endpoint
- [x] **NAME-03**: All function names update to use IAE terminology
- [x] **NAME-04**: All Zod schema names update (zInteractiveAuthorizationEndpoint*)
- [x] **NAME-05**: All exported symbols update in index files

### Protocol Changes

- [x] **PROT-01**: Response mode `iar-post` changes to `iae_post`
- [x] **PROT-02**: Response mode `iar-post.jwt` changes to `iae_post.jwt`
- [x] **PROT-03**: Audience/domain prefix `iar:` changes to `iae:`
- [x] **PROT-04**: `expected_origins` parameter removed from signed requests
- [x] **PROT-05**: `expected_url` parameter added for signed requests with validation
- [x] **PROT-06**: `expected_url` ignored in unsigned requests (per spec)

### Metadata Updates

- [x] **META-01**: `interactive_authorization_endpoint` added to Authorization Server metadata schema
- [x] **META-02**: `require_interactive_authorization_request` boolean added to AS metadata
- [x] **META-03**: `require_interactive_authorization_request` validation (must not be present if endpoint omitted)
- [x] **META-04**: Metadata description indicates SHOULD use IAE when present

### PKCE & Security

- [x] **PKCE-01**: `code_challenge` and `code_challenge_method` included when `redirect_to_web` supported
- [x] **PKCE-02**: Authorization Server enforces `code_verifier` in follow-up after `redirect_to_web`
- [x] **PKCE-03**: Redirect URI must be HTTPS (per RFC 8252 Section 7.2)
- [x] **PKCE-04**: Wallet must not use embedded user-agent for redirect_to_web

### Follow-up Flow

- [x] **FLOW-01**: Authorization Server can return `auth_session` in redirect response (not just `code`)
- [x] **FLOW-02**: Wallet makes follow-up request with `auth_session` when redirect doesn't include `code`
- [x] **FLOW-03**: Follow-up request after redirect_to_web includes `code_verifier` if PKCE used

### Client Authentication

- [x] **AUTH-01**: Client authentication rules match PAR requirements (RFC 9126, RFC 6749)
- [x] **AUTH-02**: Applicable authentication methods same as PAR

### Session Security

- [x] **SESS-01**: `auth_session` value must be distinct for each interactive authorization response
- [x] **SESS-02**: Authorization Server associates nonce with auth_session for OpenID4VP presentation
- [x] **SESS-03**: Authorization Server verifies presentation uses same nonce

### OpenID4VP Integration

- [x] **VP-01**: `response_mode` in OpenID4VP request must be `iae_post` or `iae_post.jwt`
- [x] **VP-02**: `expected_url` parameter present in signed OpenID4VP requests
- [x] **VP-03**: Wallet validates `expected_url` matches follow-up request URL
- [x] **VP-04**: Wallet returns error if `expected_url` doesn't match
- [x] **VP-05**: `openid4vp_response` parameter contains JSON-encoded response
- [x] **VP-06**: Response encrypted when `response_mode` is `iae_post.jwt`

### Error Handling

- [x] **ERR-01**: Error codes consistent with RFC 9126 (PAR errors)
- [x] **ERR-02**: `missing_interaction_type` error code properly handled

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

| Requirement | Phase | Status | Notes |
|-------------|-------|--------|-------|
| NAME-01 | Phase 1 | Complete | Completed 2026-01-29 |
| NAME-02 | Deferred | Deferred | File renaming deferred per research findings; see ROADMAP |
| NAME-03 | Phase 1 | Complete | Completed 2026-01-29 |
| NAME-04 | Phase 1 | Complete | Completed 2026-01-29 |
| NAME-05 | Phase 1 | Complete | Completed 2026-01-29 |
| PROT-01 | Phase 1 | Complete | Completed 2026-01-29 |
| PROT-02 | Phase 1 | Complete | Completed 2026-01-29 |
| PROT-03 | Phase 1 | Complete | Completed 2026-01-29 |
| PROT-04 | Phase 1 | Satisfied | Field never existed in codebase |
| PROT-05 | Phase 2 | Complete | 2026-01-29 |
| PROT-06 | Phase 2 | Complete | 2026-01-29 |
| META-01 | Phase 1 | Complete | Completed 2026-01-29 |
| META-02 | Phase 1 | Complete | Completed 2026-01-29 |
| META-03 | Phase 1 | Complete | Completed 2026-01-29 |
| META-04 | Phase 1 | Complete | Completed 2026-01-29 |
| PKCE-01 | Phase 2 | Complete | 2026-01-29 |
| PKCE-02 | Phase 2 | Complete | 2026-01-29 |
| PKCE-03 | Phase 2 | Complete | 2026-01-29 |
| PKCE-04 | Phase 2 | Complete | 2026-01-29 |
| FLOW-01 | Phase 2 | Complete | 2026-01-29 |
| FLOW-02 | Phase 2 | Complete | 2026-01-29 |
| FLOW-03 | Phase 2 | Complete | 2026-01-29 |
| AUTH-01 | Phase 2 | Complete | 2026-01-29 |
| AUTH-02 | Phase 2 | Complete | 2026-01-29 |
| SESS-01 | Phase 2 | Complete | 2026-01-29 |
| SESS-02 | Phase 2 | Complete | 2026-01-29 |
| SESS-03 | Phase 2 | Complete | 2026-01-29 |
| VP-01 | Phase 2 | Complete | 2026-01-29 |
| VP-02 | Phase 2 | Complete | 2026-01-29 |
| VP-03 | Phase 2 | Complete | 2026-01-29 |
| VP-04 | Phase 2 | Complete | 2026-01-29 |
| VP-05 | Phase 2 | Complete | 2026-01-29 |
| VP-06 | Phase 2 | Complete | 2026-01-29 |
| ERR-01 | Phase 2 | Complete | 2026-01-29 |
| ERR-02 | Phase 2 | Complete | 2026-01-29 |
| TEST-01 | Phase 3 | Complete | 2026-01-29 |
| TEST-02 | Phase 3 | Complete | 2026-01-29 |
| TEST-03 | Phase 3 | Complete | 2026-01-29 |
| TEST-04 | Phase 3 | Complete | 2026-01-29 |
| TEST-05 | Phase 3 | Complete | 2026-01-29 |
| DOC-01 | Phase 3 | Complete | 2026-01-29 |
| DOC-02 | Phase 3 | Complete | 2026-01-29 |
| DOC-03 | Phase 3 | Complete | 2026-01-29 |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 34/36 (94%)
- Deferred: 1 (NAME-02)
- Already satisfied: 1 (PROT-04)

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-01-29 after milestone completion (all 34 requirements Complete)*
