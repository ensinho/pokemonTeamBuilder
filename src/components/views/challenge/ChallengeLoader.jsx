import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

import { useTranslation } from '../../../hooks/useTranslation';
import { Mascot } from '../../Mascot';
import { ChampionFace } from './ChallengeRanking';

const STEP_KEYS = ['arena', 'team', 'room'];
const TIP_COUNT = 5;
const CHEER_MOODS = ['determinado', 'animado', 'confiante', 'radiante'];
const CHEER_GESTURES = ['hop', 'wave', 'celebrate', 'jump'];

/**
 * Interactive loading room for the Champion Challenge.
 * Gives the trainer live prep steps, a tappable battle-ready mascot, and
 * cyclable strategy tips while the champion room settles.
 */
export function ChallengeLoader({ championId, championName }) {
    const { t } = useTranslation();
    const [stepIndex, setStepIndex] = useState(0);
    const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIP_COUNT));
    const [cheers, setCheers] = useState(0);
    const [gesture, setGesture] = useState({ name: null, id: 0 });

    useEffect(() => {
        const t1 = setTimeout(() => setStepIndex(1), 650);
        const t2 = setTimeout(() => setStepIndex(2), 1450);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [championId]);

    const handleMascotTap = () => {
        const next = cheers + 1;
        setCheers(next);
        setGesture({ name: CHEER_GESTURES[next % CHEER_GESTURES.length], id: next });
    };

    const nextTip = () => setTipIndex((i) => (i + 1) % TIP_COUNT);

    const mood = CHEER_MOODS[cheers % CHEER_MOODS.length];
    const currentStepKey = STEP_KEYS[stepIndex] || 'room';

    return (
        <div className="challenge-loading" role="status" aria-live="polite">
            <div className="challenge-loader-card">
                <div className="challenge-loader-card__versus">
                    <button
                        type="button"
                        className="challenge-loader-card__mascot-btn"
                        onClick={handleMascotTap}
                        aria-label={t('challenge.loader.cheerAria')}
                    >
                        <Mascot
                            size="lg"
                            mood={mood}
                            pose="batalha"
                            play={gesture.name}
                            playKey={gesture.id}
                            seasonal={false}
                        />
                        <span className="challenge-loader-card__tap-hint">
                            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                            {cheers > 0
                                ? t('challenge.loader.cheered', { count: cheers })
                                : t('challenge.loader.tapHint')}
                        </span>
                    </button>

                    <span className="challenge-loader-card__vs" aria-hidden="true">VS</span>

                    <div className="challenge-loader-card__champ">
                        <span className="challenge-loader-card__champ-ring">
                            <ChampionFace championId={championId} size="lg" />
                        </span>
                        <span className="challenge-loader-card__champ-name">{championName}</span>
                    </div>
                </div>

                <div className="challenge-loader-card__status">
                    <p className="challenge-loader-card__label">
                        {t(`challenge.loader.steps.${currentStepKey}`, { name: championName })}
                    </p>
                    <ol className="challenge-loader-card__steps" aria-hidden="true">
                        {STEP_KEYS.map((key, idx) => (
                            <li
                                key={key}
                                className={`challenge-loader-card__dot ${idx < stepIndex ? 'is-done' : ''} ${idx === stepIndex ? 'is-active' : ''}`}
                            />
                        ))}
                    </ol>
                </div>

                <div className="challenge-loader-card__tip">
                    <div className="challenge-loader-card__tip-head">
                        <span className="challenge-loader-card__tip-kicker">{t('challenge.loader.tipKicker')}</span>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm challenge-loader-card__tip-next"
                            onClick={nextTip}
                        >
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t('challenge.loader.nextTip')}</span>
                        </button>
                    </div>
                    <p className="challenge-loader-card__tip-body">
                        {t(`challenge.loader.tips.t${tipIndex}`, { name: championName })}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ChallengeLoader;
