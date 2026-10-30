import fs from 'node:fs/promises';
import path from 'node:path';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Copies the sprites the app hotlinks into our Cloud Storage bucket, laid out
// the way src/utils/assetHost.js expects:
//
//   pokeapi/...   ← cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/...
//   showdown/...  ← play.pokemonshowdown.com/sprites/...
//
// Then VITE_ASSET_MIRROR_URL=https://storage.googleapis.com/<bucket> makes the
// app read from it. Incremental: files already in the bucket are skipped, so a
// re-run after a data refresh only uploads what's new. docs/modules/asset_mirror.md
//
// Run:  npm run assets:mirror                 (everything)
//       npm run assets:mirror -- --setup      (also: public read + CORS on the bucket)
//       npm run assets:mirror -- --only=items,trainers --dry-run --force
//
// Credentials: FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (the same service
// account api/ uses — `vercel env pull` brings them), or a key file via
// GOOGLE_APPLICATION_CREDENTIALS. Bucket: STORAGE_BUCKET or VITE_FIREBASE_STORAGE_BUCKET.

const POKEAPI_ORIGIN = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites';
const SHOWDOWN_ORIGIN = 'https://play.pokemonshowdown.com/sprites';
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
// Sprites change rarely but do change upstream (a fixed form, a new shiny),
// so a month rather than `immutable`.
const CACHE_CONTROL = 'public, max-age=2592000';
const CONCURRENCY = 16;
// AuthModal's animated greeters (src/components/modals/AuthModal.jsx).
const LOGIN_POKEMON = ['pikachu', 'eevee', 'charmander', 'gengar', 'squirtle', 'togepi', 'piplup', 'snivy'];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const DRY_RUN = flag('dry-run');
const FORCE = flag('force');

const readData = async (file) => JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf8'));

// ── What to mirror ──────────────────────────────────────────────────────────
// Every group is a list of paths relative to its origin; the bucket key is the
// prefix + that path. A path the origin 404s is skipped (not every form has a
// shiny or a Showdown gif) — the app falls back to the origin for it anyway.
async function collectGroups() {
    const { pokemons } = await readData('pokemon-index.json');
    const ids = [...new Set(pokemons.map((p) => p.id))].sort((a, b) => a - b);
    const { items } = await readData('items.json');
    const { trainers } = await readData('trainer-sprites.json');
    const gyms = await readData('gym-leaders.json');
    const trainerIds = new Set([
        ...trainers.map((t) => t.id),
        ...gyms.games.flatMap((g) => g.leaders.map((l) => l.sprite)).filter(Boolean),
        'cynthia', // the Champion Challenge's opponent
    ]);

    const pokemonPaths = (variant, ext) => ids.map((id) => `pokemon/${variant}${id}.${ext}`);
    return {
        pokemon: { prefix: 'pokeapi', origin: POKEAPI_ORIGIN, paths: [
            ...pokemonPaths('', 'png'),
            ...pokemonPaths('shiny/', 'png'),
        ] },
        artwork: { prefix: 'pokeapi', origin: POKEAPI_ORIGIN, paths: [
            ...pokemonPaths('other/official-artwork/', 'png'),
            ...pokemonPaths('other/official-artwork/shiny/', 'png'),
        ] },
        animated: { prefix: 'pokeapi', origin: POKEAPI_ORIGIN, paths: [
            ...pokemonPaths('other/showdown/', 'gif'),
            ...pokemonPaths('other/showdown/shiny/', 'gif'),
        ] },
        items: { prefix: 'pokeapi', origin: POKEAPI_ORIGIN, paths: items.map((i) => `items/${i.name}.png`) },
        trainers: { prefix: 'showdown', origin: SHOWDOWN_ORIGIN, paths: [
            ...[...trainerIds].map((id) => `trainers/${id}.png`),
            ...LOGIN_POKEMON.map((name) => `ani/${name}.gif`),
        ] },
    };
}

