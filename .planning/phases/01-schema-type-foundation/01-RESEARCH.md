# Phase 1: Schema & Type Foundation - Research

**Researched:** 2026-01-29
**Domain:** TypeScript schema refactoring, Zod validation patterns, naming migrations
**Confidence:** HIGH

## Summary

This phase involves a comprehensive rename and schema update from IAR (Interactive Authorization Request) to IAE (Interactive Authorization Endpoint) across TypeScript types, Zod schemas, file names, and protocol constants. The work is pure refactoring with protocol updates - no new functionality, but significant surface area across 5 TypeScript files, 1 metadata schema, and numerous exported symbols.

The standard approach for this type of refactoring in TypeScript projects is systematic: schemas first (establishing validation rules), then types (derived from schemas via Zod inference), then constants (protocol identifiers), and finally exports (public API surface). This ordering prevents cascading type errors and ensures validation logic is correct before implementation changes.

**Key technical considerations:**
- Zod 4.3.5 is in use (current version with improved performance and schema composition)
- TypeScript 5.9.3 with strict mode enables confident refactoring with type safety
- Conditional validation needed for `expected_url` (required for signed, ignored for unsigned)
- Metadata schema requires refinement to enforce `require_interactive_authorization_request` presence rules

**Primary recommendation:** Use Zod's `.superRefine()` for conditional validation of `expected_url`, leverage destructuring for schema extension (not `.extend()`), and perform changes in strict dependency order to catch breaking changes immediately.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.3.5 | Runtime schema validation with TypeScript inference | De facto standard for TypeScript schema validation; 14x faster in v4, excellent TypeScript integration |
| TypeScript | 5.9.3 | Type system and compilation | Current stable version with improved refactoring support and strict mode |
| tsdown | 0.19.0 | Build tool for TypeScript libraries | Already in use; handles ESM output with type definitions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Biome | 2.3.11 | Linting and formatting | Already configured; use for enforcing file naming conventions |
| Vitest | 4.0.17 | Testing framework | For validating schema changes don't break tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod v4 | Zod v3 | v3 is 14x slower, has `.merge()` deprecation issues, no `.superRefine()` improvements |
| Manual validation | Runtime type guards | Less maintainable, no automatic TypeScript inference, more error-prone |
| `.extend()` | Destructuring | `.extend()` has better TS performance per Zod v4 docs, but both valid |

**Installation:**
No new dependencies needed - all tools already in project.

## Architecture Patterns

### Recommended Project Structure
Current structure is sound and should be preserved:
```
packages/oauth2/src/interactive-authorization/
├── z-interactive-authorization.ts          # Schemas FIRST
├── create-interactive-authorization-response.ts
├── parse-interactive-authorization-request.ts
├── send-interactive-authorization-request.ts
└── verify-interactive-authorization-request.ts
```

### Pattern 1: Schema-First Type Definition
**What:** Define Zod schemas first, derive TypeScript types via inference
**When to use:** All schema/type updates in this phase
**Example:**
```typescript
// Source: Existing codebase pattern + Zod v4 best practices
// https://zod.dev/api

// 1. Define schema with validation rules
export const zInteractiveAuthorizationEndpointRequest = z
  .object({
    interaction_types_supported: z.string(),
    response_type: z.literal('code').default('code'),
    // ... other fields
  })
  .loose()

// 2. Infer TypeScript type
export type InteractiveAuthorizationEndpointRequest =
  z.input<typeof zInteractiveAuthorizationEndpointRequest>

// NOT: Define TypeScript type first, then try to match with Zod
```

