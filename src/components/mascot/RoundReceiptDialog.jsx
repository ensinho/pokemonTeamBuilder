import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Check, Copy, Download, X } from 'lucide-react';

import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { useGameNotes, useGamesToday } from '../../hooks/useGamesToday';
import { useDiaryShare } from '../../hooks/useDiaryShare';
import { useRoundStore } from '../../store/useRoundStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useInboxStore } from '../../store/useInboxStore';
import { useFriendsStore } from '../../store/useFriendsStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { useForumStore } from '../../store/useForumStore';
import { loadStaticData } from '../../services/staticData';
import { track } from '../../services/analytics';
import { dayReceipt, roundReceipt, trainerNumber, withRoundTaken } from '../../utils/mascot/roundReceipt';
import { buildReceiptShare } from '../../utils/gameShare';
import { localDayNumber } from '../../utils/gamesToday';
import { localDayKey } from '../../utils/dailyCheckin';
import { dailyQuizFor } from '../../utils/dailyQuiz';
import { TEMPLATES_BY_ID, dailyTierTemplate } from '../../utils/tierTemplates';
import { puzzleNumberOn } from '../../utils/playToday';
import { monLabel } from '../../utils/tierList';
import { MIME_SYNC_EVENT, formatMimeShareLine, readMimeDayState } from '../../utils/dailyMime';
import { diaryTopicId, todayDiaryKey } from '../../utils/forumDiary';
import { PixelScene } from './PixelScene';
import { Receipt, ReceiptStamp } from './Receipt';
import { Loader } from '../Loader';
import { InstagramIcon, XIcon } from '../icons';
import { useToastStore } from '../../store/useToastStore';
import { mimeReceiptRow, receiptCopyText, receiptFileName, receiptPostText, xIntentUrl } from '../../utils/receiptShare';
import { localizePath } from '../../utils/localePath';
import { SITE_URL } from '../../utils/seoPages';
import { renderReceiptShareBlob } from './drawReceiptShare';

/**
 * The mascot's receipt as a dialog (2026-11-17, "Fantasminha de plantão"):
 * the round's (`morning` — what changed since the trainer was last here) or
 * the day's (`day` — the four games, stamped in gold at four of four). Opened
 * only by the trainer (the note of the day, the island, the Jogos page).
 *
 * The round is taken when the receipt opens: today becomes the baseline, so
 * tomorrow's receipt compares with today.
 */

const usageRanks = async (team, lastMonth) => {
    // A new month of usage is the only time the meta is worth a line; the file
    // is large, so it is read at most once a month (the receipt that sees it).
    const index = await loadStaticData('usage-index.json');
    if (!index?.month || index.month === lastMonth || !team.length) return { month: index?.month || null, ranks: {}, names: {} };
    const format = index.formats?.find((f) => f.id === index.default) || index.formats?.[0];
    if (!format?.file) return { month: index.month, ranks: {}, names: {} };
    const usage = await loadStaticData(format.file);
    const order = Object.entries(usage?.byId || {}).sort((a, b) => (b[1].usage || 0) - (a[1].usage || 0));
    const rankOf = new Map(order.map(([id], i) => [String(id), i + 1]));
    const ranks = {};
    const names = {};
    team.forEach((member) => {
        const key = String(member.id);
        if (rankOf.has(key)) {
            ranks[key] = rankOf.get(key);
            names[key] = monLabel(member.name || usage.byId[key]?.name || key);
        }
    });
    return { month: index.month, ranks, names };
};

