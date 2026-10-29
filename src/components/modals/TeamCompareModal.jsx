import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowUpRight, Plus, X } from 'lucide-react';

import '../../styles/team-compare.css';
import { PcBox } from '../PcBox';
import { Sprite } from '../Sprite';
import { Loader } from '../Loader';
import { TypeChip } from '../TypeChip';
import { EmptyState } from '../EmptyState';
import { TeamRatingBadge } from '../TeamIdentitySummary';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { useBattleDex } from '../../hooks/useBattleDex';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { useTeamCompareStore } from '../../store/useTeamCompareStore';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { resolveMembers } from '../../utils/homeStatus';
import { analyzeTeam, rateTeam } from '../../utils/teamAnalysis';
import { compareTeams } from '../../utils/teamMatchup';

const MULTIPLIER_LABEL = { 0: '0×', 0.25: '¼×', 0.5: '½×', 1: '1×', 2: '2×', 4: '4×' };
const multiplierLabel = (m) => MULTIPLIER_LABEL[m] ?? `${m}×`;
const prettyName = (name = '') => name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// The first duel worth reading: A's worst loss, else the first duel at all.
const firstCell = (grid) => {
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            if (grid[i][j].winner === 'b') return [i, j];
        }
    }
    return grid.length && grid[0].length ? [0, 0] : null;
};

function TeamSide({ id, label, team, teams, otherId, onChange }) {
    const { t } = useTranslation();
    return (
        <div className="team-compare__side">
            <label className="field">
                <span className="field-label">{label}</span>
                <select className="select-clean" value={id || ''} onChange={(e) => onChange(e.target.value)}>
                    {teams.map((tm) => (
                        <option key={tm.id} value={tm.id} disabled={tm.id === otherId}>{tm.name}</option>
                    ))}
                </select>
            </label>
            {team && (
                <PcBox
                    members={team.members}
                    size="sm"
                    className="team-compare__box"
                    label={t('teamCompare.boxLabel', { name: team.name, n: team.members.length })}
                />
            )}
        </div>
    );
}

function MemberSprite({ profile, className = '' }) {
    return (
        <Sprite
            src={getTeamPokemonDisplaySprite(profile.member)}
            alt={prettyName(profile.name)}
            className={`team-compare__sprite ${className}`}
        />
    );
}

function HitLine({ attacker, defender, hit }) {
    const { t } = useTranslation();
    if (!hit.type) {
        return <p className="team-compare__hit">{t('teamCompare.duelNoHit', { attacker: prettyName(attacker.name), defender: prettyName(defender.name) })}</p>;
    }
    return (
        <p className="team-compare__hit">
            <span className="team-compare__hit-who">{prettyName(attacker.name)}</span>
            <TypeChip type={hit.type} size="sm" />
            <span className={`team-compare__mult team-compare__mult--${hit.multiplier > 1 ? 'up' : hit.multiplier < 1 ? 'down' : 'flat'}`}>
                {multiplierLabel(hit.multiplier)}
            </span>
            <span className="team-compare__hit-target">{t('teamCompare.duelOn', { defender: prettyName(defender.name) })}</span>
        </p>
    );
}

