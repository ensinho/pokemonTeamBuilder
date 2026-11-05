/**
 * Blue's manners — Cynthia's shape (`cynthia.js`), his own ace. He plays the
 * same cold game with a lead; his character is in his lines, not his odds.
 */
export const BLUE = {
    id: 'blue',
    /**
     * Never switched out voluntarily, and sent in last while anyone else
     * stands. His ace is the day's starter (`rotation.aceFor`), passed to
     * `decide` as `aceSpecies`; Charizard is only the fallback.
     */
    aceSpecies: 'Charizard',
    coldLead: 2,
    coldRecoilPenalty: 8,
    coldInaccuracyPenalty: 10,
};
