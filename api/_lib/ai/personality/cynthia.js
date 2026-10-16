/**
 * Cynthia's manners — the parts of her play that are character, not strength.
 * Another champion is another file with the same shape (premise A5).
 */
export const CYNTHIA = {
    id: 'cynthia',
    /** Never switched out voluntarily, and sent in last while anyone else stands. */
    aceSpecies: 'Garchomp',
    /** With a lead of this many Pokémon she plays cold: no recoil, no coin flips. */
    coldLead: 2,
    coldRecoilPenalty: 8,
    coldInaccuracyPenalty: 10,
};

export const PERSONALITIES = { cynthia: CYNTHIA };

export const personalityFor = (championId) => PERSONALITIES[championId] || CYNTHIA;