// ── Firebase ────────────────────────────────────────────────────────────────
function openBucket() {
    const bucketName = (process.env.STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
    if (!bucketName) throw new Error('Set STORAGE_BUCKET (or VITE_FIREBASE_STORAGE_BUCKET) to the bucket name.');
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const credential = clientEmail && privateKey
        ? cert({ projectId, clientEmail, privateKey })
        : applicationDefault();
    initializeApp({ credential, projectId, storageBucket: bucketName });
    return getStorage().bucket();
}

async function setupBucket(bucket) {
    // CORS: the share-card canvas (ShareSnippetModal) draws sprites with
    // crossOrigin='anonymous'; without this header the image taints the canvas.
    await bucket.setCorsConfiguration([{
        origin: ['*'],
        method: ['GET', 'HEAD'],
        responseHeader: ['Content-Type', 'Cache-Control'],
        maxAgeSeconds: 86400,
    }]);
    console.log('✓ CORS set (GET/HEAD from any origin)');

    // Public read on the whole bucket — it only holds these public sprites.
    // Uniform bucket-level access means IAM, not per-object ACLs.
    const [policy] = await bucket.iam.getPolicy({ requestedPolicyVersion: 3 });
    const role = 'roles/storage.objectViewer';
    const binding = policy.bindings.find((b) => b.role === role && !b.condition);
    if (binding?.members.includes('allUsers')) {
        console.log('✓ bucket already publicly readable');
    } else {
        if (binding) binding.members.push('allUsers');
        else policy.bindings.push({ role, members: ['allUsers'] });
        await bucket.iam.setPolicy(policy);
        console.log('✓ bucket made publicly readable (allUsers → Storage Object Viewer)');
    }
}

async function listExisting(bucket, prefix) {
    const [files] = await bucket.getFiles({ prefix: `${prefix}/`, autoPaginate: true });
    return new Set(files.map((f) => f.name));
}

const CONTENT_TYPES = { png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' };

async function mirrorOne(bucket, origin, key, rel) {
    const res = await fetch(`${origin}/${rel}`);
    if (res.status === 404) return 'missing';
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = Buffer.from(await res.arrayBuffer());
    if (DRY_RUN) return 'uploaded';
    await bucket.file(key).save(body, {
        resumable: false,
        contentType: CONTENT_TYPES[rel.split('.').pop()] || 'application/octet-stream',
        metadata: { cacheControl: CACHE_CONTROL },
    });
    return 'uploaded';
}

async function runPool(tasks, worker) {
    let next = 0;
    const run = async () => {
        while (next < tasks.length) await worker(tasks[next++]);
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, run));
}

async function main() {
    const bucket = openBucket();
    console.log(`Bucket: ${bucket.name}${DRY_RUN ? ' (dry run)' : ''}`);
    if (flag('setup')) await setupBucket(bucket);

    const groups = await collectGroups();
    const existingByPrefix = {};
    for (const [name, group] of Object.entries(groups)) {
        if (only && !only.includes(name)) continue;
        existingByPrefix[group.prefix] ??= FORCE ? new Set() : await listExisting(bucket, group.prefix);
        const existing = existingByPrefix[group.prefix];
        const todo = group.paths.filter((rel) => !existing.has(`${group.prefix}/${rel}`));
        const counts = { uploaded: 0, missing: 0, failed: 0 };
        console.log(`\n${name}: ${group.paths.length} files, ${todo.length} to fetch`);
        let done = 0;
        await runPool(todo, async (rel) => {
            try {
                counts[await mirrorOne(bucket, group.origin, `${group.prefix}/${rel}`, rel)] += 1;
            } catch (err) {
                counts.failed += 1;
                console.warn(`  ✗ ${rel}: ${err.message}`);
            }
            done += 1;
            if (done % 200 === 0) console.log(`  … ${done}/${todo.length}`);
        });
        console.log(`  ✓ ${counts.uploaded} uploaded, ${counts.missing} not at origin, ${counts.failed} failed`);
    }
    console.log(`\nVITE_ASSET_MIRROR_URL=https://storage.googleapis.com/${bucket.name}`);
}

main().catch((err) => {
    console.error(`\n✗ ${err.message}`);
    if (/default credentials/i.test(err.message)) {
        console.error('  No service account found. Firebase console → Project settings → Service accounts →');
        console.error('  "Generate new private key", save it OUTSIDE the repo, then run with');
        console.error('  GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json npm run assets:mirror');
    } else if (/permission|403|Forbidden/i.test(err.message)) {
        console.error('  The service account needs the "Storage Admin" role on this bucket (Google Cloud console → IAM).');
    }
    process.exit(1);
});