### Pattern 2: Conditional Validation with superRefine
**What:** Use `.superRefine()` for cross-field validation logic
**When to use:** When validation of one field depends on another (e.g., `expected_url`)
**Example:**
```typescript
// Source: Zod v4 patterns + PROT-05, PROT-06 requirements
// https://github.com/colinhacks/zod/discussions/938

export const zOpenid4vpRequest = z
  .object({
    request: z.optional(z.string()), // Signed JWT
    client_id: z.optional(z.string()),
    expected_url: z.optional(z.string()), // For signed requests
    // ... other fields
  })
  .loose()
  .superRefine((data, ctx) => {
    // PROT-05: expected_url REQUIRED for signed requests
    if (data.request && !data.expected_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'expected_url is required when request JWT is present',
        path: ['expected_url'],
      })
    }
    // PROT-06: expected_url IGNORED for unsigned requests
    // (no validation needed - just document behavior)
  })
```

### Pattern 3: Metadata Schema Refinement
**What:** Use `.refine()` for schema-level business rules
**When to use:** Enforcing cross-field constraints at schema level (META-03)
**Example:**
```typescript
// Source: Existing pattern in z-authorization-server-metadata.ts
export const zAuthorizationServerMetadata = z
  .object({
    interactive_authorization_endpoint: z.optional(zHttpsUrl),
    require_interactive_authorization_request: z.optional(z.boolean()),
    // ... other fields
  })
  .loose()
  .refine(
    ({ interactive_authorization_endpoint, require_interactive_authorization_request }) => {
      // META-03: require_interactive_authorization_request must not be present
      // if interactive_authorization_endpoint is omitted
      if (!interactive_authorization_endpoint && require_interactive_authorization_request !== undefined) {
        return false
      }
      return true
    },
    {
      message: 'require_interactive_authorization_request must not be present when interactive_authorization_endpoint is omitted',
    }
  )
```

### Pattern 4: File Naming Migration
**What:** Rename files systematically, let IDE update imports
**When to use:** NAME-02 requirement (all file renames)
**Example:**
```bash
# Use git mv to preserve history
git mv interactive-authorization/z-interactive-authorization.ts \
       interactive-authorization-endpoint/z-interactive-authorization-endpoint.ts

# Modern IDEs (VS Code, WebStorm) automatically update imports
# Set in VS Code: "typescript.updateImportsOnFileMove.enabled": "always"
```

### Anti-Patterns to Avoid
- **Don't use `.merge()` in Zod v4:** Deprecated in favor of `.extend()` or destructuring. Causes TS performance issues and ambiguity around strictness inheritance.
- **Don't use type assertions (`as`) instead of annotations (`: Type`):** Prevents detecting refactoring bugs when schema shapes change.
- **Don't rename types without renaming schemas:** Creates confusion when `zInteractiveAuthorizationRequest` produces `InteractiveAuthorizationEndpointRequest`.
- **Don't commit partial renames:** Leads to inconsistent codebase. Make atomic commits per requirement category (NAME-*, PROT-*, META-*).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conditional field validation | Custom validation functions | Zod `.superRefine()` | Integrates with Zod error handling, maintains type inference, standard pattern |
| Cross-field schema constraints | Manual checks in implementation | Zod `.refine()` | Validates at parse time, prevents invalid states from existing, better error messages |
| TypeScript type generation | Manual type definitions | Zod `z.infer<>` and `z.input<>` | Guaranteed sync between runtime validation and types, automatic updates |
| File renaming | Manual find-replace | IDE rename refactoring (F2 in VS Code) | Updates all imports automatically, less error-prone, preserves git history with `git mv` |
| Import path updates | Regex search-replace | TypeScript Language Service | Catches all references including dynamic ones, updates exports automatically |

**Key insight:** Schema validation libraries like Zod exist specifically because hand-rolled validation is error-prone, difficult to maintain, and loses TypeScript integration. The `.superRefine()` and `.refine()` methods handle complex conditional logic better than custom code.

## Common Pitfalls

