# OpenID4VCI Interactive Authorization Endpoint (IAE) Update

## What This Is

An update to the existing Interactive Authorization Endpoint implementation in the oid4vc-ts library to align with the latest OpenID4VCI 1.1 draft specification. The implementation currently uses the older "IAR" (Interactive Authorization Request) naming and protocol details, and needs to be migrated to the new "IAE" (Interactive Authorization Endpoint) specification with updated naming, response modes, binding mechanisms, and metadata parameters.

## Core Value

The IAE implementation must fully conform to the latest OpenID4VCI 1.1 specification to ensure interoperability with other implementations and prevent breaking changes when the spec is finalized.

## Requirements

### Validated

- ✓ Interactive Authorization Endpoint foundation exists — existing (packages/oauth2/src/interactive-authorization/)
- ✓ OpenID4VP integration for presentation flow — existing
- ✓ Authorization Server and Client abstractions — existing (Oauth2AuthorizationServer, Oauth2Client)
- ✓ Zod validation schemas for request/response — existing
- ✓ Follow-up request mechanism with auth_session — existing

### Active

- [ ] Migrate all IAR naming to IAE (types, schemas, functions, files)
- [ ] Update response_mode values (iar-post → iae_post, iar-post.jwt → iae_post.jwt)
- [ ] Update prefix values for binding (iar: → iae:)
- [ ] Replace expected_origins with expected_url for signed requests
- [ ] Add interactive_authorization_endpoint to Authorization Server metadata
- [ ] Add require_interactive_authorization_request to Authorization Server metadata
- [ ] Update PKCE handling for redirect_to_web flow
- [ ] Support auth_session response after redirect_to_web completion
- [ ] Update SessionTranscript structure for mso_mdoc (if within scope)
- [ ] Verify client authentication rules match PAR requirements
- [ ] Update all tests to match new IAE naming and protocol
- [ ] Update documentation and examples

### Out of Scope

- Format-specific IAE binding implementation (JWT-VC, LDP-VC, SD-JWT-VC, mso_mdoc) — Library doesn't handle credential format specifics; implementers handle this
- Backward compatibility with IAR naming — Clean break, no aliases or deprecation warnings
- OpenID4VP library changes — Handled in separate package
- Browser/platform-specific redirect_to_web implementation details — Application responsibility

## Context

**Existing Implementation:**
- IAE foundation exists as "interactive-authorization" in packages/oauth2/src/
- Uses older IAR terminology from previous draft
- Integration with OpenID4VP for presentation flow already working
- Callback-based architecture allows environment-agnostic implementation

**Specification Changes:**
- 10 patches (-4 through 4) from OpenID4VCI working group located in iae_changes/
- Changes include naming, response modes, binding mechanisms, metadata
- Most significant: IAR → IAE rename affects entire protocol surface
- New parameters for security (expected_url, PKCE clarifications)
- Improved binding for Session Fixation attack prevention

**Technical Environment:**
- TypeScript monorepo with packages: oauth2, openid4vci, openid4vp, utils
- Zod for runtime schema validation
- Specification-driven architecture with clear separation of concerns
- Class-based Client/Server abstractions with lower-level function utilities

**Known Dependencies:**
- Changes affect oauth2 package primarily
- openid4vci package references interactive_authorization_endpoint metadata
- openid4vp integration for openid4vp_presentation interaction type
- Tests exist at packages/oauth2/tests/interactive-authorization.test.mts

## Constraints

- **Breaking Changes Allowed**: Since IAE hasn't been released yet, breaking changes are acceptable for this feature
- **Non-Breaking for Other Features**: Changes must not break other parts of the codebase (authorization code flow, token endpoint, etc.)
- **Specification Compliance**: Must match OpenID4VCI 1.1 draft exactly (patches -4 through 4)
- **Architecture Consistency**: Follow existing patterns (Zod schemas, callback interfaces, function trios, error classes)
- **Test Coverage**: Update all existing tests to match new protocol; add tests for new features
- **No Format-Specific Logic**: Library doesn't handle credential format binding details (implementers' responsibility)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full IAR → IAE rename | Specification changed naming; maintain consistency with spec terminology | — Pending |
| Clean break (no backward compatibility) | Feature not released yet; no users to migrate | — Pending |
| Exclude format-specific binding | Library architecture doesn't handle credential format internals | — Pending |
| Update tests after implementation | Allows focused implementation without test maintenance overhead | — Pending |
| Process all 10 patches together | Comprehensive update prevents partial compliance issues | — Pending |

---
*Last updated: 2026-01-29 after initialization*
