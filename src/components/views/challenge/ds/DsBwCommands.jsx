import { typeColors } from '../../../../constants/types';
import { useTranslation } from '../../../../hooks/useTranslation';
import { getBattleIcon } from '../../../../utils/battleSprites';
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

function MoveButton({ move, meta, focused, onChoose, onFocus }) {
    const { t } = useTranslation();
    if (!move) return <span className="bw-move is-empty" aria-hidden="true" />;
    const category = meta?.category ? meta.category.toLowerCase() : null;
    return (
        <button
            type="button"
            className={`bw-move ${focused ? 'is-focused' : ''}`}
            style={{ '--type': typeColors[meta?.type] || 'var(--ds-ink-soft)' }}
            disabled={move.disabled || move.pp === 0}
            onClick={() => onChoose(move)}
            onPointerEnter={onFocus}
            onFocus={onFocus}
        >
            <span className="bw-move__name">{move.name}</span>
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

function MoveGrid({ cmd, request, moveMeta }) {
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
                />
            ))}
        </div>
    );
}

/**
 * Your six as BW's Summary (DsTeamSheet): readable while the turn plays; on
 * your turn the one shown can be sent in. A forced switch has no way back.
 */
function PartySheet({ cmd, sheet }) {
    const { t } = useTranslation();
    const shown = sheet[cmd.member];
    return (
        <div className="bw-sheet">
            {cmd.forced && <p className="bw-sheet__title">{t('challenge.command.chooseWho')}</p>}
            <DsTeamSheet members={sheet} index={cmd.member} onSelect={cmd.setMember} />
            <div className="bw-ficha__foot">
                {!cmd.forced && <button type="button" className="bw-cancel" onClick={() => cmd.open('main')}>{t('challenge.command.back')}</button>}
                {cmd.switchable && (
                    <button type="button" className="bw-btn is-pokemon" onClick={() => cmd.chooseSwitch(cmd.switchable)}>
                        {t('challenge.sheet.switchIn', { name: shown?.species || cmd.switchable.name })}
                    </button>
                )}
            </div>
        </div>
    );
}

/** Her six: dim silhouettes and "???" until each one is sent out. */
function DossierGrid({ cmd, foe, championName, title }) {
    const { t } = useTranslation();
    return (
        <div className="bw-sheet is-dossier">
            <p className="bw-sheet__title">{title || t('challenge.poketch.dossier', { name: championName })}</p>
            <ul className="bw-sheet__grid">
                {foe.map((mon, index) => {
                    const icon = mon.species ? getBattleIcon(mon.species) : null;
                    const name = mon.revealed ? mon.species : t('challenge.poketch.unknown');
                    return (
                        // Her sending order is fixed for the day.
                        <li key={index} className={`bw-card is-foe ${mon.revealed ? 'is-revealed' : ''} ${mon.fainted ? 'is-fainted' : ''}`}>
                            {icon?.url
                                ? <img src={icon.url} alt={name} width={40} height={30} decoding="async" draggable="false" />
                                : <span className="bw-card__unknown" aria-label={name}>?</span>}
                            <span className="bw-card__name">{name}</span>
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
 * A phone's bottom screen. While the turn plays it stays on the menu, dimmed —
 * as the DS does — so the layout never jumps between turns.
 */
export function DsTouchMenu({ cmd, request, enabled, moveMeta, myBalls, foeBalls, sheet, championName, clock, turn, labels = null }) {
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
                <MoveGrid cmd={cmd} request={request} moveMeta={moveMeta} />
                <button type="button" className="bw-cancel" onClick={() => cmd.open('main')}>{t('challenge.command.back')}</button>
            </div>
        );
    }
    // A forced switch waits for the faint to play out before it takes the screen.
    if (cmd.view === 'party' && (enabled || !cmd.forced)) return <div className="bw-touch is-sheet">{status}<PartySheet cmd={cmd} sheet={sheet} /></div>;
    if (cmd.view === 'dossier') return <div className="bw-touch is-sheet">{status}<DossierGrid cmd={cmd} foe={foeBalls} championName={championName} title={labels?.foeTitle} /></div>;

    return (
        <div className={`bw-touch is-main ${enabled ? '' : 'is-waiting'}`}>
            {status}
            <BallRow slots={foeBalls} className="is-foe" />
            <button type="button" className="bw-fight" onClick={() => cmd.open('moves')} disabled={!enabled || request.kind !== 'move'}>
                <span className="bw-fight__label">{t('challenge.command.fight')}</span>
            </button>
            <BallRow slots={myBalls} className="is-mine" />
            <div className="bw-touch__row">
                {/* Her team stays readable while the turn plays. */}
                <button type="button" className="bw-btn is-dossier" onClick={() => cmd.open('dossier')} disabled={!foeBalls.length}>
                    {labels?.foeButton || t('challenge.command.herTeam')}
                </button>
                <button type="button" className="bw-btn is-run" onClick={cmd.forfeit} disabled={!enabled}>{t('challenge.command.forfeit')}</button>
                {/* Your team's sheet, too. */}
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
export function DsHud({ cmd, request, enabled, moveMeta, message, foeBalls, sheet, championName, reducedMotion, labels = null }) {
    const { t } = useTranslation();
    const choosing = enabled && cmd.view === 'moves';
    const focused = choosing ? request.moves?.[cmd.focus] : null;
    const meta = focused ? moveMeta(focused.name) : null;

    return (
        <>
            {cmd.view === 'party' && (enabled || !cmd.forced) && <div className="bw-overlay is-full"><PartySheet cmd={cmd} sheet={sheet} /></div>}
            {cmd.view === 'dossier' && <div className="bw-overlay"><DossierGrid cmd={cmd} foe={foeBalls} championName={championName} title={labels?.foeTitle} /></div>}
            <div className={`bw-hud ${enabled ? 'is-choosing' : ''}`}>
                <div className="bw-hud__message">
                    {choosing && focused ? (
                        <div className="bw-hud__info" aria-live="polite">
                            <span className="bw-hud__info-name">{focused.name}</span>
                            <span className="bw-hud__info-line">
                                {meta?.type && <span className="bw-move__type" style={{ '--type': typeColors[meta.type] }}>{t(`types.${meta.type}`)}</span>}
                                {meta?.category && <span>{t(`challenge.command.category.${meta.category.toLowerCase()}`)}</span>}
                                {meta?.power ? <span>{t('challenge.command.power', { power: meta.power })}</span> : null}
                                {Number.isFinite(meta?.accuracy) && <span>{t('challenge.command.accuracy', { accuracy: meta.accuracy })}</span>}
                                {Number.isFinite(focused.pp) && (
                                    <span className={`bw-hud__pp is-${ppTone(focused.pp, focused.maxpp)}`}>PP {focused.pp}/{focused.maxpp}</span>
                                )}
                            </span>
                            <button type="button" className="bw-hud__back" onClick={() => cmd.open('main')}>{t('challenge.command.back')}</button>
                        </div>
                    ) : (
                        <DsTextBox {...message} variant="hud" reducedMotion={reducedMotion} msPerChar={14} />
                    )}
                </div>
                {enabled && (
                    <div className="bw-hud__commands">
                        {choosing ? (
                            <MoveGrid cmd={cmd} request={request} moveMeta={moveMeta} />
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
                                <button type="button" className="bw-btn is-run" onClick={cmd.forfeit}>{t('challenge.command.forfeit')}</button>
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
