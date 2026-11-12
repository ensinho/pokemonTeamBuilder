import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { MascotFace } from '../Mascot';

/**
 * The mascot's note of the day (2026-11-10): his face is the readout, the
 * sentence is the app's. What it says is `homeNote()`'s call
 * (utils/mascot/assistant.js), never this component's.
 *
 * Harmony pass (2026-11-12): it is the greeting's second line (HomeGreeting),
 * no longer a band of its own with a × — a whole band for six words, and the
 * greeting's question above it often said the opposite ("Pronto para o
 * desafio?" over "Tudo feito hoje"). When there is a note, it IS the line.
 * The line is still the way to what it mentions (a link, or the streak sheet).
 */
export function MascotNote({ note, onOpenStreak, face = true }) {
    const { t } = useTranslation();
    if (!note) return null;

    const inner = (
        <>
            {/* the greeting's circle shows him now (face={false}); elsewhere the sticker */}
            {face && <MascotFace mood={note.mood} size="xs" className="mascot-note__face" />}
            <span className="mascot-note__text">{t(`mascot.note.${note.id}`, { n: note.n })}</span>
            {(note.to || note.action === 'streak') && <ChevronRight className="mascot-note__go" aria-hidden="true" />}
        </>
    );
    if (note.to) return <Link to={note.to} className="mascot-note" data-note={note.id}>{inner}</Link>;
    if (note.action === 'streak') {
        return <button type="button" className="mascot-note" data-note={note.id} onClick={onOpenStreak}>{inner}</button>;
    }
    return <p className="mascot-note" data-note={note.id}>{inner}</p>;
}

export default MascotNote;