### Pitfall 1: Breaking Type Inference with Incorrect Schema Order
**What goes wrong:** Changing schema names before updating dependent schemas causes TypeScript errors that cascade through the codebase.
**Why it happens:** Zod schemas are used for both runtime validation and type inference. Downstream code depends on both the schema object and the inferred type.
**How to avoid:**
1. Update schemas in dependency order (leaf schemas first, composition last)
2. Update inferred type exports immediately after schema rename
3. Use TypeScript's "Go to References" (Shift+F12) to find all usages before renaming
**Warning signs:**
- Build fails with "Cannot find name" errors
- Tests fail with schema validation errors that weren't there before
- IDE shows red squiggles in files you didn't modify

### Pitfall 2: Forgetting `.loose()` After Schema Modifications
**What goes wrong:** Schemas become strict, rejecting valid requests with additional properties that were previously allowed.
**Why it happens:** OAuth2/OIDC protocols allow extension parameters. Removing `.loose()` breaks extensibility.
**How to avoid:**
- Always preserve `.loose()` modifier on protocol schemas
- Document WHY it's needed (extension parameters)
- Add test case with unknown property to catch regression
**Warning signs:**
- Integration tests fail with "unrecognized keys" errors
- Schemas reject requests that worked before
- Validation errors mention "unexpected properties"

### Pitfall 3: Silent Validation Changes from `.refine()` Mistakes
**What goes wrong:** Schema refinements have logic errors that allow invalid data or reject valid data.
**Why it happens:** `.refine()` and `.superRefine()` run AFTER base schema validation, so bugs in conditional logic aren't caught by type system.
**How to avoid:**
- Write explicit test cases for each refinement rule
- Test both positive (should pass) and negative (should fail) cases
- Use descriptive error messages in refinements to aid debugging
**Warning signs:**
- Metadata validates when it shouldn't (or vice versa)
- `expected_url` validation doesn't trigger when expected
- No clear error message when validation fails

### Pitfall 4: Export Name Mismatches After Rename
**What goes wrong:** Public API breaks because exports use old names even though underlying types were renamed.
**Why it happens:** `index.ts` exports are manually maintained and easy to miss during rename.
**How to avoid:**
- Update `src/index.ts` exports atomically with type renames
- Use IDE "Find References" on exported names before renaming
- Check `packages/oauth2/package.json` publishConfig to ensure exports are correct
- Run build (`pnpm build`) to catch missing exports
**Warning signs:**
- Build succeeds but dependent packages fail
- "Cannot find name" errors in other packages
- Type exports work in IDE but fail at runtime

### Pitfall 5: Metadata Validation Breaking with Partial Updates
**What goes wrong:** Adding new metadata fields without updating refinement logic creates inconsistent validation states.
**Why it happens:** Metadata schema has complex refinement that checks multiple fields. Adding fields requires updating refinement conditions.
**How to avoid:**
- Read entire refinement function when adding metadata fields
- Check if new field affects any existing refinement conditions
- Add test case for new field with all combinations of related fields
- Document relationships between fields in comments
**Warning signs:**
- Metadata with `require_interactive_authorization_request` but no endpoint validates successfully
- Refinement error messages don't mention new fields
- Unclear which combination of fields is valid

### Pitfall 6: Protocol Constant Typos (Underscore vs Hyphen)
**What goes wrong:** Response mode constants use wrong separator (`iae-post` vs `iae_post`), breaking protocol compliance.
**Why it happens:** OAuth2 protocols mix hyphens and underscores. Easy to use wrong one.
**How to avoid:**
- Double-check spec patches in `iae_changes/` for exact string values
- Use constants instead of string literals to prevent typos
- Add runtime validation test that checks exact protocol string values
**Warning signs:**
- Protocol examples in spec don't match code constants
- Validation rejects values that should be valid
- String literal searches find inconsistent values

## Code Examples

Verified patterns from official sources:

### Renaming Zod Schema with Type Update
```typescript
// Source: Existing codebase + Zod v4 patterns
// Before (IAR):
export const zInteractiveAuthorizationRequest = z.object({ /* ... */ })
export type InteractiveAuthorizationRequest =
  z.input<typeof zInteractiveAuthorizationRequest>

// After (IAE):
export const zInteractiveAuthorizationEndpointRequest = z.object({ /* ... */ })
export type InteractiveAuthorizationEndpointRequest =
  z.input<typeof zInteractiveAuthorizationEndpointRequest>
```

