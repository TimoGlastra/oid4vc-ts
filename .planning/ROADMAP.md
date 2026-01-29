# Roadmap: IAE Update

## Overview

This roadmap migrates the existing Interactive Authorization implementation from IAR (Interactive Authorization Request) to IAE (Interactive Authorization Endpoint) per OpenID4VCI 1.1 specification. The update flows through three natural stages: first updating schemas and types to establish the new foundation, then migrating implementation logic and integrations, and finally verifying everything through tests and documentation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Schema & Type Foundation** - Migrate all schemas, types, and constants to IAE naming and protocol
- [ ] **Phase 2: Implementation & Integration** - Update function implementations, server/client classes, and security flows
- [ ] **Phase 3: Verification & Documentation** - Update tests and documentation to match new protocol

## Phase Details

### Phase 1: Schema & Type Foundation
**Goal**: All TypeScript types, Zod schemas, and protocol constants reflect IAE specification
**Depends on**: Nothing (first phase)
**Requirements**: NAME-01, NAME-03, NAME-04, NAME-05, PROT-01, PROT-02, PROT-03, PROT-04, META-01, META-02, META-03, META-04
**Deferred**: NAME-02 (file renaming - see note below)
**Moved to Phase 2**: PROT-05, PROT-06 (expected_url validation is implementation logic)
**Success Criteria** (what must be TRUE):
  1. All exported types use IAE naming (InteractiveAuthorizationEndpoint, not InteractiveAuthorizationRequest)
  2. Response modes use iae_post and iae_post.jwt (not iar-post)
  3. Authorization Server metadata schema includes interactive_authorization_endpoint and require_interactive_authorization_request
  4. Audience prefix uses iae: (not iar:)
**Plans:** 2 plans

**Note on NAME-02 (file renaming):**
File/folder renaming from `interactive-authorization` to `interactive-authorization-endpoint` is intentionally deferred per research findings (01-RESEARCH.md, Open Question 1). Rationale: The rename would cause import churn across the codebase with minimal practical benefit; current naming is already descriptive. Can be revisited post-v1 if spec consistently uses full terminology.

**Note on PROT-04/05/06:**
- PROT-04 (remove expected_origins): Already satisfied - field never existed in codebase
- PROT-05/06 (expected_url validation): These are Wallet-side validation requirements when processing OpenID4VP requests, not schema definitions. Moved to Phase 2 with VP-02, VP-03, VP-04.

Plans:
- [x] 01-01-PLAN.md — Update Zod schemas, types, and protocol constants to IAE naming
- [x] 01-02-PLAN.md — Update implementation files and public API exports

### Phase 2: Implementation & Integration
**Goal**: All function implementations, server/client classes, and security flows conform to IAE specification
**Depends on**: Phase 1
**Requirements**: PROT-05, PROT-06, PKCE-01, PKCE-02, PKCE-03, PKCE-04, FLOW-01, FLOW-02, FLOW-03, AUTH-01, AUTH-02, SESS-01, SESS-02, SESS-03, VP-01, VP-02, VP-03, VP-04, VP-05, VP-06, ERR-01, ERR-02
**Success Criteria** (what must be TRUE):
  1. Authorization Server can return auth_session in redirect response (not just code)
  2. Wallet makes follow-up request with code_verifier when redirect_to_web uses PKCE
  3. OpenID4VP requests use iae_post or iae_post.jwt response modes
  4. Wallet validates expected_url matches follow-up request URL and returns error if mismatch
  5. Authorization Server enforces distinct auth_session values and associates nonce with each session
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Verification & Documentation
**Goal**: All tests pass with new protocol and documentation reflects IAE specification
**Depends on**: Phase 2
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. All existing tests run successfully with IAE naming and protocol
  2. Tests cover expected_url validation, auth_session in redirect response, and PKCE in redirect_to_web flow
  3. Tests verify new metadata parameters (interactive_authorization_endpoint, require_interactive_authorization_request)
  4. JSDoc comments reference IAE terminology consistently
  5. Examples demonstrate new naming and protocol patterns
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema & Type Foundation | 2/2 | Complete ✓ | 2026-01-29 |
| 2. Implementation & Integration | 0/1 | Not started | - |
| 3. Verification & Documentation | 0/1 | Not started | - |
