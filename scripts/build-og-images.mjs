// npm run og:images — redraws public/og-image.png, the site's default link
// preview (index.html, api/og.js's fallback), from the same tree api/og.js
// draws the home card with, so the static file never drifts from the brand.
//
// npm run og:images -- --preview <dir>   also draws every card api/og.js
// can make, in both languages, into <dir> (the review sheet for a design pass).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
    renderDexCard, renderGuideCard, renderPageCard, renderPokemonCard, renderResultCard,
    renderTeamCard, renderTierListCard, renderTournamentTeamCard, renderTypeCard,
} from '../api/og.js';
import { PAGE_CARDS } from '../api/_lib/ogImage.js';
import { decodeChallengeResult, decodePuzzleResult, encodeChallengeResult } from '../src/utils/resultShareCode.js';
import { decodeTierList } from '../src/utils/tierList.js';
import { GUIDE_SLUGS } from '../src/content/guideIndex.js';

const root = process.cwd();
const save = async (file, png) => {
    if (!png) { console.warn(`  skipped ${file} (no card)`); return; }
    await writeFile(file, Buffer.from(png));
    console.log(`  ${path.relative(root, file)}`);
};

await save(path.join(root, 'public', 'og-image.png'), await renderPageCard('home', 'en'));

const at = process.argv.indexOf('--preview');
if (at > 0) {
    const dir = path.resolve(process.argv[at + 1] || 'og-preview');
    await mkdir(dir, { recursive: true });
    const b36 = (n) => n.toString(36);
    const tierCode = `t.starters.${[[7, 4], [1, 158], [152, 155], [252, 255], [258]].map((r) => r.map(b36).join('-')).join('.')}`;
    const team = { name: 'Rain Team VGC', pokemons: [
        { id: 6, name: 'charizard', types: ['fire', 'flying'] }, { id: 445, name: 'garchomp', types: ['dragon', 'ground'] },
        { id: 94, name: 'gengar', types: ['ghost', 'poison'] }, { id: 248, name: 'tyranitar', types: ['rock', 'dark'] },
        { id: 658, name: 'greninja', types: ['water', 'dark'] }, { id: 812, name: 'rillaboom', types: ['grass'] },
    ] };
    for (const language of ['en', 'pt']) {
        const out = (name) => path.join(dir, `${language}-${name}.png`);
        await save(out('home-square'), await renderPageCard('home', language, { square: true }));
        for (const key of Object.keys(PAGE_CARDS)) await save(out(`page-${key}`), await renderPageCard(key, language));
        await save(out('pokemon-garchomp'), await renderPokemonCard(445, language));
        await save(out('pokemon-pikachu'), await renderPokemonCard(25, language));
        await save(out('type-ghost'), await renderTypeCard('ghost', language));
        await save(out('move-flamethrower'), await renderDexCard('move', 'flamethrower', language));
        await save(out('ability-intimidate'), await renderDexCard('ability', 'intimidate', language));
        await save(out('item-leftovers'), await renderDexCard('item', 'leftovers', language));
        for (const slug of GUIDE_SLUGS) await save(out(`guide-${slug}`), await renderGuideCard(slug, language));
        await save(out('tournament-team'), await renderTournamentTeamCard(process.argv[at + 2] || '7300801d5d05770f', language));
        await save(out('shared-team'), await renderTeamCard(team, language));
        await save(out('result-puzzle-won'), await renderResultCard('puzzle', decodePuzzleResult('312.w.8.apcaa-pcpaa-ccpca-ccccc'), language));
        await save(out('result-challenge-won'), await renderResultCard('challenge', decodeChallengeResult(encodeChallengeResult({ dayKey: '2026-11-16', won: true, turns: 14, remaining: 2, score: 860, streak: 5, difficulty: 'platinum', spark: '▃▄▃▅▆▄▆▇█' })), language));
        await save(out('result-challenge-lost'), await renderResultCard('challenge', decodeChallengeResult(encodeChallengeResult({ dayKey: '2026-11-16', won: false, turns: 22, remaining: 0, score: 310, streak: 0, difficulty: 'platinum', spark: '▆▅▄▄▃▂▂▁' })), language));
        await save(out('tierlist'), await renderTierListCard(decodeTierList(tierCode), language));
    }
}
