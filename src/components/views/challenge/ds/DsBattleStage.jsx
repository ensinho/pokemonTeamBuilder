import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useBattleCommands } from '../../../../hooks/useBattleCommands';
import { useBattleDex } from '../../../../hooks/useBattleDex';
import { useBattlePlayback } from '../../../../hooks/useBattlePlayback';
import { useConsoleInput } from '../../../../hooks/useConsoleInput';
import { useConsoleLayout } from '../../../../hooks/useConsoleLayout';
import { useSheetSources } from '../../../../hooks/useSheetSources';
import { useTranslation } from '../../../../hooks/useTranslation';
import { confirmAction } from '../../../../store/useConfirmStore';
import { readMyRequest } from '../../../../utils/battleProtocol';
import { readBattleField } from '../../../../utils/battleState';
import { eventText } from '../../../../utils/challengeText';
import { play, soundFor } from '../../../../utils/challengeSfx';
import { setPinch, startMusic, stopMusic } from '../../../../utils/battleMusic';
import { settledRequest, sheetFromRequest, shownConditions, withShown } from '../../../../utils/challengeSheet';
import { championRoster, faintedSpecies, myRoster, railTeams, switchCounts } from '../../../../utils/challengeView';
import { DsBattleScene } from './DsBattleScene';
import { DsHud, DsTouchMenu } from './DsBwCommands';
import { DsConsole } from './DsConsole';
import { ChallengeTeamsRail } from '../ChallengeTeamsRail';

const moveKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clockNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** The BW touch screen's clock, a minute at a time. */
const useClock = () => {
    const [clock, setClock] = useState(clockNow);
    useEffect(() => {
        const timer = setInterval(() => setClock(clockNow()), 30_000);
        return () => clearInterval(timer);
    }, []);
    return clock;
};

/**
 * One battle, from its first line to its last (keyed by run id, so a new run
 * starts a fresh playback), in the style of Pokémon Black & White — against
 * Cynthia, or, with `rival`, against a friend (`views/battle/PvpBattleStage`).
 *
 * The log arrives a turn at a time; `useBattlePlayback` plays it moment by
 * moment and this draws each moment — the scene as of that line, its text, its
 * animation. The menu answers only when the playback has caught up and the sim
 * is waiting for you. A tap on the message, or A, moves to the next moment.
 *
 * Two layouts (`useConsoleLayout`): on a desktop one screen holds the field and
 * the HUD strip; on a phone the field is the top screen and the BW touch menu
 * the bottom one. Beside a desktop's screen, `rails` (`{mode, end}`) adds both
 * teams as the playback has drawn them, and the parent's ranking.
 *
 * `rival` (a friend battle) swaps in what differs from the challenge: who the
 * opponent is (`foeSimName`, the name `|win|` uses; `foeSprite`), their team as
 * the log reveals it (`foeRoster`) instead of the day's lineup, the waiting line
 * and the labels. `music` names the loop that plays (`battleMusic`).
 */
