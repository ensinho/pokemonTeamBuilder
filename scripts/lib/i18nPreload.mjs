/**
 * Starts the download of the visitor's translation chunk with the page
 * (2026-11-04).
 *
 * Copy is split per language (src/i18n/catalog.js) and main.jsx loads the
 * arrival language before the first render. Left alone, the browser would only
 * learn that chunk's URL after the entry had downloaded and run — one round
 * trip late. This writes a tiny inline script at the top of <head> that guesses
 * the language the same way useLanguageStore does (a saved choice, then the
 * /pt prefix, then the browser) and adds a modulepreload for that chunk with
 * the hashed name the build gave it. A wrong guess costs nothing but the
 * preload: catalog.js still imports the right file.
 */
export function i18nPreload(languages = ['en', 'pt']) {
    let base = '/';
    return {
        name: 'i18n-preload',
        apply: 'build',
        configResolved(config) {
            base = config.base;
        },
        transformIndexHtml: {
            order: 'post',
            handler(html, ctx) {
                const chunks = Object.values(ctx.bundle || {});
                const urls = Object.fromEntries(languages.map((language) => {
                    const chunk = chunks.find((c) => c.type === 'chunk'
                        && c.facadeModuleId?.replaceAll('\\', '/').endsWith(`/src/constants/translations/${language}.js`));
                    if (!chunk) throw new Error(`i18nPreload: no chunk for translations/${language}.js — is it still imported lazily by src/i18n/catalog.js?`);
                    return [language, `${base}${chunk.fileName}`];
                }));
                const script = `<script>(function(){try{var m=${JSON.stringify(urls)},r=${JSON.stringify(base.replace(/\/$/, ''))},l=null;`
                    + `try{l=localStorage.getItem('language')}catch(e){}`
                    + `if(!m[l]){var p=location.pathname;if(r&&p.indexOf(r)===0)p=p.slice(r.length)||'/';`
                    + `l=/^\\/pt(\\/|$)/.test(p)||(navigator.language||'').toLowerCase().indexOf('pt')===0?'pt':'en'}`
                    + `var k=document.createElement('link');k.rel='modulepreload';k.crossOrigin='';k.href=m[l];document.head.appendChild(k)}catch(e){}})()</script>`;
                return html.replace(/<head>/, `<head>\n    ${script}`);
            },
        },
    };
}
