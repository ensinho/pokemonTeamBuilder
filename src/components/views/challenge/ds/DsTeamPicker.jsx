import { useMemo, useState } from 'react';

import { useSheetSources } from '../../../../hooks/useSheetSources';
import { useTranslation } from '../../../../hooks/useTranslation';
import { getBattleIcon } from '../../../../utils/battleSprites';
import { play } from '../../../../utils/challengeSfx';
import { sheetFromSaved, sheetFromSet } from '../../../../utils/challengeSheet';
import { completeMember, teamCheck } from '../../../../utils/challengeTeams';
import { getTeamPokemonDisplaySprite } from '../../../../utils/pokemonSprites';
import { DsTeamSheet } from './DsTeamSheet';

/**
 * Bottom screen at the encounter: which team faces Cynthia.
 *
 * The Time do dia comes first and is chosen by default — the same rental team
 * for everyone today, shown open, ready to go with one press of A. "My teams"
 * is one level down, with each saved team checked on the spot; a member with
 * no moves can borrow the competitive set for this battle only. Either team's
 * sheet (DsTeamSheet: ability, item, moves, stats) opens one level further
 * down — a tap on a member of the Time do dia, "Ficha" on a saved team.
 */
export function DsTeamPicker({
    savedTeams, dailyMembers, practice, championName, isStarting, teamErrors, onStart, onCancel, inputRef,
}) {
    const { t } = useTranslation();
    const [view, setView] = useState('daily');
    const [completed, setCompleted] = useState({});
    const [isCompleting, setIsCompleting] = useState(false);
    const [localErrors, setLocalErrors] = useState(null);
    // The sheet: which team it shows ('daily' | 'mine', where VOLTAR returns) and who.
    const [sheetOf, setSheetOf] = useState('daily');
    const [sheetIndex, setSheetIndex] = useState(0);
    const sources = useSheetSources();

    const rows = useMemo(() => savedTeams.map((team) => {
        const members = completed[team.id] || (team.pokemons || []).filter(Boolean);
        return { team, members, check: teamCheck(members) };
    }), [savedTeams, completed]);
    const [selectedId, setSelectedId] = useState(() => (rows.find((r) => !r.check.errors.length) || rows[0])?.team.id || null);
    const selected = rows.find((row) => row.team.id === selectedId) || null;
    const sheet = useMemo(() => {
        if (view !== 'sheet') return [];
        if (sheetOf === 'daily') return dailyMembers.map((mon) => sheetFromSet(mon, sources));
        return (selected?.members || []).slice(0, 6).map((mon) => sheetFromSaved(mon, sources));
    }, [view, sheetOf, dailyMembers, selected, sources]);
    const openSheet = (of, index = 0) => {
        play('cursor');
        setSheetOf(of);
        setSheetIndex(index);
        setView('sheet');
    };

    const start = () => {
        if (isStarting) return;
        play('confirm');
        if (view === 'daily' || (view === 'sheet' && sheetOf === 'daily')) {
            onStart({ source: 'daily' });
            return;
        }
        if (!selected) return;
        if (selected.check.errors.length) {
            setLocalErrors(selected.check.errors.map((e) => ({ code: e.reason, detail: e.name || '' })));
            return;
        }
        setLocalErrors(null);
        onStart({ source: 'saved', teamId: selected.team.id, name: selected.team.name || '', showdownText: selected.check.text });
    };

    const fillIn = async () => {
        if (!selected) return;
        setIsCompleting(true);
        try {
            const members = await Promise.all(selected.members.map(completeMember));
            setCompleted((previous) => ({ ...previous, [selected.team.id]: members }));
            setLocalErrors(null);
        } finally {
            setIsCompleting(false);
        }
    };

    if (inputRef) {
        inputRef.current = {
            onAction: (action) => {
                if (action === 'a') start();
                else if (action === 'b') cancel();
                else if (view === 'sheet' && (action === 'left' || action === 'right') && sheet.length) {
                    play('cursor');
                    setSheetIndex((sheetIndex + (action === 'left' ? sheet.length - 1 : 1)) % sheet.length);
                }
            },
        };
    }

    // VOLTAR, as in every BW menu: one level up — the sheet → its team; Meus times → Time do dia → the room.
    const cancel = () => {
        if (view === 'sheet') setView(sheetOf);
        else if (view === 'mine') setView('daily');
        else onCancel?.();
    };
    const problems = teamErrors?.length ? teamErrors : localErrors;
    const startLabel = practice ? t('challenge.picker.startPractice') : t('challenge.picker.start', { name: championName });

    return (
        <div className="ds-picker">
            {/* The sheet needs the room; its tabs say whose team it is. */}
            {view !== 'sheet' && <div className="ds-picker__head">
                <span className="ds-picker__title">{practice ? t('challenge.picker.practiceTitle') : t('challenge.picker.title')}</span>
                {view === 'daily' && (
                    <button type="button" className="ds-link" onClick={() => setView('mine')}>{t('challenge.picker.moreTeams')}</button>
                )}
                {view === 'mine' && selected?.members.length > 0 && (
                    <button type="button" className="ds-link" onClick={() => openSheet('mine')}>{t('challenge.sheet.open')}</button>
                )}
            </div>}

            {view === 'sheet' ? (
                <div className="ds-picker__sheet">
                    <DsTeamSheet members={sheet} index={sheetIndex} onSelect={setSheetIndex} />
                </div>
            ) : view === 'daily' ? (
                <div className="ds-picker__daily">
                    <div className="ds-picker__label">
                        <span>{t('challenge.picker.daily')}</span>
                        <span className="ds-badge">{t('challenge.picker.featured')}</span>
                    </div>
                    <ul className="ds-picker__grid">
                        {dailyMembers.map((mon, index) => {
                            const icon = getBattleIcon(mon.species);
                            return (
                                <li key={mon.species}>
                                    {/* A tap opens this member's sheet. */}
                                    <button
                                        type="button"
                                        className="ds-picker__mon"
                                        title={[mon.item, mon.ability, ...mon.moves].filter(Boolean).join(' · ')}
                                        aria-label={t('challenge.sheet.openOne', { name: mon.species })}
                                        onClick={() => openSheet('daily', index)}
                                    >
                                        {icon.url && <img src={icon.url} alt="" width={40} height={30} decoding="async" draggable="false" />}
                                        <span className="ds-picker__name">{mon.species}</span>
                                        <span className="ds-picker__info" aria-hidden="true">i</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : (
                <div className="ds-picker__mine">
                    {rows.length === 0 && <p className="ds-picker__empty">{t('challenge.picker.empty')}</p>}
                    {rows.map((row) => {
                        const ready = !row.check.errors.length;
                        return (
                            <button
                                key={row.team.id}
                                type="button"
                                className="ds-teamrow"
                                aria-pressed={row.team.id === selectedId}
                                onClick={() => { setSelectedId(row.team.id); setLocalErrors(null); }}
                            >
                                <span className="ds-teamrow__name">{row.team.name || t('challenge.picker.untitled')}</span>
                                <span className={`ds-teamrow__status ${ready ? 'is-ready' : 'is-warn'}`}>
                                    {ready ? t('challenge.picker.ready') : t('challenge.picker.noMoves', { count: row.check.missing.length || 1 })}
                                </span>
                                <span className="ds-teamrow__sprites" aria-hidden="true">
                                    {row.members.slice(0, 6).map((mon, index) => (
                                        // A saved team keeps its own order here.
                                        <img key={`${mon.id}-${index}`} src={getTeamPokemonDisplaySprite(mon)} alt="" width={24} height={24} loading="lazy" decoding="async" />
                                    ))}
                                </span>
                            </button>
                        );
                    })}
                    {selected && selected.check.missing.length > 0 && (
                        <button type="button" className="ds-link is-block" onClick={fillIn} disabled={isCompleting}>
                            {t('challenge.picker.autoComplete')}
                        </button>
                    )}
                </div>
            )}

            {problems?.length > 0 && (
                <ul className="ds-picker__errors" role="alert">
                    {problems.map((error, index) => (
                        // One submission's list; replaced, never reordered.
                        <li key={`${error.code}-${index}`}>{t(`challenge.picker.error.${error.code}`, { detail: error.detail || '' })}</li>
                    ))}
                </ul>
            )}

            {view !== 'sheet' && <p className="ds-picker__privacy">{t('challenge.privacy.notice')}</p>}
            <div className="ds-picker__foot">
                <button type="button" className="bw-cancel" onClick={cancel}>{t('challenge.command.back')}</button>
                <button type="button" className="ds-go" onClick={start} disabled={isStarting}>
                    {isStarting ? '…' : startLabel}
                </button>
            </div>
        </div>
    );
}
