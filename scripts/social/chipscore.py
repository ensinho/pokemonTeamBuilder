#!/usr/bin/env python3
"""
chipscore.py - compose a reel's own soundtrack from a small JSON spec.

Every reel gets a score cut to its edit instead of a stock bed: the spec names
the tempo, the chords and, bar by bar, which layers play, so the drop lands on
the reveal by construction. The sound is four-voice chiptune (square, triangle,
noise) because that is the handheld games' own material. Melodies are written
in the spec and must be original: never transcribe a tune from the games.

    python3 scripts/social/chipscore.py score.json --out assets/music/score.wav

Writes the WAV plus `<out>.cues.json` (beat times, bar times, a per-frame kick
envelope at 30 fps) for beat-locking and audio-reactive motion. Needs numpy
(not a project dependency): `python3 -m venv .venv && .venv/bin/pip install numpy`.
See docs/modules/social_media.md.
"""
import argparse
import json
import wave

import numpy as np

SR = 44100
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
        'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def midi(name):
    """'D5' / 'Bb3' / 'C#6' -> MIDI number."""
    pitch, octave = name[:-1], int(name[-1])
    return 12 * (octave + 1) + NOTE[pitch]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def chord_tones(name, octave):
    """'Dm' -> root, third, fifth as MIDI numbers in the given octave."""
    minor = name.endswith('m')
    root = 12 * (octave + 1) + NOTE[name[:-1] if minor else name]
    return [root, root + (3 if minor else 4), root + 7]


