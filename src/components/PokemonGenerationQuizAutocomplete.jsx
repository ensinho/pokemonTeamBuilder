import React, { useId } from 'react';

export function PokemonGenerationQuizAutocomplete({
    value,
    onChange,
    onKeyDown,
    suggestions,
    activeIndex,
    onSelectSuggestion,
    disabled,
    inputRef,
    helperText,
}) {
    const listboxId = useId();
    const isOpen = !disabled && value.trim().length > 0 && suggestions.length > 0;
    const activeSuggestion = isOpen ? suggestions[activeIndex] : null;

    return (
        <div className="generation-quiz-autocomplete">
            <label className="generation-quiz__field" htmlFor="generation-quiz-answer">
                <span className="generation-quiz__field-label">Answer</span>
                <div className="generation-quiz-autocomplete__input-wrap">
                    <input
                        ref={inputRef}
                        id="generation-quiz-answer"
                        type="text"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Type a Pokémon name"
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={disabled}
                        className="generation-quiz__input"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? listboxId : undefined}
                        aria-activedescendant={activeSuggestion ? `${listboxId}-${activeSuggestion.id}` : undefined}
                        aria-describedby="generation-quiz-helper"
                    />
                    {isOpen && (
                        <div className="generation-quiz-autocomplete__panel elevation-2">
                            <ul id={listboxId} role="listbox" className="generation-quiz-autocomplete__list">
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
                                            <span className="generation-quiz-autocomplete__name">{suggestion.displayName}</span>
                                            <span className="generation-quiz-autocomplete__meta">#{suggestion.id}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </label>

            <p id="generation-quiz-helper" className="generation-quiz__helper-text">
                {helperText}
            </p>
        </div>
    );
}