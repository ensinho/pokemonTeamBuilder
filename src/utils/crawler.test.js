import { describe, expect, it } from 'vitest';
import { isCrawler } from './crawler';

describe('isCrawler', () => {
    it('recognises search engines, preview fetchers and headless browsers', () => {
        for (const ua of [
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
            'WhatsApp/2.23.20.0',
            'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
            'facebookexternalhit/1.1',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36',
        ]) expect(isCrawler(ua), ua).toBe(true);
    });

    it('lets people through', () => {
        for (const ua of [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        ]) expect(isCrawler(ua), ua).toBe(false);
    });
});
