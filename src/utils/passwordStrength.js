/**
 * How strong a new password looks, 0–4, from what a person can act on: length
 * first, then variety. Not an entropy estimate — a nudge with a label.
 * Firebase's own floor (6 characters) is `meetsMinimum`.
 */
export const MIN_PASSWORD_LENGTH = 6;

export function passwordStrength(password = '') {
    const value = String(password);
    if (!value) return { score: 0, level: 'empty', meetsMinimum: false };
    let score = 0;
    if (value.length >= 8) score += 1;
    if (value.length >= 12) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    const meetsMinimum = value.length >= MIN_PASSWORD_LENGTH;
    // Below the floor it is weak no matter what it mixes.
    const capped = meetsMinimum ? Math.min(4, score) : Math.min(1, score);
    const level = ['weak', 'weak', 'fair', 'good', 'strong'][capped];
    return { score: capped, level, meetsMinimum };
}
