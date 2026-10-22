import React, { useMemo, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { useTranslation } from '../../hooks/useTranslation';
import { useMissionLauncher } from '../../hooks/useJourneys';
import { nextMission } from '../../utils/journeys';
import { CloseIcon, StarsIcon } from '../icons';
import '../../styles/journeys.css';

/** The order the gallery reads in: the path first, then what you collect. */
const CATEGORY_ORDER = ['journey', 'teams', 'forum', 'collection', 'pokepuzzle', 'quiz', 'milestone', 'master', 'activity', 'streak'];

/** Where "Go after it" leads for a badge that is not a journey's. */
const CATEGORY_TARGET = {
    teams: '/builder',
    forum: '/feed',
    collection: '/pokedex',
    pokepuzzle: '/pokepuzzle',
    quiz: '/quiz',
    milestone: '/pokepuzzle',
    master: '/quiz',
    activity: '/',
    streak: '/pokepuzzle',
};

/**
 * One badge up close (the reference's "Salas VIP" sheet): the emblem, what it
 * is, how far along the trainer is, and the one action that fits — equip it
 * once earned, or go after it.
 */
function BadgeDetailDialog({ badge, journeys, isEquipped, onToggleEquip, onClose }) {
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const launch = useMissionLauncher();
    const shiny = useShinyBurst();
    const dialogRef = useModalA11y(onClose);

    const name = language === 'pt' ? badge.namePt : badge.nameEn;
    const desc = language === 'pt' ? badge.descPt : badge.descEn;
    const req = language === 'pt' ? badge.reqPt : badge.reqEn;
    const { current, target, percent } = badge.progress;

    const goAfterIt = () => {
        onClose();
        if (badge.journeyId) {
            const journey = journeys.find((j) => j.id === badge.journeyId);
            const mission = nextMission(journey);
            if (mission) launch(mission); else navigate('/journeys');
            return;
        }
        navigate(CATEGORY_TARGET[badge.category] || '/');
    };

    const equip = () => {
        if (!isEquipped) shiny.fire();
        onToggleEquip(badge.id);
    };

    return (
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="badge-detail-title"
                aria-describedby="badge-detail-desc"
                tabIndex={-1}
                className="modal-panel modal-panel--sm"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    <span className="flex-1" />
                    <button type="button" onClick={onClose} aria-label={t('common.close')} className="modal-close">
                        <CloseIcon />
                    </button>
                </div>

                <div className="modal-body badge-detail">
                    <span className={`badge-detail__emblem ${badge.isUnlocked ? '' : 'is-locked'}`} aria-hidden="true">
                        <badge.Icon />
                    </span>
                    <span className="badge badge--caps">
                        {t(`journeys.categories.${badge.category}`)} · {badge.isUnlocked ? t('journeys.badge.unlocked') : t('journeys.badge.locked')}
                    </span>
                    <h2 id="badge-detail-title" className="modal-title">{name}</h2>
                    <p id="badge-detail-desc" className="modal-subtitle">{desc}</p>
                    {!badge.isUnlocked && (
                        <div className="badge-detail__progress">
                            <span className="journey__bar" aria-hidden="true"><i style={{ inlineSize: `${percent}%` }} /></span>
                            <span className="badge-detail__figure">
                                {req} · {t('journeys.badge.progress', { current, target })}
                            </span>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {badge.isUnlocked ? (
                        <button type="button" onClick={equip} className={`btn btn-primary btn-block relative ${shiny.isBursting ? 'is-bursting' : ''}`}>
                            {isEquipped ? <Check aria-hidden="true" /> : <StarsIcon />}
                            {isEquipped ? t('journeys.badge.equipped') : t('journeys.badge.equip')}
                            {shiny.burst}
                        </button>
                    ) : (
                        <button type="button" onClick={goAfterIt} className="btn btn-primary btn-block">
                            {t('journeys.badge.go')} <ArrowRight aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Every badge, grouped the way it is earned (the reference's Medalhas tab):
 * a heading with how many of the group are earned, then the emblems. A badge
 * still to earn is drawn in grey — the shape is there, the colour is not yet.
 * The groups stand on the page, apart by whitespace: ten bordered boxes, most
 * of them two emblems wide, made the tab a stack of empty frames (2026-10-22).
 */
export function BadgeGallery({ badges, journeys, selectedBadgeId, onToggleEquip }) {
    const { t, language } = useTranslation();
    const [openId, setOpenId] = useState(null);

    const groups = useMemo(() => CATEGORY_ORDER
        .map((category) => ({ category, items: badges.filter((b) => b.category === category) }))
        .filter((group) => group.items.length > 0), [badges]);

    const open = badges.find((b) => b.id === openId) || null;

    return (
        <div className="badge-gallery">
            {groups.map(({ category, items }) => (
                <section key={category} className="badge-group">
                    <header className="section-head">
                        <h3 className="section-title">{t(`journeys.categories.${category}`)}</h3>
                        <span className="section-action badge-group__count">
                            {items.filter((b) => b.isUnlocked).length}/{items.length}
                        </span>
                    </header>
                    <p className="badge-group__sub">{t(`journeys.categorySubs.${category}`)}</p>
                    <ul className="badge-group__grid">
                        {items.map((badge) => (
                            <li key={badge.id}>
                                <button
                                    type="button"
                                    className={`badge-tile ${badge.isUnlocked ? 'is-unlocked' : ''} ${badge.id === selectedBadgeId ? 'is-equipped' : ''}`}
                                    onClick={() => setOpenId(badge.id)}
                                >
                                    <span className="badge-tile__emblem" aria-hidden="true"><badge.Icon /></span>
                                    <span className="badge-tile__name">{language === 'pt' ? badge.namePt : badge.nameEn}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            {open && (
                <BadgeDetailDialog
                    badge={open}
                    journeys={journeys}
                    isEquipped={open.id === selectedBadgeId}
                    onToggleEquip={onToggleEquip}
                    onClose={() => setOpenId(null)}
                />
            )}
        </div>
    );
}

export default BadgeGallery;
