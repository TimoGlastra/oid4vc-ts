import { encodeToBase64Url } from '@openid4vc/utils'
import type { CallbackContext } from '../callbacks.js'
import type {
  InteractiveAuthorizationEndpointCodeResponse,
  InteractiveAuthorizationEndpointErrorResponse,
  InteractiveAuthorizationEndpointInteractionRequiredResponse,
  Openid4vpRequest,
} from './z-interactive-authorization.js'

/**
 * Generate a cryptographically secure auth_session value.
 * Per SESS-01, auth_session must be distinct for each response.
 *
 * @param callbacks - Callback context with generateRandom
 * @returns Base64URL-encoded random string suitable for auth_session
 *
 * @example
 * ```ts
 * const authSession = await generateAuthSession(callbacks)
 * // Returns: 'n-0S6_WzA2Mj...' (256-bit random value, base64url-encoded)
 * ```
 */
export async function generateAuthSession(callbacks: Pick<CallbackContext, 'generateRandom'>): Promise<string> {
  const random = await callbacks.generateRandom(32) // 256 bits
  return encodeToBase64Url(random)
}

export interface CreateInteractiveAuthorizationEndpointCodeResponseOptions {
  /**
   * The authorization code to return
   */
  authorizationCode: string

  /**
   * Optional additional fields to include in the response
   */
  additionalPayload?: Record<string, unknown>
}

/**
 * Create a successful Interactive Authorization Code Response
 *
 * This response indicates that the authorization process is complete
 * and returns an authorization code that can be exchanged for an access token.
 *
 * @param options - Response options
 * @returns The authorization code response
 *
 * @example
 * ```ts
 * const response = createInteractiveAuthorizationEndpointCodeResponse({
 *   authorizationCode: 'SplxlOBeZQQYbYS6WxSbIA'
 * })
 * ```
 */
export function createInteractiveAuthorizationEndpointCodeResponse(
  options: CreateInteractiveAuthorizationEndpointCodeResponseOptions
): InteractiveAuthorizationEndpointCodeResponse {
  return {
    status: 'ok',
    code: options.authorizationCode,
    ...options.additionalPayload,
  }
}

export interface CreateInteractiveAuthorizationEndpointOpenid4vpInteractionOptions {
  /**
   * Session identifier for subsequent requests
   * Per SESS-01, auth_session must be distinct for each response
   */
  authSession: string

  /**
   * The OpenID4VP Authorization Request to embed in the response
   * Can be either a signed request (with 'request' JWT) or unsigned request with inline parameters
   *
   * Per VP-01, response_mode MUST be 'iae_post' or 'iae_post.jwt' for IAE OpenID4VP requests
   */
  openid4vpRequest: Openid4vpRequest

  /**
   * Optional nonce to include in the OpenID4VP request for session binding
   *
   * Server should store this nonce with auth_session for later verification (SESS-02):
   * - When wallet responds with VP, server validates nonce matches stored value
   * - This binds the VP presentation to the specific auth_session (SESS-03)
   *
   * Note: Nonce-to-auth_session binding storage is implementation-specific
   * and outside the scope of this library.
   */
  nonce?: string

  /**
   * Optional additional fields to include in the response
   */
  additionalPayload?: Record<string, unknown>
}

/**
 * Create an Interactive Authorization Interaction Required Response
 * requesting an OpenID4VP presentation
 *
 * This response indicates that the wallet must present credentials
 * via OpenID4VP before authorization can be granted.
 *
 * Requirements:
 * - SESS-01: auth_session must be distinct for each response
 * - SESS-02, SESS-03: Server must bind nonce to auth_session for verification
 * - VP-01: response_mode must be 'iae_post' or 'iae_post.jwt'
 *
 * Note: Nonce-to-auth_session binding storage is implementation-specific and
 * outside the scope of this library. The server should:
 * 1. Generate auth_session and nonce
 * 2. Store binding: { auth_session -> { nonce, ... } }
 * 3. When wallet responds, verify nonce matches stored value
 *
 * @param options - Response options
 * @returns The interaction required response
 *
 * @example With unsigned request and nonce binding
 * ```ts
 * const response = createInteractiveAuthorizationEndpointOpenid4vpInteraction({
 *   authSession: 'session-123',
 *   nonce: 'n-0S6_WzA2Mj',
 *   openid4vpRequest: {
 *     response_type: 'vp_token',
 *     response_mode: 'iae_post',
 *     nonce: 'n-0S6_WzA2Mj', // Same nonce for binding
 *     dcql_query: { ... }
 *   }
 * })
 * // Server stores: sessions['session-123'] = { nonce: 'n-0S6_WzA2Mj', ... }
 * ```
 *
 * @example With signed request
 * ```ts
 * const response = createInteractiveAuthorizationEndpointOpenid4vpInteraction({
 *   authSession: 'session-123',
 *   openid4vpRequest: {
 *     request: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...'
 *   }
 * })
 * ```
 */
export function createInteractiveAuthorizationEndpointOpenid4vpInteraction(
  options: CreateInteractiveAuthorizationEndpointOpenid4vpInteractionOptions
): InteractiveAuthorizationEndpointInteractionRequiredResponse {
  // VP-01: response_mode in OpenID4VP request must be iae_post or iae_post.jwt
  const allowedResponseModes = ['iae_post', 'iae_post.jwt']
  const responseMode = (options.openid4vpRequest as Record<string, unknown>).response_mode
  if (responseMode && typeof responseMode === 'string' && !allowedResponseModes.includes(responseMode)) {
    throw new Error(`response_mode must be one of: ${allowedResponseModes.join(', ')}`)
  }

  // Build the OpenID4VP request with optional nonce
  const openid4vpRequest = options.nonce
    ? { ...options.openid4vpRequest, nonce: options.nonce }
    : options.openid4vpRequest

  return {
    status: 'require_interaction',
    type: 'openid4vp_presentation',
    auth_session: options.authSession,
    openid4vp_request: openid4vpRequest,
    ...options.additionalPayload,
  }
}