### Updating Protocol Constants
```typescript
// Source: PROT-01, PROT-02 requirements from REQUIREMENTS.md
// Before:
const RESPONSE_MODE_IAR_POST = 'iar-post'
const RESPONSE_MODE_IAR_POST_JWT = 'iar-post.jwt'

// After:
const RESPONSE_MODE_IAE_POST = 'iae_post'  // Note: underscore not hyphen
const RESPONSE_MODE_IAE_POST_JWT = 'iae_post.jwt'
```

### Updating Audience Prefix
```typescript
// Source: PROT-03 requirement
// Before:
const audiencePrefix = 'iar:'

// After:
const audiencePrefix = 'iae:'

// Usage in JWT payload:
const payload = {
  aud: `${audiencePrefix}${followUpRequestUrl}`,
  // ...
}
```

### Conditional Validation for expected_url
```typescript
// Source: PROT-05, PROT-06 requirements + Zod conditional validation patterns
// https://github.com/colinhacks/zod/discussions/938
export const zOpenid4vpRequest = z
  .object({
    request: z.optional(z.string()),
    client_id: z.optional(z.string()),
    expected_url: z.optional(z.string()),
    response_type: z.optional(z.string()),
    response_mode: z.optional(z.string()),
    nonce: z.optional(z.string()),
    // ... other OpenID4VP fields
  })
  .loose()
  .superRefine((data, ctx) => {
    // PROT-05: expected_url parameter added for signed requests with validation
    if (data.request && !data.expected_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'expected_url is required for signed OpenID4VP requests',
        path: ['expected_url'],
      })
    }
    // PROT-06: expected_url ignored in unsigned requests (no validation needed)
    // Implementation will simply not process it if request JWT is absent
  })
```

### Metadata Schema with Refinement
```typescript
// Source: Existing pattern in z-authorization-server-metadata.ts + META-03
export const zAuthorizationServerMetadata = z
  .object({
    issuer: zHttpsUrl,
    token_endpoint: zHttpsUrl,
    // ... existing fields

    // META-01: interactive_authorization_endpoint added
    interactive_authorization_endpoint: z.optional(zHttpsUrl),

    // META-02: require_interactive_authorization_request boolean added
    require_interactive_authorization_request: z.optional(z.boolean()),
  })
  .loose()
  .refine(
    ({ interactive_authorization_endpoint, require_interactive_authorization_request }) => {
      // META-03: require_interactive_authorization_request validation
      // Must not be present if endpoint omitted
      if (!interactive_authorization_endpoint && require_interactive_authorization_request !== undefined) {
        return false
      }
      return true
    },
    {
      message: "Metadata 'require_interactive_authorization_request' must not be present when 'interactive_authorization_endpoint' is omitted",
    }
  )
  // Existing introspection endpoint refinement preserved below...
```

