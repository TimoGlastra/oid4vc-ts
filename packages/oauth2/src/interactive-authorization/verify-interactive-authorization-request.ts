import type {
  VerifyAuthorizationRequestOptions,
  VerifyAuthorizationRequestReturn,
} from '../authorization-request/verify-authorization-request.js'
import { verifyAuthorizationRequest } from '../authorization-request/verify-authorization-request.js'
import type { CallbackContext } from '../callbacks.js'
import { Oauth2ErrorCodes } from '../common/z-oauth2-error.js'
import { Oauth2ServerErrorResponseError } from '../error/Oauth2ServerErrorResponseError.js'
import { type PkceCodeChallengeMethod, verifyPkce } from '../pkce.js'
import type {
  InteractiveAuthorizationEndpointFollowUpRequest,
  InteractiveAuthorizationEndpointRequest,
} from './z-interactive-authorization.js'

export interface VerifyInteractiveAuthorizationEndpointRequestReturn extends VerifyAuthorizationRequestReturn {
  /**
   * Indicates whether PKCE was successfully verified
   * True if PKCE was used and verified, false otherwise
   */
  pkceVerified: boolean
}

export interface VerifyInteractiveAuthorizationEndpointRequestOptions
  extends Omit<VerifyAuthorizationRequestOptions, 'authorizationRequest' | 'callbacks'> {
  /**
   * The parsed interactive authorization request to verify
   */
  interactiveAuthorizationRequest: InteractiveAuthorizationEndpointRequest | InteractiveAuthorizationEndpointFollowUpRequest

  /**
   * Indicates if this is a follow-up request
   * Follow-up requests may have different verification requirements
   */
  isFollowUpRequest: boolean

  /**
   * PKCE state from the initial request (retrieved from server session storage)
   * Required for PKCE verification in follow-up requests
   */
  pkceState?: {
    codeChallenge: string
    codeChallengeMethod: 'S256' | 'plain'
  }

  /**
   * Code verifier from follow-up request (from code_verifier parameter)
   * Server verifies this against pkceState.codeChallenge
   */
  codeVerifier?: string

  /**
   * Redirect URI for HTTPS validation in redirect_to_web flows (PKCE-03)
   * Must be HTTPS except for localhost development per RFC 8252
   */
  redirectUri?: string

  /**
   * Callback functions for cryptographic operations
   * Optional because only needed for initial requests (verifyAuthorizationRequest) and follow-up PKCE verification
   */
  callbacks?: Pick<CallbackContext, 'hash' | 'verifyJwt'>
}

/**
 * Verify an Interactive Authorization Request
 *
 * This function verifies the interactive authorization request including:
 * - Client attestation (if present)
 * - DPoP binding (if present)
 * - Authorization request parameters (for initial requests)
 * - PKCE verification (for follow-up requests with code_verifier)
 * - HTTPS redirect URI validation (for redirect_to_web flows)
 *
 * For follow-up requests, the verification is lighter as most parameters
 * have already been verified in the initial request.
 *
 * Client authentication follows PAR requirements (AUTH-01, AUTH-02):
 * - For initial requests: full client authentication per RFC 9126 and RFC 6749 Section 2.3
 * - Supported methods: client_secret_basic, client_secret_post, client_secret_jwt,
 *   private_key_jwt, attest_jwt_client_auth, tls_client_auth
 * - For follow-up requests: auth_session validation (client already authenticated in initial request)
 *
 * Note: PKCE-04 (wallet must not use embedded user-agent for redirect_to_web) is a wallet
 * implementation responsibility and cannot be enforced by the server.
 *
 * @param options - Verification options
 * @returns Verification result with client attestation, DPoP info, and PKCE verification status
 *
 * @example Verify initial request
 * ```ts
 * const result = await verifyInteractiveAuthorizationEndpointRequest({
 *   interactiveAuthorizationRequest: request,
 *   isFollowUpRequest: false,
 *   authorizationServerMetadata,
 *   fetch
 * })
 * ```
 *
 * @example Verify follow-up request with PKCE
 * ```ts
 * const result = await verifyInteractiveAuthorizationEndpointRequest({
 *   interactiveAuthorizationRequest: followUpRequest,
 *   isFollowUpRequest: true,
 *   pkceState: { codeChallenge: '...', codeChallengeMethod: 'S256' },
 *   codeVerifier: followUpRequest.code_verifier,
 *   callbacks: { hash }
 * })
 * // result.pkceVerified === true
 * ```
 */
