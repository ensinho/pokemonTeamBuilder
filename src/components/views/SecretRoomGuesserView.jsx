import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSecretRoom } from '../../hooks/useSecretRoom';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { PokemonGenerationQuizAutocomplete } from '../PokemonGenerationQuizAutocomplete';
import { AvatarSprite } from '../AvatarSprite';
import { parseFreeTextQuestion } from '../../utils/pokemonQuestionEvaluator';
import {
    SwordsIcon, PokeballIcon, SparklesIcon, ClipIcon, CloseIcon,
    AccountIcon, TrophyIcon, SuccessToastIcon
} from '../icons';
import { Shield, Eye, EyeOff, Users, Play, Send, Check } from 'lucide-react';
import '../../styles/secret-room-guesser.css';

export function SecretRoomGuesserView() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { t, language } = useTranslation();

    useDocumentMeta({ title: 'PokéRoom - Multiplayer Guesser' });

    const {
        currentRoom,
        isLoadingRoom,
        stealthMode,
        toggleStealthMode,
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

    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [selectedMode, setSelectedMode] = useState('secret-pokemon');
    const [selectedGenFilter, setSelectedGenFilter] = useState('all');
    const [selectedMaxRounds, setSelectedMaxRounds] = useState(5);
    const [copiedCode, setCopiedCode] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [directGuessPokemon, setDirectGuessPokemon] = useState(null);
    const [freeTextQuestion, setFreeTextQuestion] = useState('');

    const handleFreeTextQuestionSubmit = (e) => {
        e.preventDefault();
        if (!freeTextQuestion.trim()) return;
        const parsed = parseFreeTextQuestion(freeTextQuestion);
        if (parsed) {
            submitQuestion(parsed.obj, parsed.label, favoritePokemons);
            setFreeTextQuestion('');
        } else {
            submitQuestion({ category: 'custom', value: freeTextQuestion }, `Pergunta: "${freeTextQuestion}"`, favoritePokemons);
            setFreeTextQuestion('');
        }
    };

    // Keyboard shortcut Alt + S for Stealth Mode
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                toggleStealthMode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleStealthMode]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        const newCode = await createRoom({
            gameMode: selectedMode,
            genFilter: selectedGenFilter,
            maxRounds: selectedMaxRounds,
        });
        if (newCode) {
            navigate(`/pokeroom/${newCode}`);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        const ok = await joinRoom(joinCodeInput);
        if (ok) {
            navigate(`/pokeroom/${joinCodeInput.trim().toUpperCase()}`);
        }
    };

    const handleCopyCode = () => {
        if (!currentRoom) return;
        navigator.clipboard.writeText(currentRoom.code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const isMyTurn = useMemo(() => {
        if (!currentRoom || !currentRoom.players) return false;
        const currentTurnPlayer = currentRoom.players[currentRoom.currentTurnIndex];
        return currentTurnPlayer?.userId === currentRoom.hostId;
    }, [currentRoom]);

    // Categorized question options
    const questionCategories = [
        {
            title: '🔥 Tipos & Elementos',
            questions: [
                { label: 'É do Tipo Fogo?', obj: { category: 'type', value: 'fire' } },
                { label: 'É do Tipo Água?', obj: { category: 'type', value: 'water' } },
                { label: 'É do Tipo Planta?', obj: { category: 'type', value: 'grass' } },
                { label: 'É do Tipo Elétrico?', obj: { category: 'type', value: 'electric' } },
                { label: 'É do Tipo Dragão?', obj: { category: 'type', value: 'dragon' } },
                { label: 'É do Tipo Fantasma / Psíquico?', obj: { category: 'type', value: 'ghost' } },
                { label: 'Possui 2 Tipos (Dual Type)?', obj: { category: 'isDualType' } },
            ],
        },
        {
            title: '🗺️ Geração & Região',
            questions: [
                { label: 'É da Geração 1 (Kanto)?', obj: { category: 'generation', value: 1 } },
                { label: 'É da Geração 2 (Johto)?', obj: { category: 'generation', value: 2 } },
                { label: 'É da Geração 3 (Hoenn)?', obj: { category: 'generation', value: 3 } },
                { label: 'Foi introduzido ANTES da Gen 4?', obj: { category: 'genBefore', value: 4 } },
                { label: 'Foi introduzido DEPOIS da Gen 5?', obj: { category: 'genAfter', value: 5 } },
            ],
        },
        {
            title: '🥚 Linha Evolutiva',
            questions: [
                { label: 'É a Forma Base (1º estágio)?', obj: { category: 'isBaseForm' } },
                { label: 'É a Evolução Final?', obj: { category: 'isFinalForm' } },
                { label: 'É um Pokémon Bebê?', obj: { category: 'isBaby' } },
                { label: 'Não possui evolução (Estágio Único)?', obj: { category: 'isSingleStage' } },
            ],
        },
        {
            title: '🌟 Conceitos Reais & Especiais',
            questions: [
                { label: 'É Lendário ou Mítico?', obj: { category: 'isLegendary' } },
                { label: 'É um Pokémon Inicial (Starter)?', obj: { category: 'isStarter' } },
                { label: 'É um Pikaclone?', obj: { category: 'isPikaclone' } },
                { label: 'Se parece com um Animal Real?', obj: { category: 'isRealAnimal' } },
                { label: 'É baseado em Comida / Culinária?', obj: { category: 'isFoodBased' } },
                { label: 'É baseado em Objeto / Utensílio?', obj: { category: 'isObjectBased' } },
                { label: 'É um Fóssil Pré-histórico?', obj: { category: 'isFossil' } },
            ],
        },
        {
            title: '📊 Dimensões & Status',
            questions: [
                { label: 'Total de Status Base (BST) > 500?', obj: { category: 'bstMin', value: 500 } },
                { label: 'O melhor status é Velocidade?', obj: { category: 'topStatSpeed' } },
            ],
        },
        {
            title: '❤️ Favoritos & Pessoal',
            questions: [
                { label: 'Está na minha lista de Pokémon Favoritos?', obj: { category: 'isUserFavorite' } },
            ],
        },
    ];

    const favoritePokemons = useFirestoreTeamsStore((state) => state.favoritePokemons);

    const handleSendQuestion = (question) => {
        submitQuestion(question.obj, question.label, favoritePokemons);
    };

    const handleDirectGuessSubmit = (e) => {
        e.preventDefault();
        if (directGuessPokemon) {
            submitDirectGuess(directGuessPokemon);
            setDirectGuessPokemon(null);
        }
    };

    return (
        <div className={`pokeroom-container ${stealthMode ? 'stealth-mode' : ''}`}>
            {/* Header Controls Bar */}
            <div className="pokeroom-header">
                <div className="pokeroom-title-group">
                    <SwordsIcon className="w-6 h-6 text-primary" />
                    <h1>PokéRoom</h1>
                    <span className="pokeroom-badge-new">Multiplayer</span>
                </div>
                <div className="pokeroom-actions">
                    <button
                        type="button"
                        onClick={toggleStealthMode}
                        className={`btn-stealth-toggle ${stealthMode ? 'active' : ''}`}
                        title="Alternar Modo Sutil (Atalho: Alt + S)"
                    >
                        {stealthMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{stealthMode ? 'Modo Padrão' : 'Modo Sutil (Alt+S)'}</span>
                    </button>
                    {currentRoom && (
                        <button
                            type="button"
                            onClick={() => {
                                leaveRoom();
                                navigate('/pokeroom');
                            }}
                            className="btn btn-ghost text-xs font-semibold"
                        >
                            Sair da Sala
                        </button>
                    )}
                </div>
            </div>

            {/* No Room Joined -> Lobby Creation / Entrance */}
            {!currentRoom && (
                <div className="pokeroom-lobby-grid">
                    {/* Create Room Card */}
                    <div className="pokeroom-card space-y-4">
                        <h2>
                            <SparklesIcon className="w-5 h-5 text-primary" />
                            Criar Nova Sala
                        </h2>
                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            {/* Mode Cards Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                                    Modo de Jogo:
                                </label>
                                <div className="card-selector-grid">
                                    <div
                                        onClick={() => setSelectedMode('secret-pokemon')}
                                        className={`option-card ${selectedMode === 'secret-pokemon' ? 'selected' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <PokeballIcon className="w-4 h-4 text-primary" />
                                            {selectedMode === 'secret-pokemon' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                        </div>
                                        <div className="option-card-title">Secret Pokémon</div>
                                        <div className="option-card-desc">1 Segredo Coletivo para a Sala</div>
                                    </div>

                                    <div
                                        onClick={() => setSelectedMode('quem-sou-eu')}
                                        className={`option-card ${selectedMode === 'quem-sou-eu' ? 'selected' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <AccountIcon className="w-4 h-4 text-primary" />
                                            {selectedMode === 'quem-sou-eu' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                        </div>
                                        <div className="option-card-title">Quem Sou Eu?</div>
                                        <div className="option-card-desc">1 Segredo por Jogador</div>
                                    </div>
                                </div>
                            </div>

                            {/* Gen Filter Cards Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                                    Filtro de Gerações:
                                </label>
                                <div className="card-selector-grid">
                                    <div
                                        onClick={() => setSelectedGenFilter('all')}
                                        className={`option-card ${selectedGenFilter === 'all' ? 'selected' : ''}`}
                                    >
                                        <div className="option-card-title">Gens 1 ao 9</div>
                                        <div className="option-card-desc">Todas as Gerações</div>
                                    </div>
                                    <div
                                        onClick={() => setSelectedGenFilter('gen1-3')}
                                        className={`option-card ${selectedGenFilter === 'gen1-3' ? 'selected' : ''}`}
                                    >
                                        <div className="option-card-title">Gens 1 a 3</div>
                                        <div className="option-card-desc">Kanto, Johto, Hoenn</div>
                                    </div>
                                    <div
                                        onClick={() => setSelectedGenFilter('gen1-5')}
                                        className={`option-card ${selectedGenFilter === 'gen1-5' ? 'selected' : ''}`}
                                    >
                                        <div className="option-card-title">Gens 1 a 5</div>
                                        <div className="option-card-desc">Até Unova</div>
                                    </div>
                                </div>
                            </div>

                            {/* Max Rounds Cards Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                                    Número de Rodadas:
                                </label>
                                <div className="card-selector-grid">
                                    <div
                                        onClick={() => setSelectedMaxRounds(3)}
                                        className={`option-card ${selectedMaxRounds === 3 ? 'selected' : ''}`}
                                    >
                                        <div className="option-card-title">3 Rodadas</div>
                                        <div className="option-card-desc">Partida Rápida</div>
                                    </div>
                                    <div
                                        onClick={() => setSelectedMaxRounds(5)}
                                        className={`option-card ${selectedMaxRounds === 5 ? 'selected' : ''}`}
                                    >
                                        <div className="option-card-title">5 Rodadas</div>
                                        <div className="option-card-desc">Padrão</div>
                                    </div>
                                    <div
                                        onClick={() => setSelectedMaxRounds(10)}
                                        className={`option-card ${selectedMaxRounds === 10 ? 'selected' : ''}`}
                                    >
                                        <div className="option-card-title">10 Rodadas</div>
                                        <div className="option-card-desc">Longa Duração</div>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full btn btn-primary font-semibold text-xs py-3 rounded-xl shadow-md">
                                Criar Sala Multiplayer
                            </button>
                        </form>
                    </div>

                    {/* Join Room Card */}
                    <div className="pokeroom-card space-y-4">
                        <h2>
                            <SwordsIcon className="w-5 h-5 text-primary" />
                            Entrar com Código
                        </h2>
                        <form onSubmit={handleJoinRoom} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                                    Código da Sala:
                                </label>
                                <input
                                    type="text"
                                    className="input-clean font-semibold w-full text-sm"
                                    placeholder="PKMN-XXXX"
                                    value={joinCodeInput}
                                    onChange={(e) => setJoinCodeInput(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full btn btn-primary font-semibold text-xs py-3 rounded-xl shadow-md" style={{ marginTop: '3.5rem' }}>
                                Entrar na Sala
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Joined Room -> Game Lobby / Arena */}
            {currentRoom && (
                <div>
                    {/* Connected Bar */}
                    <div className="pokeroom-connected-header">
                        <div className="pokeroom-code-box">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted">Código:</span>
                            <span className="pokeroom-code-value">{currentRoom.id}</span>
                            <button type="button" onClick={handleCopyCode} className="btn btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <ClipIcon className="w-4 h-4 text-primary" />}
                                {copiedCode ? 'Copiado!' : 'Copiar Link'}
                            </button>
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowInviteModal(true)}
                                className="btn btn-primary text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-2"
                            >
                                <Users className="w-4 h-4" />
                                Convidar Amigos
                            </button>
                        </div>
                    </div>

                    {/* LOBBY STATUS */}
                    {currentRoom.status === 'lobby' && (
                        <div className="pokeroom-card space-y-4">
                            <h2>Jogadores Conectados na Sala ({currentRoom.players?.length || 0})</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-4">
                                {(currentRoom.players || []).map((player) => (
                                    <div
                                        key={player.userId}
                                        className="flex items-center gap-3 p-3 bg-surface-raised border border-border rounded-xl"
                                    >
                                        <AvatarSprite
                                            trainerSprite={player.avatar?.trainerSprite}
                                            pokemonId={player.avatar?.pokemonId}
                                            isShiny={player.avatar?.isShiny}
                                            className="w-10 h-10 object-contain"
                                            fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-40" />}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-bold text-fg truncate">{player.displayName}</div>
                                            <div className="text-xs text-primary font-semibold">Pontos: {player.score || 0}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {currentRoom.hostId === currentRoom.players?.[0]?.userId && (
                                <button
                                    type="button"
                                    onClick={startGame}
                                    className="w-full btn btn-primary font-semibold text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
                                >
                                    <Play className="w-4 h-4" />
                                    Iniciar Rodada {currentRoom.currentRound} de {currentRoom.maxRounds}
                                </button>
                            )}
                        </div>
                    )}

                    {/* PLAYING STATUS */}
                    {currentRoom.status === 'playing' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Panel: Question Builder & Direct Guess */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Turn Banner */}
                                <div className={`turn-banner ${isMyTurn ? 'my-turn' : 'other-turn'}`}>
                                    {isMyTurn
                                        ? '🎯 É O SEU TURNO! Faça uma pergunta de atributo ou arrisque um palpite.'
                                        : `Aguardando a jogada de ${currentRoom.players?.[currentRoom.currentTurnIndex]?.displayName || 'outro jogador'}...`}
                                </div>

                                {/* Direct Guess Input */}
                                <div className="pokeroom-card space-y-2">
                                    <h3 className="text-sm font-bold text-fg">Arriscar Palpite Direto de Pokémon:</h3>
                                    <form onSubmit={handleDirectGuessSubmit} className="flex gap-2">
                                        <div className="flex-1">
                                            <PokemonGenerationQuizAutocomplete
                                                onSelect={(p) => setDirectGuessPokemon(p)}
                                                placeholder="Digite o nome do Pokémon (ex: Charizard)..."
                                                disabled={!isMyTurn}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!isMyTurn || !directGuessPokemon}
                                            className="btn btn-primary font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md"
                                        >
                                            <Send className="w-4 h-4 inline mr-1" /> Palpitar
                                        </button>
                                    </form>
                                </div>

                                {/* Question Category Chips & Free Text */}
                                <div className="pokeroom-card space-y-4">
                                    <h3 className="text-sm font-bold text-fg">Fazer Pergunta (Texto Livre ou Chips):</h3>
                                    <form onSubmit={handleFreeTextQuestionSubmit} className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            className="input-clean font-semibold flex-1 text-xs"
                                            placeholder="Digite sua pergunta livre (ex: 'É do tipo fogo?', 'É favorito?')..."
                                            value={freeTextQuestion}
                                            onChange={(e) => setFreeTextQuestion(e.target.value)}
                                            disabled={!isMyTurn}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!isMyTurn || !freeTextQuestion.trim()}
                                            className="btn btn-secondary text-xs font-semibold px-4 py-2 rounded-xl"
                                        >
                                            Perguntar
                                        </button>
                                    </form>
                                    {questionCategories.map((cat) => (
                                        <div key={cat.title}>
                                            <div className="question-category-title">{cat.title}</div>
                                            <div className="chips-wrapper">
                                                {cat.questions.map((q) => (
                                                    <button
                                                        key={q.label}
                                                        type="button"
                                                        disabled={!isMyTurn}
                                                        onClick={() => handleSendQuestion(q)}
                                                        className="chip-question"
                                                    >
                                                        {q.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Panel: Feed Timeline & Scoreboard */}
                            <div className="space-y-6">
                                {/* Scoreboard */}
                                <div className="pokeroom-card space-y-3">
                                    <h2>
                                        <TrophyIcon className="w-5 h-5 text-primary" />
                                        Placar ao Vivo
                                    </h2>
                                    <div className="space-y-2">
                                        {(currentRoom.players || []).map((p, idx) => (
                                            <div
                                                key={p.userId}
                                                className={`flex justify-between items-center p-2.5 rounded-xl border ${
                                                    idx === currentRoom.currentTurnIndex
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-border bg-surface-raised'
                                                }`}
                                            >
                                                <span className="text-xs font-bold text-fg">{p.displayName}</span>
                                                <span className="text-xs font-extrabold text-primary">{p.score || 0} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Questions Log Feed */}
                                <div className="pokeroom-card space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Histórico de Perguntas</h3>
                                    <div className="questions-feed">
                                        {(currentRoom.questionsLog || []).map((log) => (
                                            <div key={log.id} className="feed-item">
                                                <div>
                                                    <div className="text-[10px] font-bold text-muted uppercase">{log.userName}</div>
                                                    <div className="text-xs font-bold text-fg">{log.questionLabel}</div>
                                                </div>
                                                <div>
                                                    {log.isDirectGuess ? (
                                                        <span className={`feed-badge ${log.isCorrect ? 'correct' : 'no'}`}>
                                                            {log.isCorrect ? 'ACERTOU!' : 'ERROU'}
                                                        </span>
                                                    ) : (
                                                        <span className={`feed-badge ${log.answer ? 'yes' : 'no'}`}>
                                                            {log.answer ? 'SIM' : 'NÃO'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ROUND RESULT / ENDED */}
                    {(currentRoom.status === 'roundResult' || currentRoom.status === 'ended') && (
                        <div className="pokeroom-card text-center py-8 space-y-4">
                            <SuccessToastIcon className="w-12 h-12 text-primary mx-auto" />
                            <h2 className="text-xl font-extrabold text-fg">
                                {currentRoom.status === 'ended' ? 'Fim de Jogo!' : 'Rodada Concluída!'}
                            </h2>
                            <p className="text-xs text-muted">
                                Rodada finalizada com sucesso!
                            </p>
                            {currentRoom.hostId && (
                                <button type="button" onClick={nextRound} className="btn btn-primary font-semibold text-xs py-3 px-8 rounded-xl shadow-md max-w-xs mx-auto">
                                    {currentRoom.status === 'ended' ? 'Reiniciar Jogo' : 'Próxima Rodada'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Friend Invite Modal (ChallengeModal Aligned) */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden outline-none flex flex-col p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                <h3 className="text-base font-bold text-fg">Convidar Amigos</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInviteModal(false)}
                                className="text-muted hover:text-fg p-1 rounded-lg hover:bg-surface-raised"
                            >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {friends.length === 0 ? (
                            <p className="text-xs text-muted italic bg-surface-raised p-3 rounded-xl border border-border">
                                Você ainda não tem amigos adicionados na sua lista.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {friends.map((friend) => (
                                    <div key={friend.userId} className="flex justify-between items-center p-3 bg-surface-raised border border-border rounded-xl">
                                        <div className="flex items-center gap-2.5">
                                            <AvatarSprite
                                                trainerSprite={friend.trainerSprite}
                                                pokemonId={friend.avatarPokemonId}
                                                isShiny={friend.avatarIsShiny}
                                                className="w-8 h-8 object-contain"
                                                fallback={<PokeballIcon className="w-4 h-4 text-muted opacity-40" />}
                                            />
                                            <span className="text-xs font-bold text-fg">{friend.displayName || t('friends.unknownTrainer')}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => inviteFriendToRoom(friend.userId)}
                                            className="btn btn-primary font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm"
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
                            className="w-full btn btn-ghost font-semibold text-xs py-2.5 rounded-xl border border-border"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
