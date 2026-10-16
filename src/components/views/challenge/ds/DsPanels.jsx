import { Link } from 'react-router-dom';

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
 * Bottom screen after the battle — the peak-end moment: the outcome, the
 * numbers, and the next step (a practice rematch, or home). The win-chance
 * chart joins here later (its curve already comes with the result).
 */
export function DsResult({ run, stats, onPractice, onShare, inputRef }) {
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

    if (inputRef) inputRef.current = { onAction: (action) => { if (action === 'a') onPractice(); } };

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
                {onShare && <button type="button" className="ds-cmd is-share" onClick={onShare}>{t('challenge.share.button')}</button>}
                <Link className="ds-cmd is-plain" to="/">{t('challenge.result.home')}</Link>
            </div>
        </div>
    );
}
