/** A Firebase Auth error as a sentence the user can act on. */
export function prettifyAuthError(err, t) {
    const code = err?.code || '';
    switch (code) {
        case 'auth/invalid-email': return t('modals.authErrorInvalidEmail');
        case 'auth/email-already-in-use': return t('modals.authErrorEmailInUse');
        case 'auth/weak-password': return t('modals.authValidationErrorPassword');
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials': return t('modals.authErrorWrongPassword');
        case 'auth/user-not-found': return t('modals.authErrorUserNotFound');
        case 'auth/network-request-failed': return t('modals.authErrorNetwork');
        case 'auth/too-many-requests': return t('modals.authErrorTooManyRequests');
        case 'auth/credential-already-in-use': return t('modals.authErrorCredentialInUse');
        case 'auth/requires-recent-login': return t('modals.authErrorRecentLogin');
        default: return err?.message || t('modals.authErrorDefault');
    }
}
