// frontend/src/utils/emailVerification.ts

/**
 * Whether this signed-in account still has to confirm its e-mail address before it may track
 * challenges or edit what it owns. That depends on the admin's "Require e-mail confirmation" switch
 * (`features.emailVerificationRequired`, true until the site config loads), the same rule the API
 * applies, so the page and the server never disagree.
 */
export function mustConfirmEmail(user: { is_verified?: boolean } | null | undefined, verificationRequired: boolean): boolean {
  return Boolean(user) && user?.is_verified === false && verificationRequired;
}
