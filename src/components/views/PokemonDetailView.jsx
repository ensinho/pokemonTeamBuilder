import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/pokemon-detail-view.css';

import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../EmptyState';
import { PokeballIcon } from '../icons';
import { PokemonDetailPanel } from './PokemonDetailPanel';

export function PokemonDetailView({
    colors,
    favoritePokemons,
    onToggleFavoritePokemon,
    onAdd,
    currentTeam = [],
    db,
    pokemonDetailsCache,
    setPokemonDetailsCache,
}) {
    const { idOrName } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useTranslation();
    const pt = language === 'pt';

    const allPokemons = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    // Resolve the index entry (so a name route maps to a numeric id).
    const indexEntry = useMemo(() => {
        const key = String(idOrName || '').toLowerCase();
        return allPokemons.find((p) => String(p.id) === key || p.name?.toLowerCase() === key) || null;
    }, [allPokemons, idOrName]);
    const resolvedId = indexEntry?.id ?? Number.parseInt(idOrName, 10);
    const validId = Number.isInteger(resolvedId) && resolvedId > 0;

    // Dynamic "go back": return to wherever the user opened this page from
    // (team detail, builder, favorites, …), falling back to history then /pokedex.
    const fromPath = location.state?.from || '';
    const handleBack = () => {
        if (fromPath) navigate(fromPath);
        else if (location.key !== 'default') navigate(-1);
        else navigate('/pokedex');
    };
    const backLabel = useMemo(() => {
        if (fromPath.startsWith('/teams')) return pt ? 'Voltar ao time' : 'Back to team';
        if (fromPath.startsWith('/builder')) return pt ? 'Voltar ao construtor' : 'Back to builder';
        if (fromPath.startsWith('/favorites')) return pt ? 'Voltar aos favoritos' : 'Back to favorites';
        if (fromPath === '/' || fromPath.startsWith('/home')) return pt ? 'Voltar ao início' : 'Back to home';
        return pt ? 'Voltar' : 'Back';
    }, [fromPath, pt]);

    // Navigating to an evolution / form / etc. keeps the original origin so the
    // back button stays meaningful through the chain.
    const handleNavigate = (id) => navigate(`/pokemon/${id}`, { state: location.state });

    // A name route (e.g. /pokemon/garchomp) can't resolve until the index loads —
    // show a spinner rather than flashing "not found".
    const isNumericRoute = /^\d+$/.test(String(idOrName || ''));
    if (!validId && !isNumericRoute && allPokemons.length === 0) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '50vh', color: 'var(--color-primary)' }} role="status" aria-label="Loading">
                <PokeballIcon className="w-14 h-14 animate-spin opacity-70" />
            </div>
        );
    }

    if (!validId) {
        return (
            <EmptyState
                title={t('pdetail.notFound')}
                message={t('pdetail.notFoundDesc')}
                action={{ label: pt ? 'Voltar' : 'Back', onClick: handleBack }}
            />
        );
    }

    return (
        <div className="pdv">
            <PokemonDetailPanel
                key={resolvedId}
                pokemonId={resolvedId}
                colors={colors}
                favoritePokemons={favoritePokemons}
                onToggleFavoritePokemon={onToggleFavoritePokemon}
                onAdd={onAdd}
                currentTeam={currentTeam}
                onNavigate={handleNavigate}
                db={db}
                pokemonDetailsCache={pokemonDetailsCache}
                setPokemonDetailsCache={setPokemonDetailsCache}
                backLabel={backLabel}
                onBack={handleBack}
            />
        </div>
    );
}
