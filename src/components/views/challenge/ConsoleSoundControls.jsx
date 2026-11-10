import { FastForward, Music, Volume2, VolumeX } from 'lucide-react';

import { useTranslation } from '../../../hooks/useTranslation';
import { ConsoleMoreMenu } from './ConsoleMoreMenu';

/**
 * Music, sound and text speed on a console's bar — the Champion Challenge's
 * and a friend battle's. A desktop gets three chips; a phone folds them into
 * the "⋯" menu (`ConsoleMoreMenu`), after whatever facts the screen adds
 * (`facts`: the streak), so the bar stays one row.
 */
export function ConsoleSoundControls({ phone, musicOn, muted, fast, onMusic, onMuted, onFast, facts = [] }) {
    const { t } = useTranslation();
    const musicLabel = t(musicOn ? 'battle.stage.musicOff' : 'battle.stage.musicOn');
    const soundLabel = t(muted ? 'challenge.console.unmute' : 'challenge.console.mute');
    const speedLabel = t('challenge.console.speed');
    const speed = fast ? '2×' : '1×';
    const SoundIcon = muted ? VolumeX : Volume2;

    if (phone) {
        return (
            <ConsoleMoreMenu
                label={t('challenge.console.more')}
                items={[
                    ...facts,
                    { id: 'music', icon: <Music aria-hidden="true" />, label: musicLabel, onClick: onMusic },
                    { id: 'sound', icon: <SoundIcon aria-hidden="true" />, label: soundLabel, onClick: onMuted },
                    { id: 'speed', icon: <FastForward aria-hidden="true" />, label: speedLabel, value: speed, onClick: onFast },
                ]}
            />
        );
    }
    return (
        <>
            <button type="button" className="ds-chip is-button" aria-pressed={musicOn} onClick={onMusic} aria-label={musicLabel} title={musicLabel}>
                <Music className={`w-3.5 h-3.5 shrink-0 ${musicOn ? '' : 'opacity-40'}`} aria-hidden="true" />
            </button>
            <button type="button" className="ds-chip is-button" aria-pressed={!muted} onClick={onMuted} aria-label={soundLabel} title={soundLabel}>
                <SoundIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
            <button type="button" className="ds-chip is-button" aria-pressed={fast} onClick={onFast} title={speedLabel}>
                <FastForward className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {speed}
            </button>
        </>
    );
}