function ThreatList({ title, threats }) {
    const { t } = useTranslation();
    return (
        <div className="team-compare__threats">
            <h3 className="team-compare__h3">{title}</h3>
            {threats.length > 0 ? (
                <ul className="team-compare__threat-list">
                    {threats.map((p, i) => (
                        <li key={`${p.id}-${i}`} className="team-compare__threat">
                            <MemberSprite profile={p} className="team-compare__sprite--sm" />
                            <span className="capitalize">{prettyName(p.name)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="team-compare__note">{t('teamCompare.threatsNone')}</p>
            )}
        </div>
    );
}

/**
 * Two saved teams, head to head (src/utils/teamMatchup.js). A dialog, opened
 * from wherever a saved team is shown — `openTeamCompare(id, source)` — so the
 * comparison never costs a page of its own.
 */
export function TeamCompareModal() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { leftId, rightId, close, setLeft, setRight } = useTeamCompareStore();
    const savedTeams = useFirestoreTeamsStore((s) => s.savedTeams);
    const activeTeamId = useFirestoreTeamsStore((s) => s.activeTeamId);
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    const dex = useBattleDex();
    const dialogRef = useModalA11y(close);

    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    // Sides: the team that was asked for on the left; on the right the active
    // team, else the newest other one. A side whose team was deleted refills.
    const left = savedTeams.find((tm) => tm.id === leftId) || savedTeams[0] || null;
    const right = savedTeams.find((tm) => tm.id === rightId && tm.id !== left?.id)
        || savedTeams.find((tm) => tm.id === activeTeamId && tm.id !== left?.id)
        || savedTeams.find((tm) => tm.id !== left?.id)
        || null;

    const indexById = React.useMemo(() => new Map((pokemonIndex || []).map((p) => [p.id, p])), [pokemonIndex]);
    const typesById = React.useMemo(() => new Map([...indexById].map(([id, p]) => [id, p.types || []])), [indexById]);

    const sideOf = React.useCallback((team) => {
        if (!team) return null;
        const members = resolveMembers(team, typesById);
        const { teamAnalysis } = analyzeTeam(members);
        return { id: team.id, name: team.name, members, rating: rateTeam(teamAnalysis, members.length) };
    }, [typesById]);
    const sideA = React.useMemo(() => sideOf(left), [sideOf, left]);
    const sideB = React.useMemo(() => sideOf(right), [sideOf, right]);

    const ready = Boolean(dex) && indexById.size > 0;
    const result = React.useMemo(() => (
        ready && sideA && sideB
            ? compareTeams(sideA.members, sideB.members, { indexById, moveDex: dex.moves })
            : null
    ), [ready, sideA, sideB, indexById, dex]);

    const [cell, setCell] = React.useState(null);
    React.useEffect(() => { setCell(result ? firstCell(result.grid) : null); }, [result]);

    const openTeam = (team) => { close(); navigate(`/teams/${team.id}`); };
    const buildTeam = () => { close(); navigate('/builder'); };

    const nameA = sideA?.name || '';
    const nameB = sideB?.name || '';
    const selected = result && cell ? { a: result.a[cell[0]], b: result.b[cell[1]], d: result.grid[cell[0]][cell[1]] } : null;
    const resultWord = (winner) => t(`teamCompare.${winner === 'a' ? 'win' : winner === 'b' ? 'loss' : 'even'}`);

    let body;
    if (savedTeams.length < 2) {
        body = (
            <EmptyState
                compact
                title={t('teamCompare.needTwoTitle')}
                message={t('teamCompare.needTwoDesc')}
                action={{ label: t('teamCompare.needTwoAction'), onClick: buildTeam, icon: <Plus className="w-4 h-4" /> }}
            />
        );
    } else if (!result) {
        body = <Loader label={t('teamCompare.loading')} block />;
    } else if (result.a.length === 0 || result.b.length === 0) {
        body = <p className="team-compare__note">{t('teamCompare.emptySide', { name: result.a.length === 0 ? nameA : nameB })}</p>;
    } else {
        const sharePct = Math.round(result.share * 100);
        const verdictText = result.verdict === 'even'
            ? t('teamCompare.verdictEven')
            : t('teamCompare.verdictWin', { name: result.verdict === 'a' ? nameA : nameB });
        const rows = [
            { key: 'rating', label: t('teamCompare.statRating'), a: sideA.rating.score, b: sideB.rating.score },
            { key: 'pressure', label: t('teamCompare.statPressure'), a: `${result.pressure.a}/${result.b.length}`, b: `${result.pressure.b}/${result.a.length}`, av: result.pressure.a / result.b.length, bv: result.pressure.b / result.a.length },
            { key: 'faster', label: t('teamCompare.statFaster'), a: result.faster.a, b: result.faster.b },
            { key: 'threats', label: t('teamCompare.statThreats'), a: result.threatsToA.length, b: result.threatsToB.length, lowerWins: true },
        ].map((row) => {
            const av = row.av ?? Number(row.a);
            const bv = row.bv ?? Number(row.b);
            const lead = av === bv ? null : (av > bv) !== Boolean(row.lowerWins) ? 'a' : 'b';
            return { ...row, lead };
        });

        body = (
            <>
                <section className={`team-compare__verdict team-compare__verdict--${result.verdict}`} aria-live="polite">
                    <p className="team-compare__verdict-title">{verdictText}</p>
                    <div
                        className="team-compare__bar"
                        role="img"
                        aria-label={t('teamCompare.shareAria', { a: nameA, pa: sharePct, b: nameB, pb: 100 - sharePct })}
                    >
                        <span className="team-compare__bar-a" style={{ flexGrow: Math.max(result.wins, 0.0001) }} />
                        <span className="team-compare__bar-even" style={{ flexGrow: result.evens }} />
                        <span className="team-compare__bar-b" style={{ flexGrow: Math.max(result.losses, 0.0001) }} />
                    </div>
                    <p className="team-compare__record">
                        {t('teamCompare.record', { wins: result.wins, evens: result.evens, losses: result.losses, total: result.total, name: nameA })}
                    </p>
                </section>

                <table className="team-compare__sheet">
                    <thead>
                        <tr>
                            <th scope="col" className="team-compare__sheet-team">{nameA}</th>
                            <th scope="col"><span className="sr-only">{t('teamCompare.statColumn')}</span></th>
                            <th scope="col" className="team-compare__sheet-team">{nameB}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.key}>
                                <td className={row.lead === 'a' ? 'is-lead' : ''}>
                                    {row.key === 'rating' ? <TeamRatingBadge compact score={sideA.rating.score} grade={sideA.rating.grade} /> : row.a}
                                </td>
                                <th scope="row">{row.label}</th>
                                <td className={row.lead === 'b' ? 'is-lead' : ''}>
                                    {row.key === 'rating' ? <TeamRatingBadge compact score={sideB.rating.score} grade={sideB.rating.grade} /> : row.b}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <section className="team-compare__duels">
                    <h3 className="team-compare__h3">{t('teamCompare.gridTitle')}</h3>
                    <p className="team-compare__note">{t('teamCompare.gridHint', { a: nameA, b: nameB })}</p>
                    <div
                        className="team-compare__grid"
                        role="grid"
                        aria-label={t('teamCompare.gridTitle')}
                        style={{ '--compare-cols': result.b.length }}
                    >
                        <div role="row" className="team-compare__grid-row">
                            <span role="columnheader" className="team-compare__corner" aria-hidden="true" />
                            {result.b.map((p, j) => (
                                <span key={`h-${j}`} role="columnheader" className={`team-compare__head ${cell?.[1] === j ? 'is-current' : ''}`}>
                                    <MemberSprite profile={p} />
                                </span>
                            ))}
                        </div>
                        {result.a.map((pa, i) => (
                            <div role="row" key={`r-${i}`} className="team-compare__grid-row">
                                <span role="rowheader" className={`team-compare__head ${cell?.[0] === i ? 'is-current' : ''}`}>
                                    <MemberSprite profile={pa} />
                                </span>
                                {result.b.map((pb, j) => {
                                    const d = result.grid[i][j];
                                    const isSel = cell?.[0] === i && cell?.[1] === j;
                                    return (
                                        <button
                                            key={`c-${j}`}
                                            type="button"
                                            role="gridcell"
                                            aria-selected={isSel}
                                            onClick={() => setCell([i, j])}
                                            className={`team-compare__cell is-${d.winner} ${isSel ? 'is-selected' : ''}`}
                                            aria-label={t('teamCompare.cellAria', { a: prettyName(pa.name), b: prettyName(pb.name), result: resultWord(d.winner) })}
                                        >
                                            {multiplierLabel(d.aHit.multiplier)}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {selected && (
                        <div className="team-compare__duel" aria-live="polite">
                            <p className={`team-compare__duel-title is-${selected.d.winner}`}>
                                {selected.d.winner === 'even'
                                    ? t('teamCompare.duelEven')
                                    : t('teamCompare.duelWinner', { name: prettyName(selected.d.winner === 'a' ? selected.a.name : selected.b.name) })}
                            </p>
                            <HitLine attacker={selected.a} defender={selected.b} hit={selected.d.aHit} />
                            <HitLine attacker={selected.b} defender={selected.a} hit={selected.d.bHit} />
                            {selected.a.speed !== null && selected.b.speed !== null && (
                                <p className="team-compare__note">
                                    {t('teamCompare.duelSpeed', { a: prettyName(selected.a.name), as: selected.a.speed, b: prettyName(selected.b.name), bs: selected.b.speed })}
                                </p>
                            )}
                        </div>
                    )}
                </section>

                <section className="team-compare__threat-cols">
                    <ThreatList title={t('teamCompare.threatsTo', { name: nameA })} threats={result.threatsToA} />
                    <ThreatList title={t('teamCompare.threatsTo', { name: nameB })} threats={result.threatsToB} />
                </section>

                <p className="team-compare__basis">{t('teamCompare.basis')}</p>
            </>
        );
    }

    return (
        <div className="modal-scrim" onClick={close} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-compare-title"
                tabIndex={-1}
                className="modal-panel modal-panel--2xl team-compare"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div className="min-w-0 flex-1">
                        <h2 id="team-compare-title" className="modal-title">{t('teamCompare.title')}</h2>
                        <p className="modal-subtitle">{t('teamCompare.subtitle')}</p>
                    </div>
                    <button type="button" onClick={close} className="modal-close" aria-label={t('teamCompare.close')}>
                        <X aria-hidden="true" />
                    </button>
                </div>

                <div className="modal-body custom-scrollbar">
                    {savedTeams.length >= 2 && (
                        <div className="team-compare__pickers">
                            <TeamSide id={left?.id} label={t('teamCompare.sideA')} team={sideA} teams={savedTeams} otherId={right?.id} onChange={setLeft} />
                            <button
                                type="button"
                                onClick={() => { setLeft(right?.id || null); setRight(left?.id || null); }}
                                className="btn btn-secondary btn-icon team-compare__swap"
                                aria-label={t('teamCompare.swap')}
                                title={t('teamCompare.swap')}
                            >
                                <ArrowLeftRight aria-hidden="true" />
                            </button>
                            <TeamSide id={right?.id} label={t('teamCompare.sideB')} team={sideB} teams={savedTeams} otherId={left?.id} onChange={setRight} />
                        </div>
                    )}
                    {body}
                </div>

                {result && left && right && (
                    <div className="modal-footer modal-footer--ruled">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openTeam(left)}>
                            <span className="btn__label">{t('teamCompare.viewTeam', { name: left.name })}</span> <ArrowUpRight aria-hidden="true" />
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openTeam(right)}>
                            <span className="btn__label">{t('teamCompare.viewTeam', { name: right.name })}</span> <ArrowUpRight aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
