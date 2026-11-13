import React from 'react';
import '../../styles/professor-entry.css';
import { Mascot } from '../Mascot';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * A Pokémon's Pokédex entry, taught by the mascot in his professor costume
 * (2026-11-13: "trazer o mascote … com a skin de professor ensinando o user").
 * He gestures with the pointer, the entry is the copy — never first person
 * (docs/modules/mascot.md, "He gestures, the app speaks"). The professor's hat
 * is passed by name, so it wins over the trainer's costume and the season.
 */
export function ProfessorEntry({ text, lang, note, className = '' }) {
    const { t } = useTranslation();
    return (
        <figure className={`professor-entry ${className}`}>
            <Mascot
                size="xl"
                framing="head"
                mood="feliz"
                pose="ensinando"
                hat="professor"
                interactive
                className="professor-entry__mascot"
            />
            <div className="professor-entry__bubble">
                <figcaption className="professor-entry__eyebrow">{t('pokedex.professorSays')}</figcaption>
                <p className="professor-entry__text" lang={lang}>{text}</p>
                {note && <p className="professor-entry__note">{note}</p>}
            </div>
        </figure>
    );
}
