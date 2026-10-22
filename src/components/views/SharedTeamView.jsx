import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import '../../styles/entity-detail-view.css';
import '../../styles/shared-team.css';

import { db } from '../../services/firebase';
import { appId } from '../../constants/firebase';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { analyzeTeam } from '../../utils/teamAnalysis';
import { titleCaseSlug } from '../../utils/smogonSets';
import { track } from '../../services/analytics';
import { TypeChip } from '../TypeChip';
import { EmptyState } from '../EmptyState';
import { Loader } from '../Loader';
import { AnimatedSprite } from '../AnimatedSprite';

/**
 * A shared team's public page (/t/:id, 2026-10-21). Every share used to be a
 * `/builder?team=id` link that replaced whatever the recipient was building the
 * moment it opened, and unfurled as the generic builder card. Now a share is a
 * page: the six with their sets, what the builder makes of them, and the
 * choice — import it (with undo, through the store's importTeam) or build your
 * own. The server titles it and draws its preview image (api/render-meta.js,
 * api/og.js), so the link itself sells the click.
 */

const LOAD_TIMEOUT_MS = 8000;

/** A Mega's own sprite id lives only in the stored art URL. */
const spriteIdOf = (member) => {
    const match = /\/(\d+)\.png$/.exec(member?.sprite || '');
    return match ? Number(match[1]) : Number(member?.id);
};

const prettyMove = (move) => titleCaseSlug(String(move || '').replace(/\s+/g, '-'));

function MemberCard({ member }) {
    const { t } = useTranslation();
    const c = member.customization || {};
    const moves = (c.moves || []).filter(Boolean).slice(0, 4);
    const facts = [
        ['item', c.item],
        ['ability', c.ability && c.ability !== 'unknown' ? c.ability : null],
        ['nature', c.nature && c.nature !== 'serious' ? c.nature : null],
        ['tera', c.teraType],
    ].filter(([, value]) => value);
    return (
        <li className="st-member">
            <Link to={`/pokemon/${member.id}`} className="st-member__stage">
                <AnimatedSprite id={spriteIdOf(member)} className="st-member__sprite" />
            </Link>
            <div className="st-member__body">
                <span className="st-member__name">{titleCaseSlug(member.name || `#${member.id}`)}</span>
                <span className="st-member__types">
                    {(member.types || []).map((type) => <TypeChip key={type} type={type} size="sm" />)}
                </span>
                {facts.length > 0 && (
                    <dl className="st-member__facts">
                        {facts.map(([key, value]) => (
                            <div key={key}>
                                <dt>{t(`sharedTeamView.${key}`)}</dt>
                                <dd>{key === 'tera' ? t(`types.${value}`) : titleCaseSlug(String(value))}</dd>
                            </div>
                        ))}
                    </dl>
                )}
                {moves.length > 0 && (
                    <ul className="st-member__moves" aria-label={t('sharedTeamView.moves')}>
                        {moves.map((move) => <li key={move}>{prettyMove(move)}</li>)}
                    </ul>
                )}
            </div>
        </li>
    );
}

