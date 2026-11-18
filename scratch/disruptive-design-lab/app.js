import {
    ALL_TYPES,
    BUILDER_SLOTS_BASE,
    META_WATERFALL,
    NATURES,
    POKEDEX_SPECIES,
    SPEED_BENCHMARKS,
    SUGGESTION_OPTIONS,
    TOURNAMENT_TEAMS,
    TRAINER_PRESETS,
    TYPE_COLORS,
    TYPE_ICON_FILES,
    TYPE_LABELS_PT,
    defMultiplier,
    hashSeed,
    trainerPixels,
} from './data.js';
import { renderPokemonImg } from './sprites.js';
import {
    AliveBot,
    destroyAllAliveBots,
    ensureBotDefs,
    initScenes,
    odo,
    stillBot,
} from './scenes.js';

const HERO_CYCLE_POSES = [
    { mood: 'animado', pose: 'acenando', caption: 'Fantasminha 3D acompanha seu ponteiro — toque para trocar a pose' },
    { mood: 'curioso', pose: 'espiando', caption: 'Espiando o plantão noturno — toque para trocar a pose' },
    { mood: 'radiante', pose: 'comemorando', caption: 'Plantão 4/4 no horizonte — Fantasminha comemorando' },
    { mood: 'empolgado', pose: 'pulando', caption: 'Subiu de faixa no builder — quique com mola' },
    { mood: 'brilhando', pose: 'campeao', extra: { hat: 'crown' }, caption: 'Coroa regional + faíscas Ouro' },
];

const MIME_CLUES = [
    '01 · Fogo pálido na ponta da cauda que reage ao humor',
    '02 · Escala 0,6 m (abaixo do joelho do treinador)',
    '03 · Tipo puro Fogo — linha inicial de Kanto (#0004)',
    '04 · Base Speed 65 · Sp. Atk 60 · Blaze',
    '05 · Evolui para Charmeleon no Nível 16',
];

const MIME_GUESS_OPTIONS = [
    { id: 'charmander', name: 'Charmander', num: '#0004', spriteKey: 'charmander', correct: true },
    { id: 'torchic', name: 'Torchic', num: '#0255', spriteKey: 'torchic', correct: false },
    { id: 'cyndaquil', name: 'Cyndaquil', num: '#0155', spriteKey: 'cyndaquil', correct: false },
    { id: 'fennekin', name: 'Fennekin', num: '#0653', spriteKey: 'fennekin', correct: false },
];

const state = {
    view: 'narrativa',
    theme: 'dark',
    viewport: 'desktop',
    spriteMode: 'vector',
    heroCycleIdx: 0,
    // View 01 · Inspetor Tático
    slots: BUILDER_SLOTS_BASE.map((s) => (s ? { ...s } : null)),
    selectedSlot: 1, // 0-based index (Heatran initially selected to highlight 4x Ground)
    suggestionIdx: 0,
    suggestionApplied: false,
    prevSynergyScore: null,
    justPeeledSlot: -1,
    activeTypeInspect: 'ground',
    // View 02 · Pokédex v4
    dexKey: 'gengar',
    dexShiny: false,
    dexNature: 'Timid',
    dexEvs: { ...POKEDEX_SPECIES.gengar.defaultEvs },
    // View 03 · Meta & Torneios
    tourFilter: 'all',
    waterfallSort: 'usage',
    sheetTeamId: null,
    // View 04 · Dossiê do Treinador
    trainerIdx: 0,
    customUid: '',
    bonusXp: 0,
    tierListDone: false,
    stampAnim: false,
    // Fase 3 · A Mímica & O Ovo Surpresa
    mimeCluesOpen: 2,
    mimeGuess: null,
    mimeBg: 'route',
    eggDay: 3,
    eggWobble: false,
};

const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function typeChipHtml(type, { sm = false } = {}) {
    const color = TYPE_COLORS[type] || TYPE_COLORS.normal;
    const iconFile = TYPE_ICON_FILES[type] || TYPE_ICON_FILES.normal;
    const label = TYPE_LABELS_PT[type] || type;
    return `
        <span class="type-chip${sm ? ' type-chip--sm' : ''}" style="--type-chip:${color}">
            <img class="type-chip__icon" src="../../src/assets/typeIcons/${iconFile}" alt="" width="16" height="16" />
            <span>${label}</span>
        </span>
    `;
}

function animateFigure(el, fromVal, toVal, suffix = '') {
    if (!el) return;
    if (prefersReducedMotion() || fromVal === toVal) {
        el.textContent = `${toVal}${suffix}`;
        return;
    }
    const start = performance.now();
    const dur = 420;
    const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const cur = Math.round(fromVal + (toVal - fromVal) * eased);
        el.textContent = `${cur}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

let toastTimer = null;
function showToast(msg, { actionLabel = '', onAction = null } = {}) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-msg');
    const actBtn = document.getElementById('toast-action');
    msgEl.textContent = msg;
    if (actionLabel && onAction) {
        actBtn.textContent = actionLabel;
        actBtn.hidden = false;
        actBtn.onclick = () => {
            onAction();
            toast.classList.remove('is-visible');
        };
    } else {
        actBtn.hidden = true;
        actBtn.onclick = null;
    }
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 5200);
}

/* ── View 01 · Inspetor Tático ───────────────────────────────────────────── */
function computeTeamAnalysis(slots) {
    const active = slots.filter(Boolean);
    const typeRows = ALL_TYPES.map((atk) => {
        let weak = 0;
        let weak4x = 0;
        let resist = 0;
        let immune = 0;
        active.forEach((mon) => {
            const mult = defMultiplier(atk, mon.types, mon.ability);
            if (mult === 0) immune += 1;
            else if (mult >= 4) { weak += 1; weak4x += 1; }
            else if (mult > 1) weak += 1;
            else if (mult < 1) resist += 1;
        });
        const net = resist + immune - weak;
        return { type: atk, weak, weak4x, resist, immune, net };
    });

    const offensiveSet = new Set();
    active.forEach((mon) => {
        mon.moves.forEach((mv) => {
            const chartEntry = ALL_TYPES.filter((t) => {
                const target = t.charAt(0).toUpperCase() + t.slice(1);
                return defMultiplier(mv.type, [t], '') > 1;
            });
            chartEntry.forEach((t) => offensiveSet.add(t));
        });
    });

    const hasGroundImmunity = typeRows.find((r) => r.type === 'ground')?.immune > 0;
    const filledCount = active.length;
    let score = 74;
    if (filledCount === 6) {
        score = hasGroundImmunity && slots[4]?.id === 10009 ? 92 : 86;
    }

    return {
        filledCount,
        typeRows,
        offensiveCount: offensiveSet.size,
        score,
        hasGroundImmunity,
    };
}

function renderBuilderView() {
    const host = document.getElementById('view-builder');
    const analysis = computeTeamAnalysis(state.slots);
    const sug = SUGGESTION_OPTIONS[state.suggestionIdx];
    const resolved = state.suggestionApplied;
    const selectedType = state.activeTypeInspect;
    const focusedSlot = state.slots[state.selectedSlot] || state.slots.find(Boolean);

    const pipsHtml = state.slots
        .map((m) => {
            if (!m) return `<i></i>`;
            const c = TYPE_COLORS[m.types[0]] || TYPE_COLORS.normal;
            return `<i class="is-filled" style="--pip:${c}"></i>`;
        })
        .join('');

    const slotsHtml = state.slots
        .map((mon, idx) => {
            if (!mon) {
                return `
                    <button type="button" class="party-slot party-slot--empty is-pulsing-target" data-action="apply-suggestion">
                        <span class="badge badge--live badge--mono">SLOT 05 · ABERTO</span>
                        <span style="font-size:var(--text-sm);font-weight:var(--weight-semibold);margin-top:var(--space-1)">+ ${sug.name}</span>
                        <span class="muted" style="font-size:var(--text-2xs)">Clique para aplicar sugestão</span>
                    </button>
                `;
            }
            const primaryColor = TYPE_COLORS[mon.types[0]] || TYPE_COLORS.normal;
            const mult = selectedType ? defMultiplier(selectedType, mon.types, mon.ability) : 1;
            const targetClass =
                selectedType && mult > 1
                    ? ' is-weak-target'
                    : selectedType && mult < 1
                      ? ' is-resist-target'
                      : '';
            const peelClass = state.justPeeledSlot === idx ? ' is-peeling' : '';
            const selClass = state.selectedSlot === idx ? ' is-selected' : '';
            const multBadge =
                selectedType && mult !== 1
                    ? `<span class="badge badge--mono ${mult === 0 ? 'badge--success' : mult > 1 ? 'badge--live' : 'badge--success'}">${mult === 0 ? '0× Imune' : `${mult}×`}</span>`
                    : `<span class="party-slot__num">#0${idx + 1}</span>`;

            return `
                <button type="button" class="party-slot${selClass}${targetClass}${peelClass}" style="--card-type:${primaryColor}" data-slot-idx="${idx}">
                    <div class="party-slot__top">
                        <span class="party-slot__num">0${idx + 1}</span>
                        ${multBadge}
                    </div>
                    <div class="party-slot__sprite type-platform" style="--card-type:${primaryColor}">
                        ${renderPokemonImg(mon, { mode: state.spriteMode, size: 68 })}
                    </div>
                    <div>
                        <div class="party-slot__name">${mon.name}</div>
                        <div class="party-slot__sub">${mon.item} · ${mon.ability}</div>
                    </div>
                    <div class="party-slot__types">
                        ${mon.types.map((t) => typeChipHtml(t, { sm: true })).join('')}
                    </div>
                </button>
            `;
        })
        .join('');

    const groundRow = analysis.typeRows.find((r) => r.type === 'ground');
    const mascotMood = resolved ? 'brilhando' : 'preocupado';

    const covCellsHtml = analysis.typeRows
        .map((row) => {
            const isAlert = row.weak >= 2 && row.resist + row.immune === 0;
            const isSafe = row.immune > 0 || (row.resist >= 2 && row.weak === 0);
            const activeCls = state.activeTypeInspect === row.type ? ' is-active' : '';
            const toneCls = isAlert ? ' is-alert' : isSafe ? ' is-safe' : '';
            const netLabel = row.immune > 0 ? `${row.immune}∅` : row.net > 0 ? `+${row.net}` : `${row.net}`;
            const netCls = row.net < 0 && row.immune === 0 ? ' is-neg' : row.net > 0 || row.immune > 0 ? ' is-pos' : '';
            return `
                <button type="button" class="cov-cell${activeCls}${toneCls}" data-inspect-type="${row.type}">
                    <span class="cov-cell__left">
                        <img src="../../src/assets/typeIcons/${TYPE_ICON_FILES[row.type]}" alt="" width="16" height="16" />
                        <span class="cov-cell__name">${TYPE_LABELS_PT[row.type]}</span>
                    </span>
                    <span class="cov-cell__net${netCls}">${netLabel}</span>
                </button>
            `;
        })
        .join('');

    host.innerHTML = `
        <div class="view-head">
            <div>
                <div class="view-eyebrow">
                    <span class="live-dot"></span>
                    <span>01 · BUILDER × AFFECTUI · SINERGIA AO VIVO</span>
                </div>
                <h1 class="view-title">Inspetor <em class="accent-word">Tático</em></h1>
                <p class="view-lead">Cinto de 6 slots em plataformas iluminadas por tipo com intervenção de decisão AffectUI e matriz reativa de cobertura.</p>
            </div>
            <div class="party-pips" aria-label="${analysis.filledCount} de 6 Pokémon no time">
                ${pipsHtml}
                <span class="figure muted" style="font-size:var(--text-xs);margin-left:var(--space-1_5)">${analysis.filledCount}/6</span>
            </div>
        </div>

        <div class="builder-layout">
            <div class="panel">
                <div class="synergy-banner">
                    <div>
                        <div class="panel-meta">REG M-C · CORE OFENSIVO</div>
                        <div style="font-size:var(--text-md);font-weight:var(--weight-semibold);margin-top:var(--space-0_5)">
                            ${focusedSlot ? `Inspecionando ${focusedSlot.name} (${focusedSlot.role})` : 'Time em construção'}
                        </div>
                    </div>
                    <div class="synergy-score">
                        <div>
                            <div class="panel-meta">SCORE DE SINERGIA</div>
                            <div id="synergy-score-num" class="synergy-score__num${resolved ? ' is-peak' : ''}">${analysis.score}</div>
                        </div>
                        <span class="badge ${resolved ? 'badge--gold' : 'badge--live'}">
                            ${resolved ? 'Excelente' : '4× Risco Ground'}
                        </span>
                    </div>
                </div>

                <div class="party-grid">${slotsHtml}</div>

                <div class="decision-card${resolved ? ' is-resolved' : ''}" role="region" aria-label="Decisão de Sinergia do Mascote">
                    <div class="decision-card__mascot bot-companion" id="builder-decision-bot"></div>
                    <div>
                        <div class="decision-card__telemetry">
                            <span class="live-dot" style="${resolved ? 'background:var(--color-success)' : ''}"></span>
                            <span>${resolved ? 'INTERVENÇÃO APLICADA · GROUND NEUTRALIZADO' : `SINAL TÁTICO · GROUND 4× · ${groundRow.weak} VULNERÁVEIS · ${groundRow.immune} IMUNE`}</span>
                        </div>
                        <div class="decision-card__title">
                            ${resolved
                                ? `${state.slots[4].name} estabilizou o slot 5 (${state.slots[4].ability})`
                                : sug.headline}
                        </div>
                        <p class="decision-card__copy">
                            ${resolved
                                ? `Heatran e Incineroar agora têm um pivot seguro com imunidade 0× a Ground e cobertura ofensiva em ${analysis.offensiveCount}/18 tipos.`
                                : sug.rationale}
                        </p>
                        <div class="decision-card__deltas">
                            ${(resolved ? ['0× Imune a Ground', `Cobertura ${analysis.offensiveCount}/18`, `Score ${analysis.score}/100`] : sug.deltas)
                                .map((d) => `<span class="badge badge--mono ${resolved ? 'badge--success' : 'badge--primary'}">${d}</span>`)
                                .join('')}
                        </div>
                        <div class="decision-card__actions">
                            ${resolved
                                ? `<button type="button" class="btn btn-secondary" data-action="undo-suggestion">Desfazer slot 5</button>`
                                : `
                                    <button type="button" class="btn btn-primary" data-action="apply-suggestion">Aplicar sugestão</button>
                                    <button type="button" class="btn btn-secondary" data-action="cycle-suggestion">Ver outra opção</button>
                                `}
                        </div>
                    </div>
                </div>
            </div>

            <aside class="panel">
                <div class="panel-head">
                    <div>
                        <h3 class="panel-title">Mapa de Cobertura</h3>
                        <span class="panel-meta">Clique em um tipo para auditar slots</span>
                    </div>
                    <span class="badge badge--mono">${analysis.offensiveCount}/18 STAB</span>
                </div>

                <div class="coverage-map">${covCellsHtml}</div>

                <div class="panel-head" style="margin-bottom:var(--space-2)">
                    <h4 class="panel-title" style="font-size:var(--text-sm)">Trace Defensivo · ${TYPE_LABELS_PT[selectedType]}</h4>
                    <span class="panel-meta">AffectUI Trail</span>
                </div>
                <div class="trace-list">
                    ${state.slots
                        .map((mon, i) => {
                            if (!mon) {
                                return `
                                    <div class="trace-row">
                                        <div>
                                            <div class="trace-row__title muted">Slot 05 · Vazio</div>
                                            <div class="trace-row__sub">Aguardando pivot defensivo</div>
                                        </div>
                                        <span class="badge badge--mono">OPEN</span>
                                    </div>
                                `;
                            }
                            const mult = defMultiplier(selectedType, mon.types, mon.ability);
                            const badgeCls = mult === 0 || mult < 1 ? 'badge--success' : mult >= 4 ? 'badge--live' : mult > 1 ? 'badge--danger' : '';
                            const label = mult === 0 ? '0× Imune' : `${mult}×`;
                            return `
                                <div class="trace-row">
                                    <div>
                                        <div class="trace-row__title">0${i + 1} · ${mon.name}</div>
                                        <div class="trace-row__sub">${mon.ability}</div>
                                    </div>
                                    <span class="badge badge--mono ${badgeCls}">${label}</span>
                                </div>
                            `;
                        })
                        .join('')}
                </div>
            </aside>
        </div>
    `;

    state.justPeeledSlot = -1;

    const scoreEl = document.getElementById('synergy-score-num');
    if (scoreEl) {
        if (state.prevSynergyScore !== null && state.prevSynergyScore !== analysis.score) {
            odo(scoreEl, state.prevSynergyScore);
            void scoreEl.offsetHeight;
            odo(scoreEl, analysis.score);
        } else {
            odo(scoreEl, analysis.score);
        }
        state.prevSynergyScore = analysis.score;
    }

    const botHost = document.getElementById('builder-decision-bot');
    if (botHost) {
        new AliveBot(botHost, {
            mood: resolved ? 'empolgado' : 'preocupado',
            pose: resolved ? 'comemorando' : 'apontando',
            px: 66,
            extra: resolved ? { tone: 'electric' } : {},
            label: resolved ? 'Fantasminha comemorando sinergia resolvida' : 'Fantasminha apontando risco 4× Ground',
        });
    }
}

