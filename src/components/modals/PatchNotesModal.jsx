import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PATCH_NOTES_VERSION } from '../../constants/theme';
import { RELEASES, CURRENT_RELEASE, PAST_RELEASES, formatReleaseMonth } from '../../constants/patchNotes';
import { useModalA11y } from '../../hooks/useModalA11y';
import { ChevronDownIcon, CloseIcon, DownloadIcon, FlowerIcon, HeartIcon, MessageIcon, PokeballIcon, SparklesIcon, SwordsIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { getGameLogo } from '../../assets/gameLogos';

const CHAMPIONS_LOGO = getGameLogo('champions');

const SPRITE_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon';

// Champions Pokédex — the cover the user will look for in the picker, over the
// roster it unlocks. Same grammar as the other two visuals: tiles, then caption.
const ChampionsDexVisual = ({ language }) => {
    const pt = language === 'pt';
    return (
        <div className="flex h-[9.5rem] flex-col items-center justify-center gap-2.5 bg-bg p-3" aria-hidden="true">
            <span className="flex h-10 w-32 items-center justify-center rounded-md bg-surface-raised p-1.5">
                <img src={CHAMPIONS_LOGO} alt="" className="max-h-full max-w-full object-contain" />
            </span>
            <div className="flex items-center gap-2">
                {[3, 727, 149].map((id) => (
                    <span key={id} className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised">
                        <img
                            src={`${SPRITE_BASE}/${id}.png`}
                            alt=""
                            className="h-10 w-10 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                        />
                        {id === 3 && (
                            <span className="absolute -bottom-1 rounded-full bg-primary px-1.5 text-[0.5rem] font-bold uppercase tracking-wide text-white">
                                Mega
                            </span>
                        )}
                    </span>
                ))}
            </div>
            <span className="font-mono text-[0.6rem] font-semibold tabular-nums text-muted">
                {pt ? '262 Pokémon · 208 espécies' : '262 Pokémon · 208 species'}
            </span>
        </div>
    );
};

// Playthrough mode — the whole point is what stops appearing, so show the same
// two cards with and without the meta pill.
const PlaythroughVisual = ({ t }) => (
    <div className="flex h-[9.5rem] flex-col items-center justify-center gap-2.5 bg-bg p-3" aria-hidden="true">
        <div className="flex items-center gap-2.5">
            {[25, 6].map((id) => (
                <span key={id} className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised">
                    <img src={`${SPRITE_BASE}/${id}.png`} alt="" className="h-10 w-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                    <span className="absolute -bottom-1 rounded-full bg-primary px-1.5 text-[0.5rem] font-bold uppercase tracking-wide text-white">
                        Meta
                    </span>
                </span>
            ))}
            <span className="px-1 text-sm font-bold text-muted">→</span>
            {[25, 6].map((id) => (
                <span key={id} className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised">
                    <img src={`${SPRITE_BASE}/${id}.png`} alt="" className="h-10 w-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                </span>
            ))}
        </div>
        <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[0.62rem] font-bold text-muted">
            {t('builder.playthroughBadge')}
        </span>
    </div>
);

// The two games imported this release, side by side — each with its own
// starters so the pair reads as "two new games", not one entry with a footnote.
const NEW_GAMES = [
    { key: 'firered-leafgreen', label: 'FireRed / LeafGreen', count: 151, starters: [1, 4, 7] },
    { key: 'legends-za', label: 'Legends: Z-A', count: 412, starters: [650, 653, 656] },
];

const NewGamesVisual = ({ language }) => {
    const pt = language === 'pt';
    return (
        <div className="flex h-[9.5rem] flex-col items-center justify-center gap-2.5 bg-bg p-3" aria-hidden="true">
            <div className="flex w-full items-stretch justify-center gap-2">
                {NEW_GAMES.map((game) => (
                    <div key={game.key} className="flex flex-1 flex-col items-center gap-1.5 rounded-lg bg-surface-raised p-2">
                        <div className="flex items-center gap-1">
                            {game.starters.map((id) => (
                                <img
                                    key={id}
                                    src={`${SPRITE_BASE}/${id}.png`}
                                    alt=""
                                    className="h-8 w-8 object-contain"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                            ))}
                        </div>
                        <span className="text-[0.68rem] font-bold leading-tight text-fg">{game.label}</span>
                        <span className="font-mono text-[0.55rem] font-semibold tabular-nums text-muted">
                            {game.count} Pokémon
                        </span>
                    </div>
                ))}
            </div>
            <span className="font-mono text-[0.6rem] font-semibold tabular-nums text-muted">
                {pt ? '2 jogos novos no seletor' : '2 new games in the picker'}
            </span>
        </div>
    );
};

// Tera Type — shown as what the build row looks like with it and without it.
const TeraVisual = ({ language }) => {
    const pt = language === 'pt';
    const Row = ({ fields, faded }) => (
        <div className={`flex flex-col gap-1 rounded-lg bg-surface-raised p-2 ${faded ? 'opacity-60' : ''}`}>
            {fields.map((f) => (
                <span key={f.label} className="flex items-baseline justify-between gap-3 text-[0.6rem]">
                    <span className="font-semibold uppercase tracking-wide text-muted">{f.label}</span>
                    <span className="font-mono text-fg">{f.value}</span>
                </span>
            ))}
        </div>
    );
    const base = [
        { label: pt ? 'Item' : 'Item', value: 'Life Orb' },
        { label: pt ? 'Natureza' : 'Nature', value: 'Jolly' },
    ];
    const tera = { label: pt ? 'Tipo Tera' : 'Tera Type', value: 'Steel' };
    return (
        <div className="flex h-[9.5rem] items-center justify-center gap-2.5 bg-bg p-3" aria-hidden="true">
            <div className="w-[8.5rem]"><Row fields={[...base, tera]} /></div>
            <span className="text-sm font-bold text-muted">→</span>
            <div className="w-[8.5rem]"><Row fields={base} /></div>
        </div>
    );
};

// Re-readable announcements — a sketch of the version list this modal now keeps.
const HistoryVisual = ({ language }) => (
    <div className="flex h-[9.5rem] flex-col items-center justify-center gap-1.5 bg-bg p-3" aria-hidden="true">
        {RELEASES.slice(0, 4).map((release, index) => (
            <div
                key={release.version}
                className={`flex w-full max-w-[13rem] items-center gap-2 rounded-md px-2 py-1 ${index === 0 ? 'bg-primary-soft' : 'bg-surface-raised'}`}
            >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted'}`} />
                <span className={`font-mono text-[0.62rem] font-bold tabular-nums ${index === 0 ? 'text-primary' : 'text-fg'}`}>
                    {release.version}
                </span>
                <span className="ml-auto truncate text-[0.55rem] text-muted">
                    {formatReleaseMonth(release.month, language)}
                </span>
            </div>
        ))}
        <span className="mt-0.5 text-[0.58rem] font-semibold text-muted">
            {language === 'pt' ? 'Histórico completo no modal' : 'Full history in this modal'}
        </span>
    </div>
);

// Open forum invites — two trainers who were never friends, and the invite card
// that put them in the same battle.
const InvitesVisual = ({ t, language }) => {
    const pt = language === 'pt';
    return (
        <div className="flex h-[9.5rem] flex-col items-center justify-center gap-2.5 bg-bg p-3" aria-hidden="true">
            <div className="flex w-full max-w-[15rem] items-center justify-between gap-2 rounded-lg bg-surface-raised px-2.5 py-2">
                <span className="flex items-center gap-1.5 text-[0.68rem] font-bold text-fg">
                    <SwordsIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {t('forum.inviteTitle')}
                </span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-white">
                    {t('forum.inviteAccept')}
                </span>
            </div>
            <div className="flex items-center gap-3">
                {[6, 9].map((id, i) => (
                    <React.Fragment key={id}>
                        {i === 1 && <span className="font-mono text-[0.6rem] font-bold text-muted">VS</span>}
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised">
                            <img
                                src={`${SPRITE_BASE}/${id}.png`}
                                alt=""
                                className="h-10 w-10 object-contain"
                                style={{ imageRendering: 'pixelated' }}
                            />
                        </span>
                    </React.Fragment>
                ))}
            </div>
            <span className="font-mono text-[0.58rem] font-semibold tabular-nums text-muted">
                {pt ? 'primeiro a aceitar entra' : 'first to accept takes it'}
            </span>
        </div>
    );
};

// Threads opening on the newest message.
const LatestVisual = ({ language }) => {
    const pt = language === 'pt';
    return (
        <div className="flex h-[9.5rem] flex-col items-center justify-center gap-1.5 bg-bg p-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex w-full max-w-[13rem] items-center gap-2 rounded-md bg-surface-raised px-2 py-1 opacity-60">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                    <span className="h-1 flex-1 rounded-full bg-muted/40" />
                </div>
            ))}
            <div className="flex w-full max-w-[13rem] items-center gap-2 rounded-md bg-primary-soft px-2 py-1">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="h-1 flex-1 rounded-full bg-primary/50" />
                <ChevronDownIcon className="h-3 w-3 shrink-0 text-primary" />
            </div>
            <span className="mt-0.5 font-mono text-[0.58rem] font-semibold text-muted">
                {pt ? 'abre na mais recente' : 'opens on the newest'}
            </span>
        </div>
    );
};

