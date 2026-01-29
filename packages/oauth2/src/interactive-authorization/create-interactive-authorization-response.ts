import type {
  InteractiveAuthorizationEndpointCodeResponse,
  InteractiveAuthorizationEndpointErrorResponse,
  InteractiveAuthorizationEndpointInteractionRequiredResponse,
  Openid4vpRequest,
} from './z-interactive-authorization.js'

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
   */
  authSession: string

  /**
   * The OpenID4VP Authorization Request to embed in the response
   * Can be either a signed request (with 'request' JWT) or unsigned request with inline parameters
   */
  openid4vpRequest: Openid4vpRequest

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
 * @param options - Response options
 * @returns The interaction required response
 *
 * @example With unsigned request
 * ```ts
 * const response = createInteractiveAuthorizationEndpointOpenid4vpInteraction({
 *   authSession: 'session-123',
 *   openid4vpRequest: {
 *     response_type: 'vp_token',
 *     response_mode: 'iae_post',
 *     nonce: 'n-0S6_WzA2Mj',
 *     dcql_query: { ... }
 *   }
 * })
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
  return {
    status: 'require_interaction',
    type: 'openid4vp_presentation',
    auth_session: options.authSession,
    openid4vp_request: options.openid4vpRequest,
    ...options.additionalPayload,
  }
}

export interface CreateInteractiveAuthorizationEndpointRedirectToWebInteractionOptions {
  /**
   * Session identifier for subsequent requests
   */
  authSession: string

  /**
   * The request URI for the PAR request
   * The wallet will use this to build an authorization request
   */
  requestUri: string

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
 * @param options - Response options
 * @returns The interaction required response
 *
 * @example
 * ```ts
 * const response = createInteractiveAuthorizationEndpointRedirectToWebInteraction({
 *   authSession: 'session-123',
 *   requestUri: 'urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c',
 *   expiresIn: 60
 * })
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
    expires_in: options.expiresIn,
    ...options.additionalPayload,
  }
}

export interface CreateInteractiveAuthorizationEndpointErrorResponseOptions {
  /**
   * The error code
   * Can be standard OAuth2 error codes or 'missing_interaction_type'
   */
  error: string

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
 * @param options - Error response options
 * @returns The error response
 *
 * @example
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
