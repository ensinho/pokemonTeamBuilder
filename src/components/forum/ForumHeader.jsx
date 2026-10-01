import React from 'react';
import {
    PokeballIcon,
    SwordsIcon,
    StarIcon,
    MessageIcon,
    FlameIcon,
    SearchIcon,
    CloseIcon,
    ArrowUpDownIcon,
    PlusIcon,
} from '../icons';

const CATEGORIES = [
    { id: 'all', labelPt: 'Todos', labelEn: 'All', icon: PokeballIcon },
    { id: 'general', labelPt: 'Geral', labelEn: 'General', icon: MessageIcon },
    { id: 'teams', labelPt: 'Times', labelEn: 'Teams', icon: SwordsIcon },
    { id: 'strategy', labelPt: 'Estratégia', labelEn: 'Strategy', icon: FlameIcon },
    { id: 'announcements', labelPt: 'Anúncios', labelEn: 'Announcements', icon: StarIcon },
];

export function ForumHeader({
    selectedCategory,
    onSelectCategory,
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    onOpenCreateTopic,
    totalTopics = 0,
    language = 'pt',
}) {
    return (
        <div className="forum-header">
            {/* Top Compact Heading Row (like Pokédex panel header) */}
            <div className="forum-header__banner">
                <div className="forum-header__heading-row">
                    <h2 className="forum-header__title">
                        {language === 'pt' ? 'Fórum da Comunidade' : 'Community Forum'}
                    </h2>
                    {totalTopics > 0 && (
                        <span className="forum-header__meta">{totalTopics}</span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onOpenCreateTopic}
                    className="btn btn-primary btn-sm forum-new-topic-btn"
                >
                    <PlusIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'pt' ? 'Novo Tópico' : 'New Topic'}</span>
                </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="forum-header__toolbar">
                {/* Category Pills */}
                <div className="forum-categories-scroll custom-scrollbar">
                    {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = selectedCategory === cat.id;
                        const label = language === 'pt' ? cat.labelPt : cat.labelEn;

                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => onSelectCategory(cat.id)}
                                className={`forum-category-pill ${isSelected ? 'is-active' : ''}`}
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Right controls: Search and Sort */}
                <div className="forum-header__controls">
                    {/* Search Field */}
                    <div className="forum-search-box">
                        <SearchIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={language === 'pt' ? 'Buscar tópicos...' : 'Search topics...'}
                            className="forum-search-input"
                            aria-label={language === 'pt' ? 'Buscar tópicos' : 'Search topics'}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => onSearchChange('')}
                                className="forum-search-clear"
                                aria-label="Limpar busca"
                            >
                                <CloseIcon className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Sort Selector */}
                    <div className="forum-sort-box">
                        <ArrowUpDownIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value)}
                            className="forum-sort-select"
                            aria-label={language === 'pt' ? 'Ordenar tópicos' : 'Sort topics'}
                        >
                            <option value="recent">
                                {language === 'pt' ? 'Mais Recentes' : 'Latest'}
                            </option>
                            <option value="popular">
                                {language === 'pt' ? 'Populares' : 'Popular'}
                            </option>
                            <option value="comments">
                                {language === 'pt' ? 'Mais Comentados' : 'Most Comments'}
                            </option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
