import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/team-builder-view.css';
import '../../styles/tools-views.css';
import { calcStat } from '../../utils/damageCalc';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
import { TypeBadge } from '../TypeBadge';
import { EmptyState } from '../EmptyState';
import { ClearIcon } from '../icons';

const LEVEL = 50;
const PAGE = 60;

// Common competitive speed benchmarks at level 50.
const SPREADS = {
    base: { ev: 0, nature: 'serious', scarf: false, key: 'base' },
    neutral: { ev: 252, nature: 'serious', scarf: false, key: 'neutral' },
    positive: { ev: 252, nature: 'timid', scarf: false, key: 'positive' },
    scarf: { ev: 252, nature: 'timid', scarf: true, key: 'scarf' },
};

const computeSpeed = (base, spread) => {
    let speed = calcStat({ base, statKey: 'speed', level: LEVEL, ev: spread.ev, iv: 31, nature: spread.nature });
    if (spread.scarf) speed = Math.floor(speed * 1.5);
    return speed;
};

export function SpeedTiersView({ generations = [] }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const isIndexLoading = useReferenceStore((s) => s.isIndexLoading);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    const [spreadKey, setSpreadKey] = useState('positive');
    const [search, setSearch] = useState('');
    const [gen, setGen] = useState('all');
    const [visibleCount, setVisibleCount] = useState(PAGE);

    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const spread = SPREADS[spreadKey];

    const ranked = useMemo(() => {
        const q = search.trim().toLowerCase();
        return pokemonIndex
            .filter((p) => p.baseStats?.speed != null)
            .filter((p) => gen === 'all' || p.generation === gen)
            .filter((p) => !q || p.name.toLowerCase().includes(q))
            .map((p) => ({ ...p, speed: computeSpeed(p.baseStats.speed, spread) }))
            .sort((a, b) => b.speed - a.speed || a.name.localeCompare(b.name));
    }, [pokemonIndex, search, gen, spread]);

    useEffect(() => { setVisibleCount(PAGE); }, [search, gen, spreadKey]);

    const visible = ranked.slice(0, visibleCount);
    const hasMore = visibleCount < ranked.length;

    const sentinelRef = useRef(null);
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMore) return undefined;
        const obs = new IntersectionObserver((e) => { if (e[0]?.isIntersecting) setVisibleCount((c) => c + PAGE); }, { rootMargin: '400px' });
        obs.observe(node);
        return () => obs.disconnect();
    }, [hasMore]);

    return (
        <div className="ref-view">
            <div className="spd-controls">
                <div className="spd-seg" role="tablist" aria-label={t('tools.speedStat')}>
                    {Object.values(SPREADS).map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            role="tab"
                            aria-selected={spreadKey === s.key}
                            className={`spd-seg__btn ${spreadKey === s.key ? 'is-active' : ''}`}
                            onClick={() => setSpreadKey(s.key)}
                        >
                            {t(`tools.${s.key}`)}
                        </button>
                    ))}
                </div>

                <div className="team-builder-select-wrap">
                    <select
                        value={gen}
                        onChange={(e) => setGen(e.target.value)}
                        className="team-builder-field team-builder-field--compact team-builder-select appearance-none"
                        aria-label={t('pdetail.generation')}
                    >
                        <option value="all">{t('db.allGenerations')}</option>
                        {generations.map((g) => (
                            <option key={g} value={g}>{g.replace('generation-', 'Gen ').toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                <div className="team-builder-search-wrap" style={{ marginLeft: 'auto' }}>
                    <span className="team-builder-search-icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder={t('favorites.searchPlaceholder', { defaultValue: 'Search…' })}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="team-builder-field team-builder-field--compact team-builder-search-input"
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch('')} className="team-builder-search-clear" aria-label={t('common.clear')}>
                            <ClearIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <p className="spd-note">{t('tools.speedNote')}</p>

            {isIndexLoading && pokemonIndex.length === 0 ? (
                <div className="team-builder-spinner-wrap" style={{ minHeight: '40vh' }}>
                    <div className="team-builder-spinner" aria-hidden="true"></div>
                </div>
            ) : ranked.length === 0 ? (
                <EmptyState compact title={t('db.noMatchesTitle')} message={t('db.noMatchesDesc')} />
            ) : (
                <div className="ref-list custom-scrollbar">
                    <div className="spd-list">
                        {visible.map((p, i) => (
                            <button key={`${p.id}-${p.name}`} type="button" className="spd-row" onClick={() => navigate(`/pokemon/${p.id}`)}>
                                <span className="spd-row__rank">#{i + 1}</span>
                                <img
                                    src={getPokemonFrontSpriteUrl(p.id)}
                                    alt=""
                                    aria-hidden="true"
                                    className="spd-row__sprite"
                                    loading="lazy"
                                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                />
                                <span className="spd-row__name">
                                    {p.name.replace(/-/g, ' ')}
                                    <span className="spd-row__types">
                                        {p.types?.map((type) => <TypeBadge key={type} type={type} />)}
                                    </span>
                                </span>
                                <span className="spd-row__speed">{p.speed}</span>
                            </button>
                        ))}
                    </div>
                    {hasMore && <div ref={sentinelRef} className="ref-sentinel" aria-hidden="true" />}
                </div>
            )}
        </div>
    );
}
