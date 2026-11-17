import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';

import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { useGameNotes, useGamesToday } from '../../hooks/useGamesToday';
import { useDiaryShare } from '../../hooks/useDiaryShare';
import { useRoundStore } from '../../store/useRoundStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useInboxStore } from '../../store/useInboxStore';
import { useFriendsStore } from '../../store/useFriendsStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
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
import { PixelScene } from './PixelScene';
import { Receipt, ReceiptStamp } from './Receipt';
import { Loader } from '../Loader';

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
    const day = useMemo(() => (mode === 'day' ? dayReceipt(done, {
        challenge: facts?.challenge || null,
        puzzle: facts?.puzzle || null,
        quiz: notes.quiz || null,
        tier: notes.tierList?.theme || null,
    }) : null), [mode, done, notes, facts]);
    useEffect(() => {
        if (mode !== 'day') return;
        update((r) => ({ ...r, daySeen: dayKey }));
        track('receipt_open', { mode: 'day', played: day?.played || 0 });
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
    const diary = useDiaryShare(share ? `receipt:${dayKey}:${share.games.length}` : null);

    if (!mode) return null;

    // ── Wording ─────────────────────────────────────────────────────────────
    const date = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(now));
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(now));
    const label = (row) => {
        switch (row.id) {
            case 'challenge': return t('receipt.row.challenge');
            case 'puzzle':
            case 'pokepuzzle': return t('receipt.row.puzzle', { n: row.params?.n || puzzleNumberOn(dayKey) });
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
        const complete = Boolean(day?.complete);
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
                rows={(day?.rows || []).map((row) => ({ label: label(row), value: value(row), bold: row.bold }))}
                totals={[
                    [t('receipt.totals.games'), t('receipt.totals.gamesOf', { n: day?.played || 0, total: day?.total || 4 })],
                    [t('receipt.totals.fullDays'), String(fullDays)],
                    [t('receipt.totals.status'), t(complete ? 'receipt.totals.complete' : 'receipt.totals.partial')],
                ]}
                next={[t('receipt.next'), t('receipt.nextMidnight')]}
                stamp={complete
                    ? <ReceiptStamp mood="orgulhoso" hat="crown" gold sub={t('receipt.stampFull')} word={t('receipt.stampFour')} press />
                    : <ReceiptStamp mood="feliz" sub={t('receipt.stampDay')} word={t('receipt.stampSoFar', { n: day?.played || 0 })} />}
                bye={t(complete ? 'receipt.byeDay' : 'receipt.byePartial')}
                code={code}
            >
                {share && (
                    diary.status === 'posted' ? (
                        <button type="button" className="btn btn-secondary" onClick={() => { close(); diary.openDiary(); }}>{t('games.seeDiary')}</button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={diary.status === 'posting'}
                            onClick={async () => { if (await diary.post({ sharedReceipt: share })) track('receipt_post', { played: share.games.length }); }}
                        >
                            {diary.status === 'posting' ? <Loader size="xs" /> : null}
                            {t('receipt.postDiary')}
                        </button>
                    )
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