export function DsBattleStage({
    run, lineup, events, eventsBase, pending, championName, playIntro,
    fast, reducedMotion, bar, rails = null, onChoose, onForfeit, onFinished,
    rival = null, music = 'champion', overlay = null,
}) {
    const { t } = useTranslation();
    const dex = useBattleDex();
    const { items } = useSheetSources();
    const layout = useConsoleLayout();
    const clock = useClock();
    const lines = run.lines;

    const dialogue = useMemo(
        () => events.map((e) => ({ key: e.key, params: e.params || {}, lineIndex: eventsBase + e.at })),
        [events, eventsBase],
    );
    const intro = useMemo(() => (playIntro ? [{ type: 'intro', lineIndex: -1 }] : []), [playIntro]);
    const { current, shown, playing, skip } = useBattlePlayback(lines, { dialogue, intro, fast, reducedMotion });

    const visible = useMemo(() => lines.slice(0, shown), [lines, shown]);
    const foeName = rival?.foeSimName || championName;
    useEffect(() => {
        // The loop gives way to the result's jingle.
        if (current?.type === 'end') stopMusic({ fade: 0.25 });
        play(soundFor(current, { championName: foeName }));
    }, [current, foeName]);
    const field = useMemo(() => readBattleField(visible), [visible]);
    const request = useMemo(() => readMyRequest(lines), [lines]);
    const mine = useMemo(() => myRoster(lines), [lines]);
    const myFainted = useMemo(() => faintedSpecies(visible, 'p1'), [visible]);
    const myBalls = useMemo(() => mine.map((m) => ({ ...m, fainted: myFainted.has(m.species) })), [mine, myFainted]);
    const foeRosterOf = rival?.foeRoster;
    const foeBalls = useMemo(
        () => (foeRosterOf ? foeRosterOf(visible) : championRoster(visible, lineup)),
        [visible, lineup, foeRosterOf],
    );
    const switchKeys = useMemo(() => switchCounts(visible), [visible]);
    // Your team's sheet as the playback has drawn it — never ahead of the field.
    const sheet = useMemo(
        () => withShown(sheetFromRequest(settledRequest(lines, shown), { dex, items }), shownConditions(visible, 'p1')),
        [lines, shown, visible, dex, items],
    );
    const turn = useMemo(() => {
        for (let i = visible.length - 1; i >= 0; i -= 1) {
            if (visible[i].startsWith('|turn|')) return Number(visible[i].slice(6)) || 0;
        }
        return 0;
    }, [visible]);

    const moveMeta = useCallback((name) => {
        // battle-dex.json move fields: name, type, category, power, accuracy, pp, desc.
        const entry = dex?.moves?.[moveKey(name)];
        return entry ? { type: entry[1], category: entry[2], power: entry[3], accuracy: entry[4], desc: entry[6] } : null;
    }, [dex]);

    // Text: the moment's line; a silent moment keeps the last one up.
    const lastText = useRef({ text: '', speaker: null });
    const ended = run.status !== 'active';
    let said = null;
    if (current) said = eventText(current, { t, mySide: 'p1', championName, foeSimName: rival?.foeSimName, rival: Boolean(rival) });
    if (said?.text) lastText.current = said;
    else if (!playing && pending) lastText.current = { text: rival?.pendingText || t('challenge.text.thinking', { name: championName }), speaker: null };
    else if (!playing && !ended && field.mine?.active) lastText.current = { text: t('challenge.text.prompt', { species: field.mine.active.species }), speaker: null };

    const yourTurn = !playing && !pending && !ended && (request.kind === 'move' || request.kind === 'switch');

    // The music: from the start to the battle's last line (the `end` moment
    // stops it, above) — for a battle being played or replayed, never for one
    // that was already over when it opened.
    const silentAtOpen = useRef(ended && !playIntro);
    useEffect(() => {
        if (!music || silentAtOpen.current) return undefined;
        startMusic(music);
        return () => stopMusic({ fade: 0.5 });
    }, [music]);
    const myHpPct = field.mine?.active && !field.mine.active.fainted ? field.mine.active.hp?.pct ?? 100 : 100;
    useEffect(() => {
        setPinch(myHpPct <= 25);
        return () => setPinch(false);
    }, [myHpPct]);

    // The run is over and every moment has played: hand over to the result.
    const finished = useRef(false);
    useEffect(() => {
        if (ended && !playing && !finished.current) {
            finished.current = true;
            const timer = setTimeout(onFinished, reducedMotion ? 200 : 900);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [ended, playing, onFinished, reducedMotion]);

    const forfeit = useCallback(async () => {
        const ok = await confirmAction(rival?.forfeitCopy || {
            title: t('challenge.battle.forfeitTitle'),
            message: run.practice ? t('challenge.battle.forfeitPracticeMessage') : t('challenge.battle.forfeitMessage'),
            confirmText: t('challenge.battle.forfeitConfirm'),
        });
        if (ok) onForfeit();
    }, [onForfeit, run.practice, rival?.forfeitCopy, t]);

    const commandInput = useRef(null);
    const cmd = useBattleCommands({
        request,
        enabled: yourTurn,
        onChoose,
        onForfeit: forfeit,
        switchLabel: (name) => t('challenge.battle.switchLabel', { name }),
        inputRef: commandInput,
        activeIndex: Math.max(0, sheet.findIndex((member) => member.active)),
    });
    useConsoleInput({
        onAction: (action) => {
            if (playing) {
                if (action === 'a') skip();
                return;
            }
            if (yourTurn) commandInput.current?.onAction?.(action);
        },
    });

    const message = {
        text: lastText.current.text,
        speaker: lastText.current.speaker,
        showArrow: playing,
        onAdvance: playing ? skip : undefined,
    };
    const scene = (
        <DsBattleScene
            field={field}
            current={current}
            {...message}
            foeBalls={foeBalls}
            myBalls={myBalls}
            switchKeys={switchKeys}
            moveMeta={moveMeta}
            championName={championName}
            foeSprite={rival?.foeSprite}
            foeName={foeName}
            reducedMotion={reducedMotion}
            messageMode={layout === 'single' ? 'none' : 'band'}
        />
    );
    const labels = rival?.labels;

    if (layout === 'single') {
        const teams = rails && railTeams(lines, lineup, visible, foeRosterOf);
        return (
            <DsConsole
                layout="single"
                label={t('challenge.battle.fieldLabel', { name: championName })}
                bar={bar}
                rails={rails && {
                    ...rails,
                    start: (
                        <ChallengeTeamsRail
                            title={t('challenge.rail.yourTeam')}
                            mine={teams.mine}
                            foe={teams.foe}
                            championName={championName}
                            foeTitle={labels?.foeTitle}
                            active={{ mine: field.mine?.active?.species, foe: field.theirs?.active?.species }}
                        />
                    ),
                }}
                screen={(
                    <div className="bw-stage">
                        {scene}
                        <DsHud
                            cmd={cmd}
                            request={request}
                            enabled={yourTurn}
                            moveMeta={moveMeta}
                            message={message}
                            foeBalls={foeBalls}
                            sheet={sheet}
                            championName={championName}
                            labels={labels}
                            reducedMotion={reducedMotion}
                        />
                        {overlay}
                    </div>
                )}
            />
        );
    }

    return (
        <DsConsole
            label={t('challenge.battle.fieldLabel', { name: championName })}
            bar={bar}
            top={scene}
            bottom={overlay || (
                <DsTouchMenu
                    cmd={cmd}
                    request={request}
                    enabled={yourTurn}
                    moveMeta={moveMeta}
                    myBalls={myBalls}
                    foeBalls={foeBalls}
                    sheet={sheet}
                    championName={championName}
                    labels={labels}
                    clock={clock}
                    turn={turn}
                />
            )}
            controls={false}
            onAction={() => {}}
            onRelease={() => {}}
        />
    );
}
