import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Minus, Plus, RotateCcw } from 'lucide-react';

import { typeColors } from '../../constants/types';
import { useTranslation } from '../../hooks/useTranslation';
import {
    BENCH_NATURES,
    EV_PRESETS,
    EV_STEP,
    computeStatBench,
    emptyBenchEvs,
    evaluateSpeedBenchmarks,
    formatNatureOption,
    seedBenchFromBuild,
    setBenchEv,
    stepBenchEv,
} from '../../utils/statBench';
import { RollingNumber } from '../RollingNumber';

/**
 * Interactive Gen 9 Level 50 EV bench + Speed Tier Benchmark strip for the
 * Pokédex entry (`PokemonDetailPanel`).
 *
 * M3 0-1-2 containment: the host `.pdd-card` owns the single 1px border;
 * everything inside separates via `--color-surface-raised` tonal bands,
 * `--space-*` rhythm, and inverted active EV chips (`--color-inverse`).
 */
export function StatBenchLv50({ pokemonId, stats = [], build = null }) {
    const { t } = useTranslation();
    const location = useLocation();

    // Seed from the species' real ladder spread when available; derive in render
    // until the trainer touches a control (zero effect-sync lag).
    const defaultSeed = useMemo(() => seedBenchFromBuild(build), [build]);
    const [userEdit, setUserEdit] = useState(null);

    const active = userEdit && userEdit.pokemonId === pokemonId
        ? userEdit
        : { pokemonId, evs: defaultSeed.evs, nature: defaultSeed.nature };

    const bench = useMemo(
        () => computeStatBench({
            stats,
            evs: active.evs,
            nature: active.nature,
            pokemonId,
        }),
        [stats, active.evs, active.nature, pokemonId],
    );

    const speedBench = useMemo(
        () => evaluateSpeedBenchmarks(bench.speed),
        [bench.speed],
    );

    const handlePreset = (statKey, preset) => {
        setUserEdit({
            pokemonId,
            nature: active.nature,
            evs: setBenchEv(active.evs, statKey, preset),
        });
    };

    const handleStep = (statKey, delta) => {
        setUserEdit({
            pokemonId,
            nature: active.nature,
            evs: stepBenchEv(active.evs, statKey, delta),
        });
    };

    const handleNatureChange = (event) => {
        setUserEdit({
            pokemonId,
            evs: active.evs,
            nature: event.target.value,
        });
    };

    const handleReset = () => {
        setUserEdit({
            pokemonId,
            evs: emptyBenchEvs(),
            nature: 'serious',
        });
    };

    const isFullSpread = bench.spentEvs >= 508;
    const isPristineZero = bench.spentEvs === 0 && active.nature === 'serious';
    const [evsPrefix = '', evsSuffix = ''] = t('pokedex.bench.evsFree', { count: '__N__' }).split('__N__');
    const [speedPrefix = '', speedSuffix = ''] = t('pokedex.bench.currentSpeed', { speed: '__N__' }).split('__N__');

    return (
        <div className="stat-bench">
            <div className="stat-bench__toolbar">
                <label className="stat-bench__nature">
                    <span className="stat-bench__nature-label">{t('pokedex.bench.natureLabel')}</span>
                    <select
                        value={active.nature}
                        onChange={handleNatureChange}
                        className="stat-bench__select"
                        aria-label={t('pokedex.bench.natureLabel')}
                    >
                        {BENCH_NATURES.map((nat) => (
                            <option key={nat.id} value={nat.id}>
                                {formatNatureOption(nat, t('pokedex.bench.neutralNature'))}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="stat-bench__toolbar-end">
                    <span className={`badge badge--figure ${isFullSpread ? 'badge--gold' : 'badge--primary'}`}>
                        <span>
                            {evsPrefix}
                            <RollingNumber value={bench.remainingEvs} />
                            {evsSuffix}
                        </span>
                    </span>
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={isPristineZero}
                        className="btn btn-ghost btn-sm stat-bench__reset"
                    >
                        <RotateCcw aria-hidden="true" />
                        <span>{t('pokedex.bench.resetEvs')}</span>
                    </button>
                </div>
            </div>

            <div className="stat-bench__rows">
                {bench.rows.map((row) => {
                    const isCustomEv = row.ev > 0 && !EV_PRESETS.includes(row.ev);
                    return (
                        <div
                            key={row.key}
                            className={`stat-bench__row ${row.isPeak ? 'is-peak' : ''}`}
                        >
                            <span className="stat-bench__key">
                                {row.label}
                                {row.modifier > 1 && <sup className="stat-bench__mod stat-bench__mod--up">+</sup>}
                                {row.modifier < 1 && <sup className="stat-bench__mod stat-bench__mod--down">−</sup>}
                            </span>

                            <span className="stat-bench__val">
                                <RollingNumber value={row.value} />
                            </span>

                            <span
                                className="stat-bench__track"
                                title={`Base ${row.base} · EV ${row.ev}`}
                                aria-hidden="true"
                            >
                                <span
                                    className="stat-bench__fill"
                                    style={{ width: `${row.pct}%` }}
                                />
                            </span>

                            <div className="stat-bench__controls" role="group" aria-label={row.label}>
                                <button
                                    type="button"
                                    onClick={() => handleStep(row.key, -EV_STEP)}
                                    disabled={row.ev === 0}
                                    aria-label={t('pokedex.bench.decreaseEvAria', { stat: row.label })}
                                    className="stat-bench__chip stat-bench__chip--step"
                                >
                                    <Minus aria-hidden="true" />
                                </button>
                                {EV_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => handlePreset(row.key, preset)}
                                        aria-pressed={row.ev === preset}
                                        aria-label={t('pokedex.bench.setEvAria', { stat: row.label, ev: preset })}
                                        className={`stat-bench__chip ${row.ev === preset ? 'is-active' : ''}`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                                {isCustomEv && (
                                    <span className="stat-bench__chip is-active stat-bench__chip--custom" aria-live="polite">
                                        {row.ev}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleStep(row.key, EV_STEP)}
                                    disabled={row.ev >= 252 || bench.remainingEvs < EV_STEP}
                                    aria-label={t('pokedex.bench.increaseEvAria', { stat: row.label })}
                                    className="stat-bench__chip stat-bench__chip--step"
                                >
                                    <Plus aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="stat-bench__speed">
                <div className="stat-bench__speed-head">
                    <h3 className="stat-bench__speed-title">{t('pokedex.bench.speedTitle')}</h3>
                    <span className="stat-bench__speed-now">
                        {speedPrefix}
                        <RollingNumber value={speedBench.speed} />
                        {speedSuffix}
                    </span>
                </div>

                <div className="stat-bench__speed-track" aria-hidden="true">
                    <span
                        className={`stat-bench__speed-fill ${speedBench.clearedCount === speedBench.anchors.length ? 'is-all-cleared' : ''}`}
                        style={{ width: `${speedBench.trackPct}%` }}
                    />
                    {speedBench.anchors.map((anchor) => (
                        <span
                            key={anchor.id}
                            className={`stat-bench__speed-tick ${anchor.cleared ? 'is-cleared' : ''}`}
                            style={{ left: `${anchor.tickPct}%` }}
                        />
                    ))}
                </div>

                <div className="stat-bench__anchors">
                    {speedBench.anchors.map((anchor) => {
                        const statusLabel = anchor.outcome === 'faster'
                            ? t('pokedex.bench.outspeeds')
                            : anchor.outcome === 'tie'
                                ? t('pokedex.bench.ties')
                                : t('pokedex.bench.underspeeds');
                        return (
                            <Link
                                key={anchor.id}
                                to={`/pokemon/${anchor.id}`}
                                state={location.state}
                                className={`stat-bench__anchor stat-bench__anchor--${anchor.outcome}`}
                                title={`${anchor.name} (${anchor.buildTag}) · ${anchor.speed} Spe — ${statusLabel}`}
                            >
                                <span
                                    className="type-platform stat-bench__anchor-stage"
                                    style={{ '--card-type': typeColors[anchor.type] || 'var(--color-primary)' }}
                                >
                                    <img
                                        src={anchor.sprite}
                                        alt=""
                                        width="32"
                                        height="32"
                                        loading="lazy"
                                        decoding="async"
                                        className="stat-bench__anchor-sprite image-pixelated"
                                    />
                                </span>
                                <span className="stat-bench__anchor-speed">{anchor.speed}</span>
                                <span className="stat-bench__anchor-name">{anchor.name}</span>
                                <span className="stat-bench__anchor-status">{statusLabel}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