/**
 * Options for creating a redirect_to_web interaction response.
 *
 * FLOW-01: Authorization Server can return auth_session in redirect response (not just code).
 * This allows for additional interactions after the redirect completes.
 *
 * FLOW-02: When redirect response includes auth_session instead of code,
 * wallet makes follow-up request with auth_session to continue the flow.
 */
export interface CreateInteractiveAuthorizationEndpointRedirectToWebInteractionOptions {
  /**
   * Session identifier for subsequent requests
   * Per SESS-01, auth_session must be distinct for each response
   */
  authSession: string

  /**
   * The request URI for the PAR request
   * The wallet will use this to build an authorization request
   */
  requestUri: string

  /**
   * If true, the redirect response will include auth_session parameter
   * for the wallet to use in follow-up request (FLOW-01).
   * If false/omitted, redirect will include authorization code directly.
   */
  returnAuthSessionInRedirect?: boolean

  /**
   * Optional expiration time in seconds for the request URI
   */
  expiresIn?: number

  /**
   * Optional additional fields to include in the response
   */
  additionalPayload?: Record<string, unknown>
}

/**
 * Create an Interactive Authorization Interaction Required Response
 * requesting a redirect to web
 *
 * This response indicates that the authorization process must continue
 * via interactions with the user in a web browser.
 *
 * Requirements:
 * - SESS-01: auth_session must be distinct for each response
 * - FLOW-01: Server can return auth_session in redirect response for follow-up
 * - FLOW-02: Wallet uses returned auth_session in follow-up request
 *
 * @param options - Response options
 * @returns The interaction required response
 *
 * @example Standard redirect with authorization code in redirect
 * ```ts
 * const response = createInteractiveAuthorizationEndpointRedirectToWebInteraction({
 *   authSession: 'session-123',
 *   requestUri: 'urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c',
 *   expiresIn: 60
 * })
 * // Wallet redirects user, after completion redirect returns authorization code directly
 * ```
 *
 * @example Redirect with auth_session for follow-up (FLOW-01, FLOW-02)
 * ```ts
 * const response = createInteractiveAuthorizationEndpointRedirectToWebInteraction({
 *   authSession: 'session-123',
 *   requestUri: 'urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c',
 *   returnAuthSessionInRedirect: true,
 *   expiresIn: 60
 * })
 * // Wallet redirects user, after completion redirect returns auth_session instead of code
 * // Wallet makes follow-up IAE request with auth_session
 * ```
 */
export function createInteractiveAuthorizationEndpointRedirectToWebInteraction(
  options: CreateInteractiveAuthorizationEndpointRedirectToWebInteractionOptions
): InteractiveAuthorizationEndpointInteractionRequiredResponse {
  return {
    status: 'require_interaction',
    type: 'redirect_to_web',
    auth_session: options.authSession,
    request_uri: options.requestUri,
    return_auth_session_in_redirect: options.returnAuthSessionInRedirect,
    expires_in: options.expiresIn,
    ...options.additionalPayload,
  }
}

export interface CreateInteractiveAuthorizationEndpointErrorResponseOptions {
  /**
   * The error code
   *
   * Error codes are consistent with RFC 9126 PAR errors (ERR-01):
   * - invalid_request: Malformed request, missing required parameters
   * - invalid_client: Client authentication failed
   * - unauthorized_client: Client not authorized for IAE
   * - invalid_scope: Scope not supported
   *
   * IAE-specific error codes (ERR-02):
   * - missing_interaction_type: No supported interaction type in request
   *   (used when wallet's interaction_types_supported doesn't include any type the server requires)
   */
  error: 'invalid_request' | 'invalid_client' | 'unauthorized_client' | 'invalid_scope' | 'missing_interaction_type'

  /**
   * Optional human-readable error description
   */
  errorDescription?: string

  /**
   * Optional URI for more information about the error
   */
  errorUri?: string

  /**
   * Optional additional fields to include in the response
   */
  additionalPayload?: Record<string, unknown>
}

/**
 * Create an Interactive Authorization Error Response
 *
 * This response indicates that an error occurred during the authorization process.
 *
 * Error codes are consistent with RFC 9126 PAR errors (ERR-01):
 * - invalid_request: Malformed request, missing required parameters
 * - invalid_client: Client authentication failed
 * - unauthorized_client: Client not authorized for IAE
 * - invalid_scope: Scope not supported
 *
 * IAE-specific error codes (ERR-02):
 * - missing_interaction_type: No supported interaction type in request
 *
 * @param options - Error response options
 * @returns The error response
 *
 * @example Standard OAuth2 error
 * ```ts
 * const response = createInteractiveAuthorizationEndpointErrorResponse({
 *   error: 'invalid_request',
 *   errorDescription: 'Missing required parameter: interaction_types_supported'
 * })
 * ```
 *
 * @example IAE-specific error (ERR-02)
 * ```ts
 * const response = createInteractiveAuthorizationEndpointErrorResponse({
 *   error: 'missing_interaction_type',
 *   errorDescription: 'interaction_types_supported is missing openid4vp_presentation'
 * })
 * ```
 */
export function createInteractiveAuthorizationEndpointErrorResponse(
  options: CreateInteractiveAuthorizationEndpointErrorResponseOptions
): InteractiveAuthorizationEndpointErrorResponse {
  return {
    error: options.error,
    error_description: options.errorDescription,
    error_uri: options.errorUri,
    ...options.additionalPayload,
  }
}
