import { ContentType, createZodFetcher, Headers, objectToQueryParams } from '@openid4vc/utils'
import type { CallbackContext } from '../callbacks.js'
import type { Jwk, JwkSet } from '../common/jwk/z-jwk.js'
import { decodeJwt } from '../common/jwt/decode-jwt.js'
import { createDpopHeadersForRequest, extractDpopNonceFromHeaders, type RequestDpopOptions } from '../dpop/dpop.js'
import { authorizationServerRequestWithDpopRetry } from '../dpop/dpop-retry.js'
import { Oauth2Error } from '../error/Oauth2Error.js'
import type { AuthorizationServerMetadata } from '../metadata/authorization-server/z-authorization-server-metadata.js'
import { createPkce, type CreatePkceReturn } from '../pkce.js'
import type {
  InteractiveAuthorizationEndpointFollowUpRequest,
  InteractiveAuthorizationEndpointRequest,
  Openid4vpRequest,
} from './z-interactive-authorization.js'
import { zInteractiveAuthorizationEndpointResponse } from './z-interactive-authorization.js'

export interface SendInteractiveAuthorizationEndpointRequestOptions {
  /**
   * Callback context
   */
  callbacks: Pick<CallbackContext, 'fetch' | 'signJwt' | 'hash' | 'generateRandom'>

  /**
   * Authorization server metadata containing the interactive_authorization_endpoint
   */
  authorizationServerMetadata: AuthorizationServerMetadata

  /**
   * The interactive authorization request parameters
   * Can be either an initial request or a follow-up request
   */
  request: InteractiveAuthorizationEndpointRequest | InteractiveAuthorizationEndpointFollowUpRequest

  /**
   * Optional DPoP configuration for request binding
   */
  dpop?: RequestDpopOptions

  /**
   * Optional headers to include in the request
   * Used for OAuth-Client-Attestation headers, etc.
   */
  additionalHeaders?: Record<string, string>

  /**
   * Allowed PKCE code challenge methods from server metadata
   * Used when generating PKCE for redirect_to_web flows
   * Defaults to ['S256', 'plain'] if not provided
   */
  pkceCodeChallengeMethods?: string[]

  /**
   * Code verifier for follow-up requests after redirect_to_web (FLOW-03)
   * Should be passed after initial request returns PKCE codeVerifier
   */
  codeVerifier?: string
}

/**
 * Send a request to the Interactive Authorization Endpoint (IAE)
 *
 * Implements the Interactive Authorization Endpoint flow from OpenID4VCI 1.1.
 * The IAE enables complex authentication and authorization flows where
 * interaction occurs directly with the Wallet.
 *
 * The request can be either:
 * - Initial request: Contains authorization parameters and interaction_types_supported
 * - Follow-up request: Contains auth_session and interaction-specific parameters
 *
 * Features:
 * - PKCE for redirect_to_web flows (PKCE-01, PKCE-02): Automatically generated for initial requests
 * - expected_url validation for replay protection: Wallets should validate this claim
 * - Response modes: iae_post, iae_post.jwt (VP-01)
 * - DPoP binding support for request authentication
 *
 * @note This function implements the IAE specification from OpenID4VCI 1.1.
 *       The previous "Interactive Authorization Request" terminology has been
 *       replaced with "Interactive Authorization Endpoint" per spec updates.
 *
 * @param options - Configuration options for the request
 * @returns The interactive authorization response and updated DPoP config
 * @throws {Oauth2Error} if the authorization server doesn't support interactive authorization
 *
 * @example Initial request with PKCE for redirect_to_web
 * ```ts
 * const result = await sendInteractiveAuthorizationEndpointRequest({
 *   callbacks,
 *   authorizationServerMetadata,
 *   request: {
 *     response_type: 'code',
 *     client_id: 'my-client',
 *     interaction_types_supported: 'openid4vp_presentation,redirect_to_web',
 *     redirect_uri: 'https://wallet.example.com/callback',
 *     authorization_details: [...]
 *   }
 * })
 * // result.pkce contains { codeVerifier, codeChallenge, codeChallengeMethod }
 * ```
 *
 * @example Follow-up request with code_verifier after redirect_to_web
 * ```ts
 * const result = await sendInteractiveAuthorizationEndpointRequest({
 *   callbacks,
 *   authorizationServerMetadata,
 *   request: {
 *     auth_session: 'session-123',
 *   },
 *   codeVerifier: savedPkce.codeVerifier  // From initial request
 * })
 * ```
 *
 * @example Follow-up request with OpenID4VP response
 * ```ts
 * const result = await sendInteractiveAuthorizationEndpointRequest({
 *   callbacks,
 *   authorizationServerMetadata,
 *   request: {
 *     auth_session: 'session-123',
 *     openid4vp_response: JSON.stringify({ vp_token: '...' })
 *   }
 * })
 * ```
 */
