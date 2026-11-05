// All copy lives in translations/en.js and translations/pt.js, one file per
// language so the browser downloads only the one it shows (src/i18n/catalog.js,
// 2026-11-04: both together were ~90 KB gz of the boot path). This aggregate is
// for code that needs every language at once: api/ (render-meta, og images) and
// the tests. Never import it from browser code.
import en from './translations/en.js';
import pt from './translations/pt.js';

export const TRANSLATIONS = { en, pt };
