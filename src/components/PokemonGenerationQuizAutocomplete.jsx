import React, { useId, useState } from 'react';

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
    placeholder,
    minCharacters,
}) {
    const listboxId = useId();
    const [isInputArmed, setIsInputArmed] = useState(false);
    const trimmedValue = value.trim();
    const isOpen = !disabled && trimmedValue.length >= minCharacters && suggestions.length > 0;
    const activeSuggestion = isOpen ? suggestions[activeIndex] : null;

    return (
        <div className="generation-quiz-autocomplete">
            <div className="generation-quiz-autocomplete__decoys" aria-hidden="true">
                <input tabIndex={-1} type="text" autoComplete="username" className="generation-quiz-autocomplete__decoy" />
                <input tabIndex={-1} type="password" autoComplete="new-password" className="generation-quiz-autocomplete__decoy" />
            </div>
            <label className="generation-quiz__field" htmlFor="generation-quiz-answer">
                <span className="sr-only">Pokémon name</span>
                <div className="generation-quiz-autocomplete__input-wrap">
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
                        placeholder={placeholder || 'Type a Pokémon name'}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={onKeyDown}
                        onFocus={() => setIsInputArmed(true)}
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

            {helperText && (
                <p id="generation-quiz-helper" className="generation-quiz__helper-text">
                    {helperText}
                </p>
            )}
        </div>
    );
}