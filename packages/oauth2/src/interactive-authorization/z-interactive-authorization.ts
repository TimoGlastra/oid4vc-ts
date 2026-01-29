import { zInteger } from '@openid4vc/utils'
import { z } from 'zod'
import { zAuthorizationRequest } from '../authorization-request/z-authorization-request.js'
import { zOauth2ErrorResponse } from '../common/z-oauth2-error.js'

/**
 * Response mode for IAE - direct POST response
 * Per OpenID4VCI 1.1 spec, uses underscore (not hyphen)
 */
export const RESPONSE_MODE_IAE_POST = 'iae_post'

/**
 * Response mode for IAE - JWT-encrypted POST response
 */
export const RESPONSE_MODE_IAE_POST_JWT = 'iae_post.jwt'

/**
 * Audience prefix for IAE binding
 * Used in JWT `aud` claim for credential binding
 */
export const IAE_AUDIENCE_PREFIX = 'iae:'

/**
 * Schema for Interactive Authorization Endpoint (initial request)
 *
 * Based on OpenID4VCI 1.1 Interactive Authorization Endpoint
 * Similar to PAR request but sent to interactive_authorization_endpoint
 */
export const zInteractiveAuthorizationEndpointRequest = z
  .object({
    // All authorization request params except response_type (always 'code' for IAE)
    ...zAuthorizationRequest.omit({ response_type: true }).shape,

    // REQUIRED: Comma-separated list of interaction types the Wallet supports
    interaction_types_supported: z.string(),

    // response_type is always 'code' for interactive authorization
    response_type: z.literal('code').default('code'),
  })
  .loose()

/**
 * Schema for Follow-up Interactive Authorization Endpoint Request
 *
 * Follow-up requests include auth_session and interaction-specific parameters
 */
export const zInteractiveAuthorizationEndpointFollowUpRequest = z
  .object({
    // REQUIRED in follow-up requests
    auth_session: z.string(),

    // OPTIONAL: OpenID4VP Authorization Response (JSON-encoded object)
    // Present when responding to openid4vp_presentation interaction
    openid4vp_response: z.optional(z.string()),

    // OPTIONAL: PKCE code verifier
    // Present when following up after redirect_to_web with PKCE
    code_verifier: z.optional(z.string()),
  })
  .loose()

/**
 * Schema for Interactive Authorization Endpoint Response - Status
 */
export const zInteractiveAuthorizationEndpointResponseStatus = z.enum([
  'require_interaction', // Additional interaction required
  'ok', // Authorization completed successfully
])

/**
 * Schema for Interactive Authorization Endpoint Response - Interaction Type
 */
export const zInteractiveAuthorizationEndpointInteractionType = z.enum([
  'openid4vp_presentation', // Request OpenID4VP presentation
  'redirect_to_web', // Redirect to web browser
  // Custom interaction types can be added by extensions
])

/**
 * Schema for OpenID4VP Request embedded in IAE response
 *
 * The OpenID4VP library handles the complete request structure.
 * This schema only defines the minimal fields needed for the IAE response.
 */
export const zOpenid4vpRequest = z
  .object({
    // JWT containing the request (signed or unsigned)
    request: z.optional(z.string()),

    // Client identifier
    client_id: z.optional(z.string()),
  })
  .loose()

/**
 * Schema for Interaction Required Response
 *
 * Returned when the Authorization Server requires additional user interaction
 */
export const zInteractiveAuthorizationEndpointInteractionRequiredResponse = z
  .object({
    // Status indicating interaction is required
    status: z.literal('require_interaction'),

    // REQUIRED: Type of interaction required
    type: zInteractiveAuthorizationEndpointInteractionType,

    // REQUIRED: Session identifier for subsequent requests
    auth_session: z.string(),

    // For type='openid4vp_presentation': OpenID4VP Authorization Request
    openid4vp_request: z.optional(zOpenid4vpRequest),

    // For type='redirect_to_web': Request URI for PAR
    request_uri: z.optional(z.string()),
    expires_in: z.optional(zInteger),
  })
  .loose()

/**
 * Schema for Authorization Code Response
 *
 * Returned when authorization is successfully completed
 */
export const zInteractiveAuthorizationEndpointCodeResponse = z
  .object({
    // Status indicating success
    status: z.literal('ok'),

    // REQUIRED: Authorization code
    code: z.string(),
  })
  .loose()

/**
 * Schema for Interactive Authorization Endpoint Error Response
 *
 * Based on RFC 9126 (PAR) error response with additional error codes
 */
export const zInteractiveAuthorizationEndpointErrorResponse = zOauth2ErrorResponse
  .extend({
    // No additional fields beyond standard OAuth2 error response
  })
  .loose()

/**
 * Union type for all possible Interactive Authorization Endpoint Responses
 */
export const zInteractiveAuthorizationEndpointResponse = z.union([
  zInteractiveAuthorizationEndpointInteractionRequiredResponse,
  zInteractiveAuthorizationEndpointCodeResponse,
  zInteractiveAuthorizationEndpointErrorResponse,
])

/**
 * Type exports
 */
export type InteractiveAuthorizationEndpointRequest = z.input<typeof zInteractiveAuthorizationEndpointRequest>
export type InteractiveAuthorizationEndpointFollowUpRequest = z.input<typeof zInteractiveAuthorizationEndpointFollowUpRequest>
export type InteractiveAuthorizationEndpointResponseStatus = z.infer<typeof zInteractiveAuthorizationEndpointResponseStatus>
export type InteractiveAuthorizationEndpointInteractionType = z.infer<typeof zInteractiveAuthorizationEndpointInteractionType>
export type Openid4vpRequest = z.infer<typeof zOpenid4vpRequest>
export type InteractiveAuthorizationEndpointInteractionRequiredResponse = z.infer<
  typeof zInteractiveAuthorizationEndpointInteractionRequiredResponse
>
export type InteractiveAuthorizationEndpointCodeResponse = z.infer<typeof zInteractiveAuthorizationEndpointCodeResponse>
export type InteractiveAuthorizationEndpointErrorResponse = z.infer<typeof zInteractiveAuthorizationEndpointErrorResponse>
export type InteractiveAuthorizationEndpointResponse = z.infer<typeof zInteractiveAuthorizationEndpointResponse>

/**
 * Error code for missing interaction type
 */
export const InteractiveAuthorizationEndpointErrorCodes = {
  MissingInteractionType: 'missing_interaction_type',
} as const