/* ── View 02 · Pokédex Instrumento v4 ────────────────────────────────────── */
function calcStatL50(key, base, ev, natureName) {
    const iv = 31;
    if (key === 'hp') {
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * 50) / 100) + 50 + 10;
    }
    const nat = NATURES[natureName] || { plus: null, minus: null };
    const mult = nat.plus === key ? 1.1 : nat.minus === key ? 0.9 : 1;
    const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * 50) / 100) + 5;
    return Math.floor(raw * mult);
}

function renderPokedexView() {
    const host = document.getElementById('view-pokedex');
    const mon = POKEDEX_SPECIES[state.dexKey];
    const heroColor = TYPE_COLORS[mon.types[0]] || TYPE_COLORS.ghost;

    const statDefs = [
        { key: 'hp', label: 'HP' },
        { key: 'atk', label: 'ATK' },
        { key: 'def', label: 'DEF' },
        { key: 'spa', label: 'SPA' },
        { key: 'spd', label: 'SPD' },
        { key: 'spe', label: 'SPE' },
    ];

    const computed = statDefs.map((s) => ({
        ...s,
        base: mon.baseStats[s.key],
        ev: state.dexEvs[s.key] || 0,
        val: calcStatL50(s.key, mon.baseStats[s.key], state.dexEvs[s.key] || 0, state.dexNature),
    }));
    const peakVal = Math.max(...computed.map((s) => s.val));
    const totalEvs = Object.values(state.dexEvs).reduce((a, b) => a + b, 0);
    const remainingEvs = Math.max(0, 510 - totalEvs);
    const bst = Object.values(mon.baseStats).reduce((a, b) => a + b, 0);
    const speStat = computed.find((s) => s.key === 'spe').val;

    const switcherHtml = Object.entries(POKEDEX_SPECIES)
        .map(([k, sp]) => `
            <button type="button" class="segmented__item" data-dex-key="${k}" aria-pressed="${state.dexKey === k}">
                <span class="figure">${sp.dex}</span>
                <span>${sp.name}</span>
            </button>
        `)
        .join('');

    const statsHtml = computed
        .map((s) => {
            const isPeak = s.val === peakVal;
            const pct = Math.min(100, Math.round((s.val / 215) * 100));
            return `
                <div class="stat-row${isPeak ? ' stat-row--peak' : ''}">
                    <span class="stat-row__key">${s.label}</span>
                    <span class="stat-row__val figure">${s.val}</span>
                    <div class="stat-track" title="Base ${s.base} · EV ${s.ev}">
                        <div class="stat-fill" style="width:${pct}%"></div>
                    </div>
                    <div class="ev-controls">
                        <button type="button" class="ev-btn" data-ev-step="${s.key}:-4" aria-label="Reduzir EV ${s.label}">−</button>
                        <button type="button" class="ev-btn${s.ev === 0 ? ' is-active' : ''}" data-ev-set="${s.key}:0">0</button>
                        <button type="button" class="ev-btn${s.ev === 124 ? ' is-active' : ''}" data-ev-set="${s.key}:124">124</button>
                        <button type="button" class="ev-btn${s.ev === 252 ? ' is-active' : ''}" data-ev-set="${s.key}:252">252</button>
                        <button type="button" class="ev-btn" data-ev-step="${s.key}:4" aria-label="Aumentar EV ${s.label}">+</button>
                    </div>
                </div>
            `;
        })
        .join('');

    const speedTicksHtml = SPEED_BENCHMARKS.map((b) => {
        const cleared = speStat >= b.speed;
        return `
            <span class="speed-tick${cleared ? ' is-cleared' : ''}">
                <span>${cleared ? '✓' : '·'}</span>
                <span>${b.speed}</span>
                <span>${b.label}</span>
            </span>
        `;
    }).join('');

    const abilitiesHtml = mon.abilities
        .map((ab) => `
            <div class="intel-row">
                <div>
                    <div class="intel-row__main">
                        <strong style="font-size:var(--text-sm)">${ab.name}</strong>
                    </div>
                    <div class="intel-row__desc">${ab.desc}</div>
                </div>
                <span class="badge badge--mono badge--primary">${ab.usage.toFixed(1)}%</span>
            </div>
        `)
        .join('');

    const itemsHtml = mon.items
        .map((it) => `
            <div class="intel-row">
                <div class="intel-row__main">
                    <span style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${it.name}</span>
                </div>
                <div class="usage-pill">
                    <span class="usage-mini-bar"><i style="width:${Math.min(100, it.usage)}%"></i></span>
                    <span>${it.usage.toFixed(1)}%</span>
                </div>
            </div>
        `)
        .join('');

    const movesHtml = mon.moves
        .map((mv) => `
            <div class="intel-row">
                <div class="intel-row__main">
                    ${typeChipHtml(mv.type, { sm: true })}
                    <span style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${mv.name}</span>
                </div>
                <div class="usage-pill">
                    <span class="usage-mini-bar"><i style="width:${Math.min(100, mv.usage)}%"></i></span>
                    <span>${mv.usage.toFixed(1)}%</span>
                </div>
            </div>
        `)
        .join('');

    host.innerHTML = `
        <div class="view-head">
            <div>
                <div class="view-eyebrow">
                    <span>02 · POKÉDEX INSTRUMENTO V4 · M3 EXPRESSIVE</span>
                </div>
                <h1 class="view-title">Estágio <em class="accent-word">Pokédex</em></h1>
                <p class="view-lead">Palco iluminado pelo tipo sobre grade Town-Map, bancada EV nível 50 em tempo real e uso competitivo sem bordas aninhadas.</p>
            </div>
            <div class="dex-switcher">
                <div class="segmented segmented--sm segmented--quiet" role="group" aria-label="Selecionar Pokémon">
                    ${switcherHtml}
                </div>
            </div>
        </div>

        <article class="pokedex-hero" style="--hero-type:${heroColor}">
            <div class="pokedex-hero__grid-bg" aria-hidden="true"></div>
            <div class="pokedex-hero__inner">
                <div class="pokedex-stage spark-host${state.dexShiny ? ' is-bursting' : ''}" style="--spark-color:var(--brand-gold)">
                    <div class="pokedex-stage__rings" aria-hidden="true"></div>
                    ${renderPokemonImg(mon, { mode: state.spriteMode, artwork: true, shiny: state.dexShiny, size: 184, className: state.dexShiny ? 'is-shiny-pop' : '' })}
                </div>
                <div>
                    <div class="pokedex-hero__top">
                        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
                            <span class="badge badge--mono">${mon.dex}</span>
                            <span class="badge">${mon.generation}</span>
                            ${mon.types.map((t) => typeChipHtml(t)).join('')}
                        </div>
                        <button type="button" class="btn btn-secondary btn--sm" data-action="toggle-shiny" aria-pressed="${state.dexShiny}">
                            <span style="color:var(--color-accent)">★</span>
                            <span>${state.dexShiny ? 'Shiny ativo' : 'Ver Shiny'}</span>
                        </button>
                    </div>
                    <h2 class="title-display" style="font-size:var(--text-2xl);margin-top:var(--space-1)">${mon.name}</h2>
                    <div class="muted" style="font-size:var(--text-sm)">${mon.genus}</div>

                    <div class="pokedex-hero__facts">
                        <div class="fact-inline"><strong>${mon.height}</strong><span>altura</span></div>
                        <div class="fact-inline"><strong>${mon.weight}</strong><span>peso</span></div>
                        <div class="fact-inline"><strong>${bst}</strong><span>BST base</span></div>
                    </div>

                    <div class="professor-bubble">
                        <div id="pokedex-professor-bot" class="bot-companion" style="width:3.25rem;height:3.25rem"></div>
                        <p class="professor-bubble__text">${mon.professorNote}</p>
                    </div>
                </div>
            </div>
        </article>

        <div class="pokedex-columns">
            <section class="panel">
                <div class="panel-head">
                    <div>
                        <h3 class="panel-title">Bancada EV · Nível 50</h3>
                        <span class="panel-meta">Pico em Ouro · Chips invertidos no valor ativo</span>
                    </div>
                    <span class="badge badge--mono ${remainingEvs === 0 ? 'badge--gold' : 'badge--primary'}">
                        ${remainingEvs} EVs livres
                    </span>
                </div>

                <div class="ev-toolbar">
                    <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-xs);font-weight:var(--weight-medium)">
                        <span class="muted">Nature</span>
                        <select id="dex-nature-select" class="nature-select">
                            ${Object.entries(NATURES)
                                .map(([n, info]) => `<option value="${n}"${state.dexNature === n ? ' selected' : ''}>${info.label}</option>`)
                                .join('')}
                        </select>
                    </label>
                    <button type="button" class="btn btn-ghost btn--sm" data-action="reset-evs">Resetar EVs</button>
                </div>

                <div class="stat-bench">${statsHtml}</div>

                <div class="speed-ticks">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)">
                        <span style="font-size:var(--text-xs);font-weight:var(--weight-semibold)">Speed Benchmarks · Lv 50</span>
                        <span class="figure" style="font-size:var(--text-xs);color:var(--color-primary-text)">Atual: ${speStat} SPE</span>
                    </div>
                    <div class="speed-ticks__row">${speedTicksHtml}</div>
                </div>
            </section>

            <section class="panel">
                <div class="intel-block">
                    <div class="panel-head" style="margin-bottom:var(--space-2)">
                        <h3 class="panel-title">Habilidades</h3>
                        <span class="panel-meta">Reg M-C / VGC</span>
                    </div>
                    <div class="intel-list">${abilitiesHtml}</div>
                </div>

                <div class="intel-block">
                    <div class="panel-head" style="margin-bottom:var(--space-2)">
                        <h3 class="panel-title">Itens mais usados</h3>
                        <span class="panel-meta">Uso %</span>
                    </div>
                    <div class="intel-list">${itemsHtml}</div>
                </div>

                <div class="intel-block">
                    <div class="panel-head" style="margin-bottom:var(--space-2)">
                        <h3 class="panel-title">Golpes principais</h3>
                        <span class="panel-meta">Frequência em Top Cut</span>
                    </div>
                    <div class="intel-list">${movesHtml}</div>
                </div>
            </section>
        </div>
    `;

    stillBot(document.getElementById('pokedex-professor-bot'), {
        mood: 'confiante',
        pose: 'ensinando',
        px: 52,
        extra: { tone: mon.types[0] },
        label: 'Professor Fantasminha analisando a espécie',
    });
}

