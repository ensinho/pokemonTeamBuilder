import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { useModalA11y } from '../../../hooks/useModalA11y';
import { useTranslation } from '../../../hooks/useTranslation';
import { useForumStore } from '../../../store/useForumStore';
import { toast } from '../../../store/useToastStore';
import { track } from '../../../services/analytics';
import { toTimeline } from '../../../utils/battleTimeline';
import { buildChallengeShare } from '../../../utils/challengeShare';
import { cleanStrip, pickStrip } from '../../../utils/battleStrip';
import { BattleStrip } from '../../BattleStrip';
import { Loader } from '../../Loader';

/**
 * The battle's comic strip (2026-11-17, "Fantasminha de plantão"): after a
 * Champion battle the mascot plays its three moments back — how it opened,
 * the turn it turned on, how it ended — his face and the battle's own line
 * in each panel (utils/battleStrip.js picks them). "Postar no Diário" posts
 * the result with the strip (`sharedChallenge.strip`), drawn again in the
 * thread by `BattleStrip`.
 */

export function BattleStripDialog({ run, championId, championName, dayKey, difficulty, streak = 0, onClose }) {
    const { t } = useTranslation();
    const ref = useModalA11y(onClose);
    const [posting, setPosting] = useState(false);
    const [posted, setPosted] = useState(false);
    const won = run?.status === 'won';
    const panels = useMemo(() => pickStrip(toTimeline(run?.lines || []), { mySide: 'p1', won }), [run, won]);
    const strip = useMemo(() => cleanStrip(panels), [panels]);

    const post = async () => {
        if (posting || !strip) return;
        setPosting(true);
        try {
            const outcome = run.result || {};
            const ok = await useForumStore.getState().postToDiary({
                sharedChallenge: buildChallengeShare({
                    dayKey,
                    championId,
                    difficulty,
                    status: run.status,
                    result: outcome,
                    streak,
                    place: outcome.place || null,
                    board: outcome.board || null,
                    curve: run.winChanceCurve || outcome.winChanceCurve || [],
                    strip,
                }),
            });
            if (ok) {
                setPosted(true);
                toast.success(t('challenge.share.posted'));
                track('strip_post', { champion: championId });
            }
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="modal-scrim">
            <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="battle-strip-title" tabIndex={-1} className="modal-panel battle-strip-dialog">
                <div className="modal-header">
                    <h2 id="battle-strip-title" className="modal-title">{t('challenge.strip.title')}</h2>
                    <button type="button" className="modal-close" onClick={onClose} aria-label={t('challenge.strip.close')}>
                        <X aria-hidden="true" />
                    </button>
                </div>
                <div className="modal-body">
                    {panels.length ? (
                        <BattleStrip panels={panels} championName={championName} />
                    ) : (
                        <p className="battle-strip__empty">{t('challenge.strip.empty')}</p>
                    )}
                </div>
                {!run?.practice && strip && (
                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={post} disabled={posting || posted}>
                            {posting && <Loader size="xs" />}
                            {t(posted ? 'challenge.strip.posted' : 'challenge.strip.post')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BattleStripDialog;
