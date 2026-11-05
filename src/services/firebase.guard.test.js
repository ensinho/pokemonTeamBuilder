import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * services/firebase.js initialises Auth without the popup/redirect resolver
 * (2026-10-30): getAuth() adds it, and it loads apis.google.com, gapi and the
 * auth iframe (~135 KB, two origins) on every boot for sign-in methods the
 * app does not use. These keep both halves true: nobody brings getAuth()
 * back, and a popup/redirect sign-in added later passes the resolver itself.
 */
const sourceFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [path] : [];
});

const POPUP_OR_REDIRECT = /\b(signInWithPopup|signInWithRedirect|linkWithPopup|linkWithRedirect|reauthenticateWithPopup|reauthenticateWithRedirect|getRedirectResult)\(/;

describe('Firebase Auth boots without the popup/redirect resolver', () => {
    const root = process.cwd();
    const files = sourceFiles(join(root, 'src')).map((file) => ({
        file: relative(root, file).replaceAll('\\', '/'),
        // Comments may name these functions (this rule's own explanation does).
        code: readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''),
    }));

    it('creates Auth with initializeAuth, never getAuth', () => {
        expect(files.filter(({ code }) => /\bgetAuth\(/.test(code)).map(({ file }) => file)).toEqual([]);
        const service = files.find(({ file }) => file === 'src/services/firebase.js').code;
        expect(service).toMatch(/initializeAuth\(app,/);
        expect(service).not.toMatch(/popupRedirectResolver/);
    });

    it('passes the resolver at the call site of any popup or redirect sign-in', () => {
        const offenders = files
            .filter(({ code }) => POPUP_OR_REDIRECT.test(code) && !/browserPopupRedirectResolver/.test(code))
            .map(({ file }) => file);
        expect(offenders).toEqual([]);
    });
});
