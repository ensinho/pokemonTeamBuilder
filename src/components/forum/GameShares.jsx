import React, { Suspense, lazy } from 'react';

// Each card is its own chunk: a thread without a tier list never loads the
// tier rules, one without a quiz never loads the category table.
const TierListShareCard = lazy(() => import('../TierListShareCard'));
const QuizShareCard = lazy(() => import('../QuizShareCard'));
const ReceiptShareCard = lazy(() => import('../ReceiptShareCard'));

/**
 * The tier list and the quiz result a forum message may carry (2026-11-15,
 * `utils/gameShare.js`). The Champion's and the PokéPuzzle's cards are
 * imported by the thread directly; these two wait for their chunk in a slot
 * of about their height, so the thread does not jump when they arrive.
 */
export function GameShares({ message }) {
    if (!message?.sharedTierList && !message?.sharedQuiz && !message?.sharedReceipt) return null;
    return (
        <Suspense fallback={<div className="game-share-slot" aria-hidden="true" />}>
            {message.sharedTierList && <TierListShareCard share={message.sharedTierList} />}
            {message.sharedQuiz && <QuizShareCard share={message.sharedQuiz} />}
            {message.sharedReceipt && <ReceiptShareCard share={message.sharedReceipt} />}
        </Suspense>
    );
}

export default GameShares;