export async function verifyInteractiveAuthorizationEndpointRequest(
  options: VerifyInteractiveAuthorizationEndpointRequestOptions
): Promise<VerifyInteractiveAuthorizationEndpointRequestReturn> {
  const { interactiveAuthorizationRequest, isFollowUpRequest } = options

  // PKCE-03: Validate redirect URI is HTTPS (per RFC 8252 Section 7.2)
  if (options.redirectUri) {
    // eslint-disable-next-line no-restricted-globals
    const redirectUrl = new URL(options.redirectUri)
    // Allow localhost for development per RFC 8252 Section 8.3
    const isLocalhost = redirectUrl.hostname === 'localhost' || redirectUrl.hostname === '127.0.0.1'
    if (redirectUrl.protocol !== 'https:' && !isLocalhost) {
      throw new Oauth2ServerErrorResponseError({
        error: Oauth2ErrorCodes.InvalidRequest,
        error_description: 'redirect_uri must use HTTPS scheme per RFC 8252 Section 7.2',
      })
    }
  }

  // For follow-up requests, we have minimal parameters to verify
  // The main verification should be done on the auth_session by the AS
  if (isFollowUpRequest) {
    // PKCE downgrade attack prevention (RFC 9700)
    if (options.pkceState && !options.codeVerifier) {
      throw new Oauth2ServerErrorResponseError({
        error: Oauth2ErrorCodes.InvalidRequest,
        error_description: 'code_verifier required when PKCE was used in initial request',
      })
    }

    // PKCE was not used but code_verifier provided - also reject
    if (!options.pkceState && options.codeVerifier) {
      throw new Oauth2ServerErrorResponseError({
        error: Oauth2ErrorCodes.InvalidRequest,
        error_description: 'code_verifier provided but PKCE was not used in initial request',
      })
    }

    // Verify PKCE if both present
    let pkceVerified = false
    if (options.pkceState && options.codeVerifier) {
      if (!options.callbacks) {
        throw new Oauth2ServerErrorResponseError({
          error: Oauth2ErrorCodes.InvalidRequest,
          error_description: 'callbacks required for PKCE verification',
        })
      }

      await verifyPkce({
        codeVerifier: options.codeVerifier,
        codeChallenge: options.pkceState.codeChallenge,
        codeChallengeMethod: options.pkceState.codeChallengeMethod as PkceCodeChallengeMethod,
        callbacks: options.callbacks,
      })
      pkceVerified = true
    }

    // For follow-up requests, client attestation/DPoP are typically not present
    // since they were already verified in the initial request
    return {
      dpop: undefined,
      clientAttestation: undefined,
      pkceVerified,
    }
  }

  // For initial requests, perform full verification
  if (!options.callbacks) {
    throw new Oauth2ServerErrorResponseError({
      error: Oauth2ErrorCodes.InvalidRequest,
      error_description: 'callbacks required for initial request verification',
    })
  }

  const { clientAttestation, dpop } = await verifyAuthorizationRequest({
    ...options,
    callbacks: options.callbacks,
    authorizationRequest: interactiveAuthorizationRequest as InteractiveAuthorizationEndpointRequest,
  })

  return {
    dpop,
    clientAttestation,
    pkceVerified: false, // PKCE is only verified in follow-up requests
  }
}
