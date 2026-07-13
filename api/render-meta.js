import fs from 'fs';
import path from 'path';

// Cache the pokemon index in memory across lambda invocations
let pokemons = [];
try {
    const jsonPath = path.join(process.cwd(), 'dist', 'data', 'pokemon-index.json');
    if (fs.existsSync(jsonPath)) {
        const data = fs.readFileSync(jsonPath, 'utf8');
        pokemons = JSON.parse(data).pokemons || [];
        console.log(`Loaded ${pokemons.length} Pokémon for dynamic meta tags.`);
    } else {
        console.warn("pokemon-index.json not found in dist, meta titles may use fallbacks.");
    }
} catch (e) {
    console.error("Failed to load pokemon-index.json in render-meta:", e);
}

function formatName(name) {
    if (!name) return '';
    // Special formatting for known competitive suffixes or forms
    return name
        .split('-')
        .map(word => {
            if (!word) return '';
            // keep small words lowercase unless they are at the start
            if (['of', 'the', 'in'].includes(word.toLowerCase())) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

function findPokemon(param) {
    if (!param) return null;
    const cleanParam = decodeURIComponent(param).toLowerCase().trim().replace(/\s+/g, '-');
    if (/^\d+$/.test(cleanParam)) {
        const id = parseInt(cleanParam, 10);
        return pokemons.find(p => p.id === id) || null;
    }
    return pokemons.find(p => p.name.toLowerCase() === cleanParam) || null;
}

export default async function handler(req, res) {
    const urlPath = req.url.split('?')[0]; // Strip search query params
    
    // Read the compiled index.html file
    let html = '';
    const htmlPath = path.join(process.cwd(), 'dist', 'index.html');
    
    try {
        if (fs.existsSync(htmlPath)) {
            html = fs.readFileSync(htmlPath, 'utf8');
        } else {
            console.error("Compiled index.html not found at:", htmlPath);
            return res.status(404).send("Application shell not found. Please trigger a deployment build.");
        }
    } catch (err) {
        console.error("Error reading index.html in serverless function:", err);
        return res.status(500).send("Internal Server Error: " + err.message);
    }
    
    // Default site values
    let title = "Pokémon Team Builder";
    let description = "Build and share competitive Pokémon teams with a full Pokédex, damage calculator, speed tiers, Smogon sets, and real tournament usage stats.";
    let imageUrl = "https://pokemonbuilder.app/og-image.png";
    let url = `https://pokemonbuilder.app${urlPath}`;
    
    // Dynamic metadata routing
    if (urlPath === '/pokepuzzle') {
        title = "Daily PokePuzzle | Pokémon Team Builder";
        description = "Solve the daily PokePuzzle! Guess the Pokémon of the day from its types, stats, height, and weight. Play here!";
        imageUrl = "https://pokemonbuilder.app/pokepuzzle-og.png";
    } 
    else if (urlPath.startsWith('/pokemon/')) {
        const param = urlPath.split('/')[2];
        const pokemon = findPokemon(param);
        if (pokemon) {
            const name = formatName(pokemon.name);
            const typesStr = pokemon.types.map(t => formatName(t)).join('/');
            title = `${name} | Pokédex | Pokémon Team Builder`;
            description = `${name}: ${typesStr}-type Pokémon. View base stats, competitive Smogon movesets, speed tiers, type matchups, and real-time tournament usage stats in Pokémon Team Builder.`;
            imageUrl = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
        } else if (param) {
            const friendlyName = formatName(param);
            title = `${friendlyName} | Pokédex | Pokémon Team Builder`;
            description = `View stats, competitive movesets, speed tiers, type matchups, and tournament usage statistics for ${friendlyName} in Pokémon Team Builder.`;
        }
    }
    else if (urlPath.startsWith('/meta/')) {
        const param = urlPath.split('/')[2];
        const pokemon = findPokemon(param);
        if (pokemon) {
            const name = formatName(pokemon.name);
            title = `${name} Meta & Usage | Pokémon Team Builder`;
            description = `View competitive usage stats, common teammates, movesets, items, abilities, and popular tournament builds for ${name}.`;
            imageUrl = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
        }
    }
    else if (urlPath === '/pokedex') {
        title = "Pokédex & Database | Pokémon Team Builder";
        description = "Search the full Pokédex, filter by type or generation, and view stats, movesets, and competitive usage details.";
    }
    else if (urlPath === '/tournaments') {
        title = "Tournament Teams | Pokémon Team Builder";
        description = "Browse real competitive Pokémon VGC teams from major tournaments. Import them directly into the builder with one click.";
    }
    else if (urlPath === '/damage-calculator') {
        title = "Damage Calculator | Pokémon Team Builder";
        description = "Calculate damage rolls between Pokémon using competitive VGC/Smogon formats. Fully integrated with active team editing.";
    }
    else if (urlPath === '/speed-tiers') {
        title = "Speed Tiers | Pokémon Team Builder";
        description = "Compare speeds of all Pokémon under different boosts, tailwind, trick room, and EV spreads to plan your match ups.";
    }
    else if (urlPath.startsWith('/tournaments/team/')) {
        title = "Tournament Team Detail | Pokémon Team Builder";
        description = "Inspect type coverage, offensive strengths, movesets, and player placements for this VGC tournament team.";
    }
    else if (urlPath.startsWith('/teams/')) {
        title = "Shared Team | Pokémon Team Builder";
        description = "View details of this shared Pokémon team. Import it directly into your builder with one click.";
    }
    
    // Inject dynamic metadata tags in index.html
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
    html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${description}" />`);
    
    // OG Meta tags
    html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
    html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${imageUrl}" />`);
    html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${url}" />`);
    
    // Twitter Meta tags
    html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
    html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);
    html = html.replace(/<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${imageUrl}" />`);
    
    // Set caching and return HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache at the Edge for 1 day, stale-while-revalidate for 1 hour to allow rapid updates
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');
    
    return res.status(200).send(html);
}
