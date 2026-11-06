import React from 'react';
import { championArt } from '../../utils/challengeArt';

/**
 * A champion's line on the day that closed (2026-11-06, social-heart C6):
 * written by the daily cron as numbers (api/_lib/championNotes.js), worded
 * here in the reader's language. The champion's own battle sprite speaks.
 */
export function ChampionNote({ note, t }) {
    const name = note.champion === 'blue' ? 'Blue' : 'Cynthia';
    const key = note.wins === 0 ? 'none' : note.wins <= 3 ? 'few' : 'many';
    return (
        <div className="champion-note">
            <img className="champion-note__art" src={championArt(note.champion).versus} alt="" width={48} height={48} decoding="async" />
            <p className="champion-note__text">
                {t(`forum.championNote.${key}`, { name, wins: note.wins, played: note.played })}
                {note.fastest && ` ${t('forum.championNote.fastest', { trainer: note.fastest.name, turns: note.fastest.turns })}`}
            </p>
        </div>
    );
}

export default ChampionNote;
