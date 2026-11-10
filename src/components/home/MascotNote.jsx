import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { localDayKey } from '../../utils/dailyCheckin';
import { Mascot } from '../Mascot';

/**
 * The mascot's note of the day (2026-11-10): one line under the greeting —
 * his face is the readout, the sentence is the app's. What it says is
 * `homeNote()`'s call (utils/mascot/assistant.js), never this component's.
 *
 * The whole line is the way to the thing it mentions (a link, or the streak
 * sheet), and the × sends him off until tomorrow: an assistant that cannot be
 * told to stop is the one everybody remembers for the wrong reason.
 */
const DISMISS_KEY = 'ptb:mascotNote';

const readDismissed = () => {
    try { return localStorage.getItem(DISMISS_KEY); } catch { return null; }
};

export function MascotNote({ note, onOpenStreak }) {
    const { t } = useTranslation();
    const today = localDayKey();
    const [dismissedOn, setDismissedOn] = useState(readDismissed);
    if (!note || dismissedOn === today) return null;

    const dismiss = () => {
        setDismissedOn(today);
        try { localStorage.setItem(DISMISS_KEY, today); } catch { /* he just comes back on the next visit */ }
    };
    const text = <span className="mascot-note__text">{t(`mascot.note.${note.id}`, { n: note.n })}</span>;
    const go = <ChevronRight className="mascot-note__go" aria-hidden="true" />;

    return (
        <aside className="mascot-note" data-note={note.id} aria-label={t('mascot.note.label')}>
            <Mascot size="md" mood={note.mood} seasonal={false} interactive stage />
            <div className="mascot-note__bubble">
                {note.to ? (
                    <Link to={note.to} className="mascot-note__body">{text}{go}</Link>
                ) : note.action === 'streak' ? (
                    <button type="button" className="mascot-note__body" onClick={onOpenStreak}>{text}{go}</button>
                ) : (
                    <p className="mascot-note__body">{text}</p>
                )}
                <button type="button" className="mascot-note__close touch-target" onClick={dismiss} aria-label={t('mascot.note.dismiss')} title={t('mascot.note.dismiss')}>
                    <X aria-hidden="true" />
                </button>
            </div>
        </aside>
    );
}

export default MascotNote;
