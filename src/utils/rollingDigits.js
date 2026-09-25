/**
 * Splits a formatted figure into the tokens <RollingNumber> renders: one per
 * character, digits carrying their numeric value so their column can roll.
 *
 * Keys count from the *right*, so the units column keeps its identity when the
 * figure grows a digit (9 → 10): React keeps the existing columns and mounts
 * only the new leading one, instead of re-keying every column and rolling
 * digits that did not change.
 */
export function splitRollingDigits(text) {
    const chars = Array.from(String(text ?? ''));
    return chars.map((char, index) => {
        const fromRight = chars.length - 1 - index;
        const isDigit = char >= '0' && char <= '9';
        return {
            key: `${isDigit ? 'd' : 's'}${fromRight}`,
            char,
            digit: isDigit ? Number(char) : null,
        };
    });
}