export async function sendInteractiveAuthorizationEndpointRequest(options: SendInteractiveAuthorizationEndpointRequestOptions) {
  const fetchWithZod = createZodFetcher(options.callbacks.fetch)

  const authorizationServerMetadata = options.authorizationServerMetadata
  const interactiveAuthorizationEndpoint = authorizationServerMetadata.interactive_authorization_endpoint
  if (!interactiveAuthorizationEndpoint) {
    throw new Oauth2Error(
      `Unable to send interactive authorization request. Authorization server '${authorizationServerMetadata.issuer}' has no 'interactive_authorization_endpoint'`
    )
  }

  // Determine if this is an initial request or follow-up
  const isFollowUpRequest = 'auth_session' in options.request

  // Generate PKCE for initial requests with redirect_to_web support
  let pkce: CreatePkceReturn | undefined
  const requestBody = { ...options.request } as Record<string, unknown>

  if (!isFollowUpRequest && 'interaction_types_supported' in options.request) {
    // Parse interaction types (comma-separated)
    const interactionTypes = (options.request.interaction_types_supported as string).split(',').map((t: string) => t.trim())

    // Generate PKCE if redirect_to_web is supported
    if (interactionTypes.includes('redirect_to_web')) {
      pkce = await createPkce({
        allowedCodeChallengeMethods: options.pkceCodeChallengeMethods ?? ['S256', 'plain'],
        callbacks: options.callbacks,
      })

      requestBody.code_challenge = pkce.codeChallenge
      requestBody.code_challenge_method = pkce.codeChallengeMethod
    }
  }

  // Add code_verifier for follow-up requests (FLOW-03)
  if (isFollowUpRequest && options.codeVerifier) {
    requestBody.code_verifier = options.codeVerifier
  }

  return authorizationServerRequestWithDpopRetry({
    dpop: options.dpop,
    request: async (dpop) => {
      const dpopHeaders = dpop
        ? await createDpopHeadersForRequest({
            request: {
              method: 'POST',
              url: interactiveAuthorizationEndpoint,
            },
            signer: dpop.signer,
            callbacks: options.callbacks,
            nonce: dpop.nonce,
          })
        : undefined

      const headers = new Headers({
        ...dpopHeaders,
        ...options.additionalHeaders,
        'Content-Type': ContentType.XWwwFormUrlencoded,
      })

      const { response, result } = await fetchWithZod(
        zInteractiveAuthorizationEndpointResponse,
        ContentType.Json,
        interactiveAuthorizationEndpoint,
        {
          method: 'POST',
          body: objectToQueryParams(requestBody).toString(),
          headers,
        }
      )

      const dpopNonce = extractDpopNonceFromHeaders(response.headers) ?? undefined
      return {
        response: result?.data,
        dpop: dpop
          ? {
              ...dpop,
              nonce: dpopNonce,
            }
          : undefined,
        pkce,
      }
    },
  })
}

/**
 * Options for validating OpenID4VP expected_url
 */
export interface ValidateOpenid4vpExpectedUrlOptions {
  /**
   * The OpenID4VP request from the IAE response
   */
  openid4vpRequest: Openid4vpRequest

  /**
   * The URL where follow-up request will be sent
   * (typically the interactive_authorization_endpoint)
   */
  followUpRequestUrl: string

  /**
   * Callbacks for JWT verification
   */
  callbacks: Pick<CallbackContext, 'verifyJwt'>

  /**
   * JWK or JWK set for verifying the signed request
   */
  signerJwk?: Jwk | JwkSet
}

/**
 * Result of expected_url validation
 */
export interface ValidateOpenid4vpExpectedUrlResult {
  valid: boolean
  error?: string
  errorDescription?: string
}

/**
 * Validate expected_url in OpenID4VP request (VP-03, VP-04, PROT-05, PROT-06)
 *
 * This function validates that the expected_url in a signed OpenID4VP request
 * matches the URL where the wallet will send the follow-up request. This prevents
 * replay attacks from malicious verifiers.
 *
 * For unsigned requests (PROT-06), validation is skipped as expected_url is not
 * enforceable without a signature.
 *
 * **WALLET IMPLEMENTATION:** This function should be called by wallet implementations
 * before responding to an OpenID4VP request from the Authorization Server.
 *
 * @param options - Validation options
 * @returns Validation result indicating success or failure with error details
 *
 * @example
 * ```ts
 * const result = await validateOpenid4vpExpectedUrl({
 *   openid4vpRequest: response.openid4vp_request,
 *   followUpRequestUrl: 'https://as.example.com/iae',
 *   callbacks: { verifyJwt },
 *   signerJwk: asJwk
 * })
 *
 * if (!result.valid) {
 *   throw new Error(`Validation failed: ${result.errorDescription}`)
 * }
 * ```
 */
