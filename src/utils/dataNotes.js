/**
 * "Where does this data come from?" for Best teams and Meta & usage
 * (2026-10-30): the paragraphs both pages show under their lists, and that
 * api/_lib/seoSnapshot.js writes into their HTML — one function, so the page
 * and the crawler read the same sentences with the same numbers. Answer
 * engines quote a source that states its method; these pages had numbers and
 * no method.
 *
 * Pure and Node-safe.
 */
import { translate } from './translateCore.js';
import { LOCALE_TAG } from './localePath.js';

const number = (n, language) => Number(n).toLocaleString(LOCALE_TAG[language]);

/** "2026-09" → "September 2026" / "setembro de 2026"; anything else as given. */
export function monthLabel(yearMonth, language) {
    if (!/^\d{4}-\d{2}$/.test(String(yearMonth || ''))) return yearMonth || '';
    return new Intl.DateTimeFormat(LOCALE_TAG[language], { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(`${yearMonth}-15T12:00:00Z`));
}

/** An ISO timestamp's calendar day, written out ("Oct 29, 2026" / "29 de out. de 2026"). */
export function dayLabel(iso, language) {
    const day = String(iso || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
    return new Intl.DateTimeFormat(LOCALE_TAG[language], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(`${day}T12:00:00Z`));
}

/** Best teams: where the teams come from, what is counted, how fresh it is. */
export function bestTeamsNotes({ total, events, format, generatedAt }, language) {
    const t = (key, params) => translate(language, `dataNotes.bestTeams.${key}`, params);
    const date = dayLabel(generatedAt, language);
    return [
        t('source'),
        t('counted', { total: number(total || 0, language), events: number(events || 0, language), format: format || 'VGC' }),
        date ? t('freshness', { date }) : null,
    ].filter(Boolean);
}

/**
 * Meta & usage, for the format on screen: the ladder sample (when the format
 * has one), the tournament merge (VGC only) and how often each source moves.
 */
export function metaNotes({ format, battles, month, kind }, language) {
    const t = (key, params) => translate(language, `dataNotes.meta.${key}`, params);
    return [
        battles && format ? t('ladder', { battles: number(battles, language), format, month: monthLabel(month, language) }) : null,
        kind === 'vgc' ? t('tournaments') : null,
        t('freshness'),
    ].filter(Boolean);
}
