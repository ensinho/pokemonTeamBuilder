import React, { useId, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

function renderHighlightedName(displayName, query) {
    if (!query) return displayName;
    const lowerName = displayName.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerName.indexOf(lowerQuery);
    if (matchIndex === -1) return displayName;

    const before = displayName.slice(0, matchIndex);
    const matched = displayName.slice(matchIndex, matchIndex + query.length);
    const after = displayName.slice(matchIndex + query.length);

    return (
        <>
            {before}
            <mark className="generation-quiz-autocomplete__match">{matched}</mark>
            {after}
        </>
    );
}

export function PokemonGenerationQuizAutocomplete({
    value = '',
    onChange = () => {},
    onKeyDown = () => {},
    suggestions = [],
    activeIndex = 0,
    onSelectSuggestion = () => {},
    disabled = false,
    inputRef = null,
    helperText = '',
    placeholder = '',
    minCharacters = 2,
    feedbackState = null,
    shortcutHint = '/',
}) {
    const { t, language } = useTranslation();
    const listboxId = useId();
    const [isInputArmed, setIsInputArmed] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const safeValue = String(value || '');
    const trimmedValue = safeValue.trim();
    const hasValue = safeValue.length > 0;
    const isOpen = !disabled && trimmedValue.length >= minCharacters && (suggestions || []).length > 0;
    const activeSuggestion = isOpen ? (suggestions || [])[activeIndex] : null;

    const handleClear = () => {
        onChange('');
        inputRef?.current?.focus();
    };

    const wrapClasses = [
        'generation-quiz-autocomplete__input-wrap',
        isFocused ? 'is-focused' : '',
        hasValue ? 'has-value' : '',
        feedbackState === 'hit' ? 'is-hit' : '',
        feedbackState === 'miss' ? 'is-miss' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="generation-quiz-autocomplete">
            <div className="generation-quiz-autocomplete__decoys" aria-hidden="true">
                <input tabIndex={-1} type="text" autoComplete="username" className="generation-quiz-autocomplete__decoy" />
                <input tabIndex={-1} type="password" autoComplete="new-password" className="generation-quiz-autocomplete__decoy" />
            </div>
            <label className="generation-quiz__field" htmlFor="generation-quiz-answer">
                <span className="sr-only">{t('games.guessInput')}</span>
                <div className={wrapClasses}>
                    <span className="generation-quiz-autocomplete__icon" aria-hidden="true">
                        <Search />
                    </span>
                    <input
                        ref={inputRef}
                        id="generation-quiz-answer"
                        name="quiz-search"
                        type="text"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        inputMode="search"
                        enterKeyHint="done"
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        placeholder={placeholder || t('games.guessInput')}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={onKeyDown}
                        onFocus={() => {
                            setIsInputArmed(true);
                            setIsFocused(true);
                        }}
                        onBlur={() => setIsFocused(false)}
                        disabled={disabled}
                        readOnly={!isInputArmed}
                        className="generation-quiz__input"
                        role="combobox"
                        aria-autocomplete={isOpen ? 'list' : 'none'}
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? listboxId : undefined}
                        aria-activedescendant={activeSuggestion ? `${listboxId}-${activeSuggestion.id}` : undefined}
                        aria-describedby={helperText ? 'generation-quiz-helper' : undefined}
                    />
                    {!disabled && (
                        <div className="generation-quiz-autocomplete__suffix">
                            {hasValue ? (
                                <>
                                    <kbd className="generation-quiz-autocomplete__kbd generation-quiz-autocomplete__kbd--enter" aria-hidden="true">
                                        Enter
                                    </kbd>
                                    <button
                                        type="button"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={handleClear}
                                        className="generation-quiz-autocomplete__clear"
                                        aria-label={language === 'pt' ? 'Limpar palpite' : 'Clear guess'}
                                    >
                                        <X aria-hidden="true" />
                                    </button>
                                </>
                            ) : (!isFocused && shortcutHint ? (
                                <kbd className="generation-quiz-autocomplete__kbd" aria-hidden="true">
                                    {shortcutHint}
                                </kbd>
                            ) : null)}
                        </div>
                    )}
                    {isOpen && (
                        <div className="generation-quiz-autocomplete__panel elevation-2">
                            <ul id={listboxId} role="listbox" className="generation-quiz-autocomplete__list custom-scrollbar">
                                {suggestions.map((suggestion, index) => (
                                    <li key={suggestion.id} role="presentation">
                                        <button
                                            id={`${listboxId}-${suggestion.id}`}
                                            type="button"
                                            role="option"
                                            aria-selected={index === activeIndex}
                                            className={`generation-quiz-autocomplete__option ${index === activeIndex ? 'is-active' : ''}`}
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => onSelectSuggestion(suggestion.id)}
                                        >
                                            <span className="generation-quiz-autocomplete__name">
                                                {renderHighlightedName(suggestion.displayName, trimmedValue)}
                                            </span>
                                            <span className="generation-quiz-autocomplete__meta">
                                                #{String(suggestion.id).padStart(3, '0')}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="generation-quiz-autocomplete__footer" aria-hidden="true">
                                <span><kbd>↑</kbd><kbd>↓</kbd> {language === 'pt' ? 'navegar' : 'navigate'}</span>
                                <span><kbd>Enter</kbd> {language === 'pt' ? 'selecionar' : 'select'}</span>
                            </div>
                        </div>
                    )}
                </div>
            </label>

            {helperText && (
                <p id="generation-quiz-helper" className="generation-quiz__helper-text">
                    {helperText}
                </p>
            )}
        </div>
    );
}