def env(n, attack, decay, sustain=0.0, release=0.01):
    """Attack / exponential decay to a sustain level / short release, n samples."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = sustain + (1 - sustain) * np.exp(-np.maximum(t - attack, 0) / max(decay, 1e-4))
    r = np.clip((n / SR - t) / max(release, 1e-4), 0, 1)
    return a * d * r


def square(freq, n, duty=0.5, vibrato=0.0):
    t = np.arange(n) / SR
    phase = freq * t + (vibrato * np.sin(2 * np.pi * 5.5 * t) if vibrato else 0)
    return np.where((phase % 1.0) < duty, 1.0, -1.0)


def triangle(freq, n):
    t = np.arange(n) / SR
    return 2 * np.abs(2 * ((freq * t) % 1.0) - 1) - 1


def lowpass(x, cutoff):
    """One-pole low-pass: takes the edge off the squares."""
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


def echo(x, delay_s, feedback=0.35, taps=3):
    out = x.copy()
    d = int(delay_s * SR)
    for k in range(1, taps + 1):
        if k * d < len(x):
            out[k * d:] += x[:len(x) - k * d] * feedback ** k
    return out


class Track:
    def __init__(self, seconds):
        self.buf = np.zeros(int(seconds * SR) + SR)

    def add(self, at, sig, gain=1.0):
        i = int(at * SR)
        if i >= len(self.buf):
            return
        sig = sig[:len(self.buf) - i]
        self.buf[i:i + len(sig)] += sig * gain


def kick(rng):
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    click = rng.uniform(-1, 1, n) * np.exp(-t / 0.004) * 0.3
    return body + click


def snare(rng):
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    noise = noise - lowpass(noise, 1800)
    return noise * np.exp(-t / 0.05) * 0.9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03) * 0.5


def hat(rng, length=0.035):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    return (noise - lowpass(noise, 6000)) * np.exp(-t / (length / 3))


def riser(rng, seconds):
    n = int(seconds * SR)
    t = np.arange(n) / n
    noise = rng.uniform(-1, 1, n)
    tone = square(220 * 2 ** (t * 2), n, 0.25) * 0.25
    return (noise - lowpass(noise, 2500)) * t ** 2 * 0.6 + tone * t ** 2


def compose(spec):
    rng = np.random.default_rng(spec.get('seed', 7))
    bpm, bars = spec['bpm'], spec['bars']
    beat = 60.0 / bpm
    step = beat / 4
    bar_len = beat * 4
    total = bars * bar_len + spec.get('tail', 0.6)
    chords = spec['chords']

    drums, bass, arp, bell, lead, fx = (Track(total) for _ in range(6))
    kick_times = []
    section_of = {}
    for s in spec['sections']:
        for b in range(s['bars'][0], s['bars'][1] + 1):
            section_of[b] = s

    for b in range(1, bars + 1):
        s = section_of.get(b, {})
        t0 = (b - 1) * bar_len
        chord = chords[(b - 1) % len(chords)]
        for i, c in enumerate(s.get('kick', '')):
            if c == 'x':
                drums.add(t0 + i * step, kick(rng), 1.0)
                kick_times.append(t0 + i * step)
        for i, c in enumerate(s.get('snare', '')):
            if c == 'x':
                drums.add(t0 + i * step, snare(rng), 0.55)
        for i, c in enumerate(s.get('hat', '')):
            if c in 'xo':
                drums.add(t0 + i * step, hat(rng, 0.09 if c == 'o' else 0.035), 0.22 if c == 'o' else 0.16)
        root = chord_tones(chord, 2)[0]
        for i, c in enumerate(s.get('bass', '')):
            if c in 'xo':
                n = int(step * 1.7 * SR)
                m = root + (12 if c == 'o' else 0)
                bass.add(t0 + i * step, triangle(hz(m), n) * env(n, 0.004, 0.16, 0.25), 0.8)
        if s.get('arp'):
            tones = chord_tones(chord, 4)
            order = [tones[0], tones[2], tones[0] + 12, tones[1] + 12]
            for i in range(16):
                n = int(step * 0.9 * SR)
                arp.add(t0 + i * step, square(hz(order[i % 4]), n, 0.25) * env(n, 0.002, 0.05), s.get('arp_gain', 0.16))
        if s.get('bell'):
            tones = chord_tones(chord, 5)
            order = [tones[0] + 12, tones[2], tones[1], tones[2]]
            for i in range(4):
                n = int(beat * 1.6 * SR)
                bell.add(t0 + i * beat, triangle(hz(order[i]), n) * env(n, 0.003, 0.22), 0.4)
        for i, name in enumerate(spec.get('lead', {}).get(str(b), [])):
            if name:
                n = int(step * 2 * 0.92 * SR)
                lead.add(t0 + i * step * 2, square(hz(midi(name)), n, 0.5, vibrato=0.012) * env(n, 0.004, 0.2, 0.55), 0.22)
        for hit in s.get('stabs', []):
            for m in chord_tones(chord, 4) + [chord_tones(chord, 2)[0]]:
                n = int(beat * 2.2 * SR)
                fx.add(t0 + hit * beat, square(hz(m), n, 0.5) * env(n, 0.003, 0.35), 0.12)
        for i, name in enumerate(s.get('blips', [])):
            if name:
                n = int(beat * 0.5 * SR)
                fx.add(t0 + i * beat, square(hz(midi(name)), n, 0.5) * env(n, 0.002, 0.12), 0.3)
                drums.add(t0 + i * beat, kick(rng), 1.0)
                kick_times.append(t0 + i * beat)
        if s.get('riser'):
            start, length = s['riser']
            fx.add(t0 + start * beat, riser(rng, length * beat), 0.35)

    mix = (drums.buf * 0.9 + lowpass(bass.buf, 900) * 0.9 + lowpass(arp.buf, 5200)
           + echo(bell.buf, step * 3, 0.4) + echo(lowpass(lead.buf, 6500), step * 3, 0.3) + lowpass(fx.buf, 7000))
    mix = mix[:int(total * SR)]
    fade = int(0.35 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix = np.tanh(mix * 1.15)
    mix = mix / np.max(np.abs(mix)) * 0.89

    frames = int(total * 30) + 1
    kick_env = np.zeros(frames)
    for kt in kick_times:
        for f in range(int(kt * 30), min(frames, int(kt * 30) + 9)):
            kick_env[f] = max(kick_env[f], float(np.exp(-(f / 30 - kt) / 0.09)) if f / 30 >= kt else 0.0)
    cues = {
        'bpm': bpm, 'beat': round(beat, 5), 'bar': round(bar_len, 5), 'duration': round(total, 3),
        'bars': [round((b - 1) * bar_len, 3) for b in range(1, bars + 1)],
        'beats': [round(i * beat, 3) for i in range(bars * 4)],
        'fps': 30, 'kick': [round(float(v), 3) for v in kick_env],
    }
    return mix, cues


def main():
    ap = argparse.ArgumentParser(description="Compose a reel's chiptune score from a JSON spec.")
    ap.add_argument('spec')
    ap.add_argument('--out', required=True, help='WAV path; cues go beside it as <out>.cues.json')
    a = ap.parse_args()
    mix, cues = compose(json.load(open(a.spec, encoding='utf-8')))
    pcm = (mix * 32767).astype('<i2')
    with wave.open(a.out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(np.column_stack([pcm, pcm]).tobytes())
    json.dump(cues, open(a.out + '.cues.json', 'w'))
    print(f"{a.out}: {cues['duration']}s at {cues['bpm']} BPM, {len(cues['beats'])} beats")


if __name__ == '__main__':
    main()
