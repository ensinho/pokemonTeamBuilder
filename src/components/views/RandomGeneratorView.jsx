import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import '../../styles/random-generator-view.css';
import { appId } from '../../constants/firebase';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { GENERATION_RANGES, LEGENDARY_IDS, NATURES_LIST } from '../../constants/pokemon';
import { typeColors } from '../../constants/types';
import { getPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { useTranslation } from '../../hooks/useTranslation';
import {
    getEvolutionChainData,
    getPokemonApiData,
    getPokemonSpeciesData,
    getStaticPokemonDetail,
} from '../../services/pokemonDataCache';
import { useModalA11y } from '../../hooks/useModalA11y';
import { AnchoredPopover } from '../AnchoredPopover';
import { EmptyState } from '../EmptyState';
import {
    ChartColumnIcon,
    CloseIcon,
    CollapseRightIcon,
    DiceIcon,
    InfoIcon,
    RefreshIcon,
} from '../icons';

const RANDOM_GENERATOR_INTRO_STORAGE_PREFIX = 'randomGeneratorIntroSeen';
const RANDOM_GENERATOR_FILTERS_LAYOUT_STORAGE_PREFIX = 'randomGeneratorFiltersLayoutExpanded';

const RANDOM_GENERATOR_STAT_LABELS = Object.freeze({
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
});

const RandomGeneratorIntroModal = ({ onClose, colors }) => {
    const dialogRef = useModalA11y(onClose);
    const { t, language } = useTranslation();

    const steps = [
        {
            title: language === 'pt' ? '1. Rolar' : '1. Roll',
            description: language === 'pt' ? 'Defina os filtros, escolha a quantidade e gere.' : 'Set filters, choose count, and generate.',
        },
        {
            title: language === 'pt' ? '2. Narrar' : '2. Host',
            description: language === 'pt' ? 'Um jogador visualiza os resultados secretos.' : 'One player views the secret results.',
        },
        {
            title: language === 'pt' ? '3. Revelar' : '3. Reveal',
            description: language === 'pt' ? 'Revele o cartão quando adivinharem corretamente.' : 'Show the card once they guess right.',
        },
    ];

    const questionIdeas = language === 'pt' ? [
        'É lendário?',
        'É da 1ª Geração?',
        'Evolui?',
        'É do tipo Água?',
    ] : [
        'Is it legendary?',
        'Is it Gen I?',
        'Does it evolve?',
        'Is it Water-type?',
    ];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="random-generator-intro-title"
                tabIndex={-1}
                className="flex w-full max-w-xl max-h-[min(88vh,42rem)] flex-col overflow-hidden rounded-[1.75rem] bg-surface shadow-2xl animate-scale-in focus:outline-none sm:max-h-[min(86vh,44rem)]"
                style={{ border: `1px solid ${colors.primary}33` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="relative px-4 py-4 sm:px-6 sm:py-5 shrink-0"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary}22 0%, ${colors.card} 72%)`,
                        borderBottom: `1px solid ${colors.primary}22`,
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={language === 'pt' ? 'Fechar guia do gerador aleatório' : 'Close random generator guide'}
                        className="absolute top-3 right-3 rounded-xl bg-surface-raised p-2 text-muted transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <CloseIcon />
                    </button>

                    <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs">
                        <DiceIcon />
                        {language === 'pt' ? 'Modo jogo de adivinhação' : 'Guessing game mode'}
                    </div>

                    <h2 id="random-generator-intro-title" className="mt-3 pr-10 text-xl font-extrabold tracking-tight text-fg sm:text-2xl">
                        {language === 'pt' ? 'Jogo de Adivinhação Pokémon' : 'Pokémon Guessing Game'}
                    </h2>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted sm:text-sm">
                        {language === 'pt' 
                            ? 'Mantenha a tela oculta, deixe os amigos fazerem perguntas de sim/não e revele quando eles adivinharem corretamente!'
                            : 'Keep the screen hidden, let friends ask yes/no questions, and reveal when they guess right!'}
                    </p>
                </div>

                <div
                    className="px-4 py-4 sm:px-6 sm:py-5 space-y-4 overflow-y-auto custom-scrollbar"
                    style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {steps.map((step) => (
                            <div
                                key={step.title}
                                className="rounded-2xl border border-surface-raised bg-bg p-3"
                            >
                                <p className="text-xs font-bold text-primary sm:text-sm">
                                    {step.title}
                                </p>
                                <p className="mt-1.5 text-[11px] leading-relaxed text-muted sm:text-xs">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl bg-bg p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                            {language === 'pt' ? 'Boas perguntas iniciais' : 'Good first questions'}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {questionIdeas.map((idea) => (
                                <span
                                    key={idea}
                                    className="rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-fg"
                                >
                                    {idea}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-[11px] leading-relaxed text-muted sm:text-xs">
                            {language === 'pt' ? 'O guia é exibido na sua primeira visita.' : 'Guide shows on your first visit.'}
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                        >
                            <DiceIcon />
                            {language === 'pt' ? 'Começar a jogar' : 'Start playing'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const formatPokemonStatLabel = (statName = '', language) => {
    if (language === 'pt') {
        const labelsPt = {
            hp: 'PS',
            attack: 'Ataque',
            defense: 'Defesa',
            'special-attack': 'At. Sp.',
            'special-defense': 'Def. Sp.',
            speed: 'Velocidade',
        };
        return labelsPt[statName] || statName.replace(/-/g, ' ');
    }
    const labelsEn = {
        hp: 'HP',
        attack: 'Attack',
        defense: 'Defense',
        'special-attack': 'Sp. Atk',
        'special-defense': 'Sp. Def',
        speed: 'Speed',
    };
    return labelsEn[statName] || statName.replace(/-/g, ' ');
};

const getStrongestStat = (stats = []) => {
    if (!Array.isArray(stats) || stats.length === 0) return null;
    return stats.reduce((best, stat) => (!best || stat.base_stat > best.base_stat ? stat : best), null);
};

const getPokemonStatusMeta = (pokemon, colors, language) => {
    if (pokemon.isLegendary) {
        return {
            label: language === 'pt' ? 'Lendário' : 'Legendary',
            tone: colors.warning,
            hint: language === 'pt' ? 'Raro, uma grande adição à equipe.' : 'Rare, high-impact roster pull.',
        };
    }

    if (pokemon.isMythical) {
        return {
            label: language === 'pt' ? 'Mítico' : 'Mythical',
            tone: colors.primary,
            hint: language === 'pt' ? 'Nível de evento e extraordinariamente raro.' : 'Event-tier and unusually rare.',
        };
    }

    return {
        label: language === 'pt' ? 'Comum' : 'Regular',
        tone: colors.text,
        hint: language === 'pt' ? 'Encontro padrão.' : 'Standard encounter pool.',
    };
};

const StatusInfoCard = ({ pokemon, colors }) => {
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef(null);
    const popoverRef = useRef(null);
    const closeTimerRef = useRef(null);
    const { t, language } = useTranslation();

    const statusMeta = useMemo(() => getPokemonStatusMeta(pokemon, colors, language), [pokemon, colors, language]);
    const strongestStat = useMemo(() => getStrongestStat(pokemon.stats), [pokemon.stats]);

    const clearCloseTimer = useCallback(() => {
        if (typeof window === 'undefined' || !closeTimerRef.current) return;
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    }, []);

    const openPopover = useCallback(() => {
        clearCloseTimer();
        setIsOpen(true);
    }, [clearCloseTimer]);

    const scheduleClose = useCallback(() => {
        if (typeof window === 'undefined') return;
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            setIsOpen(false);
            closeTimerRef.current = null;
        }, 90);
    }, [clearCloseTimer]);

    useEffect(() => () => {
        if (typeof window !== 'undefined' && closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
            setIsOpen(false);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                className="random-generator-compact-meta__button"
                style={{ '--random-generator-status-tone': statusMeta.tone }}
                aria-expanded={isOpen}
                aria-label={language === 'pt' ? `Detalhes de status de ${pokemon.name}` : `Status details for ${pokemon.name}`}
                onClick={() => {
                    clearCloseTimer();
                    setIsOpen((prev) => !prev);
                }}
                onMouseEnter={openPopover}
                onMouseLeave={scheduleClose}
            >
                <span className="random-generator-compact-meta__label">Status</span>
                <strong className="random-generator-compact-meta__value flex items-center justify-between gap-1">
                    <span style={{ color: statusMeta.tone }}>{statusMeta.label}</span>
                    <span className="random-generator-compact-meta__info-icon" aria-hidden="true">
                        <InfoIcon className="w-3 h-3" />
                    </span>
                </strong>
            </button>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={anchorRef}
                popoverRef={popoverRef}
                className="random-generator-status-popover"
                style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                }}
                arrowStyle={{
                    backgroundColor: colors.card,
                    borderTop: `1px solid ${colors.border}`,
                    borderLeft: `1px solid ${colors.border}`,
                }}
                placement="top"
                role="tooltip"
                ariaLabel={language === 'pt' ? `Detalhes de status de ${pokemon.name}` : `${pokemon.name} status details`}
            >
                <div
                    className="random-generator-status-popover__body"
                    onMouseEnter={openPopover}
                    onMouseLeave={scheduleClose}
                >
                    <p className="random-generator-status-popover__eyebrow">{language === 'pt' ? 'Info do card' : 'Card info'}</p>
                    <div className="random-generator-status-popover__row">
                        <span>Status</span>
                        <strong style={{ color: statusMeta.tone }}>{statusMeta.label}</strong>
                    </div>
                    <div className="random-generator-status-popover__row">
                        <span>{language === 'pt' ? 'Melhor atributo' : 'Strongest stat'}</span>
                        <strong>
                            {strongestStat
                                ? `${formatPokemonStatLabel(strongestStat.name, language)} ${strongestStat.base_stat}`
                                : (language === 'pt' ? 'Desconhecido' : 'Unknown')}
                        </strong>
                    </div>
                    <p className="random-generator-status-popover__hint">{statusMeta.hint}</p>
                </div>
            </AnchoredPopover>
        </>
    );
};

export function RandomGeneratorView({ colors, generations, db, userId }) {
    const { t, language } = useTranslation();
    const [generatedPokemon, setGeneratedPokemon] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAllIds, setIsLoadingAllIds] = useState(false);
    const [allPokemonIds, setAllPokemonIds] = useState([]);
    const [pokemonCount, setPokemonCount] = useState(3);
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [legendaryFilter, setLegendaryFilter] = useState('all');
    const [fullyEvolvedFilter, setFullyEvolvedFilter] = useState('all');
    const [formsFilter, setFormsFilter] = useState('all');
    const evolutionCacheRef = useRef({});
    const [showIntroModal, setShowIntroModal] = useState(false);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
    const [generationSummary, setGenerationSummary] = useState({ requested: 3, generated: 0, exhausted: false });
    const pokemonDataCacheRef = useRef({});
    const introStorageKey = useMemo(() => `${RANDOM_GENERATOR_INTRO_STORAGE_PREFIX}:${userId || 'guest'}`, [userId]);
    const filtersLayoutStorageKey = useMemo(() => `${RANDOM_GENERATOR_FILTERS_LAYOUT_STORAGE_PREFIX}:${userId || 'guest'}`, [userId]);
    const regionOptions = useMemo(
        () => (Array.isArray(generations) && generations.length > 0
            ? generations
            : Object.keys(GENERATION_RANGES).filter((generation) => generation !== 'all')),
        [generations]
    );
    const filterSummaryChips = useMemo(() => {
        const chips = [
            { key: 'count', label: language === 'pt' ? 'Quantidade' : 'Count', value: String(pokemonCount) },
            {
                key: 'region',
                label: language === 'pt' ? 'Região' : 'Region',
                value: selectedRegion === 'all'
                    ? (language === 'pt' ? 'Todas as regiões' : 'All regions')
                    : selectedRegion.replace('generation-', 'Gen ').replace('-', ' '),
            },
        ];

        if (selectedType !== 'all') {
            chips.push({
                key: 'type',
                label: language === 'pt' ? 'Tipo' : 'Type',
                value: t(`types.${selectedType}`),
            });
        }

        if (legendaryFilter === 'legendary') {
            chips.push({ key: 'legendary', label: language === 'pt' ? 'Raridade' : 'Rarity', value: language === 'pt' ? 'Lendário' : 'Legendary' });
        } else if (legendaryFilter === 'non-legendary') {
            chips.push({ key: 'legendary', label: language === 'pt' ? 'Raridade' : 'Rarity', value: language === 'pt' ? 'Sem lendários' : 'No legends' });
        }

        if (fullyEvolvedFilter === 'fully-evolved') {
            chips.push({ key: 'evolution', label: language === 'pt' ? 'Estágio' : 'Stage', value: language === 'pt' ? 'Estágio final' : 'Final stage' });
        } else if (fullyEvolvedFilter === 'not-fully-evolved') {
            chips.push({ key: 'evolution', label: language === 'pt' ? 'Estágio' : 'Stage', value: language === 'pt' ? 'Pode evoluir' : 'Can evolve' });
        }

        if (formsFilter === 'with-forms') {
            chips.push({ key: 'forms', label: language === 'pt' ? 'Formas' : 'Forms', value: language === 'pt' ? 'Formas alt' : 'Alt forms' });
        } else if (formsFilter === 'no-forms') {
            chips.push({ key: 'forms', label: language === 'pt' ? 'Formas' : 'Forms', value: language === 'pt' ? 'Sem formas' : 'No forms' });
        }

        return chips;
    }, [pokemonCount, selectedRegion, selectedType, legendaryFilter, fullyEvolvedFilter, formsFilter, language, t]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(filtersLayoutStorageKey);
            setIsFiltersExpanded(saved !== '0');
        } catch (_) {
            setIsFiltersExpanded(true);
        }
    }, [filtersLayoutStorageKey]);

    useEffect(() => {
        let cancelled = false;

        try {
            if (localStorage.getItem(introStorageKey) === '1') {
                setShowIntroModal(false);
                return () => {
                    cancelled = true;
                };
            }
        } catch (_) {
            // Ignore storage availability issues and fall back to Firestore.
        }

        if (!db || !userId) {
            setShowIntroModal(true);
            return () => {
                cancelled = true;
            };
        }

        (async () => {
            try {
                const prefRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'preferences');
                const snap = await getDoc(prefRef);
                if (cancelled) return;

                const seen = snap.exists() && snap.data()?.randomGeneratorIntroSeen === true;
                if (seen) {
                    try { localStorage.setItem(introStorageKey, '1'); } catch (_) { /* ignore */ }
                }
                setShowIntroModal(!seen);
            } catch (_) {
                if (!cancelled) {
                    setShowIntroModal(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [db, userId, introStorageKey]);

    const handleCloseIntroModal = useCallback(() => {
        setShowIntroModal(false);
        try { localStorage.setItem(introStorageKey, '1'); } catch (_) { /* ignore */ }

        if (!db || !userId) return;

        const prefRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'preferences');
        setDoc(prefRef, { randomGeneratorIntroSeen: true, updatedAt: Date.now() }, { merge: true }).catch(() => {
            // Best effort only.
        });
    }, [db, userId, introStorageKey]);

    const handleToggleFiltersLayout = useCallback(() => {
        setIsFiltersExpanded((prev) => {
            const next = !prev;
            try { localStorage.setItem(filtersLayoutStorageKey, next ? '1' : '0'); } catch (_) { /* ignore */ }
            return next;
        });
    }, [filtersLayoutStorageKey]);

    const getGenerationName = (id) => {
        for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
            if (gen !== 'all' && id >= range.start && id <= range.end) {
                return gen.replace('generation-', 'Gen ').toUpperCase();
            }
        }
        return 'Unknown';
    };

    const fetchEvolutionChain = useCallback(async (evolutionChainUrl, targetPokemonId = null) => {
        try {
            const cacheKey = targetPokemonId ? `${evolutionChainUrl}_${targetPokemonId}` : evolutionChainUrl;

            if (evolutionCacheRef.current[cacheKey]) {
                return evolutionCacheRef.current[cacheKey];
            }

            const evoData = await getEvolutionChainData(evolutionChainUrl);
            const EEVEE_FAMILY = [133, 134, 135, 136, 196, 197, 470, 471, 700];
            const evolutions = [];
            const isEeveeFamily = targetPokemonId && EEVEE_FAMILY.includes(parseInt(targetPokemonId, 10));

            if (isEeveeFamily) {
                const findPathToTarget = (chain, targetId, path = []) => {
                    const speciesId = chain.species.url.split('/').filter(Boolean).pop();
                    const currentPath = [...path, {
                        name: chain.species.name,
                        id: speciesId,
                        chain,
                    }];

                    if (parseInt(speciesId, 10) === parseInt(targetId, 10)) {
                        return currentPath;
                    }

                    if (chain.evolves_to && chain.evolves_to.length > 0) {
                        for (const evo of chain.evolves_to) {
                            const result = findPathToTarget(evo, targetId, currentPath);
                            if (result) return result;
                        }
                    }

                    return null;
                };

                const pathToTarget = findPathToTarget(evoData.chain, targetPokemonId);

                if (pathToTarget) {
                    pathToTarget.forEach((node, index) => {
                        const id = parseInt(node.id, 10);
                        let genIntroduced = 'Unknown';

                        for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
                            if (gen !== 'all' && id >= range.start && id <= range.end) {
                                genIntroduced = gen.replace('generation-', 'Gen ').toUpperCase();
                                break;
                            }
                        }

                        evolutions.push({
                            name: node.name,
                            id: node.id,
                            stage: index + 1,
                            genIntroduced,
                            evolutionDetails: node.chain.evolution_details?.[0] || null,
                        });
                    });
                }
            } else {
                const processChain = (chain, stage = 1) => {
                    const speciesId = chain.species.url.split('/').filter(Boolean).pop();
                    const id = parseInt(speciesId, 10);
                    let genIntroduced = 'Unknown';

                    for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
                        if (gen !== 'all' && id >= range.start && id <= range.end) {
                            genIntroduced = gen.replace('generation-', 'Gen ').toUpperCase();
                            break;
                        }
                    }

                    evolutions.push({
                        name: chain.species.name,
                        id: speciesId,
                        stage,
                        genIntroduced,
                        evolutionDetails: chain.evolution_details?.[0] || null,
                    });

                    if (chain.evolves_to && chain.evolves_to.length > 0) {
                        chain.evolves_to.forEach((evo) => processChain(evo, stage + 1));
                    }
                };

                processChain(evoData.chain);
            }

            evolutionCacheRef.current[cacheKey] = evolutions;

            return evolutions;
        } catch (error) {
            console.error('Error fetching evolution chain:', error);
            return [];
        }
    }, []);

    const fetchPokemonForms = useCallback(async (speciesData) => {
        try {
            const forms = await Promise.all(
                (speciesData?.varieties || [])
                    .filter((variety) => !variety.is_default)
                    .slice(0, 5)
                    .map(async (variety) => {
                        try {
                            const formData = await getPokemonApiData(variety.pokemon.url);
                            return {
                                name: variety.pokemon.name,
                                sprite: formData.sprites.front_default || formData.sprites.other?.['official-artwork']?.front_default,
                            };
                        } catch {
                            return null;
                        }
                    })
            );

            return forms.filter(Boolean);
        } catch (error) {
            console.error('Error fetching forms:', error);
            return [];
        }
    }, []);

    const fetchFullPokemonData = useCallback(async (pokemonId) => {
        if (pokemonDataCacheRef.current[pokemonId]) {
            return pokemonDataCacheRef.current[pokemonId];
        }

        try {
            const randomNature = NATURES_LIST[Math.floor(Math.random() * NATURES_LIST.length)];
            const getRandomGender = (genderRate) => {
                if (genderRate === 0) return 'Male';
                if (genderRate === 8) return 'Female';
                if (genderRate !== -1 && Number.isInteger(genderRate)) {
                    return Math.random() < (genderRate / 8) ? 'Female' : 'Male';
                }
                return 'Genderless';
            };

            const staticPokemonData = await getStaticPokemonDetail(pokemonId);
            if (staticPokemonData?.evolutions) {
                const fullPokemon = {
                    ...staticPokemonData,
                    generation: getGenerationName(staticPokemonData.id),
                    abilities: (staticPokemonData.abilities || []).map((ability) => typeof ability === 'string' ? ability : ability.name).filter(Boolean),
                    habitat: staticPokemonData.habitat || 'Unknown',
                    growthRate: staticPokemonData.growthRate || 'Unknown',
                    nature: randomNature,
                    gender: getRandomGender(staticPokemonData.genderRate),
                };
                pokemonDataCacheRef.current[pokemonId] = fullPokemon;
                return fullPokemon;
            }

            const [pokemonData, speciesData] = await Promise.all([
                getPokemonApiData(pokemonId),
                getPokemonSpeciesData(pokemonId),
            ]);

            if (!pokemonData || !speciesData) return null;

            const evolutions = speciesData.evolution_chain?.url
                ? await fetchEvolutionChain(speciesData.evolution_chain.url, pokemonId)
                : [];
            const forms = await fetchPokemonForms(speciesData);
            const currentEvo = evolutions.find((evolution) => parseInt(evolution.id, 10) === pokemonId);
            const evolutionStage = currentEvo?.stage || 1;
            const isFullyEvolved = !evolutions.some((evolution) => evolution.stage > evolutionStage);

            const fullPokemon = {
                id: pokemonData.id,
                name: pokemonData.name,
                types: pokemonData.types.map((typeEntry) => typeEntry.type.name),
                sprite: pokemonData.sprites.other?.['official-artwork']?.front_default || pokemonData.sprites.front_default,
                shinySprite: pokemonData.sprites.other?.['official-artwork']?.front_shiny || pokemonData.sprites.front_shiny,
                height: pokemonData.height / 10,
                weight: pokemonData.weight / 10,
                generation: getGenerationName(pokemonData.id),
                stats: pokemonData.stats.map((statEntry) => ({ name: statEntry.stat.name, base_stat: statEntry.base_stat })),
                abilities: pokemonData.abilities.map((abilityEntry) => abilityEntry.ability.name),
                evolutions,
                evolutionStage,
                isFullyEvolved,
                forms,
                isLegendary: speciesData.is_legendary,
                isMythical: speciesData.is_mythical,
                habitat: speciesData.habitat?.name || 'Unknown',
                nature: randomNature,
                gender: getRandomGender(speciesData.gender_rate),
                baseHappiness: speciesData.base_happiness,
                captureRate: speciesData.capture_rate,
                growthRate: speciesData.growth_rate?.name || 'Unknown',
            };

            pokemonDataCacheRef.current[pokemonId] = fullPokemon;
            return fullPokemon;
        } catch (error) {
            console.error(`Error fetching Pokemon ${pokemonId}:`, error);
            return null;
        }
    }, [fetchEvolutionChain, fetchPokemonForms]);

    const loadAllPokemonIds = useCallback(async () => {
        if (allPokemonIds.length > 0) return allPokemonIds;

        setIsLoadingAllIds(true);
        try {
            const maxNationalDexId = GENERATION_RANGES.all.end;
            const ids = Array.from({ length: maxNationalDexId }, (_, index) => index + 1);
            setAllPokemonIds(ids);
            return ids;
        } catch (error) {
            console.error('Error loading national dex index:', error);
            return [];
        } finally {
            setIsLoadingAllIds(false);
        }
    }, [allPokemonIds]);

    const matchesPokemonFilters = useCallback((pokemon) => {
        if (!pokemon) return false;
        if (selectedType !== 'all' && !pokemon.types.includes(selectedType)) return false;
        if (legendaryFilter === 'legendary' && !LEGENDARY_IDS.has(pokemon.id)) return false;
        if (legendaryFilter === 'non-legendary' && LEGENDARY_IDS.has(pokemon.id)) return false;
        if (fullyEvolvedFilter === 'fully-evolved' && !pokemon.isFullyEvolved) return false;
        if (fullyEvolvedFilter === 'not-fully-evolved' && pokemon.isFullyEvolved) return false;
        if (formsFilter === 'with-forms' && (!pokemon.forms || pokemon.forms.length === 0)) return false;
        if (formsFilter === 'no-forms' && (pokemon.forms?.length || 0) > 0) return false;
        return true;
    }, [selectedType, legendaryFilter, fullyEvolvedFilter, formsFilter]);

    const generateRandomPokemon = useCallback(async () => {
        const requestedCount = Math.max(1, Number(pokemonCount) || 1);
        setIsLoading(true);
        setGeneratedPokemon([]);
        setGenerationSummary({ requested: requestedCount, generated: 0, exhausted: false });

        try {
            let validIds = [];
            if (selectedRegion === 'all') {
                validIds = await loadAllPokemonIds();
            } else {
                const range = GENERATION_RANGES[selectedRegion] || GENERATION_RANGES.all;
                validIds = Array.from({ length: range.end - range.start + 1 }, (_, index) => range.start + index);
            }

            if (legendaryFilter === 'legendary') {
                validIds = validIds.filter((id) => LEGENDARY_IDS.has(id));
            } else if (legendaryFilter === 'non-legendary') {
                validIds = validIds.filter((id) => !LEGENDARY_IDS.has(id));
            }

            if (validIds.length === 0) {
                setGenerationSummary({ requested: requestedCount, generated: 0, exhausted: true });
                return;
            }

            const shuffledIds = [...validIds];
            for (let index = shuffledIds.length - 1; index > 0; index -= 1) {
                const randomIndex = Math.floor(Math.random() * (index + 1));
                [shuffledIds[index], shuffledIds[randomIndex]] = [shuffledIds[randomIndex], shuffledIds[index]];
            }

            const results = [];
            const seenIds = new Set();
            const batchSize = Math.min(Math.max(requestedCount * 4, 12), 36);
            let cursor = 0;

            while (results.length < requestedCount && cursor < shuffledIds.length) {
                const batchIds = shuffledIds.slice(cursor, cursor + batchSize);
                cursor += batchSize;
                const batchResults = await Promise.all(batchIds.map((id) => fetchFullPokemonData(id)));

                for (const pokemon of batchResults) {
                    if (!pokemon || seenIds.has(pokemon.id) || !matchesPokemonFilters(pokemon)) {
                        continue;
                    }

                    seenIds.add(pokemon.id);
                    results.push(pokemon);

                    if (results.length === requestedCount) {
                        break;
                    }
                }
            }

            const finalResults = results.slice(0, requestedCount);
            setGeneratedPokemon(finalResults);
            setGenerationSummary({
                requested: requestedCount,
                generated: finalResults.length,
                exhausted: finalResults.length < requestedCount,
            });
        } catch (error) {
            console.error('Error generating Pokemon:', error);
            setGenerationSummary({ requested: requestedCount, generated: 0, exhausted: true });
        } finally {
            setIsLoading(false);
        }
    }, [pokemonCount, selectedRegion, legendaryFilter, loadAllPokemonIds, fetchFullPokemonData, matchesPokemonFilters]);

    useEffect(() => {
        generateRandomPokemon();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const PokemonDetailCard = ({ pokemon, roundNumber }) => {
        const [evoSprites, setEvoSprites] = useState({});
        const [loadingSprites, setLoadingSprites] = useState(true);
        const evolutionChain = useMemo(() => Array.isArray(pokemon.evolutions) ? pokemon.evolutions : [], [pokemon.evolutions]);
        const hasEvolutionLine = evolutionChain.length > 1;

        useEffect(() => {
            const fetchEvoSprites = async () => {
                if (!hasEvolutionLine) {
                    setLoadingSprites(false);
                    return;
                }

                setLoadingSprites(true);
                const sprites = {};

                try {
                    await Promise.all(
                        evolutionChain.map(async (evo) => {
                            try {
                                const data = await getPokemonApiData(evo.id);
                                sprites[evo.id] = data.sprites.front_default;
                            } catch {
                                sprites[evo.id] = null;
                            }
                        })
                    );
                } catch (error) {
                    console.error('Error fetching evo sprites:', error);
                }
                setEvoSprites(sprites);
                setLoadingSprites(false);
            };

            fetchEvoSprites();
        }, [evolutionChain, hasEvolutionLine]);

        const primaryType = pokemon.types[0];
        const primaryTypeColor = typeColors[primaryType] || colors.primary;

        const EvolutionSprite = ({ evo, isCurrent = false }) => {
            const spriteSrc = isCurrent ? (pokemon.sprite || POKEBALL_PLACEHOLDER_URL) : (evoSprites[evo.id] || POKEBALL_PLACEHOLDER_URL);

            return (
                <div className={`random-generator-evolution-node ${isCurrent ? 'is-current' : ''}`}>
                    <div
                        className="random-generator-evolution-node__art"
                        style={{
                            backgroundColor: isCurrent ? typeColors[primaryType] + '14' : colors.background,
                            borderColor: isCurrent ? typeColors[primaryType] : colors.border,
                        }}
                    >
                        {loadingSprites ? (
                            <div
                                className={`random-generator-evolution-node__skeleton ${isCurrent ? 'is-current' : ''} animate-pulse`}
                                style={{ backgroundColor: colors.cardLight }}
                            />
                        ) : (
                            <img
                                src={spriteSrc}
                                alt={evo.name}
                                className={`random-generator-evolution-node__image ${isCurrent ? 'is-current' : ''}`}
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                        )}
                    </div>
                    <p
                        className={`random-generator-evolution-node__name ${isCurrent ? 'is-current' : ''}`}
                        style={{ color: isCurrent ? colors.text : colors.textMuted }}
                    >
                        {evo.name.replace(/-/g, ' ')}
                    </p>
                </div>
            );
        };

        return (
            <article
                className="random-generator-card"
                style={{
                    '--random-generator-type-color': primaryTypeColor,
                    '--random-generator-type-soft': `${primaryTypeColor}18`,
                    '--random-generator-type-border': `${primaryTypeColor}44`,
                }}
            >
                <div className="random-generator-card__hero">
                    <div className="random-generator-card__top">
                        <div className="random-generator-card__chip-row">
                            <span className="random-generator-card__chip" style={{ color: colors.primary }}>
                                {language === 'pt' ? 'Rodada' : 'Round'} {roundNumber}
                            </span>
                            <span className="random-generator-card__chip" style={{ color: colors.textMuted }}>
                                #{String(pokemon.id).padStart(3, '0')}
                            </span>
                        </div>
                        <span className="random-generator-card__chip" style={{ backgroundColor: `${primaryTypeColor}1A`, color: primaryTypeColor }}>
                            {pokemon.generation}
                        </span>
                    </div>

                    <div className="random-generator-card__hero-body">
                        <div
                            className="random-generator-card__art"
                            style={{
                                backgroundColor: `${primaryTypeColor}1A`,
                                borderColor: primaryTypeColor,
                            }}
                        >
                            <img
                                src={getPokemonDisplaySprite(pokemon) || POKEBALL_PLACEHOLDER_URL}
                                alt={pokemon.name}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-contain image-pixelated"
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                        </div>
                        <div className="random-generator-card__identity">
                            <h3 className="random-generator-card__title">
                                {pokemon.name.replace(/-/g, ' ')}
                            </h3>
                            <div className="random-generator-card__taxonomy">
                                <div className="random-generator-card__type-list">
                                    {pokemon.types.map((type) => (
                                        <span
                                            key={type}
                                            className="random-generator-card__type-pill"
                                            style={{ backgroundColor: typeColors[type] }}
                                        >
                                            {t(`types.${type}`)}
                                        </span>
                                    ))}
                                </div>
                                {pokemon.abilities?.length > 0 && (
                                    <div className="random-generator-card__ability-group">
                                        <span className="random-generator-card__ability-label">{language === 'pt' ? 'Habilidades' : 'Abilities'}</span>
                                        <div className="random-generator-card__ability-list">
                                            {pokemon.abilities.map((ability, index) => (
                                                <span
                                                    key={ability}
                                                    className={`random-generator-card__ability-pill ${index === 0 ? 'is-primary' : ''} capitalize`}
                                                >
                                                    {ability.replace(/-/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="random-generator-card__body">
                    <div className="random-generator-compact-meta">
                        <div className="random-generator-compact-meta__item">
                            <span className="random-generator-compact-meta__label">{language === 'pt' ? 'Altura' : 'Height'}</span>
                            <strong className="random-generator-compact-meta__value">{pokemon.height}m</strong>
                        </div>
                        <div className="random-generator-compact-meta__item">
                            <span className="random-generator-compact-meta__label">{language === 'pt' ? 'Peso' : 'Weight'}</span>
                            <strong className="random-generator-compact-meta__value">{pokemon.weight}kg</strong>
                        </div>
                        <div className="random-generator-compact-meta__item">
                            <span className="random-generator-compact-meta__label">Habitat</span>
                            <strong className="random-generator-compact-meta__value capitalize">
                                {pokemon.habitat?.replace(/-/g, ' ') || (language === 'pt' ? 'Desconhecido' : 'Unknown')}
                            </strong>
                        </div>
                        <div className="random-generator-compact-meta__item">
                            <StatusInfoCard pokemon={pokemon} colors={colors} />
                        </div>
                    </div>

                    {hasEvolutionLine && (
                        <div className="random-generator-section random-generator-section--compact random-generator-section--centered">
                            <div className="random-generator-section__header random-generator-section__header--centered">
                                <p className="random-generator-section__label" style={{ color: colors.primary }}>
                                    {language === 'pt' ? 'Linha evolutiva' : 'Evolution line'}
                                </p>
                                <span className="random-generator-section__meta" style={{ color: colors.textMuted }}>
                                    {pokemon.isFullyEvolved 
                                        ? (language === 'pt' ? 'Estágio final' : 'Final stage') 
                                        : (language === 'pt' ? `Estágio ${pokemon.evolutionStage}` : `Stage ${pokemon.evolutionStage}`)}
                                </span>
                            </div>
                            <div
                                className="random-generator-evolution-strip overflow-x-auto custom-scrollbar"
                                style={{ '--scrollbar-track-color': colors.cardLight, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.cardLight }}
                            >
                                <div className="random-generator-evolution-strip__track">
                                    {evolutionChain.map((evo, index) => {
                                        const isCurrent = parseInt(evo.id, 10) === pokemon.id;
                                        return (
                                            <React.Fragment key={evo.id}>
                                                <EvolutionSprite evo={evo} isCurrent={isCurrent} />
                                                {index < evolutionChain.length - 1 && (
                                                    <span className="random-generator-evolution-separator" style={{ color: colors.textMuted }}>→</span>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {pokemon.forms && pokemon.forms.length > 0 && formsFilter !== 'no-forms' && (
                        <div className="random-generator-section random-generator-section--compact">
                            <div className="random-generator-section__header">
                                <p className="random-generator-section__label">
                                    {language === 'pt' ? 'Formas alternativas' : 'Alternate forms'}
                                </p>
                                <span className="random-generator-section__meta">
                                    {pokemon.forms.length}
                                </span>
                            </div>
                            <div className="random-generator-forms-grid">
                                {pokemon.forms.slice(0, 4).map((form) => (
                                    <div key={form.name} className="random-generator-form">
                                        {form.sprite && (
                                            <img src={form.sprite} alt={form.name} className="w-10 h-10 mx-auto" />
                                        )}
                                        <p className="random-generator-form__name">
                                            {form.name.replace(pokemon.name + '-', '').replace(/-/g, ' ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </article>
        );
    };

    return (
        <main className="random-generator-view">
            {showIntroModal && <RandomGeneratorIntroModal onClose={handleCloseIntroModal} colors={colors} />}

            <section className="random-generator-panel random-generator-panel--results">
                {/* Unified top toolbar */}
                <div className="random-generator-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-border">
                    <div className="random-generator-filters-toggle-wrap">
                        <button
                            type="button"
                            onClick={handleToggleFiltersLayout}
                            className="random-generator-filters__toggle"
                            aria-expanded={isFiltersExpanded}
                            aria-controls="random-generator-filters-panel"
                        >
                            <span className="flex items-center justify-between gap-3">
                                <span className="min-w-0 flex items-center gap-2 text-sm font-bold text-fg">
                                    <ChartColumnIcon className="w-4 h-4 text-primary" />
                                    {language === 'pt' ? 'Filtros' : 'Filters'}
                                    <span className="random-generator-filters__count-badge text-muted text-xs font-normal ml-1">
                                        ({filterSummaryChips.length} {language === 'pt' ? 'ativos' : 'active'})
                                    </span>
                                </span>
                                <span className={`random-generator-filters__toggle-icon ${isFiltersExpanded ? 'is-expanded' : ''}`} aria-hidden="true">
                                    <CollapseRightIcon />
                                </span>
                            </span>
                        </button>
                    </div>

                    <div className="random-generator-actions flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowIntroModal(true)}
                            className="random-generator-action random-generator-action--ghost"
                        >
                            <InfoIcon />
                            {language === 'pt' ? 'Como Jogar' : 'How to Play'}
                        </button>
                        <button
                            type="button"
                            onClick={generateRandomPokemon}
                            disabled={isLoading || isLoadingAllIds}
                            className="random-generator-action random-generator-action--primary"
                        >
                            <RefreshIcon />
                            {isLoading 
                                ? (language === 'pt' ? 'Gerando...' : 'Generating...') 
                                : isLoadingAllIds 
                                    ? (language === 'pt' ? 'Preparando...' : 'Preparing pool...') 
                                    : (language === 'pt' ? 'Gerar' : 'Generate')}
                        </button>
                    </div>
                </div>

                {/* Collapsible Filters Grid */}
                <div
                    id="random-generator-filters-panel"
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                        maxHeight: isFiltersExpanded ? '40rem' : '0px',
                        opacity: isFiltersExpanded ? 1 : 0,
                        transform: isFiltersExpanded ? 'translateY(0)' : 'translateY(-8px)',
                        pointerEvents: isFiltersExpanded ? 'auto' : 'none',
                    }}
                    aria-hidden={!isFiltersExpanded}
                >
                    <div className="random-generator-filters__grid pb-3 mb-3 border-b border-border">
                        <label className="random-generator-field">
                            <span className="random-generator-field__label">{language === 'pt' ? 'Quantidade' : 'Count'}</span>
                            <select
                                value={pokemonCount}
                                onChange={(e) => setPokemonCount(parseInt(e.target.value, 10))}
                                className="random-generator-select"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((count) => (
                                    <option key={count} value={count}>{count}</option>
                                ))}
                            </select>
                        </label>

                        <label className="random-generator-field">
                            <span className="random-generator-field__label">{language === 'pt' ? 'Região' : 'Region'}</span>
                            <select
                                value={selectedRegion}
                                onChange={(e) => setSelectedRegion(e.target.value)}
                                className="random-generator-select capitalize"
                            >
                                <option value="all">{language === 'pt' ? 'Todas as regiões' : 'All regions'}</option>
                                {regionOptions.map((generation) => (
                                    <option key={generation} value={generation} className="capitalize">
                                        {generation.replace('generation-', 'Gen ').replace('-', ' ')}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="random-generator-field">
                            <span className="random-generator-field__label">{language === 'pt' ? 'Tipo' : 'Type'}</span>
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="random-generator-select capitalize"
                            >
                                <option value="all">{language === 'pt' ? 'Todos os tipos' : 'All types'}</option>
                                {Object.keys(typeColors).map((type) => (
                                    <option key={type} value={type} className="capitalize">{t(`types.${type}`)}</option>
                                ))}
                            </select>
                        </label>

                        <label className="random-generator-field">
                            <span className="random-generator-field__label">{language === 'pt' ? 'Raridade' : 'Rarity'}</span>
                            <select
                                value={legendaryFilter}
                                onChange={(e) => setLegendaryFilter(e.target.value)}
                                className="random-generator-select"
                            >
                                <option value="all">{language === 'pt' ? 'Qualquer raridade' : 'Any rarity'}</option>
                                <option value="legendary">{language === 'pt' ? 'Apenas lendários' : 'Legendary only'}</option>
                                <option value="non-legendary">{language === 'pt' ? 'Excluir lendários' : 'Exclude legendaries'}</option>
                            </select>
                        </label>

                        <label className="random-generator-field">
                            <span className="random-generator-field__label">{language === 'pt' ? 'Estágio' : 'Stage'}</span>
                            <select
                                value={fullyEvolvedFilter}
                                onChange={(e) => setFullyEvolvedFilter(e.target.value)}
                                className="random-generator-select"
                            >
                                <option value="all">{language === 'pt' ? 'Qualquer estágio' : 'Any stage'}</option>
                                <option value="fully-evolved">{language === 'pt' ? 'Apenas último estágio' : 'Fully evolved only'}</option>
                                <option value="not-fully-evolved">{language === 'pt' ? 'Pode evoluir' : 'Not fully evolved'}</option>
                            </select>
                        </label>

                        <label className="random-generator-field">
                            <span className="random-generator-field__label">{language === 'pt' ? 'Formas' : 'Forms'}</span>
                            <select
                                value={formsFilter}
                                onChange={(e) => setFormsFilter(e.target.value)}
                                className="random-generator-select"
                            >
                                <option value="all">{language === 'pt' ? 'Qualquer pool de formas' : 'Any form pool'}</option>
                                <option value="with-forms">{language === 'pt' ? 'Apenas com formas alternativas' : 'Only Pokemon with alt forms'}</option>
                                <option value="no-forms">{language === 'pt' ? 'Apenas sem formas alternativas' : 'Only Pokemon without alt forms'}</option>
                            </select>
                        </label>
                    </div>
                </div>

                {!isFiltersExpanded && (
                    <div className="random-generator-filters__summary mb-4">
                        {filterSummaryChips.map((chip) => (
                            <span key={chip.key} className="random-generator-filters__chip">
                                <span className="text-muted">{chip.label}</span>
                                <span>{chip.value}</span>
                            </span>
                        ))}
                    </div>
                )}

                <div className="random-generator-divider" />

                <div className="random-generator-results__header">
                    <div>
                        <h3 className="random-generator-results__title">{language === 'pt' ? 'Giro Atual' : 'Current Roll'}</h3>
                        <p className="random-generator-results__copy">
                            {language === 'pt' 
                                ? `${generationSummary.generated}/${generationSummary.requested} Pokémon gerados.` 
                                : `${generationSummary.generated}/${generationSummary.requested} Pokémon generated.`}
                        </p>
                        {generationSummary.exhausted && generationSummary.generated < generationSummary.requested && (
                            <p className="random-generator-results__hint">
                                {language === 'pt' 
                                    ? `Apenas ${generationSummary.generated} corresponderam. Afrouxe os filtros para gerar todos.` 
                                    : `Only ${generationSummary.generated} matched. Loosen filters to generate all requested Pokémon.`}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={generateRandomPokemon}
                        disabled={isLoading || isLoadingAllIds}
                        className="random-generator-action random-generator-action--ghost"
                    >
                        <RefreshIcon />
                        {language === 'pt' ? 'Girar de novo' : 'Reroll'}
                    </button>
                </div>

                {isLoading ? (
                    <div className="random-generator-results__grid">
                        {Array.from({ length: pokemonCount }).map((_, index) => (
                            <div key={index} className="rounded-2xl overflow-hidden border border-border bg-surface-raised animate-pulse">
                                <div className="h-56 relative" style={{ backgroundColor: colors.card }}>
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="h-5 rounded w-2/3 mx-auto" style={{ backgroundColor: colors.card }}></div>
                                    <div className="flex gap-2 justify-center">
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.card }}></div>
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.card }}></div>
                                    </div>
                                    <div className="h-24 rounded-2xl" style={{ backgroundColor: colors.card }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : generatedPokemon.length > 0 ? (
                    <div className="random-generator-results__grid">
                        {generatedPokemon.map((pokemon, index) => (
                            <PokemonDetailCard key={`${pokemon.id}-${index}`} pokemon={pokemon} roundNumber={index + 1} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        compact
                        title={language === 'pt' ? 'Nenhum resultado' : 'Nothing rolled'}
                        message={language === 'pt' ? 'Nenhum Pokémon corresponde aos filtros selecionados. Tente afrouxá-los.' : 'No Pokemon match the selected filters. Try loosening them.'}
                    />
                )}
            </section>
        </main>
    );
}