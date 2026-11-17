import { useState } from 'react';
import { ChevronLeft, Flag } from 'lucide-react';

import { typeColors } from '../../../../constants/types';
import { useTranslation } from '../../../../hooks/useTranslation';
import { getBattleIcon } from '../../../../utils/battleSprites';
import { hpTone } from '../../../../utils/battleState';
import { moveMatchup, multiplierLabel } from '../../../../utils/moveMatchup';
import { play } from '../../../../utils/challengeSfx';
import { moveChoosable } from '../../../../hooks/useBattleCommands';
import { DsTeamSheet } from './DsTeamSheet';
import { DsTextBox } from './DsTextBox';

/*
 * The battle menu in the style of Pokémon Black & White, in its two homes:
 *
 *   DsTouchMenu — a phone's bottom screen, as on the DS: red, the wide FIGHT
 *                 capsule in the middle, three buttons along the bottom, both
 *                 sides' Poké Balls; moves, party and her team replace it.
 *   DsHud       — a desktop's single screen: a strip along the bottom with
 *                 the message on the left and four buttons on the right; the
 *                 moves take the buttons' place and the box on the left
 *                 describes the one in focus.
 *
 * Both read the same state (`useBattleCommands`). There is no BAG — no items in
 * this challenge — so its yellow slot opens her team, the dossier. POKéMON
 * opens your team's sheet (DsTeamSheet), the way to send one in on your turn.
 */

/** PP colour, as on the DS: yellow at half, orange at a quarter, red at none. */
const ppTone = (pp, max) => {
    if (!pp) return 'out';
    if (!max) return 'ok';
    if (pp <= max / 4) return 'low';
    if (pp <= max / 2) return 'mid';
    return 'ok';
};

/**
 * What a move would do to the Pokémon in front of it (`moveMatchup`): Tera
 * Blast armed with TERA takes the Tera type, as in the games. Null for a
 * status move, a neutral hit or an empty slot across the field.
 */
const matchupFor = (move, meta, target, cmd) => {
    if (!move || !meta?.type || !target) return null;
    const teraBlast = cmd.armed && cmd.gimmick === 'terastallize' && cmd.teraType && String(move.id || move.name).toLowerCase().replace(/[^a-z]/g, '') === 'terablast';
    const reading = moveMatchup({ moveType: teraBlast ? String(cmd.teraType).toLowerCase() : meta.type, category: meta.category, target });
    return reading && reading.tone !== 'neutral' ? reading : null;
};

/** The matchup as the HUD shows it: a word (hidden in the desktop strip) and the figure. */
function MatchupTag({ reading, className = '' }) {
    const { t } = useTranslation();
    if (!reading) return null;
    const word = t(`challenge.command.matchup.${reading.tone}`);
    return (
        <span className={`bw-eff is-${reading.tone} ${className}`} title={word}>
            <span className="bw-eff__word">{word}</span>
            <span className="bw-eff__figure" aria-hidden="true">{multiplierLabel(reading.multiplier)}</span>
        </span>
    );
}

function MoveButton({ move, meta, focused, onChoose, onFocus, cmd, target }) {
    const { t } = useTranslation();
    if (!move) return <span className="bw-move is-empty" aria-hidden="true" />;
    const category = meta?.category ? meta.category.toLowerCase() : null;
    // Z armed: the move reads as the Z-Move it becomes; the others wait.
    const asZ = cmd.armed && cmd.gimmick === 'zmove' && move.zMove;
    const reading = matchupFor(move, meta, target, cmd);
    return (
        <button
            type="button"
            className={`bw-move ${focused ? 'is-focused' : ''} ${asZ ? 'is-z' : ''}`}
            style={{ '--type': typeColors[meta?.type] || 'var(--ds-ink-soft)' }}
            disabled={!moveChoosable(move, cmd.gimmick, cmd.armed)}
            onClick={() => onChoose(move)}
            onPointerEnter={onFocus}
            onFocus={onFocus}
        >
            <span className="bw-move__head">
                <span className="bw-move__name">{asZ ? move.zMove : move.name}</span>
                <MatchupTag reading={reading} />
            </span>
            <span className="bw-move__meta">
                {meta?.type && <span className="bw-move__type">{t(`types.${meta.type}`)}</span>}
                {category && <span className={`ds-move__cat is-${category}`} role="img" aria-label={t(`challenge.command.category.${category}`)} />}
                {Number.isFinite(move.pp) && (
                    <span className={`bw-move__pp is-${ppTone(move.pp, move.maxpp)}`}>PP {move.pp}/{move.maxpp}</span>
                )}
            </span>
        </button>
    );
}

