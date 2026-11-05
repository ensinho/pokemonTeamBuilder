import { useTranslation } from '../../../../hooks/useTranslation';
import { promptSignIn } from '../../../../utils/navigation';

/** Bottom screen for a guest at the encounter: sign in, and the screen carries on. */
export function DsSignInGate({ championName, onCancel }) {
    const { t } = useTranslation();
    return (
        <div className="ds-panel">
            <p className="ds-panel__title">{t('challenge.gate.title', { name: championName })}</p>
            <p className="ds-panel__body">{t('challenge.gate.body')}</p>
            <div className="ds-panel__actions">
                <button type="button" className="ds-go" onClick={() => promptSignIn('signIn')}>{t('challenge.gate.signIn')}</button>
                <button type="button" className="ds-cmd is-plain" onClick={() => promptSignIn('signUp')}>{t('challenge.gate.signUp')}</button>
            </div>
            {onCancel && <button type="button" className="bw-cancel" onClick={onCancel}>{t('challenge.command.back')}</button>}
        </div>
    );
}

/**
 * Another champion is waiting: shown in the room to a trainer who has beaten
 * this one and hasn't faced the other today. One press goes; "later" hides it.
 */
export function DsChampionHint({ beatenName, nextName, onGo, onDismiss }) {
    const { t } = useTranslation();
    return (
        <div className="ds-panel" role="status">
            <p className="ds-panel__title">{t('challenge.hint.title', { name: nextName })}</p>
            <p className="ds-panel__body">{t('challenge.hint.body', { beaten: beatenName, name: nextName })}</p>
            <div className="ds-panel__actions">
                <button type="button" className="ds-go" onClick={onGo}>{t('challenge.hint.go', { name: nextName })}</button>
                <button type="button" className="ds-cmd is-plain" onClick={onDismiss}>{t('challenge.hint.later')}</button>
            </div>
        </div>
    );
}

/**
 * Bottom screen after the battle — the peak-end moment: the outcome, the
 * numbers, and the next step: a rematch, sharing it to the forum, or back to
 * the room, where another champion may be waiting (`onBack`).
 */
export function DsResult({ run, stats, onPractice, onShare, onBack, isSharing = false, inputRef }) {
    const { t } = useTranslation();
    const won = run.status === 'won';
    const headline = run.practice
        ? t(won ? 'challenge.result.practiceWon' : 'challenge.result.practiceLost')
        : t(`challenge.result.${run.status}`);
    const result = run.result || {};
    const figures = [
        ['turns', result.turns],
        ['remaining', result.remaining],
        ['score', result.score],
        ...(!run.practice && stats ? [['streak', stats.streak], ['bestStreak', stats.bestStreak]] : []),
    ].filter(([, value]) => Number.isFinite(value));

    if (inputRef) {
        inputRef.current = {
            onAction: (action) => {
                if (action === 'a') onPractice();
                else if (action === 'b') onBack?.();
            },
        };
    }

    return (
        <div className={`ds-panel ds-result ${won ? 'is-won' : 'is-lost'}`}>
            <p className="ds-result__title">{headline}</p>
            <dl className="ds-result__figures">
                {figures.map(([key, value]) => (
                    <div key={key}>
                        <dt>{t(`challenge.result.${key}`)}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
            {result.place && (
                <p className="ds-result__place">{t('challenge.ranking.placeLine', { place: result.place, board: t(`challenge.ranking.${result.board || 'daily'}`) })}</p>
            )}
            <p className="ds-panel__body">{run.practice ? t('challenge.result.practiceNote') : t('challenge.result.comeBack')}</p>
            <div className={`ds-panel__actions ${onShare ? 'is-three' : ''}`}>
                <button type="button" className="ds-go" onClick={onPractice}>{t('challenge.result.practice')}</button>
                {onShare && (
                    <button type="button" className="ds-cmd is-share" onClick={onShare} disabled={isSharing}>
                        {isSharing ? '…' : t('challenge.share.button')}
                    </button>
                )}
                <button type="button" className="ds-cmd is-plain" onClick={onBack}>{t('challenge.result.back')}</button>
            </div>
        </div>
    );
}
