import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useBattleCommands } from '../../../../hooks/useBattleCommands';
import { useBattleDex } from '../../../../hooks/useBattleDex';
import { useBattlePlayback } from '../../../../hooks/useBattlePlayback';
import { useConsoleInput } from '../../../../hooks/useConsoleInput';
import { useConsoleLayout } from '../../../../hooks/useConsoleLayout';
import { useTranslation } from '../../../../hooks/useTranslation';
import { confirmAction } from '../../../../store/useConfirmStore';
import { readMyRequest } from '../../../../utils/battleProtocol';
import { readBattleField } from '../../../../utils/battleState';
import { eventText } from '../../../../utils/challengeText';
import { play, soundFor } from '../../../../utils/challengeSfx';
import { championRoster, faintedSpecies, myRoster, railTeams, switchCounts } from '../../../../utils/challengeView';
import { DsBattleScene } from './DsBattleScene';
import { DsHud, DsTouchMenu } from './DsBwCommands';
import { DsConsole } from './DsConsole';
import { DsTeamsRail } from './DsRails';

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
 * starts a fresh playback), in the style of Pokémon Black & White.
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
 */
export function DsBattleStage({
    run, lineup, events, eventsBase, pending, championName, playIntro,
    fast, reducedMotion, bar, rails = null, onChoose, onForfeit, onFinished,
}) {
    const { t } = useTranslation();
    const dex = useBattleDex();
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
    useEffect(() => { play(soundFor(current, { championName })); }, [current, championName]);
    const field = useMemo(() => readBattleField(visible), [visible]);
    const request = useMemo(() => readMyRequest(lines), [lines]);
    const mine = useMemo(() => myRoster(lines), [lines]);
    const myFainted = useMemo(() => faintedSpecies(visible, 'p1'), [visible]);
    const myBalls = useMemo(() => mine.map((m) => ({ ...m, fainted: myFainted.has(m.species) })), [mine, myFainted]);
    const foeBalls = useMemo(() => championRoster(visible, lineup), [visible, lineup]);
    const switchKeys = useMemo(() => switchCounts(visible), [visible]);
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
    if (current) said = eventText(current, { t, mySide: 'p1', championName });
    if (said?.text) lastText.current = said;
    else if (!playing && pending) lastText.current = { text: t('challenge.text.thinking', { name: championName }), speaker: null };
    else if (!playing && !ended && field.mine?.active) lastText.current = { text: t('challenge.text.prompt', { species: field.mine.active.species }), speaker: null };

    const yourTurn = !playing && !pending && !ended && (request.kind === 'move' || request.kind === 'switch');

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
        const ok = await confirmAction({
            title: t('challenge.battle.forfeitTitle'),
            message: run.practice ? t('challenge.battle.forfeitPracticeMessage') : t('challenge.battle.forfeitMessage'),
            confirmText: t('challenge.battle.forfeitConfirm'),
        });
        if (ok) onForfeit();
    }, [onForfeit, run.practice, t]);

    const commandInput = useRef(null);
    const cmd = useBattleCommands({
        request,
        enabled: yourTurn,
        onChoose,
        onForfeit: forfeit,
        switchLabel: (name) => t('challenge.battle.switchLabel', { name }),
        inputRef: commandInput,
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
            reducedMotion={reducedMotion}
            messageMode={layout === 'single' ? 'none' : 'band'}
        />
    );

    if (layout === 'single') {
        const teams = rails && railTeams(lines, lineup, visible);
        return (
            <DsConsole
                layout="single"
                label={t('challenge.battle.fieldLabel', { name: championName })}
                bar={bar}
                rails={rails && {
                    ...rails,
                    start: (
                        <DsTeamsRail
                            title={t('challenge.rail.yourTeam')}
                            mine={teams.mine}
                            foe={teams.foe}
                            championName={championName}
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
                            championName={championName}
                            reducedMotion={reducedMotion}
                        />
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
            bottom={(
                <DsTouchMenu
                    cmd={cmd}
                    request={request}
                    enabled={yourTurn}
                    moveMeta={moveMeta}
                    myBalls={myBalls}
                    foeBalls={foeBalls}
                    championName={championName}
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