export function SharedTeamView() {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [state, setState] = useState({ status: 'loading', team: null });
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        let alive = true;
        setState({ status: 'loading', team: null });
        if (!db || !id) {
            setState({ status: 'missing', team: null });
            return undefined;
        }
        // A read that never answers (offline, a blocked network) must not hold
        // the page on its loader: past this it is treated as not found.
        const timeout = new Promise((_, reject) => { setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS); });
        Promise.race([getDoc(doc(db, `artifacts/${appId}/public/data/teams`, id)), timeout])
            .then((snap) => {
                if (!alive) return;
                const data = snap.exists() ? snap.data() : null;
                const pokemons = Array.isArray(data?.pokemons) ? data.pokemons.filter(Boolean).slice(0, 6) : [];
                if (!pokemons.length) {
                    setState({ status: 'missing', team: null });
                    return;
                }
                setState({ status: 'ready', team: { ...data, pokemons } });
                track('shared_team_view', { team_id: id, size: pokemons.length });
            })
            .catch(() => { if (alive) setState({ status: 'missing', team: null }); });
        return () => { alive = false; };
    }, [id]);

    const team = state.team;
    useDocumentMeta({ path: `/t/${id}`, sharedTeam: team || undefined });

    const handleImport = async () => {
        setIsImporting(true);
        track('shared_team_import', { team_id: id });
        const ok = await useActiveTeamStore.getState().importTeam({ name: team.name, pokemons: team.pokemons });
        setIsImporting(false);
        if (ok) navigate('/builder');
    };

    if (state.status === 'loading') return <Loader size="lg" label={t('sharedTeamView.loading')} block />;

    if (state.status === 'missing') {
        return (
            <EmptyState
                title={t('sharedTeamView.notFoundTitle')}
                message={t('sharedTeamView.notFoundBody')}
                action={{ label: t('sharedTeamView.buildOwn'), onClick: () => navigate('/builder') }}
            />
        );
    }

    return <SharedTeamContent id={id} team={team} onImport={handleImport} isImporting={isImporting} />;
}

/**
 * The page itself, apart from fetching it: the hero with the two ways
 * forward, the builder's verdict, and one card per member. Separate so it can
 * be drawn from any team object (a test, a preview) without Firestore.
 */
export function SharedTeamContent({ id, team, onImport, isImporting = false }) {
    const { t } = useTranslation();
    const analysis = useMemo(() => analyzeTeam(team.pokemons).teamAnalysis, [team]);
    const weaknesses = Object.entries(analysis.weaknesses).sort(([, a], [, b]) => b - a).map(([type]) => type);
    const resisted = Object.keys(analysis.defensiveCoverage).length;
    const hits = analysis.strengths instanceof Set ? analysis.strengths.size : 0;

    return (
        <div className="edv shared-team">
            <header className="edv-header st-hero">
                <div className="st-hero__copy">
                    <span className="edv-kicker">{t('sharedTeamView.kicker')} · {t('sharedTeamView.members', { count: team.pokemons.length })}</span>
                    <h1 className="edv-title st-hero__title">{team.name || t('sharedTeamView.untitled')}</h1>
                    <div className="st-hero__actions">
                        <button type="button" className="btn btn-primary btn-lg" onClick={onImport} disabled={isImporting}>
                            {t('sharedTeamView.importCta')}
                        </button>
                        <Link to="/builder" className="btn btn-outline btn-lg" onClick={() => track('shared_team_build_own', { team_id: id })}>
                            {t('sharedTeamView.buildOwn')}
                        </Link>
                    </div>
                </div>
                <dl className="st-verdict" aria-label={t('sharedTeamView.analysisTitle')}>
                    <div className="st-verdict__row">
                        <dt>{t('sharedTeamView.weak')}</dt>
                        <dd className="st-verdict__chips">
                            {weaknesses.length
                                ? weaknesses.map((type) => <TypeChip key={type} type={type} size="sm" />)
                                : <span className="st-verdict__ok">{t('sharedTeamView.noWeakness')}</span>}
                        </dd>
                    </div>
                    <div className="st-verdict__row">
                        <dt>{t('sharedTeamView.resists')}</dt>
                        <dd className="st-verdict__figure">{t('sharedTeamView.resistsValue', { n: resisted })}</dd>
                    </div>
                    <div className="st-verdict__row">
                        <dt>{t('sharedTeamView.hits')}</dt>
                        <dd className="st-verdict__figure">{t('sharedTeamView.hitsValue', { n: hits })}</dd>
                    </div>
                </dl>
            </header>

            <ul className="st-members">
                {team.pokemons.map((member, i) => <MemberCard key={member.instanceId || `${member.id}-${i}`} member={member} />)}
            </ul>
        </div>
    );
}