### IDE-Assisted File Rename
```bash
# Source: Best practices from VS Code TypeScript refactoring
# https://code.visualstudio.com/docs/typescript/typescript-refactoring

# 1. Use git mv to preserve history
git mv packages/oauth2/src/interactive-authorization/z-interactive-authorization.ts \
       packages/oauth2/src/interactive-authorization/z-interactive-authorization-endpoint.ts

# 2. VS Code automatically updates imports when file is moved
# Configure in settings.json:
# "typescript.updateImportsOnFileMove.enabled": "always"

# 3. Verify import updates
git diff packages/oauth2/src/
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod v3 `.merge()` | Zod v4 destructuring or `.extend()` | Zod 4.0 (2025) | Better TypeScript performance, clearer strictness semantics |
| Manual error flattening | `z.flattenError()` / `z.treeifyError()` | Zod 4.0 (2025) | Explicit error formatting methods |
| Type-first validation | Schema-first with inference | Zod adoption (2021+) | Runtime safety matches compile-time types |
| String literals in protocols | Constants with enum types | TypeScript 3.4+ (2019) | Prevents typos, enables refactoring |
| Manual import updates | IDE-assisted refactoring | TypeScript Language Service maturity | Faster, more reliable renames |

**Deprecated/outdated:**
- **Zod `.merge()`:** Deprecated in v4, use `.extend()` or destructuring
- **IAR naming:** Specification changed to IAE in OpenID4VCI 1.1
- **`iar-post` response mode:** Changed to `iae_post` (underscore)
- **`expected_origins` parameter:** Replaced with `expected_url` for better security

## Open Questions

Things that couldn't be fully resolved:

1. **Should folder be renamed from `interactive-authorization` to `interactive-authorization-endpoint`?**
   - What we know: NAME-02 requires "all file names rename"; folder is technically a "file name" in file system
   - What's unclear: Whether folder rename is worth the churn (affects imports across codebase)
   - Recommendation: Keep folder as `interactive-authorization` for now (shorter import paths), only rename files. Revisit if spec consistently uses full "Interactive Authorization Endpoint" term. Document decision in commit message.

2. **Do we need migration guide for external consumers?**
   - What we know: PROJECT.md states "Feature not released yet; no users to migrate"
   - What's unclear: Whether any internal testing or preview deployments exist
   - Recommendation: Assume no external consumers per PROJECT.md constraint. If preview exists, add breaking change note to CHANGELOG.

3. **Should response mode constants be validated as enums?**
   - What we know: Spec defines `iae_post` and `iae_post.jwt` as standard values
   - What's unclear: Whether custom response modes are allowed (spec doesn't explicitly forbid)
   - Recommendation: Use string type with validation, not enum. Allows future extension. Document standard values in JSDoc.

## Sources

### Primary (HIGH confidence)
- Zod v4 documentation - https://zod.dev/api (schema validation patterns)
- Zod v4 migration guide - https://zod.dev/v4/changelog (breaking changes from v3)
- TypeScript Handbook - https://www.typescriptlang.org/docs/handbook/ (type system)
- Existing codebase patterns - `/packages/oauth2/src/` (established project conventions)
- Requirements document - `.planning/REQUIREMENTS.md` (authoritative requirements)
- Specification patches - `iae_changes/*.patch` (protocol changes)

### Secondary (MEDIUM confidence)
- [VS Code TypeScript Refactoring](https://code.visualstudio.com/docs/typescript/typescript-refactoring) - IDE refactoring capabilities (2026)
- [Zod GitHub Discussions #938](https://github.com/colinhacks/zod/discussions/938) - Conditional validation patterns
- [Zod GitHub Discussions #3268](https://github.com/colinhacks/zod/discussions/3268) - Cross-field validation with `.superRefine()`
- [Lessons from Upgrading to Zod 4](https://www.viget.com/articles/lessons-learned-upgrading-a-large-typescript-application-from-zod-3-to-4) - Real-world migration experience
- [TypeScript Breaking Changes](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes) - Historical breaking changes documentation

### Tertiary (LOW confidence)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) - General best practices (not project-specific)
- Community articles on Zod validation - Various patterns, not all verified for v4

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zod 4.3.5 and TypeScript 5.9.3 versions confirmed in package.json and pnpm-lock.yaml
- Architecture: HIGH - Patterns verified in existing codebase, Zod v4 official docs consulted
- Pitfalls: HIGH - Based on Zod v4 migration issues, TypeScript refactoring gotchas, and codebase structure analysis

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable domain, Zod 4.x and TypeScript 5.x are current)

**Notes:**
- No Context7 queries needed - domain is well-established TypeScript/Zod patterns
- Specification changes are documented in project (iae_changes/ directory)
- All findings verified against current project dependencies
