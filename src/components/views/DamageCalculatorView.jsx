import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/tools-views.css';
import { resolvePokemonDetail, getMoveDetails } from '../../services/pokemonDataCache';
import { calcDamage, NATURE_MODIFIERS } from '../../utils/damageCalc';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
import { PokemonPicker } from '../PokemonPicker';

const NATURES = Object.keys(NATURE_MODIFIERS);
const prettify = (s = '') => s.replace(/-/g, ' ');

const EV_INPUT = (label, value, onChange) => (
    <label className="dmg-ev">
        <span className="dmg-ev__label">{label}</span>
        <input
            type="number" min="0" max="252" step="4" value={value}
            onChange={(e) => onChange(Math.max(0, Math.min(252, Number(e.target.value) || 0)))}
            className="dmg-ev__input"
        />
    </label>
);

export function DamageCalculatorView() {
    const { t } = useTranslation();
    const allPokemons = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const [level, setLevel] = useState(50);
    const [isCritical, setIsCritical] = useState(false);

    const [attacker, setAttacker] = useState(null);
    const [defender, setDefender] = useState(null);
    const [atkNature, setAtkNature] = useState('serious');
    const [defNature, setDefNature] = useState('serious');
    const [atkEvs, setAtkEvs] = useState({ attack: 0, 'special-attack': 0 });
    const [defEvs, setDefEvs] = useState({ hp: 0, defense: 0, 'special-defense': 0 });

    const [moves, setMoves] = useState([]);
    const [moveName, setMoveName] = useState('');
    const [moveDetail, setMoveDetail] = useState(null);

    // Load the attacker's move pool when it changes.
    useEffect(() => {
        let cancelled = false;
        setMoves([]); setMoveName(''); setMoveDetail(null);
        if (!attacker?.id) return undefined;
        resolvePokemonDetail(attacker.id).then((detail) => {
            if (cancelled || !detail?.moves) return;
            const sorted = [...detail.moves].sort((a, b) => a.name.localeCompare(b.name));
            setMoves(sorted);
        });
        return () => { cancelled = true; };
    }, [attacker?.id]);

    // Resolve the selected move's power/type/category.
    useEffect(() => {
        let cancelled = false;
        setMoveDetail(null);
        if (!moveName) return undefined;
        const entry = moves.find((m) => m.name === moveName);
        getMoveDetails(entry?.url, moveName).then((d) => { if (!cancelled) setMoveDetail(d); });
        return () => { cancelled = true; };
    }, [moveName, moves]);

    const result = useMemo(() => {
        if (!attacker?.baseStats || !defender?.baseStats || !moveDetail) return null;
        return calcDamage({
            level,
            movePower: moveDetail.power,
            moveType: moveDetail.type,
            moveCategory: moveDetail.damage_class,
            attacker: { baseStats: attacker.baseStats, types: attacker.types, nature: atkNature, evs: atkEvs },
            defender: { baseStats: defender.baseStats, types: defender.types, nature: defNature, evs: defEvs },
            isCritical,
        });
    }, [attacker, defender, moveDetail, level, atkNature, defNature, atkEvs, defEvs, isCritical]);

    const isStatusMove = moveDetail && moveDetail.damage_class === 'status';

    return (
        <div>
            <div className="dmg-grid">
                {/* Attacker */}
                <div className="dmg-card">
                    <div className="dmg-card__title dmg-card__title--atk">{t('tools.attacker')}</div>
                    <PokemonPicker pokemons={allPokemons} value={attacker} onSelect={setAttacker} />

                    <div className="dmg-field">
                        <span className="dmg-field__label">{t('tools.move')}</span>
                        <select className="dmg-select" value={moveName} onChange={(e) => setMoveName(e.target.value)} disabled={!attacker}>
                            <option value="">{t('tools.selectMove')}</option>
                            {moves.map((m) => <option key={m.name} value={m.name}>{prettify(m.name)}</option>)}
                        </select>
                    </div>

                    <div className="dmg-field">
                        <span className="dmg-field__label">{t('tools.nature')}</span>
                        <select className="dmg-select" value={atkNature} onChange={(e) => setAtkNature(e.target.value)}>
                            {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    <div className="dmg-field">
                        <span className="dmg-field__label">{t('tools.evs')}</span>
                        <div className="dmg-evs">
                            {EV_INPUT('Atk', atkEvs.attack, (v) => setAtkEvs((s) => ({ ...s, attack: v })))}
                            {EV_INPUT('SpA', atkEvs['special-attack'], (v) => setAtkEvs((s) => ({ ...s, 'special-attack': v })))}
                        </div>
                    </div>
                </div>

                {/* Defender */}
                <div className="dmg-card">
                    <div className="dmg-card__title dmg-card__title--def">{t('tools.defender')}</div>
                    <PokemonPicker pokemons={allPokemons} value={defender} onSelect={setDefender} />

                    <div className="dmg-field">
                        <span className="dmg-field__label">{t('tools.nature')}</span>
                        <select className="dmg-select" value={defNature} onChange={(e) => setDefNature(e.target.value)}>
                            {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    <div className="dmg-field">
                        <span className="dmg-field__label">{t('tools.evs')}</span>
                        <div className="dmg-evs">
                            {EV_INPUT('HP', defEvs.hp, (v) => setDefEvs((s) => ({ ...s, hp: v })))}
                            {EV_INPUT('Def', defEvs.defense, (v) => setDefEvs((s) => ({ ...s, defense: v })))}
                            {EV_INPUT('SpD', defEvs['special-defense'], (v) => setDefEvs((s) => ({ ...s, 'special-defense': v })))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="dmg-options">
                <label className="dmg-field" style={{ margin: 0 }}>
                    <span className="dmg-field__label">{t('tools.level')}</span>
                    <input
                        type="number" min="1" max="100" value={level}
                        onChange={(e) => setLevel(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                        className="dmg-number" style={{ width: '5rem' }}
                    />
                </label>
                <label className="dmg-check">
                    <input type="checkbox" checked={isCritical} onChange={(e) => setIsCritical(e.target.checked)} />
                    {t('tools.critical')}
                </label>
            </div>

            {result && !isStatusMove ? (
                <div className="dmg-result">
                    <div className="dmg-result__headline">
                        {result.minPct}% – {result.maxPct}%
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
                            ({result.minDamage}–{result.maxDamage} / {result.defenderHP} HP)
                        </span>
                    </div>
                    <div className={`dmg-result__ko ${result.koGuaranteed ? 'dmg-result__ko--guaranteed' : 'dmg-result__ko--possible'}`}>
                        {result.minDamage <= 0
                            ? t('tools.noDamage')
                            : (result.koGuaranteed
                                ? t('tools.guaranteed', { n: result.koHits })
                                : t('tools.possible', { n: result.koHits }))}
                    </div>
                    <div className="dmg-result__meta">
                        <span>×{result.effectiveness}</span>
                        {result.stab && <span>STAB</span>}
                        {isCritical && <span>{t('tools.critical')}</span>}
                    </div>
                    <div className="dmg-bar" aria-hidden="true">
                        <div className="dmg-bar__fill" style={{ width: `${Math.min(100, result.maxPct)}%` }} />
                        <div className="dmg-bar__min" style={{ width: `${Math.min(100, result.minPct)}%` }} />
                    </div>
                </div>
            ) : isStatusMove ? (
                <div className="dmg-empty">{t('tools.noDamage')}</div>
            ) : (
                <div className="dmg-empty">{t('tools.pickBoth')}</div>
            )}
        </div>
    );
}