// Sharing a PokéPuzzle board — the grid travels, the answer does not.
const PuzzleShareVisual = ({ language }) => {
    const pt = language === 'pt';
    // Four attempts taken, four never needed — the same shape the forum card
    // draws, so the announcement shows the thing that actually ships.
    const rows = ['aapaaaa', 'apacaaa', 'ccacpaa', 'ccccccc', '', '', '', ''];
    const tone = { c: 'bg-success', p: 'bg-warning', a: 'bg-border' };
    const pending = 'aaaaaaa';
    return (
        <div className="flex h-[9.5rem] flex-col items-center justify-center gap-2.5 bg-bg p-3" aria-hidden="true">
            <div className="flex flex-col gap-0.5 rounded-lg bg-surface-raised p-2.5">
                {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-0.5">
                        {(row || pending).split('').map((code, cellIndex) => (
                            <span
                                key={cellIndex}
                                className={`h-2 w-2 rounded-sm bg-border ${row ? tone[code] : 'opacity-40'}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <span className="font-mono text-[0.6rem] font-semibold tabular-nums text-muted">
                {pt ? '4/8 · sem spoiler' : '4/8 · no spoilers'}
            </span>
        </div>
    );
};

// Ledger `icon` / `visual` names → components. Keeps constants/patchNotes.js
// free of JSX so it can be imported anywhere (and unit-tested).
const NOTE_ICONS = {
    pokeball: PokeballIcon,
    sparkles: SparklesIcon,
    heart: HeartIcon,
    flower: FlowerIcon,
    swords: SwordsIcon,
    message: MessageIcon,
};

const NOTE_VISUALS = {
    champions: ChampionsDexVisual,
    playthrough: PlaythroughVisual,
    newGames: NewGamesVisual,
    tera: TeraVisual,
    history: HistoryVisual,
    invites: InvitesVisual,
    latest: LatestVisual,
    puzzleShare: PuzzleShareVisual,
};

export function PatchNotesModal({ onClose, colors, isInstallable, isIOS, onInstall }) {
    const { t, language } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const navigate = useNavigate();
    const goTo = useCallback((path) => {
        onClose();
        navigate(path);
    }, [navigate, onClose]);

    // Which release is on screen comes from the ledger in constants/patchNotes.js;
    // the icons and illustrations are resolved here so that file stays data-only.
    const [historyOpen, setHistoryOpen] = useState(false);
    const notes = CURRENT_RELEASE.notes.map((note) => ({
        ...note,
        Icon: NOTE_ICONS[note.icon] || PokeballIcon,
        Visual: NOTE_VISUALS[note.visual],
        title: t(note.title),
        description: t(note.description),
        cta: t(note.cta),
    }));

    return (
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="patch-notes-title"
                tabIndex={-1}
                className="modal-panel"
                style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={(event) => event.stopPropagation()}
            >
                <button onClick={onClose} type="button" aria-label={t('patchNotes.closeLabel')} className="absolute top-4 right-4 text-muted hover:text-fg transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
                    <CloseIcon />
                </button>

                <div className="shrink-0 border-b border-surface-raised px-5 pb-4 pt-5 text-center">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                            <FlowerIcon />
                        </div>
                        <h2 id="patch-notes-title" className="text-2xl font-extrabold tracking-tight text-fg md:text-3xl">
                            {t('patchNotes.whatsNew')}
                        </h2>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                        {t('patchNotes.releaseLine', { version: PATCH_NOTES_VERSION, month: formatReleaseMonth(CURRENT_RELEASE.month, language) })}
                    </p>
                </div>

                <div className="shrink-0 px-5 pt-4">
                    <div className="flex items-start gap-3 rounded-xl bg-surface-raised p-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary" aria-hidden="true">
                            <HeartIcon className="w-4 h-4" />
                        </span>
                        <p className="text-sm text-fg">{t('patchNotes.thanksBody')}</p>
                    </div>
                </div>

                <div className="space-y-4 px-5 py-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {notes.map((note) => {
                        const { key, title, description, cta, path } = note;
                        const NoteIcon = note.Icon;
                        const NoteVisual = note.Visual;
                        // A note either goes somewhere or opens the history below it.
                        const activate = note.expandsHistory ? () => setHistoryOpen(true) : () => goTo(path);
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={activate}
                                className="w-full rounded-xl bg-surface-raised p-4 text-left transition-colors duration-150 hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={`${title} – ${cta}`}
                                aria-expanded={note.expandsHistory ? historyOpen : undefined}
                            >
                                <div className="mb-3 overflow-hidden rounded-lg bg-surface">
                                    <NoteVisual colors={colors} t={t} language={language} />
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary" aria-hidden="true">
                                        <NoteIcon className="w-4 h-4" />
                                    </span>
                                    <h3 className="font-bold text-primary">{title}</h3>
                                </div>
                                <p className="text-sm text-fg">
                                    {description}
                                </p>
                                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                    {cta}
                                    <span aria-hidden="true">→</span>
                                </span>
                            </button>
                        );
                    })}

                    {/* Past releases. Collapsed by default so the modal still leads
                        with what's new, but reachable whenever someone wants to
                        catch up on what they missed. */}
                    <section className="rounded-xl bg-surface-raised p-4">
                        <button
                            type="button"
                            onClick={() => setHistoryOpen((open) => !open)}
                            aria-expanded={historyOpen}
                            aria-controls="patch-notes-history"
                            className="flex w-full items-center justify-between gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                        >
                            <span className="text-sm font-bold text-fg">{t('patchNotes.historySectionTitle')}</span>
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                {historyOpen ? t('patchNotes.historyHide') : t('patchNotes.historyShow', { count: PAST_RELEASES.length })}
                                <ChevronDownIcon className={`h-4 w-4 transition-transform duration-150 ${historyOpen ? '' : '-rotate-90'}`} />
                            </span>
                        </button>

                        {historyOpen && (
                            <ol id="patch-notes-history" className="mt-3 space-y-3">
                                {PAST_RELEASES.map((release) => (
                                    <li key={release.version} className="rounded-lg bg-surface p-3">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="font-mono text-xs font-bold tabular-nums text-fg">{release.version}</span>
                                            <span className="text-[0.68rem] text-muted">{formatReleaseMonth(release.month, language)}</span>
                                        </div>
                                        <ul className="mt-1.5 space-y-1">
                                            {release.notes.map((note) => (
                                                <li key={note.key} className="flex items-baseline gap-2 text-xs text-fg">
                                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                                                    <span>{t(note.title)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                </div>

                <div className="shrink-0 border-t border-surface-raised px-5 pb-5 pt-4">
                    {(isInstallable || isIOS) && (
                        <div
                            className="mb-4 flex items-center gap-3 rounded-xl p-3"
                            style={{ backgroundColor: colors.primary + '18', border: `1px solid ${colors.primary}35` }}
                        >
                            <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                                style={{ backgroundColor: colors.primary }}
                            >
                                <DownloadIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-bold text-fg">{t('patchNotes.addToHome')}</p>
                                <p className="text-xs text-muted">
                                    {isIOS
                                        ? t('patchNotes.iosInstallHint')
                                        : t('patchNotes.installHint')}
                                </p>
                            </div>
                            {isInstallable && (
                                <button
                                    type="button"
                                    onClick={onInstall}
                                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-75"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    {t('patchNotes.installBtn')}
                                </button>
                            )}
                        </div>
                    )}
                    <div className="text-center">
                        <button
                            onClick={onClose}
                            className="rounded-lg bg-primary px-8 py-3 font-bold text-white transition-colors hover:opacity-90"
                        >
                            {t('patchNotes.gotIt')}
                        </button>
                        <p className="mt-3 text-xs text-muted">
                            {t('patchNotes.madeBy')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
