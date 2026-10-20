import { useTranslation } from '../../../hooks/useTranslation';

/**
 * After a friend battle — the peak-end moment: the outcome, the figures, and
 * the next step. REVANCHE is one tap to the same friend; REVER replays the
 * battle from this device's copy of the log, no request at all.
 *
 * @param {{outcome: 'won'|'lost'|'tie'|'forfeitWon'|'forfeitLost'}} props
 */
export function PvpResult({
    outcome, opponentName, turns, remaining, onRematch, onReplay, onShare, onBack, inputRef,
}) {
    const { t } = useTranslation();
    const won = outcome === 'won' || outcome === 'forfeitWon';
    const figures = [
        ['turns', turns],
        ['remaining', remaining],
    ].filter(([, value]) => Number.isFinite(value) && value > 0);

    if (inputRef) {
        inputRef.current = {
            onAction: (action) => {
                if (action === 'a') (onRematch || onReplay || onBack)?.();
                else if (action === 'b') onBack();
            },
        };
    }
    const actions = [
        onRematch && <button key="rematch" type="button" className="ds-go" onClick={onRematch}>{t('battle.result.rematch')}</button>,
        onReplay && <button key="replay" type="button" className="ds-cmd is-plain" onClick={onReplay}>{t('battle.result.replay')}</button>,
        onShare && <button key="share" type="button" className="ds-cmd is-share" onClick={onShare}>{t('challenge.share.button')}</button>,
    ].filter(Boolean);

    return (
        <div className={`ds-panel ds-result pvp-result ${won ? 'is-won' : 'is-lost'}`}>
            <p className="ds-result__title">{t(`battle.result.${outcome}`, { name: opponentName })}</p>
            {figures.length > 0 && (
                <dl className="ds-result__figures">
                    {figures.map(([key, value]) => (
                        <div key={key}>
                            <dt>{t(`challenge.result.${key}`)}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            )}
            <p className="ds-panel__body">{t(won ? 'battle.result.wonBody' : 'battle.result.lostBody', { name: opponentName })}</p>
            {actions.length > 0 && <div className={`ds-panel__actions ${actions.length > 2 ? 'is-three' : ''}`}>{actions}</div>}
            <button type="button" className="bw-cancel" onClick={onBack}>{t('battle.result.toList')}</button>
        </div>
    );
}
