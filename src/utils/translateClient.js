import { getTable } from '../i18n/catalog.js';
import { translateFrom } from './translateResolve.js';

/**
 * translateCore.js for the browser (swapped in by vite.config.js). Same
 * signature, but it reads the tables the catalog has loaded instead of
 * importing both languages into the boot path. main.jsx loads the visitor's
 * language before the first render, so every call from the UI finds it.
 */
export function translate(language, path, params = {}) {
    return translateFrom(getTable(language), getTable('en'), path, params);
}
