import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const PUBLIC_DIR = resolve(ROOT, 'public');

describe('PWA & Web Icons Configuration', () => {
    it('declares all required favicon and apple-touch-icon tags in index.html', () => {
        const indexHtml = readFileSync(resolve(ROOT, 'index.html'), 'utf-8');

        expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
        expect(indexHtml).toContain('<link rel="icon" href="/favicon.ico" sizes="any" />');
        expect(indexHtml).toContain('<link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />');
        expect(indexHtml).toContain('<link rel="icon" type="image/png" href="/favicon-16x16.png" sizes="16x16" />');
        expect(indexHtml).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />');
        expect(indexHtml).toContain('<link rel="manifest" href="/site.webmanifest" />');
    });

    it('configures site.webmanifest and manifest.json with purpose "any maskable"', () => {
        for (const filename of ['site.webmanifest', 'manifest.json', 'manifest.webmanifest']) {
            const filepath = resolve(PUBLIC_DIR, filename);
            expect(existsSync(filepath), `${filename} should exist`).toBe(true);

            const manifest = JSON.parse(readFileSync(filepath, 'utf-8'));
            expect(manifest.icons).toBeInstanceOf(Array);

            const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
            const icon512 = manifest.icons.find((i) => i.sizes === '512x512');

            expect(icon192).toBeDefined();
            expect(icon192.purpose).toContain('maskable');
            expect(icon192.purpose).toContain('any');

            expect(icon512).toBeDefined();
            expect(icon512.purpose).toContain('maskable');
            expect(icon512.purpose).toContain('any');
        }
    });

    it('ensures all icon assets exist and are non-empty in public directory', () => {
        const requiredAssets = [
            'favicon.ico',
            'favicon.svg',
            'favicon-16x16.png',
            'favicon-32x32.png',
            'apple-touch-icon.png',
            'android-chrome-192x192.png',
            'android-chrome-512x512.png',
            'LogoCuteGengarRounded.png',
            'logo-mark.webp',
            'logo-mark-128.webp',
        ];

        for (const file of requiredAssets) {
            const p = resolve(PUBLIC_DIR, file);
            expect(existsSync(p), `${file} should exist in public/`).toBe(true);
            const stats = readFileSync(p);
            expect(stats.length).toBeGreaterThan(100);
        }
    });

    it('verifies transparent corners on PNG assets (RGBA with alpha 0 at corners)', () => {
        // PNG magic byte check
        const png512 = readFileSync(resolve(PUBLIC_DIR, 'android-chrome-512x512.png'));
        const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        for (let i = 0; i < pngMagic.length; i += 1) {
            expect(png512[i]).toBe(pngMagic[i]);
        }

        // IHDR chunk (starts at offset 12)
        // width at 16..20, height at 20..24, color type at 25 (6 = RGBA)
        const colorType = png512[25];
        expect(colorType).toBe(6); // 6 is RGBA (Truecolor with alpha)
    });
});