/* ── View 03 · Telemetria VGC & Meta ─────────────────────────────────────── */
function renderMetaView() {
    const host = document.getElementById('view-meta');
    const filteredTeams = TOURNAMENT_TEAMS.filter((t) => state.tourFilter === 'all' || t.tags.includes(state.tourFilter));

    const filterChips = [
        { id: 'all', label: 'Todos Top Cut' },
        { id: 'mega', label: 'Mega Cores' },
        { id: 'weather', label: 'Sun & Rain' },
        { id: 'terrain', label: 'Grassy Terrain' },
    ]
        .map((c) => `
            <button type="button" class="status-chip" data-tour-filter="${c.id}" aria-pressed="${state.tourFilter === c.id}">
                <span class="status-chip__dot"></span>
                <span>${c.label}</span>
            </button>
        `)
        .join('');

    const cardsHtml = filteredTeams
        .map((team) => {
            const rankCls = team.rank <= 3 ? `rank-pill--${team.rank}` : 'rank-pill--other';
            const stripHtml = team.pokemons
                .map((p) => {
                    const color = TYPE_COLORS[p.types[0]] || TYPE_COLORS.normal;
                    return `
                        <div class="sprite-strip__cell" title="${p.name} · ${p.item}">
                            <div class="type-platform" style="--card-type:${color}">
                                ${renderPokemonImg(p, { mode: state.spriteMode, size: 48 })}
                            </div>
                            <span class="sprite-strip__label">${p.name.replace('-Mega-Y', '-Y').replace('-Mega', '-M')}</span>
                        </div>
                    `;
                })
                .join('');

            return `
                <article class="tour-card">
                    <div class="tour-card__head">
                        <div style="display:flex;align-items:center;gap:var(--space-2)">
                            <span class="rank-pill ${rankCls}">${team.placementLabel}</span>
                            <span class="badge badge--mono">${team.record}</span>
                        </div>
                        <span class="panel-meta">${team.format} · ${team.date}</span>
                    </div>
                    <div>
                        <h3 style="font-size:var(--text-md)">${team.title}</h3>
                        <div class="muted" style="font-size:var(--text-xs)">${team.player} · ${team.archetype}</div>
                    </div>
                    <div class="sprite-strip">${stripHtml}</div>
                    <div class="tour-card__foot">
                        <span class="panel-meta">${team.tournament}</span>
                        <button type="button" class="btn btn-secondary btn--sm" data-inspect-team="${team.id}">Inspecionar Sheet</button>
                    </div>
                </article>
            `;
        })
        .join('');

    const sortedWaterfall = [...META_WATERFALL].sort((a, b) => {
        if (state.waterfallSort === 'winRate') return b.winRate - a.winRate;
        if (state.waterfallSort === 'topCut') return b.topCut - a.topCut;
        return b.usage - a.usage;
    });
    const maxUsage = Math.max(...sortedWaterfall.map((r) => r.usage));

    const waterfallHtml = sortedWaterfall
        .map((row) => {
            const tone = TYPE_COLORS[row.types[0]] || TYPE_COLORS.normal;
            const barW = Math.round((row.usage / maxUsage) * 100);
            const cutW = Math.round((row.topCut / row.teams) * 100 * 3.2);
            return `
                <div class="wf-row">
                    <div class="wf-mon">
                        <div class="type-platform" style="--card-type:${tone}">
                            ${renderPokemonImg(row, { mode: state.spriteMode, size: 36 })}
                        </div>
                        <div style="min-width:0">
                            <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.name}</div>
                            <div class="muted" style="font-size:var(--text-2xs)">${row.core}</div>
                        </div>
                    </div>
                    <div class="wf-col-trace">
                        <div class="wf-trace" title="Uso ${row.usage}% · ${row.topCut} Top Cuts">
                            <div class="wf-trace__usage" style="width:${barW}%;--wf-tone:${tone}"></div>
                            <div class="wf-trace__cut" style="left:4%;width:${Math.min(barW - 6, cutW)}%"></div>
                        </div>
                    </div>
                    <div class="wf-col-split">
                        <div class="split-bar">
                            <div class="split-bar__labels">
                                <span style="color:var(--color-success)">WR ${row.winRate.toFixed(1)}%</span>
                                <span class="muted">${row.topCut} cuts</span>
                            </div>
                            <div class="split-bar__track">
                                <span class="split-bar__win" style="width:${row.winRate}%"></span>
                                <span class="split-bar__loss"></span>
                            </div>
                        </div>
                    </div>
                    <div class="figure" style="text-align:right;font-weight:var(--weight-semibold);font-size:var(--text-sm)">
                        ${row.usage.toFixed(1)}%
                    </div>
                </div>
            `;
        })
        .join('');

    host.innerHTML = `
        <div class="view-head">
            <div>
                <div class="view-eyebrow">
                    <span>03 · TELEMETRIA VGC &amp; META · AFFECTUI WATERFALL</span>
                </div>
                <h1 class="view-title">Torneios &amp; <em class="accent-word">Meta</em></h1>
                <p class="view-lead">Equipes reais de Buenos Aires SPE 2027 (Reg M-C) com inspeção imediata de Sheet e cascata de uso competitivo.</p>
            </div>
            <div class="segmented segmented--sm segmented--quiet" role="group" aria-label="Ordenar telemetria">
                <button type="button" class="segmented__item" data-wf-sort="usage" aria-pressed="${state.waterfallSort === 'usage'}">Uso %</button>
                <button type="button" class="segmented__item" data-wf-sort="winRate" aria-pressed="${state.waterfallSort === 'winRate'}">Win Rate</button>
                <button type="button" class="segmented__item" data-wf-sort="topCut" aria-pressed="${state.waterfallSort === 'topCut'}">Top Cut</button>
            </div>
        </div>

        <div class="meta-toolbar">
            <div class="filter-chips">${filterChips}</div>
            <span class="panel-meta">8.654 times analisados · Limitless + Smogon</span>
        </div>

        <div class="tournament-grid">${cardsHtml}</div>

        <section class="panel panel--flush">
            <div style="padding:var(--space-4) var(--space-5);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap">
                <div>
                    <h3 class="panel-title">AffectUI Usage Waterfall</h3>
                    <span class="panel-meta">Barra principal = Uso · Trilha ouro = Conversão Top Cut · Split = Win Rate</span>
                </div>
                <span class="badge badge--mono">Reg M-C</span>
            </div>
            <div class="waterfall-table">
                <div class="wf-head">
                    <span>POKÉMON</span>
                    <span class="wf-col-trace">TRACE DE USO &amp; TOP CUT</span>
                    <span class="wf-col-split">WIN / LOSS SPLIT</span>
                    <span style="text-align:right">USO %</span>
                </div>
                ${waterfallHtml}
            </div>
        </section>
    `;
}