/**
 * The gimmick switch — MEGA, Z or TERA, whichever the active Pokémon has (one
 * at most); the move chosen next uses it. TERA wears its type's colour.
 */
function MegaToggle({ cmd }) {
    const { t } = useTranslation();
    if (!cmd.gimmick) return null;
    const tera = cmd.gimmick === 'terastallize';
    const type = tera ? String(cmd.teraType || '').toLowerCase() : null;
    const label = {
        mega: t('challenge.command.megaLabel'),
        zmove: t('challenge.command.zLabel'),
        terastallize: t('challenge.command.teraLabel', { type: type ? t(`types.${type}`) : '' }),
    }[cmd.gimmick];
    const text = { mega: t('challenge.command.mega'), zmove: t('challenge.command.z'), terastallize: t('challenge.command.tera') }[cmd.gimmick];
    return (
        <button
            type="button"
            className={`bw-mega is-${cmd.gimmick}`}
            style={tera && typeColors[type] ? { '--tera': typeColors[type] } : undefined}
            aria-pressed={cmd.armed}
            onClick={cmd.toggleGimmick}
            aria-label={label}
            title={label}
        >
            {text}
        </button>
    );
}

function MoveGrid({ cmd, request, moveMeta, target }) {
    const slots = Array.from({ length: 4 }, (_, i) => request.moves?.[i] || null);
    return (
        <div className="bw-moves__grid">
            {slots.map((move, index) => (
                <MoveButton
                    key={move ? move.slot : `empty-${index}`}
                    move={move}
                    meta={move ? moveMeta(move.name) : null}
                    focused={cmd.focus === index}
                    onChoose={cmd.chooseMove}
                    onFocus={() => cmd.setFocus(index)}
                    cmd={cmd}
                    target={target}
                />
            ))}
        </div>
    );
}

const GENDER = { M: '♂', F: '♀' };

/**
 * BW's party screen ("Choose a Pokémon", 2026-11-15 — Enzo's reference): the
 * six as cards, two columns, the right one standing half a step lower as on
 * the DS. Each card is what a trainer checks before a switch — the icon on a
 * platform in its first type, the name, the HP bar, the level and the HP as
 * figures, the status — and the one out has a Poké Ball by its name. Built on
 * the screen's 8-pixel grid: 36-px cards, 8 between them, 4 of stagger.
 * A tap picks a card; a tap on the picked one opens its sheet.
 */
