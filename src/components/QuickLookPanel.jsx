import React, { useEffect, useId, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Package, X } from 'lucide-react';

import '../styles/quick-look.css';
import '../styles/reference-views.css';
import { typeColors } from '../constants/types';
import { useTranslation } from '../hooks/useTranslation';
import { useBattleDex } from '../hooks/useBattleDex';
import { useStaticData } from '../hooks/useStaticData';
import { useQuickLookStore } from '../store/useQuickLookStore';
import { useReferenceStore } from '../store/useReferenceStore';
import { getAbilityPageData, getItemPageData, getMovePageData } from '../services/pokemonDataCache';
import { deployBase } from '../services/localeHistory';
import { localizePath } from '../utils/localePath';
import { coverageFor, quickLookPath, resolveAbility, resolveItem, resolveMove, resolvePokemon } from '../utils/quickLook';
import { getPokemonArtworkSpriteUrl } from '../utils/pokemonSprites';
import { itemSpriteUrl } from '../utils/itemSuggestions';
import { titleCaseSlug } from '../utils/smogonSets';
import { Sprite } from './Sprite';
import { StatBar } from './StatBar';
import { TypeChip } from './TypeChip';
import { Loader } from './Loader';

const MULTIPLIER_LABEL = { 4: '4×', 2: '2×', 0.5: '½×', 0.25: '¼×', 0: '0×' };
const padDex = (id) => `#${String(id).padStart(4, '0')}`;

/**
 * A move, ability or item the baked lists do not know (a new one, a typo in a
 * slug) still answers: the PokéAPI page loaders fill the gap.
 */
