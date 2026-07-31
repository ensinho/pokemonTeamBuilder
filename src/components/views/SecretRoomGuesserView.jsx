import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSecretRoom } from '../../hooks/useSecretRoom';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { PokemonGenerationQuizAutocomplete } from '../PokemonGenerationQuizAutocomplete';
import { AvatarSprite } from '../AvatarSprite';
import { typeIcons } from '../../constants/types';
import {
    buildQuestionKey,
    parseFreeTextQuestion,
    resolvePokemonGenerationNumber,
    QUESTION_EXAMPLES,
} from '../../utils/pokemonQuestionEvaluator';
import { loadPokemonIndex, normalizePokemonQuizInput } from '../../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import {
    SwordsIcon, PokeballIcon, SparklesIcon, ClipIcon, CloseIcon,
    AccountIcon,
} from '../icons';
import {
    Flame, Droplets, Leaf, Sparkles, Heart, Crown, Ruler,
    Users, Play, Check, MessageSquare, HelpCircle,
    Dna, Layers, Send, PartyPopper, LogOut,
} from 'lucide-react';
import '../../styles/generation-quiz-view.css';
import '../../styles/secret-room-guesser.css';

const MIN_AUTOCOMPLETE_CHARACTERS = 2;
const MAX_SUGGESTIONS = 6;
const AUTO_ADVANCE_SECONDS = 6;

/**
 * The two game modes. PokéRoom is the place; these are what you play in it.
 *
 * The keys are the values persisted on every existing room doc and compared in
 * `useSecretRoomStore` — only the display names live here, so renaming a mode
 * never invalidates a room that is already open.
 */
const GAME_MODES = {
    'secret-pokemon': {
        name: 'Pokinator',
        desc: 'Um segredo coletivo — todos perguntam sobre o mesmo Pokémon',
    }
};

const modeName = (gameMode) => GAME_MODES[gameMode]?.name || 'Pokinator';

const toDisplayName = (name = '') => String(name)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/** Pokémon used only as faint background art — decorative, never interactive. */
const DECOR_SPRITES = [
    { id: 94, className: 'pokeroom__decor--one' },    // Gengar — the mystery
    { id: 65, className: 'pokeroom__decor--two' },    // Alakazam — the guessing
    { id: 132, className: 'pokeroom__decor--three' }, // Ditto — the disguise
];

/**
 * One revealed/locked attribute row on the secret card.
 *
 * Module-level so React keeps the same element type across renders (a component
 * declared inside the parent would remount the whole row on every keystroke).
 */
const CardSlot = ({ icon, label, value, wide = false }) => {
    const isRevealed = Boolean(value);
    return (
        <div
            className="pokeroom-tcg__slot"
            data-state={isRevealed ? 'revealed' : 'locked'}
            data-wide={wide ? 'true' : 'false'}
        >
            <span className="pokeroom-tcg__slot-label">
                {icon}
                {label}
            </span>
            <span className="pokeroom-tcg__slot-value">{isRevealed ? value : '???'}</span>
            {isRevealed && <Check className="pokeroom-tcg__slot-check" aria-hidden="true" />}
        </div>
    );
};

/** A revealed type: canonical color from `type-badge--*`, plus its game icon. */
const RevealedType = ({ type, label }) => (
    <span className={`pokeroom-tcg__type type-badge--${type}`}>
        {typeIcons[type] && <img src={typeIcons[type]} alt="" aria-hidden="true" />}
        {label}
    </span>
);

/**
 * Quick-question chips. Each one disappears from every player's screen once
 * that question has been asked in the room, so nobody re-asks a known answer.
 */
const STARTER_CHIPS = [
    { label: 'Tipo Fogo', Icon: Flame, obj: { category: 'type', value: 'fire' } },
    { label: 'Tipo Água', Icon: Droplets, obj: { category: 'type', value: 'water' } },
    { label: 'Tipo Planta', Icon: Leaf, obj: { category: 'type', value: 'grass' } },
    { label: '2 Tipos', Icon: Layers, obj: { category: 'isDualType' } },
    { label: 'É grande?', Icon: Ruler, obj: { category: 'heightMin', value: 2 }, labelFull: 'Tem 2m ou mais (é grande)?' },
    { label: 'Já evoluiu?', Icon: Layers, obj: { category: 'isEvolved' }, labelFull: 'Já é uma evolução (não é forma base)?' },
    { label: 'É lendário?', Icon: Crown, obj: { category: 'isLegendary' } },
    { label: 'É inicial?', Icon: Sparkles, obj: { category: 'isStarter' } },
    { label: 'Meus favoritos', Icon: Heart, obj: { category: 'isUserFavorite' } },
];