function PartyGrid({ cmd, sheet, onSummary }) {
    const { t } = useTranslation();
    const pick = (index) => {
        if (index === cmd.member) {
            onSummary();
            return;
        }
        play('cursor');
        cmd.setMember(index);
    };
    return (
        <ul className="bw-party" aria-label={t('challenge.sheet.title')}>
            {sheet.map((mon, index) => {
                const icon = getBattleIcon(mon.species);
                const hp = mon.hp;
                const figures = hp ? (hp.max ? `${hp.current}/${hp.max}` : `${hp.pct}%`) : null;
                return (
                    // The team's order is fixed for the battle.
                    <li key={`${mon.species}-${index}`}>
                        <button
                            type="button"
                            className={`bw-party__card ${index === cmd.member ? 'is-picked' : ''} ${mon.fainted ? 'is-fainted' : ''}`}
                            style={{ '--type': typeColors[mon.types?.[0]] || 'var(--hud-edge)' }}
                            aria-pressed={index === cmd.member}
                            aria-label={[mon.species, mon.active ? t('challenge.sheet.onField') : null, figures ? `HP ${figures}` : null].filter(Boolean).join(', ')}
                            onClick={() => pick(index)}
                        >
                            <span className="bw-party__art" aria-hidden="true">
                                {icon.url && <img src={icon.url} alt="" width={40} height={30} decoding="async" draggable="false" />}
                            </span>
                            <span className="bw-party__name">
                                {mon.active && <span className="bw-party__out" aria-hidden="true" />}
                                <span className="bw-party__species">{mon.species}</span>
                                {mon.status
                                    ? <span className={`ds-hpbox__status is-${mon.status}`}>{String(mon.status).toUpperCase()}</span>
                                    : GENDER[mon.gender] && <span className={`ds-hpbox__gender is-${mon.gender === 'F' ? 'f' : 'm'}`}>{GENDER[mon.gender]}</span>}
                            </span>
                            <span className="bw-party__bar" aria-hidden="true">
                                <span className="bw-party__hp-mark">HP</span>
                                <span className="bw-card__hp">
                                    {hp && <span className={`ds-partymon__fill is-${hpTone(hp.pct)}`} style={{ '--hp': hp.pct / 100 }} />}
                                </span>
                            </span>
                            <span className="bw-party__figures" aria-hidden="true">
                                <span>Lv{mon.level}</span>
                                {figures && <span>{figures}</span>}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * Your six, in two steps as on the DS: the party (PartyGrid) and, for the one
 * picked, BW's Summary (DsTeamSheet). Readable while the turn plays; on your
 * turn the picked one can be sent in from either. A forced switch has no way
 * back to the menu.
 */
function PartySheet({ cmd, sheet }) {
    const { t } = useTranslation();
    const [summary, setSummary] = useState(false);
    const shown = sheet[cmd.member];
    const send = cmd.switchable && (
        <button type="button" className="bw-btn is-pokemon bw-party__send" onClick={() => cmd.chooseSwitch(cmd.switchable)}>
            {t(cmd.reviving ? 'challenge.sheet.revive' : 'challenge.sheet.switchIn', { name: shown?.species || cmd.switchable.name })}
        </button>
    );

    if (summary) {
        return (
            <div className="bw-sheet">
                <DsTeamSheet members={sheet} index={cmd.member} onSelect={cmd.setMember} />
                <div className="bw-ficha__foot">
                    <button type="button" className="bw-cancel" onClick={() => { play('cancel'); setSummary(false); }}>{t('challenge.command.back')}</button>
                    {send}
                </div>
            </div>
        );
    }

    return (
        <div className="bw-sheet is-party">
            <PartyGrid cmd={cmd} sheet={sheet} onSummary={() => { play('confirm'); setSummary(true); }} />
            <div className="bw-party__foot">
                {send || (
                    <p className="bw-party__prompt" role="status">
                        {t(cmd.reviving ? 'challenge.command.chooseRevive' : cmd.forced ? 'challenge.command.chooseWho' : 'challenge.sheet.choose')}
                    </p>
                )}
                <button type="button" className="bw-cancel bw-party__summary" onClick={() => { play('confirm'); setSummary(true); }} disabled={!shown}>
                    {t('challenge.sheet.summary')}
                </button>
                {!cmd.forced && <button type="button" className="bw-cancel" onClick={() => cmd.open('main')}>{t('challenge.command.back')}</button>}
            </div>
        </div>
    );
}

/**
 * Her six: dim silhouettes and "???" until each one is sent out — then its
 * types, so a trainer can plan the next switch without leaving the battle.
 */
function DossierGrid({ cmd, foe, championName, title, typesOf }) {
    const { t } = useTranslation();
    return (
        <div className="bw-sheet is-dossier">
            <p className="bw-sheet__title">{title || t('challenge.poketch.dossier', { name: championName })}</p>
            <ul className="bw-sheet__grid">
                {foe.map((mon, index) => {
                    const icon = mon.species ? getBattleIcon(mon.species) : null;
                    const name = mon.revealed ? mon.species : t('challenge.poketch.unknown');
                    const types = mon.revealed && typesOf ? typesOf(mon.species) : [];
                    return (
                        // Her sending order is fixed for the day.
                        <li key={index} className={`bw-card is-foe ${mon.revealed ? 'is-revealed' : ''} ${mon.fainted ? 'is-fainted' : ''}`}>
                            {icon?.url
                                ? <img src={icon.url} alt={name} width={40} height={30} decoding="async" draggable="false" />
                                : <span className="bw-card__unknown" aria-label={name}>?</span>}
                            <span className="bw-card__text">
                                <span className="bw-card__name">{name}</span>
                                {types.length > 0 && (
                                    <span className="bw-card__types">
                                        {types.map((type) => (
                                            <span key={type} className="bw-move__type" style={{ '--type': typeColors[type] }}>{t(`types.${type}`)}</span>
                                        ))}
                                    </span>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ul>
            <button type="button" className="bw-cancel" onClick={() => cmd.open('main')}>{t('challenge.command.back')}</button>
        </div>
    );
}

function BallRow({ slots, className }) {
    return (
        <span className={`bw-balls ${className}`} aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => slots[i] || null).map((slot, i) => (
                // Fixed six positions.
                <span key={i} className={`ds-ball ${!slot ? 'is-empty' : slot.fainted ? 'is-fainted' : ''}`} />
            ))}
        </span>
    );
}

/**
 * Who is still standing, as one line (2026-11-17, the HUD clarity pass): your
 * balls under your name, theirs under theirs — the two loose rows of BW's
 * touch screen read as decoration to anyone who never held a DS.
 */
function Scoreboard({ myBalls, foeBalls, foeName }) {
    const { t } = useTranslation();
    const left = (slots) => slots.filter((slot) => slot && !slot.fainted).length;
    return (
        <div className="bw-score">
            <span className="bw-score__side">
                <span className="bw-score__name">{t('challenge.command.you')}</span>
                <BallRow slots={myBalls} className="is-mine" />
            </span>
            <span className="bw-score__vs" aria-label={t('challenge.command.standing', { mine: left(myBalls), theirs: left(foeBalls), name: foeName })}>
                {left(myBalls)}<span className="bw-score__dash" aria-hidden="true">–</span>{left(foeBalls)}
            </span>
            <span className="bw-score__side is-foe">
                <span className="bw-score__name">{foeName}</span>
                <BallRow slots={foeBalls} className="is-foe" />
            </span>
        </div>
    );
}

/** DESISTIR as a quiet flag: rare, irreversible (it asks first), never the size of LUTAR. */
function ForfeitButton({ cmd, disabled, className = '' }) {
    const { t } = useTranslation();
    const label = t('challenge.command.forfeitLabel');
    return (
        <button type="button" className={`bw-flag ${className}`} onClick={cmd.forfeit} disabled={disabled} aria-label={label} title={label}>
            <Flag aria-hidden="true" />
        </button>
    );
}

/**
 * A phone's bottom screen. While the turn plays it stays on the menu, dimmed —
 * as the DS does — so the layout never jumps between turns.
 */
export function DsTouchMenu({ cmd, request, enabled, moveMeta, target = null, typesOf = null, myBalls, foeBalls, sheet, championName, clock, turn, labels = null }) {
    const { t } = useTranslation();
    const status = (
        <div className="bw-touch__status" aria-hidden="true">
            <span>{clock}</span>
            {turn > 0 && <span>{t('challenge.command.turn', { n: turn })}</span>}
        </div>
    );
    if (enabled && cmd.view === 'moves') {
        return (
            <div className="bw-touch is-moves">
                {status}
                <MoveGrid cmd={cmd} request={request} moveMeta={moveMeta} target={target} />
                <div className="bw-moves__foot">
                    <MegaToggle cmd={cmd} />
                    <button type="button" className="bw-cancel" onClick={() => cmd.open('main')}>{t('challenge.command.back')}</button>
                </div>
            </div>
        );
    }
    // A forced switch waits for the faint to play out before it takes the screen.
    if (cmd.view === 'party' && (enabled || !cmd.forced)) return <div className="bw-touch is-sheet">{status}<PartySheet cmd={cmd} sheet={sheet} /></div>;
    if (cmd.view === 'dossier') return <div className="bw-touch is-sheet">{status}<DossierGrid cmd={cmd} foe={foeBalls} championName={championName} title={labels?.foeTitle} typesOf={typesOf} /></div>;

    return (
        <div className={`bw-touch is-main ${enabled ? '' : 'is-waiting'}`}>
            {status}
            <Scoreboard myBalls={myBalls} foeBalls={foeBalls} foeName={championName} />
            <button type="button" className="bw-fight" onClick={() => cmd.open('moves')} disabled={!enabled || request.kind !== 'move'}>
                <span className="bw-fight__label">{t('challenge.command.fight')}</span>
            </button>
            <div className="bw-touch__row">
                <ForfeitButton cmd={cmd} disabled={!enabled} />
                {/* Her team stays readable while the turn plays. */}
                <button type="button" className="bw-btn is-dossier" onClick={() => cmd.open('dossier')} disabled={!foeBalls.length}>
                    {labels?.foeButton || t('challenge.command.herTeam')}
                </button>
                {/* Your team's sheet, too — on the thumb's side. */}
                <button type="button" className="bw-btn is-pokemon" onClick={() => cmd.open('party')} disabled={!sheet.length}>
                    {t('challenge.command.pokemon')}
                </button>
            </div>
        </div>
    );
}

/**
 * A desktop's HUD strip, inside the one screen: the message on the left, four
 * buttons on the right — or, choosing a move, the moves on the right and what
 * the focused one does on the left. Party and her team open over the field.
 */
export function DsHud({ cmd, request, enabled, moveMeta, target = null, typesOf = null, message, foeBalls, sheet, championName, reducedMotion, labels = null, mascot = null }) {
    const { t } = useTranslation();
    const choosing = enabled && cmd.view === 'moves';
    const focused = choosing ? request.moves?.[cmd.focus] : null;
    const meta = focused ? moveMeta(focused.name) : null;
    const reading = focused ? matchupFor(focused, meta, target, cmd) : null;

    return (
        <>
            {cmd.view === 'party' && (enabled || !cmd.forced) && <div className="bw-overlay is-full"><PartySheet cmd={cmd} sheet={sheet} /></div>}
            {cmd.view === 'dossier' && <div className="bw-overlay"><DossierGrid cmd={cmd} foe={foeBalls} championName={championName} title={labels?.foeTitle} typesOf={typesOf} /></div>}
            <div className={`bw-hud ${enabled ? 'is-choosing' : ''}`}>
                <div className="bw-hud__message">
                    {choosing && focused ? (
                        <div className="bw-hud__info" aria-live="polite">
                            <span className="bw-hud__info-name">{cmd.armed && cmd.gimmick === 'zmove' && focused.zMove ? focused.zMove : focused.name}</span>
                            {/* Two fixed rows: what it is (how it lands first — the one fact
                                that changes the choice — its type, its category), then its figures. */}
                            <span className="bw-hud__info-line">
                                {reading && (
                                    <span className={`bw-eff is-${reading.tone}`} title={t('challenge.command.matchupOn', { effect: t(`challenge.command.matchup.${reading.tone}`), name: target.name })}>
                                        {t(`challenge.command.matchup.${reading.tone}`)}
                                        <span className="bw-eff__figure">{multiplierLabel(reading.multiplier)}</span>
                                    </span>
                                )}
                                {meta?.type && <span className="bw-move__type" style={{ '--type': typeColors[meta.type] }}>{t(`types.${meta.type}`)}</span>}
                                {/* The category as the games draw it (as on the phone's tiles): the word cost the line its room. */}
                                {meta?.category && (
                                    <span
                                        className={`ds-move__cat is-${meta.category.toLowerCase()}`}
                                        role="img"
                                        aria-label={t(`challenge.command.category.${meta.category.toLowerCase()}`)}
                                        title={t(`challenge.command.category.${meta.category.toLowerCase()}`)}
                                    />
                                )}
                            </span>
                            <span className="bw-hud__info-line is-figures">
                                {meta?.power ? <span>{t('challenge.command.power', { power: meta.power })}</span> : null}
                                {Number.isFinite(meta?.accuracy) && <span>{t('challenge.command.accuracy', { accuracy: meta.accuracy })}</span>}
                                {Number.isFinite(focused.pp) && (
                                    <span className={`bw-hud__pp is-${ppTone(focused.pp, focused.maxpp)}`}>PP {focused.pp}/{focused.maxpp}</span>
                                )}
                            </span>
                            <MegaToggle cmd={cmd} />
                            {/* An icon beside the name: as a labelled capsule in the corner it covered the PP. */}
                            <button
                                type="button"
                                className="bw-hud__back"
                                onClick={() => cmd.open('main')}
                                aria-label={t('challenge.command.back')}
                                title={t('challenge.command.back')}
                            >
                                <ChevronLeft aria-hidden="true" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <DsTextBox {...message} variant="hud" reducedMotion={reducedMotion} msPerChar={14} />
                            {mascot}
                        </>
                    )}
                </div>
                {enabled && (
                    <div className="bw-hud__commands">
                        {choosing ? (
                            <MoveGrid cmd={cmd} request={request} moveMeta={moveMeta} target={target} />
                        ) : (
                            <div className="bw-hud__grid">
                                <button type="button" className="bw-btn is-fight" onClick={() => cmd.open('moves')} disabled={request.kind !== 'move'}>
                                    {t('challenge.command.fight')}
                                </button>
                                <button type="button" className="bw-btn is-dossier" onClick={() => cmd.open('dossier')} disabled={!foeBalls.length}>
                                    {labels?.foeButton || t('challenge.command.herTeam')}
                                </button>
                                <button type="button" className="bw-btn is-pokemon" onClick={() => cmd.open('party')} disabled={!sheet.length}>
                                    {t('challenge.command.pokemon')}
                                </button>
                                <ForfeitButton cmd={cmd} className="bw-hud__flag" />
                            </div>
                        )}
                    </div>
                )}
                {!enabled && (
                    // While the turn plays: both teams stay one click away, as on the phone.
                    <div className="bw-hud__peek">
                        <button type="button" className="bw-btn is-pokemon" onClick={() => cmd.open(cmd.view === 'party' ? 'main' : 'party')} disabled={!sheet.length} aria-pressed={cmd.view === 'party'}>
                            {t('challenge.command.pokemon')}
                        </button>
                        <button type="button" className="bw-btn is-dossier" onClick={() => cmd.open(cmd.view === 'dossier' ? 'main' : 'dossier')} disabled={!foeBalls.length} aria-pressed={cmd.view === 'dossier'}>
                            {labels?.foeButton || t('challenge.command.herTeam')}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