export function RoundReceiptDialog() {
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const { mode, facts, close, update } = useRoundStore(useShallow((s) => ({ mode: s.open, facts: s.facts, close: s.closeReceipt, update: s.update })));
    const ref = useModalA11y(close);
    const done = useGamesToday();
    const notes = useGameNotes();
    const userId = useAuthStore((s) => s.userId);
    const streak = useAuthStore((s) => s.streak?.count || 0);
    const inbox = useInboxStore((s) => s.entries);
    const friendCount = useFriendsStore((s) => s.friends.length);
    const team = useActiveTeamStore((s) => s.currentTeam);

    const now = useMemo(() => Date.now(), []);
    const dayKey = localDayKey(new Date(now));
    const dayNumber = localDayNumber(now);
    const quiz = useMemo(() => dailyQuizFor(dayNumber), [dayNumber]);
    const theme = useMemo(() => dailyTierTemplate(dayNumber), [dayNumber]);
    const locale = language === 'pt' ? 'pt-BR' : 'en-GB';
    const quizTitle = quiz ? quiz.list.title[language === 'pt' ? 'pt' : 'en'] : '';

    const rowLabel = (row) => {
        switch (row.id) {
            case 'challenge': return t('receipt.row.challenge');
            // the round's row carries the puzzle's number; the day's row carries
            // the attempts in `n`, so its number is always today's
            case 'puzzle': return t('receipt.row.puzzle', { n: row.params?.n || puzzleNumberOn(dayKey) });
            case 'pokepuzzle': return t('receipt.row.puzzle', { n: puzzleNumberOn(dayKey) });
            case 'quiz': return t('receipt.row.quiz', { title: quizTitle });
            case 'tier':
            case 'tierList': {
                // a theme the catalogue no longer has reads as the day's list, never as a key
                const id = TEMPLATES_BY_ID[row.params?.theme] ? row.params.theme : theme?.id;
                return id ? t('receipt.row.tier', { theme: t(`tierList.templates.${id}.name`) }) : t('receipt.row.tierShort');
            }
            case 'passed': return t('receipt.row.passed', { name: row.params.name });
            case 'streak': return t('receipt.row.streak');
            case 'meta': return t('receipt.row.meta', { name: row.params.name });
            default: return row.id;
        }
    };
    // ── The round: taken once, on open ──────────────────────────────────────
    const [round, setRound] = useState(null);
    useEffect(() => {
        if (mode !== 'morning') return undefined;
        let alive = true;
        const before = useRoundStore.getState().round;
        const passed = inbox.filter((e) => e.kind === 'passed').map((e) => ({ name: e.fromName, at: e.createdAt }));
        const members = (team || []).filter((m) => m && Number.isInteger(Number(m.id)));
        usageRanks(members, before.last?.metaMonth || null)
            .catch(() => ({ month: null, ranks: {}, names: {} }))
            .then((meta) => {
                if (!alive) return;
                const receipt = roundReceipt(before, {
                    challenge: { done: done.challenge },
                    puzzle: { n: puzzleNumberOn(dayKey), done: done.pokepuzzle },
                    quiz: quiz ? { list: quiz.listId, done: done.quiz } : null,
                    tier: theme ? { theme: theme.id, done: done.tierList } : null,
                    passed,
                    streak,
                    metaMonth: meta.month,
                    ranks: meta.ranks,
                    names: meta.names,
                    friends: friendCount,
                });
                setRound(receipt);
                update((r) => withRoundTaken(r, { dayKey, at: Date.now(), metaMonth: meta.month, ranks: meta.ranks }));
                track('receipt_open', { mode: 'morning', news: receipt.news });
            });
        return () => { alive = false; };
        // Taken once per opening: later changes to the day do not re-take it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // ── The day ─────────────────────────────────────────────────────────────
    const fullDays = useRoundStore((s) => s.round.fullDays);
    const [mimeState, setMimeState] = useState(() => readMimeDayState(dayKey));
    useEffect(() => {
        const refresh = () => setMimeState(readMimeDayState(dayKey));
        refresh();
        if (typeof window === 'undefined') return undefined;
        window.addEventListener(MIME_SYNC_EVENT, refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener(MIME_SYNC_EVENT, refresh);
            window.removeEventListener('storage', refresh);
        };
    }, [dayKey, mode]);

    const day = useMemo(() => (mode === 'day' ? dayReceipt(done, {
        challenge: facts?.challenge || null,
        puzzle: facts?.puzzle || null,
        quiz: notes.quiz || null,
        tier: notes.tierList?.theme || null,
    }) : null), [mode, done, notes, facts]);

    const mimeRow = useMemo(() => mimeReceiptRow(mimeState, dayNumber, language), [mimeState, dayNumber, language]);
    const mimeShareLine = useMemo(
        () => (mimeRow ? formatMimeShareLine({ number: mimeRow.number, clue: mimeRow.clue, t }) : null),
        [mimeRow, t],
    );
    const dayPlayed = day?.played || 0;
    const dayTotal = day?.total || 4;
    const dayComplete = Boolean(day?.complete);
    const hasActivity = dayPlayed > 0 || Boolean(mimeRow);

    useEffect(() => {
        if (mode !== 'day') return;
        update((r) => ({ ...r, daySeen: dayKey }));
        track('receipt_open', { mode: 'day', played: dayPlayed, mime: Boolean(mimeRow) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    const share = useMemo(() => (day ? buildReceiptShare({
        day: dayKey,
        done,
        challenge: facts?.challenge ? { won: Boolean(facts.challenge.won), turns: Number(facts.challenge.turns) || null } : null,
        puzzle: facts?.puzzle ? { solved: Boolean(facts.puzzle.solved), attempts: Number(facts.puzzle.attempts) || 0 } : null,
        quiz: notes.quiz ? { found: notes.quiz.found, total: notes.quiz.total } : null,
        tier: notes.tierList?.theme || null,
        full: fullDays,
    }) : null), [day, dayKey, done, facts, notes, fullDays]);
    const diary = useDiaryShare(share ? `receipt:${dayKey}:${share.games.length}:${mimeRow ? 1 : 0}` : null);
    const [mimePosting, setMimePosting] = useState(false);
    const [mimePostedDay, setMimePostedDay] = useState(null);
    const mimeOnlyPosted = mimePostedDay === dayKey;

    const dayRows = useMemo(() => {
        if (!day) return [];
        const base = day.rows.map((row) => ({
            label: rowLabel(row),
            value: t(`receipt.value.${row.value}`, row.params || {}),
            bold: row.bold,
        }));
        return mimeRow
            ? [...base, { label: mimeRow.label, value: mimeRow.value, bold: mimeRow.bold }]
            : base;
        // `rowLabel` and `t` follow `language`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, mimeRow, language, dayKey, quizTitle, theme]);

    const dayStatusLabel = dayComplete
        ? t('receipt.totals.complete')
        : dayPlayed > 0
            ? `${t('receipt.totals.gamesOf', { n: dayPlayed, total: dayTotal })} · ${language === 'pt' ? 'parcial' : 'in progress'}`
            : mimeRow
                ? (language === 'pt' ? 'mímica bônus' : 'bonus mime')
                : t('receipt.totals.partial');

    const dayStampSpec = dayComplete
        ? { gold: true, sub: t('receipt.stampFull'), word: t('receipt.stampFour'), mood: 'orgulhoso', hat: 'crown', press: true }
        : dayPlayed > 0
            ? { gold: false, sub: language === 'pt' ? 'Parcial' : 'In progress', word: t('receipt.stampSoFar', { n: dayPlayed }), mood: 'feliz', press: true }
            : mimeRow
                ? { gold: false, sub: language === 'pt' ? 'Bônus' : 'Bonus', word: language === 'pt' ? 'Mímica' : 'Mime', mood: 'feliz', press: true }
                : { gold: false, sub: t('receipt.stampDay'), word: t('receipt.stampSoFar', { n: 0 }), mood: 'feliz', press: false };

    // ── The day as an image (save, copy, Instagram, X) ──────────────────────
    // Drawn as soon as the day's receipt opens with activity, so the tap that
    // shares it calls `navigator.share` at once — a phone refuses a share that
    // comes after awaited work (drawPuzzleShare.js).
    const imageRef = useRef(null);
    const copyTimerRef = useRef(null);
    const [imageReady, setImageReady] = useState(false);
    const [copiedReceipt, setCopiedReceipt] = useState(false);
    const showToast = useToastStore((s) => s.showToast);
    const playUrl = `${SITE_URL}${localizePath('/games', language)}`;
    const dateFormatted = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(now));
    const imageSpec = useMemo(() => {
        if (mode !== 'day' || !day || !hasActivity) return null;
        return {
            rows: dayRows,
            totals: [
                [t('receipt.totals.games'), t('receipt.totals.gamesOf', { n: dayPlayed, total: dayTotal })],
                [t('receipt.totals.fullDays'), String(fullDays)],
                [t('receipt.totals.status'), dayStatusLabel],
            ],
            date: [t('receipt.meta.date'), dateFormatted],
            stamp: { gold: dayStampSpec.gold, sub: dayStampSpec.sub, word: dayStampSpec.word },
            code: { code: trainerNumber(userId || 'guest'), label: t('receipt.trainerId') },
            labels: {
                brand: t('receipt.brand'),
                kind: t('receipt.kindDay'),
                kicker: t('receipt.image.kicker'),
                score: dayPlayed === 0 && mimeRow ? (language === 'pt' ? 'Mímica' : 'Mime') : `${dayPlayed}/${dayTotal}`,
                play: t('receipt.image.play'),
                site: playUrl.replace(/^https?:\/\//, ''),
            },
            logoUrl: `${import.meta.env.BASE_URL}logo-mark.webp`,
            playUrl,
        };
        // `t` and `dateFormatted` follow `language`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, day, hasActivity, dayRows, dayPlayed, dayTotal, dayStatusLabel, dayStampSpec.gold, dayStampSpec.sub, dayStampSpec.word, fullDays, language, userId, mimeRow]);
    useEffect(() => {
        imageRef.current = null;
        setImageReady(false);
        if (!imageSpec) return undefined;
        let alive = true;
        renderReceiptShareBlob(imageSpec).catch(() => null).then((blob) => {
            if (!alive) return;
            imageRef.current = blob;
            setImageReady(Boolean(blob));
        });
        return () => { alive = false; };
    }, [imageSpec]);
    useEffect(() => () => {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    }, []);

    const postText = day
        ? receiptPostText(t, {
            played: dayPlayed,
            total: dayTotal,
            complete: dayComplete,
            mime: mimeShareLine ? { line: mimeShareLine } : null,
        })
        : '';
    const fileName = receiptFileName(dayKey, language);
    const coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const imageFile = () => (imageRef.current ? new File([imageRef.current], fileName, { type: 'image/png' }) : null);
    // A phone hands the picture to its share sheet (Instagram, X, Save Image).
    const shareSheet = async (file, extra = {}) => {
        if (!coarse || !file || !navigator.canShare?.({ files: [file] })) return false;
        try {
            await navigator.share({ files: [file], ...extra });
            return true;
        } catch (err) {
            return err?.name === 'AbortError'; // refused (no gesture left, a WebView): the fallback below
        }
    };
    const download = () => {
        const url = URL.createObjectURL(imageRef.current);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    };
    const onSave = async () => {
        const file = imageFile();
        if (!file) { showToast(t('receipt.image.error'), 'error'); return; }
        if (await shareSheet(file)) { track('receipt_share', { channel: 'save' }); return; }
        download();
        track('receipt_share', { channel: 'download' });
        showToast(t('receipt.image.saved'), 'success');
    };
    const onCopy = async () => {
        let copied = false;
        if (imageRef.current && typeof window.ClipboardItem === 'function' && navigator.clipboard?.write) {
            copied = await navigator.clipboard
                .write([new window.ClipboardItem({ 'image/png': imageRef.current })])
                .then(() => true, () => false);
        }
        if (!copied && navigator.clipboard?.writeText) {
            const summary = receiptCopyText({
                brand: t('receipt.brand'),
                kind: t('receipt.kindDay'),
                date: dateFormatted,
                rows: dayRows,
                status: `${t('receipt.totals.status')}: ${dayStatusLabel}`,
                playUrl,
            });
            copied = await navigator.clipboard.writeText(summary).then(() => true, () => false);
        }
        if (!copied) {
            showToast(t('receipt.image.error'), 'error');
            return;
        }
        track('receipt_share', { channel: 'copy' });
        setCopiedReceipt(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedReceipt(false), 1800);
        showToast(language === 'pt' ? 'Recibo copiado!' : 'Receipt copied!', 'success');
    };
    const onPostMimeOnly = async () => {
        if (mimePosting || !mimeShareLine) return;
        const forum = useForumStore.getState();
        if (!useAuthStore.getState().userId) {
            await forum.sendMessage(diaryTopicId(todayDiaryKey()), mimeShareLine);
            return;
        }
        setMimePosting(true);
        try {
            const diaryId = await forum.ensureDiary();
            const ok = diaryId ? await forum.sendMessage(diaryId, mimeShareLine) : false;
            if (ok) {
                setMimePostedDay(dayKey);
                track('receipt_post', { played: 0, mime: true });
                showToast(t('games.postedToDiary'), 'success');
            }
        } finally {
            setMimePosting(false);
        }
    };
    const onInstagram = async () => {
        const file = imageFile();
        if (!file) { showToast(t('receipt.image.error'), 'error'); return; }
        if (await shareSheet(file, { text: postText })) { track('receipt_share', { channel: 'instagram' }); return; }
        // Instagram has no web composer to fill: the picture is saved and the site opened.
        download();
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        track('receipt_share', { channel: 'instagram_web' });
        showToast(t('receipt.image.savedForInstagram'), 'success');
    };
    const onX = async () => {
        if (await shareSheet(imageFile(), { text: `${postText} ${playUrl}` })) { track('receipt_share', { channel: 'x' }); return; }
        // X's composer takes words and a link, never a file: the picture goes to
        // the clipboard first (while the page still has focus), ready to paste.
        let copied = Promise.resolve(false);
        if (imageRef.current && typeof window.ClipboardItem === 'function' && navigator.clipboard?.write) {
            copied = navigator.clipboard.write([new window.ClipboardItem({ 'image/png': imageRef.current })]).then(() => true, () => false);
        }
        window.open(xIntentUrl(postText, playUrl), '_blank', 'noopener,noreferrer');
        track('receipt_share', { channel: 'x_web' });
        if (await copied) showToast(t('receipt.image.copiedForX'), 'success');
    };

    if (!mode) return null;

    // ── Wording ─────────────────────────────────────────────────────────────
    const date = dateFormatted;
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(now));
    const label = rowLabel;
    const value = (row) => t(`receipt.value.${row.value}`, row.params || {});
    const code = { code: trainerNumber(userId || 'guest'), label: t('receipt.trainerId') };

    let body;
    if (mode === 'morning') {
        body = !round ? (
            <Loader size="md" scene="pokedex" block label={t('receipt.preparing')} />
        ) : (
            <Receipt
                printing
                brand={t('receipt.brand')}
                kind={t('receipt.kindRound')}
                meta={[
                    [t('receipt.meta.routine'), t('receipt.meta.routineRound')],
                    [t('receipt.meta.date'), date],
                    [t('receipt.meta.time'), '00:00'],
                    [t('receipt.meta.you'), t('receipt.meta.asleep')],
                ]}
                columns={[t('receipt.columns.item'), t('receipt.columns.today')]}
                rows={round.rows.map((row) => ({ label: label(row), value: value(row), bold: row.bold }))}
                totals={[
                    [t('receipt.totals.checked'), String(round.checked)],
                    [t('receipt.totals.news'), String(round.news)],
                    [t('receipt.totals.status'), t('receipt.totals.done')],
                ]}
                next={[t('receipt.next'), t('receipt.nextTomorrow')]}
                stamp={<ReceiptStamp mood="feliz" sub={t('receipt.stampRound')} word={t('receipt.stampDone')} press />}
                bye={t('receipt.byeRound')}
                code={code}
            >
                <button type="button" className="btn btn-primary" onClick={() => { close(); navigate('/games'); }}>
                    {t('receipt.openGames')}
                </button>
            </Receipt>
        );
    } else {
        const diaryPosted = share ? diary.status === 'posted' : mimeOnlyPosted;
        const diaryPosting = share ? diary.status === 'posting' : mimePosting;
        body = (
            <Receipt
                printing
                brand={t('receipt.brand')}
                kind={t('receipt.kindDay')}
                meta={[
                    [t('receipt.meta.routine'), t('receipt.meta.routineDay')],
                    [t('receipt.meta.date'), date],
                    [t('receipt.meta.time'), time],
                    [t('receipt.meta.you'), t('receipt.meta.awake')],
                ]}
                columns={[t('receipt.columns.game'), t('receipt.columns.result')]}
                rows={dayRows}
                totals={[
                    [t('receipt.totals.games'), t('receipt.totals.gamesOf', { n: dayPlayed, total: dayTotal })],
                    [t('receipt.totals.fullDays'), String(fullDays)],
                    [t('receipt.totals.status'), dayStatusLabel],
                ]}
                next={[t('receipt.next'), t('receipt.nextMidnight')]}
                stamp={(
                    <ReceiptStamp
                        mood={dayStampSpec.mood}
                        hat={dayStampSpec.hat}
                        gold={dayStampSpec.gold}
                        sub={dayStampSpec.sub}
                        word={dayStampSpec.word}
                        press={dayStampSpec.press}
                    />
                )}
                bye={t(dayComplete ? 'receipt.byeDay' : 'receipt.byePartial')}
                code={code}
            >
                {hasActivity ? (
                    <>
                        {diaryPosted ? (
                            <button type="button" className="btn btn-secondary" onClick={() => { close(); diary.openDiary(); }}>{t('games.seeDiary')}</button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={diaryPosting}
                                onClick={async () => {
                                    if (share) {
                                        if (await diary.post({ sharedReceipt: share })) track('receipt_post', { played: share.games.length, mime: Boolean(mimeRow) });
                                    } else {
                                        await onPostMimeOnly();
                                    }
                                }}
                            >
                                {diaryPosting ? <Loader size="xs" /> : null}
                                {t('receipt.postDiary')}
                            </button>
                        )}
                        <div className="receipt__share" role="group" aria-label={t('receipt.image.group')}>
                            <button type="button" className="btn btn-secondary btn-sm" disabled={!imageReady} onClick={onSave} aria-label={t('receipt.image.saveLong')}>
                                {imageReady ? <Download className="w-4 h-4" aria-hidden="true" /> : <Loader size="xs" />}
                                <span aria-hidden="true">{t('receipt.image.save')}</span>
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" disabled={!imageReady} onClick={onCopy}>
                                {copiedReceipt ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                                <span>{language === 'pt' ? (copiedReceipt ? 'Copiado' : 'Copiar') : (copiedReceipt ? 'Copied' : 'Copy')}</span>
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" disabled={!imageReady} onClick={onInstagram}>
                                <InstagramIcon className="w-4 h-4" />
                                Instagram
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" disabled={!imageReady} onClick={onX} aria-label={t('receipt.image.x')}>
                                <XIcon className="w-4 h-4" />
                                <span aria-hidden="true">X</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="receipt__hint">
                            {language === 'pt'
                                ? 'Jogue pelo menos 1 jogo hoje para emitir e postar seu recibo.'
                                : 'Play at least 1 game today to emit and post your receipt.'}
                        </p>
                        <button type="button" className="btn btn-primary" onClick={() => { close(); navigate('/games'); }}>
                            {t('receipt.openGames')}
                        </button>
                    </>
                )}
            </Receipt>
        );
    }

    return (
        <div className="modal-scrim">
            <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="round-receipt-title" tabIndex={-1} className="modal-panel modal-panel--sm round-receipt">
                <div className="modal-header">
                    <h2 id="round-receipt-title" className="modal-title">{t(mode === 'morning' ? 'receipt.titleRound' : 'receipt.titleDay')}</h2>
                    <button type="button" className="modal-close" onClick={close} aria-label={t('receipt.close')}>
                        <X aria-hidden="true" />
                    </button>
                </div>
                <div className="modal-body round-receipt__body custom-scrollbar">
                    <div className="round-receipt__stage">
                        <PixelScene kind={mode === 'morning' ? 'morning' : 'dusk'} seed={dayNumber} className="round-receipt__scene" />
                        {body}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RoundReceiptDialog;
