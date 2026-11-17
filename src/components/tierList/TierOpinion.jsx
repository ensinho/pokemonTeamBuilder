import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { useTranslation } from '../../hooks/useTranslation';
import { boardIds, TIER_KEYS } from '../../utils/tierList';
import { boardTiers, compareTiers, opinionTiers, opinionVerdict } from '../../utils/tierOpinion';
import { Mascot } from '../Mascot';

/**
 * His opinion (2026-11-17, "Fantasminha de plantão"): the mascot ranked the
 * same theme — by base stat total, a Ghost one tier up, the Gengar line
 * always on top — and once the trainer's list is complete he says how much
 * they agree. Only for a complete themed list (he never judges early), and
 * never a celebration: his face and a line, the trainer's list stays theirs.
 */
export function TierOpinion({ board, monsById }) {
    const { t } = useTranslation();
    const [showHis, setShowHis] = useState(false);
    const ids = useMemo(() => boardIds(board), [board]);
    const his = useMemo(() => opinionTiers(ids.map((id) => monsById.get(id)).filter(Boolean)), [ids, monsById]);
    const result = useMemo(() => compareTiers(boardTiers(board), his), [board, his]);
    const verdict = opinionVerdict(result);
    if (!verdict) return null;

    const nameOf = (id) => monsById.get(id)?.label || `#${id}`;
    const share = result.total ? result.same / result.total : 0;

    return (
        <section className="tier-opinion" aria-labelledby="tier-opinion-title">
            <Mascot size="lg" mood={verdict.mood} seasonal={false} className="tier-opinion__face" />
            <div className="tier-opinion__text">
                <h3 id="tier-opinion-title" className="tier-opinion__title">{t('tierList.opinion.title')}</h3>
                <p className="tier-opinion__line">
                    <strong>{t('tierList.opinion.agree', { same: result.same, total: result.total })}</strong>
                    {' '}
                    {t(`tierList.opinion.${verdict.id}`)}
                </p>
                <span className="tier-opinion__bar" aria-hidden="true">
                    <span className="tier-opinion__same" style={{ '--share': share }} />
                </span>
                {result.worst && (
                    <p className="tier-opinion__worst">
                        {t('tierList.opinion.worst', { name: nameOf(result.worst.id), his: result.worst.his, mine: result.worst.mine })}
                    </p>
                )}
                <p className="tier-opinion__method">{t('tierList.opinion.method')}</p>
                <button type="button" className="btn btn-ghost btn-sm tier-opinion__toggle" aria-expanded={showHis} onClick={() => setShowHis((v) => !v)}>
                    {t(showHis ? 'tierList.opinion.hide' : 'tierList.opinion.show')}
                    <ChevronDown aria-hidden="true" />
                </button>
                {showHis && (
                    <dl className="tier-opinion__list">
                        {TIER_KEYS.map((tier) => {
                            const names = ids.filter((id) => his[id] === tier).map(nameOf);
                            if (!names.length) return null;
                            return (
                                <div key={tier}>
                                    <dt>{tier}</dt>
                                    <dd>{names.join(', ')}</dd>
                                </div>
                            );
                        })}
                    </dl>
                )}
            </div>
        </section>
    );
}

export default TierOpinion;
