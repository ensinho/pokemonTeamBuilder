/**
 * One frame of a decrypting name (DecryptText): the first `revealed`
 * characters are the real ones, the rest are random glyphs — except spaces,
 * hyphens and other punctuation, which stay put so the word's shape is right
 * from the first frame. Returns the two halves so the noise can be styled.
 */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function decryptFrame(text, revealed, random = Math.random) {
    const chars = Array.from(String(text ?? ''));
    const cut = Math.max(0, Math.min(chars.length, Math.floor(revealed)));
    const noise = chars.slice(cut).map((char) => (
        /[\p{L}\p{N}]/u.test(char) ? GLYPHS[Math.floor(random() * GLYPHS.length)] : char
    ));
    return { resolved: chars.slice(0, cut).join(''), noise: noise.join('') };
}

/** How long the whole reveal takes: long enough to read as a decode, short
 *  enough to finish before the eye moves on. */
export function decryptDuration(text) {
    const length = Array.from(String(text ?? '')).length;
    return Math.max(450, Math.min(900, length * 70));
}
