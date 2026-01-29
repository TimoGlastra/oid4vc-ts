import { formatZodError } from '@openid4vc/utils'
import {
  type ParseAuthorizationRequestResult,
  parseAuthorizationRequest,
} from '../authorization-request/parse-authorization-request.js'
import type { RequestLike } from '../common/z-common.js'
import { Oauth2ErrorCodes } from '../common/z-oauth2-error.js'
import { Oauth2ServerErrorResponseError } from '../error/Oauth2ServerErrorResponseError.js'
import type {
  InteractiveAuthorizationEndpointFollowUpRequest,
  InteractiveAuthorizationEndpointRequest,
} from './z-interactive-authorization.js'
import {
  zInteractiveAuthorizationEndpointFollowUpRequest,
  zInteractiveAuthorizationEndpointRequest,
} from './z-interactive-authorization.js'

export interface ParseInteractiveAuthorizationEndpointRequestOptions {
  /**
   * The HTTP request object
   */
  request: RequestLike

  /**
   * The parsed request body (already decoded from form URL encoded)
   */
  interactiveAuthorizationRequest: unknown
}

export interface ParseInteractiveAuthorizationEndpointRequestResult extends ParseAuthorizationRequestResult {
  /**
   * The parsed interactive authorization request
   * Can be either an initial request or a follow-up request
   */
  interactiveAuthorizationRequest: InteractiveAuthorizationEndpointRequest | InteractiveAuthorizationEndpointFollowUpRequest

  /**
   * Indicates if this is a follow-up request (has auth_session)
   */
  isFollowUpRequest: boolean

  /**
   * PKCE state from initial request (if PKCE was used)
   * Server should store this with auth_session for later verification
   */
  pkce?: {
    codeChallenge: string
    codeChallengeMethod: 'S256' | 'plain'
  }
}

/**
 * Parse an Interactive Authorization Request
 *
 * This function parses and validates an Interactive Authorization Endpoint request.
 * It automatically detects whether this is an initial request or a follow-up request
 * based on the presence of the auth_session parameter.
 *
 * @param options - Parsing options
 * @returns The parsed request and metadata
 * @throws {Oauth2ServerErrorResponseError} if validation fails
 *
 * @example Parse initial request
 * ```ts
 * const { interactiveAuthorizationRequest, isFollowUpRequest } = parseInteractiveAuthorizationEndpointRequest({
 *   request: req,
 *   interactiveAuthorizationRequest: req.body
 * })
 * // isFollowUpRequest = false
 * ```
 *
 * @example Parse follow-up request
 * ```ts
 * const { interactiveAuthorizationRequest, isFollowUpRequest } = parseInteractiveAuthorizationEndpointRequest({
 *   request: req,
 *   interactiveAuthorizationRequest: req.body
 * })
 * // isFollowUpRequest = true
 * ```
 */
export function parseInteractiveAuthorizationEndpointRequest(
  options: ParseInteractiveAuthorizationEndpointRequestOptions
): ParseInteractiveAuthorizationEndpointRequestResult {
  const { interactiveAuthorizationRequest: requestBody } = options

  // Check if this is a follow-up request (has auth_session)
  const isFollowUpRequest =
    typeof requestBody === 'object' &&
    requestBody !== null &&
    'auth_session' in requestBody &&
    typeof requestBody.auth_session === 'string'

  if (isFollowUpRequest) {
    // Parse as follow-up request
    const parsedRequest = zInteractiveAuthorizationEndpointFollowUpRequest.safeParse(requestBody)
    if (!parsedRequest.success) {
      throw new Oauth2ServerErrorResponseError({
        error: Oauth2ErrorCodes.InvalidRequest,
        error_description: `Error occurred during validation of interactive authorization follow-up request.\n${formatZodError(parsedRequest.error)}`,
      })
    }

    // Follow-up requests have minimal parameters, so we don't parse authorization request details
    return {
      interactiveAuthorizationRequest: parsedRequest.data,
      isFollowUpRequest: true,
      dpop: undefined,
      clientAttestation: undefined,
    }
  } else {
    // Parse as initial request
    const parsedRequest = zInteractiveAuthorizationEndpointRequest.safeParse(requestBody)
    if (!parsedRequest.success) {
      throw new Oauth2ServerErrorResponseError({
        error: Oauth2ErrorCodes.InvalidRequest,
        error_description: `Error occurred during validation of interactive authorization request.\n${formatZodError(parsedRequest.error)}`,
      })
    }

    const interactiveAuthorizationRequest = parsedRequest.data
    const { clientAttestation, dpop } = parseAuthorizationRequest({
      authorizationRequest: interactiveAuthorizationRequest,
      request: options.request,
    })

    // Extract PKCE state from initial request if present
    const pkce = parsedRequest.data.code_challenge
      ? {
          codeChallenge: parsedRequest.data.code_challenge,
          codeChallengeMethod: (parsedRequest.data.code_challenge_method ?? 'S256') as 'S256' | 'plain',
        }
      : undefined

    return {
      interactiveAuthorizationRequest,
      isFollowUpRequest: false,
      dpop,
      clientAttestation,
      pkce,
    }
  }
}