function openTeamSheetModal(teamId) {
    const team = TOURNAMENT_TEAMS.find((t) => t.id === teamId);
    if (!team) return;
    state.sheetTeamId = teamId;
    const scrim = document.getElementById('sheet-scrim');
    const panel = document.getElementById('sheet-panel');
    const leadColor = TYPE_COLORS[team.leadType] || TYPE_COLORS.dragon;

    const monsHtml = team.pokemons
        .map((p) => {
            const pColor = TYPE_COLORS[p.types[0]] || leadColor;
            return `
                <div class="sheet-mon">
                    <div style="display:flex;align-items:center;gap:var(--space-2_5)">
                        <div class="type-platform" style="--card-type:${pColor}">
                            ${renderPokemonImg(p, { mode: state.spriteMode, size: 52 })}
                        </div>
                        <div style="min-width:0">
                            <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">${p.name}</div>
                            <div class="muted" style="font-size:var(--text-2xs)">${p.item} · ${p.ability}</div>
                            <div class="figure muted" style="font-size:var(--text-2xs)">${p.nature}</div>
                        </div>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">
                        ${p.moves.map((mv) => `<span class="badge">${mv}</span>`).join('')}
                    </div>
                </div>
            `;
        })
        .join('');

    panel.innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4)">
            <div>
                <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">
                    <span class="rank-pill ${team.rank <= 3 ? `rank-pill--${team.rank}` : 'rank-pill--other'}">${team.placementLabel}</span>
                    <span class="badge badge--mono">${team.format}</span>
                </div>
                <h2 id="sheet-title" class="title-display" style="font-size:var(--text-xl)">${team.title}</h2>
                <div class="muted" style="font-size:var(--text-xs);margin-top:var(--space-0_5)">${team.player} · ${team.tournament}</div>
            </div>
            <button type="button" class="btn btn-secondary btn--sm" data-action="close-sheet">Fechar</button>
        </div>
        <div class="sheet-mons">${monsHtml}</div>
        <div style="display:flex;justify-content:flex-end;gap:var(--space-2);margin-top:var(--space-5)">
            <button type="button" class="btn btn-primary" data-action="copy-pokepaste">Copiar Poképaste</button>
        </div>
    `;
    scrim.hidden = false;
    scrim.classList.add('is-open');
}

function closeTeamSheetModal() {
    const scrim = document.getElementById('sheet-scrim');
    scrim.classList.remove('is-open');
    scrim.hidden = true;
    state.sheetTeamId = null;
}

/* ── View 04 · Dossiê do Treinador ───────────────────────────────────────── */
function renderBarcodeBars(uid) {
    let h = hashSeed(uid);
    const bars = [];
    let x = 2;
    for (let i = 0; i < 28; i += 1) {
        h = (h * 1664525 + 1013904223) >>> 0;
        const w = (h % 3) + 1.5;
        bars.push(`<rect x="${x}" y="0" width="${w}" height="28" rx="0.5"/>`);
        x += w + ((h >>> 4) % 2) + 1.8;
    }
    return `<svg class="receipt__barcode" viewBox="0 0 ${Math.ceil(x)} 28" aria-hidden="true">${bars.join('')}</svg>`;
}

function renderProfileView() {
    const host = document.getElementById('view-profile');
    const trainer = TRAINER_PRESETS[state.trainerIdx];
    const activeUid = state.customUid || trainer.uid;
    const toneColor = TYPE_COLORS[trainer.toneType] || TYPE_COLORS.dragon;
    const pixels = trainerPixels(activeUid, { cols: 36, rows: 10, accents: 6 });
    const pixelRects = pixels
        .map((c) => `<rect x="${c.x}" y="${c.y}" width="0.82" height="0.82" rx="0.12" opacity="${c.accent ? 1 : c.o}" class="${c.accent ? 'is-accent' : ''}"/>`)
        .join('');

    const totalXp = trainer.xp + state.bonusXp;
    const gengarMaxed = state.bonusXp > 0;
    const fullDayCount = trainer.fullDays + (state.tierListDone ? 1 : 0);

    const presetsHtml = TRAINER_PRESETS.map((p, idx) => `
        <button type="button" class="segmented__item" data-trainer-idx="${idx}" aria-pressed="${state.trainerIdx === idx}">
            <span>${p.name}</span>
        </button>
    `).join('');

    host.innerHTML = `
        <div class="view-head">
            <div>
                <div class="view-eyebrow">
                    <span>04 · PERFIL × CENA VIVA · FANTASMINHA DE PLANTÃO</span>
                </div>
                <h1 class="view-title">Dossiê do <em class="accent-word">Treinador</em></h1>
                <p class="view-lead">Banner generativo único por UID, métricas tipográficas sem caixas, evolução por maestria e recibo tátil do plantão.</p>
            </div>
            <div class="segmented segmented--sm segmented--quiet" role="group" aria-label="Escolher treinador">
                ${presetsHtml}
            </div>
        </div>

        <div class="profile-layout">
            <div>
                <article class="trainer-hero" style="--tc-tone:${toneColor}">
                    <div class="trainer-banner">
                        <svg class="trainer-banner__pixels" viewBox="0 0 36 10" preserveAspectRatio="none" aria-hidden="true">
                            ${pixelRects}
                        </svg>
                        <div class="trainer-banner__partner">
                            ${renderPokemonImg({ id: 94, spriteKey: trainer.partnerKey, name: trainer.partnerName }, { mode: state.spriteMode, artwork: true, size: 144 })}
                        </div>
                    </div>

                    <div class="trainer-body">
                        <div class="trainer-body__top">
                            <div class="trainer-avatar" id="profile-avatar-bot"></div>
                            <div class="trainer-uid-row">
                                <span class="badge badge--mono">UID ${activeUid}</span>
                                <button type="button" class="btn btn-secondary btn--sm" data-action="reroll-uid">Gerar novo UID</button>
                            </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:var(--space-2_5);flex-wrap:wrap">
                            <h2 class="title-display" style="font-size:var(--text-2xl)">${trainer.name}</h2>
                            <span class="badge badge--primary">${trainer.persona}</span>
                            <span class="badge">${trainer.since}</span>
                        </div>
                        <div class="muted" style="font-size:var(--text-sm);margin-top:var(--space-1)">
                            ${trainer.handle} · Parceiro: ${trainer.partnerName} · ${trainer.league}
                        </div>

                        <!-- Bold Figure + Muted Word (ZERO stat boxes) -->
                        <div class="figure-word-strip">
                            <div class="figure-word">
                                <span class="figure-word__num is-gold">${trainer.streak}</span>
                                <span class="figure-word__label">dias de ofensiva</span>
                            </div>
                            <div class="figure-word">
                                <span class="figure-word__num">${totalXp.toLocaleString('pt-BR')}</span>
                                <span class="figure-word__label">XP acumulado</span>
                            </div>
                            <div class="figure-word">
                                <span class="figure-word__num">${fullDayCount}</span>
                                <span class="figure-word__label">dias 4/4 completos</span>
                            </div>
                            <div class="figure-word">
                                <span class="figure-word__num" style="color:var(--color-primary-text)">${trainer.rank}</span>
                                <span class="figure-word__label">Liga Regional</span>
                            </div>
                        </div>
                    </div>
                </article>

                <section class="panel">
                    <div class="panel-head">
                        <div>
                            <h3 class="panel-title">Linha Evolutiva de Maestria</h3>
                            <span class="panel-meta">Gastly → Haunter → Gengar · Progresso em dispositivo da franquia</span>
                        </div>
                        <button type="button" class="btn btn-primary btn--sm" data-action="boost-xp">
                            ${gengarMaxed ? 'Reiniciar XP Demo' : '+250 XP · Evoluir'}
                        </button>
                    </div>

                    <div class="evo-track">
                        <div class="evo-node">
                            <div class="evo-node__disc type-platform" style="--card-type:${TYPE_COLORS.ghost}">
                                ${renderPokemonImg({ id: 92, spriteKey: 'gastly', name: 'Gastly' }, { mode: state.spriteMode, size: 56 })}
                            </div>
                            <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">Gastly</div>
                            <span class="badge badge--mono badge--success">Nv 1–10 · Concluído</span>
                        </div>
                        <div class="evo-node">
                            <div class="evo-node__disc type-platform" style="--card-type:${TYPE_COLORS.poison}">
                                ${renderPokemonImg({ id: 93, spriteKey: 'haunter', name: 'Haunter' }, { mode: state.spriteMode, size: 56 })}
                            </div>
                            <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">Haunter</div>
                            <span class="badge badge--mono badge--success">Nv 11–25 · Concluído</span>
                        </div>
                        <div class="evo-node is-active${gengarMaxed ? '' : ' is-locked'}">
                            <div class="evo-node__disc spark-host${gengarMaxed ? ' is-bursting' : ''}" style="--spark-color:var(--brand-gold)">
                                ${renderPokemonImg({ id: 94, spriteKey: 'gengar', name: 'Gengar' }, { mode: state.spriteMode, size: 56 })}
                            </div>
                            <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">
                                ${gengarMaxed ? 'Gengar · Mestre!' : 'Quem é esse?'}
                            </div>
                            <span class="badge badge--mono ${gengarMaxed ? 'badge--gold' : 'badge--primary'}">
                                ${gengarMaxed ? '100% · Desbloqueado' : '78% · Em curso'}
                            </span>
                        </div>
                    </div>
                </section>
            </div>

            <aside class="receipt-slot" aria-label="Recibo do Plantão">
                <div style="width:100%;height:3.75rem;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--color-border);margin-bottom:var(--space-2)">
                    <canvas class="scene" data-scene="morning" data-w="96" data-h="26" aria-hidden="true"></canvas>
                </div>
                <div class="receipt">
                    <div class="receipt__brand">
                        <span id="profile-receipt-bot" style="display:inline-flex;width:1.875rem;height:1.875rem;flex-shrink:0"></span>
                        <span>Fantasminha de plantão</span>
                    </div>
                    <div class="receipt__kind">RECIBO DA RONDA · HOJE</div>
                    <hr class="receipt__rule" />
                    <ul class="receipt__rows">
                        <li class="receipt__row"><span>Champion Challenge</span><span class="receipt__lead"></span><strong>VENCIDO</strong></li>
                        <li class="receipt__row"><span>PokéPuzzle #418</span><span class="receipt__lead"></span><strong>3/6</strong></li>
                        <li class="receipt__row"><span>Quiz do dia</span><span class="receipt__lead"></span><strong>9/10</strong></li>
                        <li class="receipt__row">
                            <span>Tier List do dia</span>
                            <span class="receipt__lead"></span>
                            <strong style="color:${state.tierListDone ? 'var(--receipt-volt)' : '#B91C1C'}">
                                ${state.tierListDone ? 'COMPLETA' : 'PENDENTE'}
                            </strong>
                        </li>
                    </ul>
                    <hr class="receipt__rule" />
                    <div class="receipt__row" style="font-weight:700">
                        <span>OFENSIVA ATIVA</span>
                        <span class="receipt__lead"></span>
                        <span>${trainer.streak} DIAS</span>
                    </div>
                    <div class="receipt__stamp${state.tierListDone ? ' is-gold' : ''}${state.stampAnim ? ' is-animated' : ''}">
                        <span>${state.tierListDone ? '4/4 OURO' : 'PLANTÃO 3/4'}</span>
                    </div>
                    ${renderBarcodeBars(activeUid)}
                    <div style="display:flex;justify-content:center;margin-top:var(--space-1)">
                        <button type="button" class="btn btn-primary btn--sm" data-action="toggle-day-complete" style="width:100%">
                            ${state.tierListDone ? 'Reverter simulação 4/4' : 'Concluir Tier List (4/4)'}
                        </button>
                    </div>
                </div>
            </aside>
        </div>

        <section style="margin-top:var(--space-6)" aria-label="Fase 3 · A Mímica e O Ovo Surpresa">
            <div class="ch2-section-head">
                <div>
                    <div class="panel-meta">FASE 3 · PRÓXIMO PLANTÃO</div>
                    <h2>A Mímica no Diário &amp; O Ovo Surpresa</h2>
                </div>
                <span class="badge badge--gold">Protótipos interativos</span>
            </div>
            ${renderFase3SectionHtml('prof')}
        </section>
    `;
    state.stampAnim = false;

    new AliveBot(document.getElementById('profile-avatar-bot'), {
        mood: gengarMaxed ? 'radiante' : 'feliz',
        pose: gengarMaxed ? 'campeao' : 'parado',
        px: 74,
        extra: { tone: trainer.toneType },
        label: `Mascote avatar de ${trainer.name}`,
    });
    stillBot(document.getElementById('profile-receipt-bot'), {
        mood: state.tierListDone ? 'brilhando' : 'feliz',
        pose: 'parado',
        px: 30,
        extra: { tone: state.tierListDone ? 'electric' : 'ghost' },
    });
    mountFase3Interactive('prof');
}

/* ── Fase 3 · A Mímica & O Ovo Surpresa (shared between C2 & Dossiê) ────── */
function eggSvgHtml(day, wobble) {
    const cracks = [
        '',
        '<path d="M48 24 L43 34 L50 40" stroke="#7C3AFF" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
        '<path d="M48 24 L43 34 L52 42 L45 50" stroke="#7C3AFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
        '<path d="M48 22 L41 34 L53 43 L44 54 L56 61" stroke="#FF3D9A" stroke-width="2.7" fill="none" stroke-linecap="round"/><path d="M34 48 L43 44" stroke="#FFD23F" stroke-width="2.2" stroke-linecap="round"/>',
    ][Math.min(3, Math.max(0, day - 1))];
    return `
        <svg class="${wobble ? 'egg-wobble' : ''}" viewBox="0 0 96 96" width="128" height="128" role="img" aria-label="Ovo surpresa no dia ${day} de 5">
            <ellipse cx="48" cy="83" rx="22" ry="6" fill="rgba(12,8,22,0.35)"/>
            <path d="M48 12 C67 12 75 44 75 61 C75 76 63 82 48 82 C33 82 21 76 21 61 C21 44 29 12 48 12 Z" fill="#F8F4FF" stroke="#1B0A3D" stroke-width="3"/>
            <ellipse cx="37" cy="40" rx="5.5" ry="7.5" fill="#C4B5FD"/>
            <circle cx="59" cy="56" r="6" fill="#DDD6FE"/>
            <circle cx="39" cy="64" r="4" fill="#FFD23F"/>
            ${cracks}
        </svg>
    `;
}

function renderFase3SectionHtml(prefix) {
    const solved = state.mimeGuess === 'charmander';
    const sceneKind = state.mimeBg === 'mountain' ? 'mountain' : 'route';
    const cluesHtml = MIME_CLUES.map((text, idx) => {
        const open = idx < state.mimeCluesOpen || solved;
        return `
            <span class="mime-clue-chip${open ? ' is-open' : ''}">
                <strong>${open ? '✓' : '•'}</strong>
                <span>${open ? text : `Pista 0${idx + 1} · bloqueada`}</span>
            </span>
        `;
    }).join('');

    const guessBtnsHtml = MIME_GUESS_OPTIONS.map((opt) => {
        const picked = state.mimeGuess === opt.id;
        const cls = picked ? (opt.correct ? ' is-correct' : ' is-wrong') : '';
        return `
            <button type="button" class="mime-guess-btn${cls}" data-mime-guess="${opt.id}">
                <span>${opt.name}</span>
                <span class="figure muted" style="font-size:var(--text-2xs)">${opt.num}</span>
            </button>
        `;
    }).join('');

    const hatched = state.eggDay >= 5;
    const daysHtml = [1, 2, 3, 4, 5]
        .map((d) => {
            const cls = d === state.eggDay ? ' is-active' : d < state.eggDay ? ' is-done' : '';
            return `<button type="button" class="egg-day-btn${cls}" data-egg-day="${d}">Dia ${d}</button>`;
        })
        .join('');

    return `
        <div class="fase3-grid">
            <article class="panel" style="display:grid;gap:var(--space-3_5)">
                <div class="panel-head" style="margin-bottom:0">
                    <div>
                        <h3 class="panel-title">A Mímica no Diário</h3>
                        <span class="panel-meta">Silhueta em escala 1,6 m + Fantasminha no tom do tipo</span>
                    </div>
                    <div class="segmented segmented--sm segmented--quiet" role="group" aria-label="Cenário da Mímica">
                        <button type="button" class="segmented__item" data-mime-bg="route" aria-pressed="${state.mimeBg === 'route'}">Rota</button>
                        <button type="button" class="segmented__item" data-mime-bg="mountain" aria-pressed="${state.mimeBg === 'mountain'}">Serra</button>
                    </div>
                </div>

                <div class="mime-stage">
                    <div class="mime-stage__sky">
                        <canvas class="scene" data-scene="${sceneKind}" data-w="96" data-h="52" aria-hidden="true"></canvas>
                    </div>
                    <div class="mime-stage__actor">
                        <div id="mime-bot-${prefix}" style="width:7.25rem;height:7.25rem"></div>
                        <span class="mime-stage__tag">Tom Fogo · Segurando chama</span>
                    </div>
                    <div class="mime-stage__actor">
                        <div class="mime-sil-wrap${solved ? '' : ' is-hidden'}">
                            ${renderPokemonImg({ id: 4, spriteKey: 'charmander', name: 'Charmander' }, { mode: state.spriteMode, size: 104 })}
                        </div>
                        <span class="mime-stage__tag">${solved ? 'Charmander · 0,6 m (#0004)' : 'Escala 0,6 m / Treinador 1,6 m'}</span>
                    </div>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap">
                    <span class="panel-meta">${state.mimeCluesOpen}/5 pistas reveladas</span>
                    <button type="button" class="btn btn-secondary btn--sm" data-action="next-mime-clue" ${state.mimeCluesOpen >= 5 ? 'disabled' : ''}>
                        Revelar próxima pista
                    </button>
                </div>
                <div class="mime-clues">${cluesHtml}</div>
                <div class="mime-guesses">${guessBtnsHtml}</div>
            </article>

            <article class="panel" style="display:grid;gap:var(--space-3_5)">
                <div class="panel-head" style="margin-bottom:0">
                    <div>
                        <h3 class="panel-title">O Ovo Surpresa</h3>
                        <span class="panel-meta">5 dias não punitivos · choca traje sazonal</span>
                    </div>
                    <span class="badge badge--mono ${hatched ? 'badge--gold' : 'badge--primary'}">${state.eggDay}/5 dias</span>
                </div>

                <div class="egg-stage">
                    <div class="egg-stage__sky">
                        <canvas class="scene" data-scene="morning" data-w="96" data-h="52" aria-hidden="true"></canvas>
                    </div>
                    <div class="egg-stage__center">
                        ${hatched
                            ? `<div id="egg-bot-${prefix}" style="width:8.5rem;height:8.5rem"></div>
                               <span class="egg-hatched-badge">TRAJE NOVO · CHAPÉU DE BRUXA</span>`
                            : `${eggSvgHtml(state.eggDay, state.eggWobble)}
                               <span class="mime-stage__tag">Faltam ${5 - state.eggDay} dia(s) para chocar</span>`
                        }
                    </div>
                </div>

                <p class="muted" style="font-size:var(--text-xs);line-height:1.5">
                    Perder um dia nunca zera o ovo — o progresso espera pela próxima ronda. Ao fechar o ciclo de 5 dias, o Fantasminha sai com um novo acessório do catálogo.
                </p>

                <div class="egg-days">${daysHtml}</div>
            </article>
        </div>
    `;
}

function mountFase3Interactive(prefix) {
    const solved = state.mimeGuess === 'charmander';
    const mimeHost = document.getElementById(`mime-bot-${prefix}`);
    if (mimeHost) {
        new AliveBot(mimeHost, {
            mood: solved ? 'radiante' : 'curioso',
            pose: solved ? 'comemorando' : 'segurandoChama',
            px: 116,
            extra: { tone: 'fire' },
            label: 'Fantasminha imitando Pokémon de Fogo',
        });
    }
    if (state.eggDay >= 5) {
        const eggHost = document.getElementById(`egg-bot-${prefix}`);
        if (eggHost) {
            new AliveBot(eggHost, {
                mood: 'empolgado',
                pose: 'campeao',
                px: 136,
                extra: { hat: 'witch' },
                label: 'Fantasminha chocado com chapéu de bruxa',
            });
        }
    }
    state.eggWobble = false;
}

/* ── View C2 · Capítulo 2 Narrativa Completa ─────────────────────────────── */
function renderNarrativaView() {
    const host = document.getElementById('view-narrativa');
    const heroCycle = HERO_CYCLE_POSES[state.heroCycleIdx % HERO_CYCLE_POSES.length];

    const analysis = computeTeamAnalysis(state.slots);
    const resolved = Boolean(state.slots[4]);
    const sug = SUGGESTION_OPTIONS[state.suggestionIdx];
    const groundRow = analysis.typeRows.find((r) => r.type === 'ground');

    const dexMon = POKEDEX_SPECIES[state.dexKey];
    const dexColor = TYPE_COLORS[dexMon.types[0]] || TYPE_COLORS.ghost;
    const speStat = calcStatL50('spe', dexMon.baseStats.spe, state.dexEvs.spe || 0, state.dexNature);

    const trainer = TRAINER_PRESETS[state.trainerIdx];
    const activeUid = state.customUid || trainer.uid;
    const toneColor = TYPE_COLORS[trainer.toneType] || TYPE_COLORS.dragon;
    const pixels = trainerPixels(activeUid, { cols: 28, rows: 8, accents: 5 });
    const pixelRects = pixels
        .map((c) => `<rect x="${c.x}" y="${c.y}" width="0.82" height="0.82" rx="0.12" opacity="${c.accent ? 1 : c.o}" class="${c.accent ? 'is-accent' : ''}"/>`)
        .join('');

    const miniPartyHtml = state.slots
        .map((mon, idx) => {
            if (!mon) {
                return `
                    <div class="party-slot party-slot--empty" style="min-height:6.5rem;padding:var(--space-2_5)">
                        <span class="figure muted" style="font-size:var(--text-2xs)">0${idx + 1} · OPEN</span>
                        <span class="muted" style="font-size:var(--text-2xs)">Pivot Ground</span>
                    </div>
                `;
            }
            const color = TYPE_COLORS[mon.types[0]] || TYPE_COLORS.normal;
            return `
                <div class="party-slot${state.justPeeledSlot === idx ? ' is-peeling' : ''}" style="--card-type:${color};min-height:6.5rem;padding:var(--space-2_5)">
                    <div class="party-slot__top">
                        <span class="party-slot__num">0${idx + 1}</span>
                        <span class="badge badge--mono">${mon.types[0].slice(0, 3).toUpperCase()}</span>
                    </div>
                    <div class="type-platform" style="--card-type:${color};margin:0 auto">
                        ${renderPokemonImg(mon, { mode: state.spriteMode, size: 48 })}
                    </div>
                    <div class="party-slot__name" style="font-size:var(--text-xs);text-align:center">${mon.name}</div>
                </div>
            `;
        })
        .join('');

    const top2Html = TOURNAMENT_TEAMS.slice(0, 2)
        .map((team) => {
            const rankCls = `rank-pill--${team.rank}`;
            return `
                <div class="tour-card" style="padding:var(--space-3_5);background:var(--color-surface-raised);border:none">
                    <div class="tour-card__head">
                        <span class="rank-pill ${rankCls}">${team.placementLabel}</span>
                        <span class="badge badge--mono">${team.record}</span>
                    </div>
                    <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">${team.title}</div>
                    <div class="sprite-strip">
                        ${team.pokemons
                            .map((p) => `<div class="sprite-strip__cell">${renderPokemonImg(p, { mode: state.spriteMode, size: 36 })}</div>`)
                            .join('')}
                    </div>
                    <div class="tour-card__foot">
                        <span class="panel-meta">${team.player}</span>
                        <button type="button" class="btn btn-secondary btn--sm" data-inspect-team="${team.id}">Inspecionar Sheet</button>
                    </div>
                </div>
            `;
        })
        .join('');

    host.innerHTML = `
        <div class="ch2-stack">
            <!-- Night Pixel-Sky Opening Hero -->
            <section class="ch2-hero" aria-label="Fantasminha de plantão — Capítulo 2">
                <div class="ch2-hero__sky">
                    <canvas class="scene" data-scene="night" data-w="112" data-h="54" aria-hidden="true"></canvas>
                </div>
                <div class="ch2-hero__scrim" aria-hidden="true"></div>
                <div class="ch2-hero__inner">
                    <div>
                        <div class="ch2-eyebrow">
                            <span class="live-dot" style="background:var(--brand-gold)"></span>
                            <span>CAPÍTULO 2 · DESIGN SYSTEM v4 · AO VIVO</span>
                        </div>
                        <h1 class="ch2-hero__title">Cenas Vivas &amp; <em style="font-style:normal;color:var(--brand-gold)">Instrumentos Táticos</em></h1>
                        <p class="ch2-hero__lead">
                            O Fantasminha deixa de ser um ícone estático e passa a habitar céus em dither Bayer, decisões táticas do builder, bancadas Nv. 50 e ciclos não punitivos da ronda.
                        </p>
                        <div class="ch2-hero__actions">
                            <button type="button" class="btn btn-primary" data-view="builder">01 · Abrir Inspetor Tático</button>
                            <button type="button" class="btn btn-secondary" data-view="pokedex" style="background:color-mix(in srgb,var(--brand-ink) 70%,transparent);color:var(--mascot-white);border-color:color-mix(in srgb,var(--mascot-white) 24%,transparent)">02 · Abrir Pokédex v4</button>
                            <button type="button" class="btn btn-ghost" data-action="cycle-hero-bot" style="color:var(--brand-gold)">Trocar pose do Fantasminha</button>
                        </div>
                    </div>
                    <div class="ch2-hero__stage">
                        <div class="ch2-hero__bot" id="ch2-hero-bot" role="button" tabindex="0" data-action="cycle-hero-bot" aria-label="Interagir com o Fantasminha em 3D"></div>
                        <span class="ch2-hero__caption">${heroCycle.caption}</span>
                    </div>
                </div>
            </section>

            <!-- De onde vem · 4 lenses -->
            <section aria-label="De onde vem o sistema">
                <div class="ch2-section-head">
                    <div>
                        <div class="panel-meta">TRADUÇÃO DE REFERÊNCIAS</div>
                        <h2>De onde vem cada decisão</h2>
                    </div>
                    <span class="panel-meta">4 lentes externas filtradas pelo tema violeta + ouro</span>
                </div>
                <div class="ch2-refs">
                    <article class="ch2-ref-card">
                        <span class="ch2-ref-card__tag">AffectUI</span>
                        <h3>Decision Cards &amp; Waterfall</h3>
                        <p>Troca alertas genéricos por intervenção acionável em 1 clique, rastro por slot e barras comparativas win/loss.</p>
                    </article>
                    <article class="ch2-ref-card">
                        <span class="ch2-ref-card__tag">M3 Expressive</span>
                        <h3>Contenção 0-1-2</h3>
                        <p>Um único contêiner dono da borda. Sub-blocos internos vivem só de preenchimento tátil e espaçamento rigoroso.</p>
                    </article>
                    <article class="ch2-ref-card">
                        <span class="ch2-ref-card__tag">Emil · Jakub · Stageshow</span>
                        <h3>Física de Sticker &amp; Odômetro</h3>
                        <p>Slots pousam com curva linear de mola e números rolam verticalmente apenas quando o usuário age no time.</p>
                    </article>
                    <article class="ch2-ref-card">
                        <span class="ch2-ref-card__tag">Taste · Anti-Slop · Impeccable</span>
                        <h3>Zero Caixas Vazias</h3>
                        <p>Métricas sem molduras repetidas ("figura + palavra"), contrastes calibrados em dark e light, zero vidro no mobile.</p>
                    </article>
                </div>
            </section>

            <!-- Peça 01 · Inspetor Tático -->
            <section class="ch2-piece" aria-label="Peça 01 · Inspetor Tático">
                <div class="ch2-piece__text">
                    <span class="ch2-piece__num">PEÇA 01 · BUILDER × AFFECTUI</span>
                    <h3>O cinto do time e o Decision Card do mascote</h3>
                    <p>
                        Em vez de esconder vulnerabilidades 4× em abas secundárias, o Fantasminha aponta o risco direto no cinto e oferece uma troca com desfazer imediato e impacto visível no score.
                    </p>
                    <ul class="ch2-rules">
                        <li class="ch2-rules__label">Fica de pé</li>
                        <li>Slot preenchido usa borda interna do tipo + sombra sticker; vazio usa tracejado.</li>
                        <li>Aplicar sugestão rola o odômetro de sinergia (<span class="figure">${analysis.score}</span>/100) sem piscar a página.</li>
                        <li>Undo sempre acessível via toast e botão secundário no card.</li>
                    </ul>
                    <div>
                        <button type="button" class="btn btn-secondary btn--sm" data-view="builder">Abrir tela 01 isolada →</button>
                    </div>
                </div>
                <div class="ch2-mock">
                    <div class="ch2-mock__head">
                        <div>
                            <span class="panel-meta">SIMULAÇÃO AO VIVO · SLOT 5 ABERTO</span>
                            <div style="font-size:var(--text-md);font-weight:var(--weight-semibold)">Score tático do core</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:var(--space-2_5)">
                            <div id="ch2-synergy-odo" class="synergy-score__num${resolved ? ' is-peak' : ''}" style="font-size:var(--text-xl)">${analysis.score}</div>
                            <span class="badge ${resolved ? 'badge--gold' : 'badge--live'}">${resolved ? '92/100 Estável' : '4× Ground'}</span>
                        </div>
                    </div>
                    <div class="party-grid">${miniPartyHtml}</div>
                    <div class="decision-card${resolved ? ' is-resolved' : ''}">
                        <div class="decision-card__mascot bot-companion" id="ch2-decision-bot"></div>
                        <div>
                            <div class="decision-card__title">${resolved ? `${state.slots[4].name} fechou a fraqueza Ground` : sug.headline}</div>
                            <p class="decision-card__copy">${resolved ? `Imunidade Levitate protege Heatran e Incineroar (${groundRow.immune} imune no time).` : sug.rationale}</p>
                            <div class="decision-card__actions">
                                ${resolved
                                    ? `<button type="button" class="btn btn-secondary btn--sm" data-action="undo-suggestion">Desfazer slot 5</button>`
                                    : `<button type="button" class="btn btn-primary btn--sm" data-action="apply-suggestion">Aplicar sugestão</button>
                                       <button type="button" class="btn btn-secondary btn--sm" data-action="cycle-suggestion">Alternar opção</button>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Peça 02 · Pokédex Instrumento v4 -->
            <section class="ch2-piece" aria-label="Peça 02 · Pokédex Instrumento v4">
                <div class="ch2-piece__text">
                    <span class="ch2-piece__num">PEÇA 02 · M3 EXPRESSIVE × DETAIL</span>
                    <h3>Palco em Town-Map e Professor Fantasminha</h3>
                    <p>
                        A ficha do Pokémon abandona blocos brancos empilhados. A cor dominante do tipo ilumina a grade por trás do palco e o Fantasminha Professor conduz o olhar para o benchmark de Speed no Nível 50.
                    </p>
                    <ul class="ch2-rules">
                        <li class="ch2-rules__label">Fica de pé</li>
                        <li>Apenas um destaque Ouro marca o atributo de maior valor calculado.</li>
                        <li>Chips de EV invertidos no valor ativo, com teto rígido de 510 EVs.</li>
                        <li>Fala do Professor sem borda própria — o palco e a barra de contraste bastam.</li>
                    </ul>
                    <div>
                        <button type="button" class="btn btn-secondary btn--sm" data-view="pokedex">Abrir tela 02 isolada →</button>
                    </div>
                </div>
                <div class="ch2-mock" style="--hero-type:${dexColor};background:radial-gradient(65% 70% at 22% 32%,color-mix(in srgb,${dexColor} 20%,transparent),transparent 72%),var(--color-surface)">
                    <div class="ch2-mock__head">
                        <div style="display:flex;align-items:center;gap:var(--space-2)">
                            <span class="badge badge--mono">${dexMon.dex}</span>
                            <strong style="font-size:var(--text-lg)">${dexMon.name}</strong>
                            ${dexMon.types.map((t) => typeChipHtml(t, { sm: true })).join('')}
                        </div>
                        <button type="button" class="btn btn-secondary btn--sm" data-action="toggle-shiny">
                            <span style="color:var(--color-accent)">★</span> ${state.dexShiny ? 'Shiny ativo' : 'Ver Shiny'}
                        </button>
                    </div>
                    <div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-4);align-items:center">
                        <div class="type-platform" style="--card-type:${dexColor}">
                            ${renderPokemonImg(dexMon, { mode: state.spriteMode, artwork: true, shiny: state.dexShiny, size: 112 })}
                        </div>
                        <div class="professor-bubble" style="margin-top:0">
                            <div id="ch2-prof-bot" class="bot-companion" style="width:3.25rem;height:3.25rem"></div>
                            <p class="professor-bubble__text">${dexMon.professorNote}</p>
                        </div>
                    </div>
                    <div class="speed-ticks" style="margin-top:0">
                        <div style="display:flex;justify-content:space-between;font-size:var(--text-xs)">
                            <span>Benchmark Speed Lv 50 · ${state.dexNature}</span>
                            <strong class="figure" style="color:var(--color-accent)">${speStat} SPE</strong>
                        </div>
                        <div class="speed-ticks__row">
                            ${SPEED_BENCHMARKS.map((b) => `<span class="speed-tick${speStat >= b.speed ? ' is-outrun' : ''}">${b.speed} · ${b.label}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </section>

            <!-- Peça 03 · Telemetria VGC & Meta -->
            <section class="ch2-piece" aria-label="Peça 03 · Meta & Torneios">
                <div class="ch2-piece__text">
                    <span class="ch2-piece__num">PEÇA 03 · AFFECTUI WATERFALL × TORNEIOS</span>
                    <h3>Top Cut limpo e cascata de uso real</h3>
                    <p>
                        Resultados reais do Special Event de Buenos Aires em Reg M-C com fita de 6 Pokémon legível à primeira vista e abertura imediata da sheet M3 para copiar Poképaste.
                    </p>
                    <ul class="ch2-rules">
                        <li class="ch2-rules__label">Fica de pé</li>
                        <li>Medalhas Ouro, Prata e Bronze só no pódio real — nada de neon genérico.</li>
                        <li>Inspeção de Sheet abre drawer com natureza, item e 4 golpes sem sair da tela.</li>
                    </ul>
                    <div>
                        <button type="button" class="btn btn-secondary btn--sm" data-view="meta">Abrir tela 03 isolada →</button>
                    </div>
                </div>
                <div class="ch2-mock">
                    <div class="tournament-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-3)">
                        ${top2Html}
                    </div>
                </div>
            </section>

            <!-- Peça 04 · Dossiê Vivo & Recibo -->
            <section class="ch2-piece" aria-label="Peça 04 · Dossiê do Treinador">
                <div class="ch2-piece__text">
                    <span class="ch2-piece__num">PEÇA 04 · PERFIL × CENA VIVA</span>
                    <h3>Figura + palavra muda e o recibo térmico</h3>
                    <p>
                        O cartão de treinador gera um mosaico exclusivo pelo UID, abandona caixinhas de status em favor de tipografia em escala e fecha o dia com um recibo térmico perfurado.
                    </p>
                    <ul class="ch2-rules">
                        <li class="ch2-rules__label">Fica de pé</li>
                        <li>Zero moldura ao redor dos números de ofensiva, XP e liga regional.</li>
                        <li>Carimbo de 4/4 OURO rotaciona e ganha brilho apenas quando a última tarefa fecha.</li>
                    </ul>
                    <div>
                        <button type="button" class="btn btn-secondary btn--sm" data-view="profile">Abrir tela 04 isolada →</button>
                    </div>
                </div>
                <div class="ch2-mock" style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,0.8fr);gap:var(--space-4);align-items:start">
                    <div style="display:grid;gap:var(--space-3)">
                        <div class="trainer-banner" style="height:6.5rem;border-radius:var(--radius-lg);--tc-tone:${toneColor}">
                            <svg class="trainer-banner__pixels" viewBox="0 0 28 8" preserveAspectRatio="none" aria-hidden="true">${pixelRects}</svg>
                        </div>
                        <div style="display:flex;align-items:center;gap:var(--space-3)">
                            <div id="ch2-profile-bot" class="bot-companion" style="width:4rem;height:4rem;border-radius:var(--radius-full);box-shadow:var(--ring-logo);background:var(--mascot-tile)"></div>
                            <div>
                                <div style="font-weight:var(--weight-heading);font-size:var(--text-lg)">${trainer.name}</div>
                                <div class="panel-meta">UID ${activeUid} · ${trainer.persona}</div>
                            </div>
                        </div>
                        <div class="figure-word-strip" style="margin-top:0;padding-top:var(--space-3)">
                            <div class="figure-word">
                                <span class="figure-word__num is-gold">${trainer.streak}</span>
                                <span class="figure-word__label">dias ativos</span>
                            </div>
                            <div class="figure-word">
                                <span class="figure-word__num">${(trainer.xp + state.bonusXp).toLocaleString('pt-BR')}</span>
                                <span class="figure-word__label">XP total</span>
                            </div>
                        </div>
                    </div>
                    <div class="receipt" style="padding:var(--space-3_5) var(--space-3_5) var(--space-5)">
                        <div class="receipt__brand"><span>Fantasminha · Ronda</span></div>
                        <hr class="receipt__rule"/>
                        <div class="receipt__row"><span>Tier List</span><span class="receipt__lead"></span><strong>${state.tierListDone ? 'COMPLETA' : 'PENDENTE'}</strong></div>
                        <div class="receipt__stamp${state.tierListDone ? ' is-gold' : ''}" style="font-size:var(--text-xs)"><span>${state.tierListDone ? '4/4 OURO' : '3/4 ATIVO'}</span></div>
                        <button type="button" class="btn btn-primary btn--sm" data-action="toggle-day-complete">
                            ${state.tierListDone ? 'Reverter 4/4' : 'Fechar dia 4/4'}
                        </button>
                    </div>
                </div>
            </section>

            <!-- Peça 05 · Fase 3 do Plantão -->
            <section class="ch2-piece" style="grid-template-columns:minmax(0,1fr)" aria-label="Peça 05 · Fase 3">
                <div class="ch2-piece__text">
                    <span class="ch2-piece__num">PEÇA 05 · FASE 3 DO PLANTÃO</span>
                    <h3>A Mímica no Diário &amp; O Ovo Surpresa</h3>
                    <p>
                        O mascote veste o tom do tipo alvo para encenar o Pokémon misterioso em cena real 1,6 m, enquanto o ovo semanal acompanha a constância sem punir falhas.
                    </p>
                </div>
                ${renderFase3SectionHtml('ch2')}
            </section>

            <!-- O que entra no sistema · 6 Primitives -->
            <section aria-label="Primitivos que entram no sistema">
                <div class="ch2-section-head">
                    <div>
                        <div class="panel-meta">ARQUITETURA CONSOLIDADA</div>
                        <h2>O que entra no sistema</h2>
                    </div>
                    <span class="panel-meta">6 contratos prontos para produção em src/</span>
                </div>
                <div class="ch2-prims">
                    <article class="ch2-prim">
                        <div class="ch2-prim__head"><h3>PBMascot 3D Bot</h3><span class="ch2-prim__code">frame.js</span></div>
                        <p>11 camadas (.bs0–.bs10) que acompanham ponteiro e reagem por mood/pose/tom de tipo.</p>
                    </article>
                    <article class="ch2-prim">
                        <div class="ch2-prim__head"><h3>Bayer Living Scenes</h3><span class="ch2-prim__code">canvas.scene</span></div>
                        <p>Céus em dither 4×4 (night, morning, dusk, route, mountain) nítidos e leves em GPU.</p>
                    </article>
                    <article class="ch2-prim">
                        <div class="ch2-prim__head"><h3>Decision Card</h3><span class="ch2-prim__code">AffectUI</span></div>
                        <p>Diagnóstico tático acionável com 1 clique, peel do sticker e desfazer imediato.</p>
                    </article>
                    <article class="ch2-prim">
                        <div class="ch2-prim__head"><h3>Odometer &amp; Bench Lv 50</h3><span class="ch2-prim__code">odo()</span></div>
                        <p>Rolagem vertical somente em mudanças provocadas pelo usuário — zero count-up falso.</p>
                    </article>
                    <article class="ch2-prim">
                        <div class="ch2-prim__head"><h3>Contenção 0-1-2</h3><span class="ch2-prim__code">M3 Expressive</span></div>
                        <p>Apenas um contorno externo por painel; sub-regiões usam preenchimento elevado e gap.</p>
                    </article>
                    <article class="ch2-prim">
                        <div class="ch2-prim__head"><h3>Tactile Receipt &amp; Fase 3</h3><span class="ch2-prim__code">4/4 Ouro</span></div>
                        <p>Comprovante térmico serrilhado e ciclos não punitivos com trajes desbloqueáveis.</p>
                    </article>
                </div>
            </section>
        </div>
    `;

    // Mount live 3D PBMascots & Odometer in Capítulo 2
    const heroHost = document.getElementById('ch2-hero-bot');
    if (heroHost) {
        new AliveBot(heroHost, {
            mood: heroCycle.mood,
            pose: heroCycle.pose,
            px: 192,
            view: '-480 -500 960 1120',
            extra: heroCycle.extra || {},
            label: 'Fantasminha de plantão interativo',
        });
    }
    const ch2DecBot = document.getElementById('ch2-decision-bot');
    if (ch2DecBot) {
        new AliveBot(ch2DecBot, {
            mood: resolved ? 'empolgado' : 'preocupado',
            pose: resolved ? 'comemorando' : 'apontando',
            px: 62,
            extra: resolved ? { tone: 'electric' } : {},
        });
    }
    const ch2ProfBot = document.getElementById('ch2-prof-bot');
    if (ch2ProfBot) {
        stillBot(ch2ProfBot, {
            mood: 'confiante',
            pose: 'ensinando',
            px: 52,
            extra: { tone: dexMon.types[0] },
        });
    }
    const ch2ProfileBot = document.getElementById('ch2-profile-bot');
    if (ch2ProfileBot) {
        new AliveBot(ch2ProfileBot, {
            mood: state.bonusXp > 0 ? 'radiante' : 'feliz',
            pose: state.bonusXp > 0 ? 'campeao' : 'parado',
            px: 58,
            extra: { tone: trainer.toneType },
        });
    }
    const ch2OdoEl = document.getElementById('ch2-synergy-odo');
    if (ch2OdoEl) {
        if (state.prevSynergyScore !== null && state.prevSynergyScore !== analysis.score) {
            odo(ch2OdoEl, state.prevSynergyScore);
            void ch2OdoEl.offsetHeight;
            odo(ch2OdoEl, analysis.score);
        } else {
            odo(ch2OdoEl, analysis.score);
        }
        state.prevSynergyScore = analysis.score;
    }
    mountFase3Interactive('ch2');
}

/* ── Global Render & Event Delegation ────────────────────────────────────── */
function renderChrome() {
    document.documentElement.dataset.theme = state.theme;
    const themeIcon = document.getElementById('theme-toggle-icon');
    const themeLabel = document.getElementById('theme-toggle-label');
    if (state.theme === 'dark') {
        themeIcon.textContent = '☀';
        themeLabel.textContent = 'Claro';
    } else {
        themeIcon.textContent = '☾';
        themeLabel.textContent = 'Escuro';
    }

    document.querySelectorAll('[data-view]').forEach((btn) => {
        const active = btn.dataset.view === state.view;
        if (btn.getAttribute('role') === 'tab') {
            btn.setAttribute('aria-selected', String(active));
        } else {
            btn.classList.toggle('is-active', active);
        }
    });

    document.querySelectorAll('.view-panel').forEach((sec) => {
        sec.classList.toggle('is-active', sec.id === `view-${state.view}`);
    });

    document.querySelectorAll('[data-viewport]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.viewport === state.viewport));
    });
    const stage = document.getElementById('lab-stage');
    stage.classList.toggle('is-mobile-frame', state.viewport === 'mobile');

    const spriteBtn = document.getElementById('sprite-mode-btn');
    spriteBtn.setAttribute('aria-pressed', String(state.spriteMode === 'pokeapi'));
    spriteBtn.querySelector('span').textContent = state.spriteMode === 'pokeapi' ? 'Sprites: PokéAPI' : 'Sprites: Vetor';
}

function renderActiveView() {
    destroyAllAliveBots();
    ensureBotDefs();
    renderChrome();
    if (state.view === 'narrativa') renderNarrativaView();
    else if (state.view === 'builder') renderBuilderView();
    else if (state.view === 'pokedex') renderPokedexView();
    else if (state.view === 'meta') renderMetaView();
    else if (state.view === 'profile') renderProfileView();
    initScenes(document.getElementById('lab-stage'));
}

function switchTheme(event) {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
        state.theme = next;
        renderActiveView();
    };
    if (event && document.startViewTransition && !prefersReducedMotion()) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        document.documentElement.style.setProperty('--vt-x', `${x}px`);
        document.documentElement.style.setProperty('--vt-y', `${y}px`);
        document.documentElement.style.setProperty('--vt-r', `${r}px`);
        document.startViewTransition(apply);
    } else {
        apply();
    }
}

function applySuggestion() {
    const sug = SUGGESTION_OPTIONS[state.suggestionIdx];
    state.prevSynergyScore = computeTeamAnalysis(state.slots).score;
    state.slots[4] = { slot: 5, ...sug };
    state.suggestionApplied = true;
    state.justPeeledSlot = 4;
    state.selectedSlot = 4;
    renderActiveView();
    showToast(`${sug.name} adicionado ao slot 5`, {
        actionLabel: 'Desfazer',
        onAction: undoSuggestion,
    });
}

function undoSuggestion() {
    state.prevSynergyScore = computeTeamAnalysis(state.slots).score;
    state.slots[4] = null;
    state.suggestionApplied = false;
    state.selectedSlot = 1;
    renderActiveView();
}

function initEvents() {
    ensureBotDefs();
    stillBot(document.getElementById('brand-mascot'), { mood: 'feliz', pose: 'parado', px: 30 });

    document.getElementById('theme-toggle-btn').addEventListener('click', switchTheme);
    document.getElementById('sprite-mode-btn').addEventListener('click', () => {
        state.spriteMode = state.spriteMode === 'vector' ? 'pokeapi' : 'vector';
        renderActiveView();
        showToast(state.spriteMode === 'pokeapi' ? 'Sprites PokéAPI CDN ativos (fallback automático offline)' : 'Ilustrações vetoriais locais ativas');
    });

    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('[data-view]');
        if (viewBtn) {
            state.view = viewBtn.dataset.view;
            renderActiveView();
            return;
        }

        const vpBtn = e.target.closest('[data-viewport]');
        if (vpBtn) {
            state.viewport = vpBtn.dataset.viewport;
            renderActiveView();
            return;
        }

        const slotBtn = e.target.closest('[data-slot-idx]');
        if (slotBtn) {
            state.selectedSlot = Number(slotBtn.dataset.slotIdx);
            renderActiveView();
            return;
        }

        const typeBtn = e.target.closest('[data-inspect-type]');
        if (typeBtn) {
            state.activeTypeInspect = typeBtn.dataset.inspectType;
            renderActiveView();
            return;
        }

        const dexBtn = e.target.closest('[data-dex-key]');
        if (dexBtn) {
            state.dexKey = dexBtn.dataset.dexKey;
            const sp = POKEDEX_SPECIES[state.dexKey];
            state.dexNature = sp.defaultNature;
            state.dexEvs = { ...sp.defaultEvs };
            renderActiveView();
            return;
        }

        const evStep = e.target.closest('[data-ev-step]');
        if (evStep) {
            const [statKey, deltaStr] = evStep.dataset.evStep.split(':');
            const delta = Number(deltaStr);
            const cur = state.dexEvs[statKey] || 0;
            const otherSum = Object.entries(state.dexEvs)
                .filter(([k]) => k !== statKey)
                .reduce((a, [, v]) => a + v, 0);
            const maxAllowed = Math.min(252, 510 - otherSum);
            state.dexEvs[statKey] = Math.max(0, Math.min(maxAllowed, cur + delta));
            renderActiveView();
            return;
        }

        const evSet = e.target.closest('[data-ev-set]');
        if (evSet) {
            const [statKey, valStr] = evSet.dataset.evSet.split(':');
            const target = Number(valStr);
            const otherSum = Object.entries(state.dexEvs)
                .filter(([k]) => k !== statKey)
                .reduce((a, [, v]) => a + v, 0);
            const maxAllowed = Math.min(252, 510 - otherSum);
            state.dexEvs[statKey] = Math.max(0, Math.min(maxAllowed, target));
            renderActiveView();
            return;
        }

        const tourFilter = e.target.closest('[data-tour-filter]');
        if (tourFilter) {
            state.tourFilter = tourFilter.dataset.tourFilter;
            renderActiveView();
            return;
        }

        const wfSort = e.target.closest('[data-wf-sort]');
        if (wfSort) {
            state.waterfallSort = wfSort.dataset.wfSort;
            renderActiveView();
            return;
        }

        const inspectTeam = e.target.closest('[data-inspect-team]');
        if (inspectTeam) {
            openTeamSheetModal(inspectTeam.dataset.inspectTeam);
            return;
        }

        const trBtn = e.target.closest('[data-trainer-idx]');
        if (trBtn) {
            state.trainerIdx = Number(trBtn.dataset.trainerIdx);
            state.customUid = '';
            renderActiveView();
            return;
        }

        const mimeBgBtn = e.target.closest('[data-mime-bg]');
        if (mimeBgBtn) {
            state.mimeBg = mimeBgBtn.dataset.mimeBg;
            renderActiveView();
            return;
        }

        const mimeGuessBtn = e.target.closest('[data-mime-guess]');
        if (mimeGuessBtn) {
            state.mimeGuess = mimeGuessBtn.dataset.mimeGuess;
            if (state.mimeGuess === 'charmander') {
                state.mimeCluesOpen = 5;
                showToast('Acertou! Charmander (#0004) · +45 XP na Mímica');
            } else {
                showToast('Quase! Observe a chama na cauda e a altura de 0,6 m');
            }
            renderActiveView();
            return;
        }

        const eggDayBtn = e.target.closest('[data-egg-day]');
        if (eggDayBtn) {
            state.eggDay = Number(eggDayBtn.dataset.eggDay);
            state.eggWobble = state.eggDay < 5;
            if (state.eggDay === 5) {
                showToast('Ovo chocado! Novo traje desbloqueado: Chapéu de Bruxa');
            }
            renderActiveView();
            return;
        }

        const actionEl = e.target.closest('[data-action]');
        if (actionEl) {
            const act = actionEl.dataset.action;
            if (act === 'apply-suggestion') applySuggestion();
            else if (act === 'undo-suggestion') undoSuggestion();
            else if (act === 'cycle-suggestion') {
                state.suggestionIdx = (state.suggestionIdx + 1) % SUGGESTION_OPTIONS.length;
                renderActiveView();
            } else if (act === 'cycle-hero-bot') {
                state.heroCycleIdx = (state.heroCycleIdx + 1) % HERO_CYCLE_POSES.length;
                renderActiveView();
            } else if (act === 'next-mime-clue') {
                state.mimeCluesOpen = Math.min(5, state.mimeCluesOpen + 1);
                renderActiveView();
            } else if (act === 'toggle-shiny') {
                state.dexShiny = !state.dexShiny;
                renderActiveView();
            } else if (act === 'reset-evs') {
                state.dexEvs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
                renderActiveView();
            } else if (act === 'close-sheet') {
                closeTeamSheetModal();
            } else if (act === 'copy-pokepaste') {
                const team = TOURNAMENT_TEAMS.find((t) => t.id === state.sheetTeamId);
                if (team && navigator.clipboard) {
                    const paste = team.pokemons.map((p) => `${p.name} @ ${p.item}\nAbility: ${p.ability}\n${p.nature} Nature\n- ${p.moves.join('\n- ')}`).join('\n\n');
                    navigator.clipboard.writeText(paste).catch(() => {});
                }
                showToast('Poképaste copiado para a área de transferência');
            } else if (act === 'reroll-uid') {
                const rand = Math.floor(1000 + Math.random() * 8999);
                state.customUid = `PTB-${rand}-VGC`;
                renderActiveView();
            } else if (act === 'boost-xp') {
                state.bonusXp = state.bonusXp > 0 ? 0 : 250;
                renderActiveView();
            } else if (act === 'toggle-day-complete') {
                state.tierListDone = !state.tierListDone;
                state.stampAnim = true;
                renderActiveView();
            }
        }

        if (e.target.id === 'sheet-scrim') {
            closeTeamSheetModal();
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.id === 'dex-nature-select') {
            state.dexNature = e.target.value;
            renderActiveView();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.sheetTeamId) {
            closeTeamSheetModal();
        }
        if (e.key === 'Enter' && e.target.id === 'ch2-hero-bot') {
            state.heroCycleIdx = (state.heroCycleIdx + 1) % HERO_CYCLE_POSES.length;
            renderActiveView();
        }
    });
}

// Parse URL query params for deterministic screenshots (?view=pokedex&theme=light&viewport=mobile)
const params = new URLSearchParams(window.location.search);
if (params.get('view') && ['narrativa', 'builder', 'pokedex', 'meta', 'profile'].includes(params.get('view'))) {
    state.view = params.get('view');
}
if (params.get('theme') && ['dark', 'light'].includes(params.get('theme'))) {
    state.theme = params.get('theme');
}
if (params.get('viewport') && ['desktop', 'mobile'].includes(params.get('viewport'))) {
    state.viewport = params.get('viewport');
}

initEvents();
renderActiveView();