export function SecretRoomGuesserView() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useDocumentMeta({ title: 'PokéRoom - Multiplayer Guesser' });

    const {
        authUserId,
        currentRoom,
        friends,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        submitQuestion,
        submitDirectGuess,
        nextRound,
        inviteFriendToRoom,
    } = useSecretRoom(roomId);

    const favoritePokemons = useFirestoreTeamsStore((state) => state.favoritePokemons);

    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [selectedMode, setSelectedMode] = useState('secret-pokemon');
    const [selectedMaxRounds, setSelectedMaxRounds] = useState(5);
    const [copiedCode, setCopiedCode] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [pokemonIndex, setPokemonIndex] = useState([]);

    // The single console input: it takes a Pokémon name *or* a question.
    const [command, setCommand] = useState('');
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [feedback, setFeedback] = useState(null);
    // The big SIM/NÃO answer to the question just asked, shown under the input.
    const [verdict, setVerdict] = useState(null);
    const commandInputRef = useRef(null);

    useEffect(() => {
        loadPokemonIndex().then((idx) => setPokemonIndex(idx || [])).catch(() => {});
    }, []);

    const isMyTurn = useMemo(() => {
        if (!currentRoom?.players?.length || !authUserId) return false;
        return currentRoom.players[currentRoom.currentTurnIndex]?.userId === authUserId;
    }, [currentRoom, authUserId]);

    const isHost = Boolean(authUserId) && currentRoom?.hostId === authUserId;

    const turnPlayerName = currentRoom?.players?.[currentRoom.currentTurnIndex]?.displayName || 'outro treinador';

    // "Who Poke Am I" gives every player their own hidden Pokémon, and the store
    // already evaluates each question against the asker's own secret. The card
    // must therefore show *my* secret — showing whoever's turn it was meant the
    // board described someone else's Pokémon.
    const isOwnSecretMode = currentRoom?.gameMode !== 'secret-pokemon';

    const secretPokemon = useMemo(() => {
        if (!currentRoom) return null;
        if (!isOwnSecretMode) return currentRoom.sharedSecretPokemon;
        return currentRoom.players?.find((p) => p.userId === authUserId)?.secretPokemon || null;
    }, [currentRoom, isOwnSecretMode, authUserId]);

    // In own-secret mode only my own questions describe my Pokémon; everyone
    // else's answers are about theirs.
    const myQuestionsLog = useMemo(() => {
        const log = currentRoom?.questionsLog || [];
        if (!isOwnSecretMode) return log;
        return log.filter((entry) => entry.userId === authUserId);
    }, [currentRoom?.questionsLog, isOwnSecretMode, authUserId]);

    const isRevealed = currentRoom?.status === 'roundResult' || currentRoom?.status === 'ended';

    /* --------------------------------------------------------------------
       Rounds advance on their own after the reveal.
       -------------------------------------------------------------------- */

    const [autoAdvanceIn, setAutoAdvanceIn] = useState(null);
    const advancedRoundRef = useRef(null);

    useEffect(() => {
        // 'ended' is the end of the match — it waits for a human.
        if (currentRoom?.status !== 'roundResult') {
            setAutoAdvanceIn(null);
            return undefined;
        }

        setAutoAdvanceIn(AUTO_ADVANCE_SECONDS);
        const ticker = setInterval(() => {
            setAutoAdvanceIn((seconds) => (seconds === null ? null : Math.max(0, seconds - 1)));
        }, 1000);

        // Everyone sees the countdown, but only the host writes the next round —
        // every client firing `nextRound()` on the same doc would be a write storm.
        let timer;
        if (isHost) {
            const roundKey = `${currentRoom.id}:${currentRoom.currentRound}`;
            if (advancedRoundRef.current !== roundKey) {
                advancedRoundRef.current = roundKey;
                timer = setTimeout(() => { nextRound(); }, AUTO_ADVANCE_SECONDS * 1000);
            }
        }

        return () => {
            clearInterval(ticker);
            if (timer) clearTimeout(timer);
        };
    }, [isHost, currentRoom?.status, currentRoom?.currentRound, currentRoom?.id, nextRound]);

    /* --------------------------------------------------------------------
       Single input: figure out what the player meant while they type.
       -------------------------------------------------------------------- */

    const normalizedCommand = useMemo(() => normalizePokemonQuizInput(command), [command]);

    // A name only suggests itself once the player has typed at least half of it.
    // Without that gate the dropdown pops open over the panel while someone is
    // typing an ordinary question ("é do tipo fogo?" matches dozens of names).
    const nameSuggestions = useMemo(() => {
        if (normalizedCommand.length < MIN_AUTOCOMPLETE_CHARACTERS) return [];
        return (pokemonIndex || [])
            .filter((p) => {
                if (p.isForm) return false;
                const normalizedName = normalizePokemonQuizInput(p.name);
                if (normalizedCommand.length < Math.ceil(normalizedName.length / 2)) return false;
                return normalizedName.includes(normalizedCommand);
            })
            .slice(0, MAX_SUGGESTIONS)
            .map((p) => ({ id: p.id, displayName: toDisplayName(p.name) }));
    }, [normalizedCommand, pokemonIndex]);

    const matchedPokemon = useMemo(() => {
        if (!normalizedCommand) return null;
        return (pokemonIndex || []).find(
            (p) => !p.isForm && normalizePokemonQuizInput(p.name) === normalizedCommand
        ) || null;
    }, [normalizedCommand, pokemonIndex]);

    const parsedQuestion = useMemo(() => parseFreeTextQuestion(command), [command]);

    // A name that resolves exactly is a guess; anything the parser understands is
    // a question; everything else is not submittable yet.
    const intent = useMemo(() => {
        if (!command.trim()) return { kind: 'empty' };
        if (matchedPokemon) return { kind: 'guess', pokemon: matchedPokemon };
        if (parsedQuestion) return { kind: 'question', ...parsedQuestion };
        if (nameSuggestions.length > 0) return { kind: 'partial' };
        return { kind: 'unknown' };
    }, [command, matchedPokemon, parsedQuestion, nameSuggestions.length]);

    useEffect(() => {
        setActiveSuggestionIndex(0);
    }, [normalizedCommand]);

    // A new round is a clean slate — the previous answer no longer applies.
    useEffect(() => {
        setVerdict(null);
        setFeedback(null);
    }, [currentRoom?.currentRound, currentRoom?.status]);

    // Compare full question identity, not just the category — otherwise the first
    // "geração 2" made every other generation look already-asked.
    const askedKeys = useMemo(() => {
        const keys = new Set();
        myQuestionsLog.forEach((entry) => {
            const key = buildQuestionKey(entry.questionObj);
            if (key) keys.add(key);
        });
        return keys;
    }, [myQuestionsLog]);

    const alreadyAsked = useCallback(
        (questionObj) => askedKeys.has(buildQuestionKey(questionObj)),
        [askedKeys]
    );

    const runQuestion = useCallback(async (questionObj, label) => {
        if (alreadyAsked(questionObj)) {
            setFeedback({ tone: 'warning', message: 'Essa pergunta já foi feita nesta rodada.' });
            return;
        }
        const result = await submitQuestion(questionObj, label, favoritePokemons);
        if (result?.rejected) {
            setFeedback({ tone: 'danger', message: result.hint || 'Não foi possível responder essa pergunta.' });
            return;
        }
        setCommand('');
        setFeedback(null);
        setVerdict({ kind: 'answer', answer: Boolean(result?.answer), label });
    }, [alreadyAsked, submitQuestion, favoritePokemons]);

    const handleCommandSubmit = useCallback(async (event) => {
        event?.preventDefault?.();
        if (!isMyTurn) {
            setFeedback({ tone: 'warning', message: 'Espere a sua vez de jogar.' });
            return;
        }

        if (intent.kind === 'guess') {
            const result = await submitDirectGuess(intent.pokemon);
            if (!result?.rejected) {
                setCommand('');
                setFeedback(null);
                setVerdict({
                    kind: 'guess',
                    answer: Boolean(result?.isCorrect),
                    label: toDisplayName(intent.pokemon.name),
                });
            }
            return;
        }

        if (intent.kind === 'question') {
            await runQuestion(intent.obj, intent.label);
            return;
        }

        // Half-typed name with the dropdown open: Enter takes the highlighted
        // suggestion rather than scolding the player for not finishing the word.
        if (intent.kind === 'partial') {
            const picked = nameSuggestions[activeSuggestionIndex] || nameSuggestions[0];
            const target = (pokemonIndex || []).find((p) => p.id === picked?.id);
            if (target) {
                const result = await submitDirectGuess(target);
                if (!result?.rejected) {
                    setCommand('');
                    setFeedback(null);
                    setVerdict({
                        kind: 'guess',
                        answer: Boolean(result?.isCorrect),
                        label: toDisplayName(target.name),
                    });
                }
                return;
            }
        }

        setFeedback({
            tone: 'danger',
            message: 'Não entendi. Digite o nome de um Pokémon para palpitar, ou uma pergunta sobre atributo.',
        });
    }, [isMyTurn, intent, submitDirectGuess, runQuestion, nameSuggestions, activeSuggestionIndex, pokemonIndex]);

    const handleSelectSuggestion = useCallback((suggestionId) => {
        const found = (pokemonIndex || []).find((p) => p.id === suggestionId);
        if (!found) return;
        setCommand(toDisplayName(found.name));
        commandInputRef.current?.focus();
    }, [pokemonIndex]);

    const handleInputKeyDown = useCallback((event) => {
        if (!nameSuggestions.length) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveSuggestionIndex((index) => (index + 1) % nameSuggestions.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveSuggestionIndex((index) => (index - 1 + nameSuggestions.length) % nameSuggestions.length);
        } else if (event.key === 'Tab') {
            event.preventDefault();
            handleSelectSuggestion(nameSuggestions[activeSuggestionIndex]?.id);
        }
    }, [nameSuggestions, activeSuggestionIndex, handleSelectSuggestion]);

    /* --------------------------------------------------------------------
       Progressive reveal — only "SIM" answers add information to the card.
       -------------------------------------------------------------------- */

    const revealed = useMemo(() => {
        const info = { types: [], generation: null, stage: null, special: null, size: null };

        // Oldest first, so later answers refine earlier ones.
        [...myQuestionsLog].reverse().forEach((entry) => {
            if (!entry.answer || !entry.questionObj) return;
            const { category, value, min, max } = entry.questionObj;

            if (category === 'type' && value && !info.types.includes(value)) info.types.push(value);
            if (category === 'generation' && value) info.generation = Number(value);
            if (category === 'isSingleStage') info.stage = 'Estágio único';
            if (category === 'isBaseForm') info.stage = 'Forma base';
            if (category === 'isFinalForm') info.stage = 'Evolução final';
            if (category === 'isEvolved') info.stage = 'Já evoluiu';
            if (category === 'isBaby') info.stage = 'Bebê';
            if (category === 'isLegendary') info.special = 'Lendário';
            if (category === 'isStarter') info.special = 'Inicial';
            if (category === 'isFossil') info.special = 'Fóssil';
            if (category === 'isUserFavorite') info.special = 'Seu favorito';
            if (category === 'heightMin') info.size = `≥ ${value}m`;
            if (category === 'heightMax') info.size = `< ${value}m`;
            if (category === 'heightRange') info.size = `${min}m – ${max}m`;
            if (category === 'weightMin') info.size = `≥ ${value}kg`;
            if (category === 'weightMax') info.size = `< ${value}kg`;
        });

        return info;
    }, [myQuestionsLog]);

    const revealedCount = [
        revealed.types.length > 0,
        revealed.generation !== null,
        revealed.stage !== null,
        revealed.special !== null,
        revealed.size !== null,
    ].filter(Boolean).length;

    const availableChips = useMemo(
        () => STARTER_CHIPS.filter((chip) => !alreadyAsked(chip.obj)),
        [alreadyAsked]
    );

    /* -------------------------------------------------------------------- */

    const handleCreateRoom = async (event) => {
        event.preventDefault();
        const newCode = await createRoom({
            gameMode: selectedMode,
            genFilter: 'all',
            maxRounds: selectedMaxRounds,
        });
        if (newCode) navigate(`/pokeroom/${newCode}`);
    };

    const handleJoinRoom = async (event) => {
        event.preventDefault();
        const cleanCode = String(joinCodeInput || '').trim().toUpperCase();
        if (!cleanCode) return;
        if (await joinRoom(cleanCode)) navigate(`/pokeroom/${cleanCode}`);
    };

    const handleCopyCode = () => {
        const code = String(currentRoom?.code || currentRoom?.id || '').trim();
        if (!code) return;
        navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#/pokeroom/${code}`);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleLeaveRoom = () => {
        leaveRoom();
        navigate('/pokeroom');
    };

    /* ---------------------------- the card ---------------------------- */

    const renderSecretCard = () => (
        <div className="pokeroom__rail-card">
            <article className="pokeroom-tcg" data-revealed={isRevealed ? 'true' : 'false'}>
                <header className="pokeroom-tcg__head">
                    <span className="pokeroom-tcg__label">
                        <SparklesIcon />
                        {isOwnSecretMode ? 'Você é...' : 'Pokémon Secreto'}
                    </span>
                    <span className="pokeroom-tcg__round">
                        Rodada {currentRoom.currentRound}/{currentRoom.maxRounds}
                    </span>
                </header>

                <div className="pokeroom-tcg__art">
                    {isRevealed && secretPokemon ? (
                        <img
                            src={getPokemonArtworkSpriteUrl(secretPokemon.id)}
                            alt={toDisplayName(secretPokemon.name)}
                        />
                    ) : (
                        <div className="pokeroom-tcg__locked">
                            <PokeballIcon />
                            <span className="pokeroom-tcg__locked-text">Quem é você?</span>
                        </div>
                    )}
                </div>

                <div className="pokeroom-tcg__name">
                    {isRevealed && secretPokemon ? toDisplayName(secretPokemon.name) : '? ? ?'}
                </div>

                <div className="pokeroom-tcg__progress-row">
                    <span>{revealedCount}/5</span>
                    <span className="pokeroom-tcg__progress">
                        <span
                            className="pokeroom-tcg__progress-fill"
                            style={{ width: `${(revealedCount / 5) * 100}%` }}
                        />
                    </span>
                </div>

                <div className="pokeroom-tcg__slots">
                    <CardSlot
                        icon={<Flame />}
                        label="Tipagem"
                        wide
                        value={revealed.types.length ? (
                            <>
                                {revealed.types.map((type) => (
                                    <RevealedType
                                        key={type}
                                        type={type}
                                        label={t(`types.${type}`, { defaultValue: type }).toUpperCase()}
                                    />
                                ))}
                            </>
                        ) : null}
                    />

                    <CardSlot
                        icon={<Dna />}
                        label="Geração"
                        value={revealed.generation ? `Gen ${revealed.generation}` : null}
                    />

                    <CardSlot icon={<Layers />} label="Estágio" value={revealed.stage} />
                    <CardSlot icon={<Ruler />} label="Porte" value={revealed.size} />
                    <CardSlot icon={<Crown />} label="Especial" value={revealed.special} />
                </div>

                <footer className="pokeroom-tcg__foot">
                    <span>
                        {isRevealed && secretPokemon?.id
                            ? `#${String(secretPokemon.id).padStart(3, '0')}`
                            : '#???'}
                    </span>
                    <span className="pokeroom-tcg__rarity">★ Secret</span>
                </footer>
            </article>

            <div className="pokeroom__card-caption">
                <PokeballIcon />
                {modeName(currentRoom.gameMode)}
            </div>
        </div>
    );

    /* ---------------------------- render ---------------------------- */

    return (
        <div className="pokeroom">
            {/* Themed background art. Decorative only: aria-hidden and click-through. */}
            <div className="pokeroom__decor" aria-hidden="true">
                {DECOR_SPRITES.map((sprite) => (
                    <img
                        key={sprite.id}
                        src={getPokemonArtworkSpriteUrl(sprite.id)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className={`pokeroom__decor-sprite ${sprite.className}`}
                    />
                ))}
            </div>

            {/* One row for everything: mode title, room code, standings, actions.
                Inside a room the mode *is* the title — PokéRoom is the page, and
                repeating it alongside the mode chip was pure noise. */}
            <header className="pokeroom__header" data-in-room={currentRoom ? 'true' : 'false'}>
                <div className="pokeroom__title-group">
                    <span className="pokeroom__title-icon">
                        <SparklesIcon />
                    </span>
                    <div>
                        <h1 className="pokeroom__title">
                            {currentRoom ? modeName(currentRoom.gameMode) : 'PokéRoom'}
                            {!currentRoom && <span className="pokeroom__badge">Multiplayer</span>}
                        </h1>
                        {!currentRoom && (
                            <p className="pokeroom__subtitle">
                                Adivinhe o Pokémon secreto em salas em tempo real com seus amigos.
                            </p>
                        )}
                    </div>
                </div>

                {currentRoom && (
                    <>
                        <button
                            type="button"
                            onClick={handleCopyCode}
                            className="pokeroom__code-pill"
                            data-copied={copiedCode ? 'true' : 'false'}
                            title={copiedCode ? 'Link copiado!' : 'Clique para copiar o link da sala'}
                            aria-label={`Copiar o link da sala ${currentRoom.id}`}
                        >
                            <span className="pokeroom__code-pill-value">{currentRoom.id}</span>
                            <span className="pokeroom__code-pill-icon">
                                {copiedCode ? <Check /> : <ClipIcon />}
                            </span>
                        </button>

                        <div className="pokeroom__scoreboard pokeroom__scoreboard--bar">
                            {(currentRoom.players || []).map((player, index) => (
                                <div
                                    key={player.userId}
                                    className="pokeroom__score-pill"
                                    data-active={
                                        currentRoom.status === 'playing' && index === currentRoom.currentTurnIndex
                                            ? 'true'
                                            : 'false'
                                    }
                                    title={
                                        player.userId === currentRoom.hostId
                                            ? `${player.displayName} (anfitrião)`
                                            : player.displayName
                                    }
                                >
                                    <span className="pokeroom__score-avatar">
                                        <AvatarSprite
                                            trainerSprite={player.avatar?.trainerSprite}
                                            pokemonId={player.avatar?.pokemonId}
                                            isShiny={player.avatar?.isShiny}
                                            fallback={<PokeballIcon />}
                                        />
                                    </span>
                                    <span className="pokeroom__score-meta">
                                        <span className="pokeroom__score-name">
                                            {player.displayName}
                                            {player.userId === authUserId && (
                                                <span className="pokeroom__score-you">você</span>
                                            )}
                                        </span>
                                        <span className="pokeroom__score-pts">{player.score || 0}</span>
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="pokeroom__bar-actions">
                            <button
                                type="button"
                                onClick={() => setShowInviteModal(true)}
                                className="btn btn-primary"
                            >
                                <Users />
                                Convidar
                            </button>
                            <button
                                type="button"
                                onClick={handleLeaveRoom}
                                className="pokeroom__icon-btn"
                                title="Sair da sala"
                                aria-label="Sair da sala"
                            >
                                <LogOut />
                            </button>
                        </div>
                    </>
                )}
            </header>

            {/* Direct link to a room we have not received yet */}
            {roomId && !currentRoom && (
                <div className="pokeroom__panel">
                    <div className="pokeroom__result">
                        <span className="pokeroom__spinner" />
                        <h2 className="pokeroom__result-title">Conectando à sala {roomId}…</h2>
                        <p className="pokeroom__hint">
                            Se a sala já foi encerrada, volte ao lobby e crie uma nova.
                        </p>
                        <button type="button" onClick={() => navigate('/pokeroom')} className="btn btn-outline">
                            Voltar ao lobby
                        </button>
                    </div>
                </div>
            )}

            {/* Lobby: create or join */}
            {!roomId && !currentRoom && (
                <>
                    <div className="pokeroom__lobby-grid">
                        <section className="pokeroom__panel">
                            <h2 className="pokeroom__panel-title">
                                <SparklesIcon />
                                Criar nova sala
                            </h2>
                            <form onSubmit={handleCreateRoom} className="pokeroom__form">
                                <div>
                                    <span className="pokeroom__field-label">Modo de jogo</span>
                                    <div className="pokeroom__option-grid">
                                        <button
                                            type="button"
                                            aria-pressed={selectedMode === 'secret-pokemon'}
                                            onClick={() => setSelectedMode('secret-pokemon')}
                                            className="pokeroom__option"
                                        >
                                            <span className="pokeroom__option-head">
                                                <PokeballIcon />
                                                {selectedMode === 'secret-pokemon' && <Check />}
                                            </span>
                                            <span className="pokeroom__option-title">
                                                {GAME_MODES['secret-pokemon'].name}
                                            </span>
                                            <span className="pokeroom__option-desc">
                                                {GAME_MODES['secret-pokemon'].desc}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Segmented control: three short options do not need
                                    three cards, and this reads as one decision. */}
                                <div>
                                    <span className="pokeroom__field-label">Número de rodadas</span>
                                    <div className="pokeroom__segmented" role="group" aria-label="Número de rodadas">
                                        {[
                                            { rounds: 3, desc: 'Rápida' },
                                            { rounds: 5, desc: 'Padrão' },
                                            { rounds: 10, desc: 'Longa' },
                                        ].map(({ rounds, desc }) => (
                                            <button
                                                key={rounds}
                                                type="button"
                                                aria-pressed={selectedMaxRounds === rounds}
                                                onClick={() => setSelectedMaxRounds(rounds)}
                                                className="pokeroom__segment"
                                            >
                                                <strong>{rounds}</strong>
                                                <span>{desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pokeroom__form-footer">
                                    {/* Live echo of the two choices, so the button is never a leap */}
                                    <p className="pokeroom__summary">
                                        <Sparkles />
                                        <span>
                                            <strong>{GAME_MODES[selectedMode].name}</strong>
                                            {' · '}
                                            {selectedMaxRounds} rodadas
                                        </span>
                                    </p>
                                    <button type="submit" className="btn btn-primary pokeroom__btn-block">
                                        <Play />
                                        Criar sala
                                    </button>
                                </div>
                            </form>
                        </section>

                        <section className="pokeroom__panel pokeroom__panel--join">
                            <h2 className="pokeroom__panel-title">
                                <SwordsIcon />
                                Entrar com código
                            </h2>
                            <form onSubmit={handleJoinRoom} className="pokeroom__form">
                                <div>
                                    <span className="pokeroom__field-label">Código da sala</span>
                                    <div className="pokeroom__join-row">
                                        <input
                                            type="text"
                                            className="input-clean pokeroom__code-input"
                                            placeholder="PKMN-XXXX"
                                            value={joinCodeInput}
                                            onChange={(event) => setJoinCodeInput(event.target.value)}
                                            maxLength={9}
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={!joinCodeInput.trim()}
                                        >
                                            Entrar
                                        </button>
                                    </div>
                                </div>
                                <p className="pokeroom__hint">
                                    Peça o código a quem criou a sala, ou aceite um convite pela notificação.
                                </p>
                            </form>
                        </section>
                    </div>

                    <div className="pokeroom__steps">
                        <div className="pokeroom__step">
                            <span className="pokeroom__step-num">1</span>
                            <span className="pokeroom__step-text">
                                <strong>Crie e convide</strong>
                                Compartilhe o código com seus amigos.
                            </span>
                        </div>
                        <div className="pokeroom__step">
                            <span className="pokeroom__step-num">2</span>
                            <span className="pokeroom__step-text">
                                <strong>Pergunte no seu turno</strong>
                                Tipo, geração, porte, evolução — tudo em texto livre.
                            </span>
                        </div>
                        <div className="pokeroom__step">
                            <span className="pokeroom__step-num">3</span>
                            <span className="pokeroom__step-text">
                                <strong>Arrisque o palpite</strong>
                                Digite o nome do Pokémon e ganhe 100 pontos.
                            </span>
                        </div>
                    </div>
                </>
            )}

            {currentRoom && (
                <>
                    {/* Waiting room. The header above already lists every player, so
                        this panel only carries the one decision left to make. */}
                    {currentRoom.status === 'lobby' && (
                        <section className="pokeroom__panel">
                            <div className="pokeroom__result">
                                <span className="pokeroom__result-icon"><Users /></span>
                                <h2 className="pokeroom__result-title">
                                    {(currentRoom.players?.length || 0) > 1
                                        ? `${currentRoom.players.length} treinadores na sala`
                                        : 'Esperando treinadores'}
                                </h2>
                                <p className="pokeroom__hint">
                                    {modeName(currentRoom.gameMode)} · {GAME_MODES[currentRoom.gameMode]?.desc}
                                    <br />
                                    {(currentRoom.players?.length || 0) > 1
                                        ? 'Todos prontos — pode começar.'
                                        : 'Convide amigos ou compartilhe o código acima.'}
                                </p>
                                {isHost ? (
                                    <button type="button" onClick={startGame} className="btn btn-primary">
                                        <Play />
                                        Iniciar rodada {currentRoom.currentRound} de {currentRoom.maxRounds}
                                    </button>
                                ) : (
                                    <span className="pokeroom__countdown">
                                        <span className="pokeroom__countdown-dot" />
                                        Aguardando o anfitrião iniciar
                                    </span>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Arena */}
                    {(currentRoom.status === 'playing' || isRevealed) && (
                        <div className="pokeroom__arena">
                            {renderSecretCard()}

                            <div className="pokeroom__rail-main">
                                {isRevealed ? (
                                    <>
                                        <section className="pokeroom__panel">
                                            <div className="pokeroom__result">
                                                <span className="pokeroom__result-icon"><PartyPopper /></span>
                                                <h2 className="pokeroom__result-title">
                                                    {currentRoom.status === 'ended' ? 'Fim de jogo!' : 'Rodada concluída!'}
                                                </h2>
                                                <p className="pokeroom__hint">
                                                    {currentRoom.winnerId
                                                        ? `${(currentRoom.players || []).find((p) => p.userId === currentRoom.winnerId)?.displayName || 'Alguém'} acertou o Pokémon secreto.`
                                                        : 'Ninguém acertou esta rodada.'}
                                                </p>

                                                {currentRoom.status === 'roundResult' && (
                                                    <span className="pokeroom__countdown">
                                                        <span className="pokeroom__countdown-dot" />
                                                        Próxima rodada em {autoAdvanceIn ?? AUTO_ADVANCE_SECONDS}s
                                                    </span>
                                                )}

                                                {isHost && (
                                                    <button type="button" onClick={nextRound} className="btn btn-primary">
                                                        {currentRoom.status === 'ended' ? 'Reiniciar jogo' : 'Avançar agora'}
                                                    </button>
                                                )}
                                            </div>
                                        </section>
                                    </>
                                ) : (
                                    <>
                                        <div className="pokeroom__turn" data-mine={isMyTurn ? 'true' : 'false'}>
                                            <span className="pokeroom__turn-dot" />
                                            <span className="pokeroom__turn-text">
                                                {isMyTurn ? (
                                                    <>
                                                        <strong>É o seu turno.</strong>
                                                        <span className="pokeroom__turn-sub">
                                                            Faça uma pergunta ou arrisque o nome do Pokémon.
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <strong>Vez de {turnPlayerName}.</strong>
                                                        <span className="pokeroom__turn-sub">
                                                            Acompanhe o histórico enquanto espera.
                                                        </span>
                                                    </>
                                                )}
                                            </span>
                                        </div>


                                        {/* The one console input */}
                                        <section className="pokeroom__panel">
                                            <h2 className="pokeroom__panel-title">
                                                <MessageSquare />
                                                Pergunte ou palpite
                                            </h2>

                                            <form onSubmit={handleCommandSubmit} className="pokeroom__console-row">
                                                <PokemonGenerationQuizAutocomplete
                                                    value={command}
                                                    onChange={(next) => { setCommand(next); setFeedback(null); }}
                                                    onKeyDown={handleInputKeyDown}
                                                    suggestions={nameSuggestions}
                                                    activeIndex={activeSuggestionIndex}
                                                    onSelectSuggestion={handleSelectSuggestion}
                                                    disabled={!isMyTurn}
                                                    inputRef={commandInputRef}
                                                    placeholder="Ex: “é do tipo fogo?”, “maior que 1m?” ou “Charizard”"
                                                    minCharacters={MIN_AUTOCOMPLETE_CHARACTERS}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!isMyTurn || intent.kind === 'empty'}
                                                    className="btn btn-primary pokeroom__console-btn"
                                                >
                                                    <Send />
                                                    {intent.kind === 'guess' ? 'Palpitar' : 'Perguntar'}
                                                </button>
                                            </form>

                                            <div className="pokeroom__intent" data-kind={intent.kind}>
                                                {intent.kind === 'guess' && (
                                                    <>
                                                        <PokeballIcon />
                                                        <span>Palpite direto: <strong>{toDisplayName(intent.pokemon.name)}</strong> · Gen {resolvePokemonGenerationNumber(intent.pokemon)}</span>
                                                    </>
                                                )}
                                                {intent.kind === 'question' && (
                                                    <>
                                                        <HelpCircle />
                                                        <span>Pergunta: <strong>{intent.label}</strong></span>
                                                    </>
                                                )}
                                                {intent.kind === 'partial' && (
                                                    <>
                                                        <PokeballIcon />
                                                        <span>
                                                            Enter para palpitar{' '}
                                                            <strong>
                                                                {(nameSuggestions[activeSuggestionIndex] || nameSuggestions[0])?.displayName}
                                                            </strong>
                                                            {' '}· ↑↓ para trocar
                                                        </span>
                                                    </>
                                                )}
                                                {intent.kind === 'unknown' && (
                                                    <>
                                                        <HelpCircle />
                                                        <span>Não reconhecido. Tente “{QUESTION_EXAMPLES[0]}” ou um nome de Pokémon.</span>
                                                    </>
                                                )}
                                                {intent.kind === 'empty' && (
                                                    <>
                                                        <HelpCircle />
                                                        <span>Um campo só: escreva uma pergunta ou o nome do Pokémon.</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* The answer to what was just asked — big and centred,
                                                because it is the whole point of the turn. */}
                                            {verdict && (
                                                <div
                                                    className="pokeroom__verdict"
                                                    data-answer={verdict.answer ? 'yes' : 'no'}
                                                    role="status"
                                                    aria-live="polite"
                                                >
                                                    <span className="pokeroom__verdict-question">{verdict.label}</span>
                                                    <strong className="pokeroom__verdict-answer">
                                                        {verdict.kind === 'guess' && verdict.answer
                                                            ? 'ACERTOU!'
                                                            : (verdict.answer ? 'SIM' : 'NÃO')}
                                                    </strong>
                                                </div>
                                            )}

                                            {feedback && (
                                                <p className={`generation-quiz__feedback generation-quiz__feedback--${feedback.tone}`}>
                                                    {feedback.message}
                                                </p>
                                            )}

                                            {availableChips.length > 0 && (
                                                <>
                                                    <div className="pokeroom__divider" />
                                                    <div>
                                                        <span className="pokeroom__field-label">Perguntas rápidas</span>
                                                        <div className="pokeroom__chips">
                                                            {availableChips.map((chip) => {
                                                                const ChipIcon = chip.Icon;
                                                                return (
                                                                    <button
                                                                        key={chip.label}
                                                                        type="button"
                                                                        disabled={!isMyTurn}
                                                                        onClick={() => runQuestion(chip.obj, chip.labelFull || chip.label)}
                                                                        className="pokeroom__chip"
                                                                    >
                                                                        <ChipIcon />
                                                                        <span>{chip.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </section>
                                    </>
                                )}
                            </div>

                            {/* Dedicated log column — nothing but the running history */}
                            <div className="pokeroom__rail-log">
                                <section className="pokeroom__panel pokeroom__panel--tight pokeroom__log-panel">
                                    <h2 className="pokeroom__panel-title">
                                        <MessageSquare />
                                        Histórico
                                        <span className="pokeroom__panel-count">
                                            {(currentRoom.questionsLog || []).length}
                                        </span>
                                    </h2>

                                    {(currentRoom.questionsLog || []).length === 0 ? (
                                        <div className="pokeroom__empty">
                                            <HelpCircle />
                                            <p className="pokeroom__empty-text">
                                                Nenhuma pergunta ainda. Comece por um tipo — costuma eliminar
                                                mais candidatos de uma vez.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="pokeroom__feed">
                                            {(currentRoom.questionsLog || []).map((entry) => (
                                                <div key={entry.id} className="pokeroom__feed-item">
                                                    <div className="pokeroom__feed-body">
                                                        <div className="pokeroom__feed-who">{entry.userName}</div>
                                                        <div className="pokeroom__feed-what">{entry.questionLabel}</div>
                                                    </div>
                                                    {entry.isDirectGuess ? (
                                                        <span
                                                            className="pokeroom__feed-badge"
                                                            data-tone={entry.isCorrect ? 'hit' : 'no'}
                                                        >
                                                            {entry.isCorrect ? 'Acertou' : 'Errou'}
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="pokeroom__feed-badge"
                                                            data-tone={entry.answer ? 'yes' : 'no'}
                                                        >
                                                            {entry.answer ? 'Sim' : 'Não'}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Invite modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="pokeroom__panel-title">
                                <Users />
                                Convidar amigos
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowInviteModal(false)}
                                className="btn btn-ghost"
                                aria-label="Fechar"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {friends.length === 0 ? (
                            <p className="pokeroom__hint">
                                Você ainda não tem amigos na lista. Adicione treinadores no seu perfil para
                                convidá-los direto para a sala.
                            </p>
                        ) : (
                            <div className="pokeroom__score-list max-h-60 overflow-y-auto">
                                {friends.map((friend) => (
                                    <div key={friend.userId} className="pokeroom__player">
                                        <span className="pokeroom__player-avatar">
                                            <AvatarSprite
                                                trainerSprite={friend.trainerSprite}
                                                pokemonId={friend.avatarPokemonId}
                                                isShiny={friend.avatarIsShiny}
                                                fallback={<PokeballIcon />}
                                            />
                                        </span>
                                        <span className="pokeroom__player-meta">
                                            <span className="pokeroom__player-name">
                                                {friend.displayName || t('friends.unknownTrainer')}
                                            </span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => inviteFriendToRoom(friend.userId)}
                                            className="btn btn-primary"
                                        >
                                            Convidar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            className="btn btn-outline pokeroom__btn-block"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