export async function validateOpenid4vpExpectedUrl(
  options: ValidateOpenid4vpExpectedUrlOptions
): Promise<ValidateOpenid4vpExpectedUrlResult> {
  const { openid4vpRequest, followUpRequestUrl } = options

  // PROT-06: Unsigned requests bypass expected_url validation
  if (!openid4vpRequest.request) {
    return { valid: true }
  }

  // Decode the JWT to extract claims
  const decoded = decodeJwt({ jwt: openid4vpRequest.request })
  const expectedUrl = decoded.payload.expected_url as string | undefined

  // PROT-05: Signed requests must include expected_url
  if (!expectedUrl) {
    return {
      valid: false,
      error: 'invalid_request',
      errorDescription: 'expected_url missing in signed OpenID4VP request',
    }
  }

  // VP-04: Validate expected_url matches follow-up URL
  if (expectedUrl !== followUpRequestUrl) {
    return {
      valid: false,
      error: 'invalid_request',
      errorDescription: 'expected_url mismatch',
    }
  }

  return { valid: true }
}

/**
 * Options for encoding OpenID4VP response
 */
export interface EncodeOpenid4vpResponseOptions {
  /**
   * The VP response to encode
   */
  vpResponse: {
    vp_token: string
    presentation_submission?: unknown
  }

  /**
   * Response mode from the OpenID4VP request
   */
  responseMode: 'iae_post' | 'iae_post.jwt'

  /**
   * Encryption key from AS (required for iae_post.jwt)
   */
  encryptionKey?: Jwk

  /**
   * Callbacks for encryption
   */
  callbacks?: Pick<CallbackContext, 'encryptJwe'>
}

/**
 * Encode OpenID4VP response according to response mode (VP-05, VP-06)
 *
 * This function encodes the VP response according to the response_mode specified
 * in the OpenID4VP request:
 * - iae_post: JSON-encoded string (VP-05)
 * - iae_post.jwt: Encrypted JWT using JARM encryption (VP-06)
 *
 * **WALLET IMPLEMENTATION:** This function should be called by wallet implementations
 * to properly encode the VP response before sending it in the follow-up request.
 *
 * @param options - Encoding options
 * @returns Encoded VP response string ready to send as openid4vp_response parameter
 *
 * @example JSON encoding (iae_post)
 * ```ts
 * const encoded = await encodeOpenid4vpResponse({
 *   vpResponse: {
 *     vp_token: 'eyJ...',
 *     presentation_submission: { ... }
 *   },
 *   responseMode: 'iae_post'
 * })
 * // Returns: JSON string
 * ```
 *
 * @example Encrypted encoding (iae_post.jwt)
 * ```ts
 * const encoded = await encodeOpenid4vpResponse({
 *   vpResponse: {
 *     vp_token: 'eyJ...',
 *     presentation_submission: { ... }
 *   },
 *   responseMode: 'iae_post.jwt',
 *   encryptionKey: asPublicJwk,
 *   callbacks: { encryptJwe }
 * })
 * // Returns: Encrypted JWT string
 * ```
 */
export async function encodeOpenid4vpResponse(options: EncodeOpenid4vpResponseOptions): Promise<string> {
  const { vpResponse, responseMode } = options

  // VP-05: For iae_post, return JSON-encoded string
  if (responseMode === 'iae_post') {
    return JSON.stringify(vpResponse)
  }

  // VP-06: For iae_post.jwt, encrypt using JARM
  if (responseMode === 'iae_post.jwt') {
    if (!options.encryptionKey || !options.callbacks?.encryptJwe) {
      throw new Oauth2Error(
        'encryptionKey and callbacks.encryptJwe are required for iae_post.jwt response mode'
      )
    }

    // Use JARM encryption per OpenID4VP Section 8.3
    const result = await options.callbacks.encryptJwe(
      {
        method: 'jwk',
        publicJwk: options.encryptionKey,
        alg: 'ECDH-ES',
        enc: 'A256GCM',
      },
      JSON.stringify(vpResponse)
    )

    return result.jwe
  }

  throw new Oauth2Error(`Unsupported response mode: ${responseMode}`)
}
