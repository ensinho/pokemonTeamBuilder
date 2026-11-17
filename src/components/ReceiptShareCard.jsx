import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import '../styles/receipt.css';

import { useTranslation } from '../hooks/useTranslation';
import { readReceiptShare } from '../utils/gameShare';
import { dayReceipt } from '../utils/mascot/roundReceipt';
import { DAILY_GAMES } from '../utils/gamesToday';
import { TEMPLATES_BY_ID } from '../utils/tierTemplates';
import { ReceiptRow, ReceiptStamp } from './mascot/Receipt';

/**
 * A day's receipt posted to the Diário (2026-11-17, "Fantasminha de
 * plantão"): the four games as the mascot printed them, small — the paper,
 * the rows, the gold stamp for a day of four. Read through
 * `readReceiptShare` (checked and clamped) before anything is drawn; ids and
 * figures only, so nothing here can carry a trainer's words.
 */
export function ReceiptShareCard({ share }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const card = readReceiptShare(share);
    if (!card) return null;

    const done = Object.fromEntries(DAILY_GAMES.map((game) => [game, card.games.includes(game)]));
    const day = dayReceipt(done, { challenge: card.challenge, puzzle: card.puzzle, quiz: card.quiz, tier: card.tier });
    const label = (row) => {
        if (row.id === 'challenge') return t('receipt.row.challenge');
        if (row.id === 'pokepuzzle') return t('receipt.row.puzzleShort');
        if (row.id === 'quiz') return t('receipt.row.quizShort');
        return t('receipt.row.tierShort');
    };
    const value = (row) => (row.id === 'tierList' && TEMPLATES_BY_ID[card.tier]
        ? t(`tierList.templates.${card.tier}.name`)
        : t(`receipt.value.${row.value}`, row.params || {}));

    return (
        <div className="forum-team-share-card receipt-share">
            <div className="forum-team-share-header">
                <h5 className="forum-team-share-title flex items-center gap-1">
                    <ReceiptText className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                    {t('receipt.shareTitle')}
                </h5>
                <span className={`badge shrink-0 ${day.complete ? 'badge--gold' : ''}`}>
                    {t('receipt.totals.gamesOf', { n: day.played, total: day.total })}
                </span>
            </div>
            <div className="receipt-share__paper">
                <ul className="receipt__rows">
                    {day.rows.map((row) => <ReceiptRow key={row.id} label={label(row)} value={value(row)} bold={row.bold} />)}
                </ul>
                {day.complete && <ReceiptStamp mood="orgulhoso" hat="crown" gold sub={t('receipt.stampFull')} word={t('receipt.stampFour')} />}
                {card.full > 0 && <p className="receipt-share__full">{t('receipt.shareFull', { n: card.full })}</p>}
            </div>
            <button type="button" onClick={() => navigate('/games')} className="btn btn-ghost btn-sm receipt-share__play">
                {t('receipt.sharePlay')}
            </button>
        </div>
    );
}

export default ReceiptShareCard;