function useFallbackLook(look, missing) {
    const [state, setState] = useState({ key: null, data: null, status: 'idle' });
    const id = look ? `${look.kind}:${look.key}` : null;

    useEffect(() => {
        if (!missing || !look || look.kind === 'pokemon') return undefined;
        let cancelled = false;
        setState({ key: id, data: null, status: 'loading' });
        const loader = look.kind === 'move' ? getMovePageData : look.kind === 'ability' ? getAbilityPageData : getItemPageData;
        Promise.resolve(loader(look.key))
            .then((data) => {
                if (cancelled) return;
                if (!data) { setState({ key: id, data: null, status: 'missing' }); return; }
                const name = titleCaseSlug(data.name || look.key);
                const mapped = look.kind === 'move'
                    ? {
                        kind: 'move', slug: data.name, name, type: data.type, damageClass: data.damage_class,
                        power: data.power, accuracy: data.accuracy, neverMisses: data.accuracy == null && data.damage_class !== 'status',
                        pp: data.pp, effect: data.effect,
                        coverage: data.damage_class === 'status' ? null : coverageFor(data.type),
                    }
                    : look.kind === 'ability'
                        ? { kind: 'ability', slug: data.name, name, effect: data.effect }
                        : { kind: 'item', slug: data.name, name, category: data.category, effect: data.effect };
                setState({ key: id, data: mapped, status: 'ready' });
            })
            .catch(() => { if (!cancelled) setState({ key: id, data: null, status: 'missing' }); });
        return () => { cancelled = true; };
        // `look` is identified by `id`; the object itself changes identity per render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, missing]);

    return state.key === id ? state : { data: null, status: missing ? 'loading' : 'idle' };
}

function Section({ title, meta, children }) {
    return (
        <section className="quick-look__section">
            <div className="quick-look__section-head">
                <h3>{title}</h3>
                {meta}
            </div>
            {children}
        </section>
    );
}

function TypeRow({ label, mult, tone, types }) {
    if (!types?.length) return null;
    return (
        <div className={`quick-look__tier quick-look__tier--${tone}`}>
            <p className="quick-look__tier-label">
                {mult && <span className="quick-look__mult">{mult}</span>}
                {label}
            </p>
            <div className="quick-look__pills">
                {types.map((type) => <TypeChip key={type} type={type} size="sm" />)}
            </div>
        </div>
    );
}

/**
 * The quick look: one Pokémon, move, ability or item, docked beside a battle
 * (QuickLookPanel is mounted by AppLayout while the stack in useQuickLookStore
 * has something on it). Not a modal — the battle behind it keeps working, and
 * the keyboard stays with the battle until the trainer tabs into the panel.
 * Docked bottom-right on a desktop, over the field (top) on a phone, where the
 * bottom screen holds the commands. It can fold to its title bar.
 */
export function QuickLookPanel() {
    const { t, language } = useTranslation();
    const titleId = useId();
    const stack = useQuickLookStore((s) => s.stack);
    const open = useQuickLookStore((s) => s.open);
    const back = useQuickLookStore((s) => s.back);
    const close = useQuickLookStore((s) => s.close);
    const [folded, setFolded] = useState(false);
    const look = stack[stack.length - 1] || null;

    const dex = useBattleDex();
    const abilities = useStaticData('ability-list.json', { enabled: look?.kind === 'ability' });
    const items = useStaticData('item-list.json', { enabled: look?.kind === 'item' });
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    useEffect(() => { useReferenceStore.getState().fetchPokemonIndex(); }, []);

    // A new look unfolds the panel: the trainer just asked to see it.
    useEffect(() => { setFolded(false); }, [look?.kind, look?.key]);

    const resolved = useMemo(() => {
        if (!look) return null;
        if (look.kind === 'pokemon') {
            const entry = pokemonIndex.find((p) => String(p.id) === String(look.key));
            return entry ? resolvePokemon(entry, dex) : null;
        }
        if (look.kind === 'move') return dex ? resolveMove(look.key, dex) : null;
        if (look.kind === 'ability') return resolveAbility(look.key, abilities.data?.abilities);
        return resolveItem(look.key, items.data?.items);
    }, [look, pokemonIndex, dex, abilities.data, items.data]);

    // Ready to say "not in the baked data" only once that data has arrived.
    const sourceReady = !look ? false
        : look.kind === 'pokemon' ? pokemonIndex.length > 0
            : look.kind === 'move' ? Boolean(dex)
                : look.kind === 'ability' ? abilities.status === 'ready'
                    : items.status === 'ready';
    const fallback = useFallbackLook(look, sourceReady && !resolved && look?.kind !== 'pokemon');
    const data = resolved || fallback.data;
    const isLoading = !data && (!sourceReady || fallback.status === 'loading');

    // Escape closes the panel — but only from inside it: the
    // battle console has its own Escape (VOLTAR) and must keep it.
    const onKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            close();
        }
    };

    if (!look) return null;

    const kindLabel = {
        pokemon: 'Pokémon',
        move: t('search.kindMove'),
        ability: t('search.kindAbility'),
        item: t('search.kindItem'),
    }[look.kind];
    const pageHref = localizePath(quickLookPath(look), language, deployBase());
    const englishNote = language === 'pt' ? <p className="quick-look__note">{t('quickLook.englishNote')}</p> : null;

    const renderPokemon = () => (
        <>
            <div className="quick-look__hero" style={{ '--ql-type': typeColors[data.types[0]] || 'var(--color-primary)' }}>
                <Sprite className="quick-look__art" src={getPokemonArtworkSpriteUrl(data.id)} alt="" eager />
                <div className="quick-look__identity">
                    <p className="quick-look__dex">{padDex(data.id)}</p>
                    <h2 id={titleId} className="quick-look__title">{data.name}</h2>
                    <div className="quick-look__pills">
                        {data.types.map((type) => <TypeChip key={type} type={type} size="sm" />)}
                    </div>
                </div>
            </div>
            {data.stats.length > 0 && (
                <Section title={t('pokedex.baseStats')} meta={<span className="quick-look__meta">{t('pokedex.statTotal')} <b>{data.total}</b></span>}>
                    <div className="quick-look__stats">
                        {data.stats.map((stat) => (
                            <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} peak={stat.base_stat === Math.max(...data.stats.map((s) => s.base_stat))} />
                        ))}
                    </div>
                </Section>
            )}
            {data.defenses.length > 0 && (
                <Section title={t('pokedex.typeEffectivenessTitle')}>
                    <div className="quick-look__tiers">
                        {data.defenses.map((group) => {
                            const tone = group.multiplier > 1 ? 'bad' : group.multiplier === 0 ? 'none' : 'good';
                            const label = tone === 'bad' ? t('pokedex.weakAgainst') : tone === 'none' ? t('pokedex.immuneTo') : t('pokedex.resistantTo');
                            return <TypeRow key={group.multiplier} label={label} mult={MULTIPLIER_LABEL[group.multiplier]} tone={tone} types={group.types} />;
                        })}
                    </div>
                </Section>
            )}
            {data.abilities.length > 0 && (
                <Section title={t('pokedex.abilities')}>
                    <div className="quick-look__links">
                        {data.abilities.map((name) => (
                            <button key={name} type="button" className="quick-look__link" onClick={() => open({ kind: 'ability', key: name })}>
                                {name}
                            </button>
                        ))}
                    </div>
                </Section>
            )}
        </>
    );

    const renderMove = () => (
        <>
            <div className="quick-look__hero" style={{ '--ql-type': typeColors[data.type] || 'var(--color-primary)' }}>
                <div className="quick-look__identity">
                    <h2 id={titleId} className="quick-look__title">{data.name}</h2>
                    <div className="quick-look__pills">
                        {data.type && <TypeChip type={data.type} size="sm" />}
                        {data.damageClass && <span className={`ref-cat ref-cat--${data.damageClass}`}>{t(`db.${data.damageClass}`)}</span>}
                    </div>
                </div>
            </div>
            <dl className="quick-look__figures">
                <div><dt>{t('pokedex.movesHeaderPower')}</dt><dd>{data.power ?? '—'}</dd></div>
                <div><dt>{t('pokedex.movesHeaderAcc')}</dt><dd>{data.neverMisses ? '∞' : (data.accuracy ? `${data.accuracy}%` : '—')}</dd></div>
                <div><dt>{t('pokedex.movesHeaderPp')}</dt><dd>{data.pp ?? '—'}</dd></div>
            </dl>
            {data.neverMisses && <p className="quick-look__note">{t('quickLook.neverMisses')}</p>}
            {data.effect && (
                <Section title={t('db.effectHeading')}>
                    <p className="quick-look__prose" lang="en">{data.effect}</p>
                    {englishNote}
                </Section>
            )}
            {data.coverage && (
                <Section title={t('quickLook.coverage')}>
                    <div className="quick-look__tiers">
                        <TypeRow label={t('quickLook.superEffective')} mult="2×" tone="good" types={data.coverage.strong} />
                        <TypeRow label={t('quickLook.notVeryEffective')} mult="½×" tone="bad" types={data.coverage.weak} />
                        <TypeRow label={t('quickLook.noEffect')} mult="0×" tone="none" types={data.coverage.none} />
                    </div>
                </Section>
            )}
        </>
    );

    const renderText = () => (
        <>
            <div className="quick-look__hero quick-look__hero--plain">
                {look.kind === 'item' && (
                    <span className="quick-look__item">
                        <ItemSprite slug={data.slug} />
                    </span>
                )}
                <div className="quick-look__identity">
                    <h2 id={titleId} className="quick-look__title">{data.name}</h2>
                    {data.category && <p className="quick-look__sub">{titleCaseSlug(data.category)}</p>}
                </div>
            </div>
            {data.effect && (
                <Section title={t('db.effectHeading')}>
                    <p className="quick-look__prose" lang="en">{data.effect}</p>
                    {englishNote}
                </Section>
            )}
        </>
    );

    let body;
    if (isLoading) body = <div className="quick-look__state"><Loader size="sm" label={t('common.loading')} /></div>;
    else if (!data) body = <p className="quick-look__state">{t('quickLook.notFound')}</p>;
    else if (data.kind === 'pokemon') body = renderPokemon();
    else if (data.kind === 'move') body = renderMove();
    else body = renderText();

    return (
        <aside
            className={`quick-look ${folded ? 'is-folded' : ''}`}
            role="dialog"
            aria-modal="false"
            aria-labelledby={data ? titleId : undefined}
            aria-label={data ? undefined : t('quickLook.label')}
            onKeyDown={onKeyDown}
        >
            <header className="quick-look__bar">
                {stack.length > 1 ? (
                    <button type="button" className="quick-look__btn" onClick={back} aria-label={t('common.back')} title={t('common.back')}>
                        <ArrowLeft aria-hidden="true" />
                    </button>
                ) : null}
                <p className="quick-look__kind">
                    <span>{t('quickLook.label')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{kindLabel}</span>
                    {folded && data && <b>{data.name}</b>}
                </p>
                <a className="quick-look__btn" href={pageHref} target="_blank" rel="noopener" aria-label={t('quickLook.openPage')} title={t('quickLook.openPage')}>
                    <ExternalLink aria-hidden="true" />
                </a>
                <button
                    type="button"
                    className="quick-look__btn"
                    onClick={() => setFolded((value) => !value)}
                    aria-expanded={!folded}
                    aria-label={folded ? t('quickLook.unfold') : t('quickLook.fold')}
                    title={folded ? t('quickLook.unfold') : t('quickLook.fold')}
                >
                    {folded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                </button>
                <button type="button" className="quick-look__btn" onClick={close} aria-label={t('common.close')} title={t('common.close')}>
                    <X aria-hidden="true" />
                </button>
            </header>
            {!folded && <div className="quick-look__body custom-scrollbar">{body}</div>}
        </aside>
    );
}

function ItemSprite({ slug }) {
    const [failed, setFailed] = useState(false);
    if (failed || !slug) return <Package aria-hidden="true" />;
    return <img src={itemSpriteUrl(slug)} alt="" className="image-pixelated" onError={() => setFailed(true)} />;
}

export default QuickLookPanel;
