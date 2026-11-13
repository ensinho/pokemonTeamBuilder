/**
 * A Firebase Auth error as a sentence the user can act on. An unknown code
 * gets the translated generic line — never `err.message`, which is Firebase's
 * English ("Firebase: Error (auth/…)") and reached the dialog verbatim until
 * 2026-11-04.
 */
export function prettifyAuthError(err, t) {
    const code = err?.code || '';
    switch (code) {
        case 'auth/invalid-email':
        case 'auth/missing-email': return t('modals.authErrorInvalidEmail');
        case 'auth/email-already-in-use': return t('modals.authErrorEmailInUse');
        case 'auth/weak-password': return t('modals.authValidationErrorPassword');
        case 'auth/missing-password': return t('modals.authErrorMissingPassword');
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials': return t('modals.authErrorWrongPassword');
        case 'auth/user-not-found': return t('modals.authErrorUserNotFound');
        case 'auth/user-disabled': return t('modals.authErrorUserDisabled');
        case 'auth/network-request-failed': return t('modals.authErrorNetwork');
        case 'auth/too-many-requests':
        case 'auth/quota-exceeded': return t('modals.authErrorTooManyRequests');
        case 'auth/credential-already-in-use': return t('modals.authErrorCredentialInUse');
        case 'auth/requires-recent-login': return t('modals.authErrorRecentLogin');
        // Google (2026-11-12)
        case 'auth/popup-blocked': return t('modals.authErrorPopupBlocked');
        case 'auth/operation-not-allowed': return t('modals.authErrorProviderOff');
        case 'auth/unauthorized-domain': return t('modals.authErrorUnauthorizedDomain');
        case 'auth/account-exists-with-different-credential': return t('modals.authErrorOtherMethod');
        case 'auth/internal-error':
        default: return t('modals.authErrorDefault');
    }
}

/** Which field an auth error is about, so the form can mark and focus it. */
export function authErrorField(err) {
    switch (err?.code || '') {
        case 'auth/invalid-email':
        case 'auth/missing-email':
        case 'auth/email-already-in-use':
        case 'auth/user-not-found':
        case 'auth/credential-already-in-use':
            return 'email';
        case 'auth/weak-password':
        case 'auth/missing-password':
        case 'auth/wrong-password':
            return 'password';
        default:
            return null;
    }
}

/**
 * The trainer closed the Google popup (or opened a second one): not an
 * error to show — the dialog just goes back to waiting.
 */
export function isAuthCancel(err) {
    const code = err?.code || '';
    return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/user-cancelled';
}
