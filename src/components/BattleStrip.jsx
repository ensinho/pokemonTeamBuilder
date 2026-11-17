import React from 'react';
import '../styles/battle-strip.css';

import { useTranslation } from '../hooks/useTranslation';
import { eventText } from '../utils/challengeText';
import { stripEvent } from '../utils/battleStrip';
import { Mascot } from './Mascot';

/**
 * The mascot's comic strip of a Champion battle (2026-11-17, "Fantasminha de
 * plantão" — utils/battleStrip.js): his face in each panel, the battle's own
 * lines under it. Drawn in the strip dialog after a battle and again in the
 * Diário when the result was posted with it.
 */
export function BattleStrip({ panels, championName, size = 'lg', compact = false }) {
    const { t } = useTranslation();
    return (
        <ol className={`battle-strip ${compact ? 'battle-strip--compact' : ''}`}>
            {panels.map((panel, i) => (
                <li key={i} className="battle-strip__panel">
                    <Mascot size={size} mood={panel.mood} seasonal={false} className="battle-strip__face" />
                    <p className="battle-strip__lines">
                        {panel.events.map((event, k) => {
                            const said = eventText(stripEvent(event, championName), { t, mySide: 'p1', championName });
                            return said.text ? <span key={k}>{said.text}</span> : null;
                        })}
                    </p>
                </li>
            ))}
        </ol>
    );
}

export default BattleStrip;
