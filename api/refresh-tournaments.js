// Vercel Cron target: triggers a redeploy once a day so the build re-scrapes the
// latest VGC tournament teams (the scrape runs in `prebuild`). Keeps the static
// data fresh without committing to the repo.
//
// Required env:
//   DEPLOY_HOOK_URL — a Vercel Deploy Hook URL (Project → Settings → Git → Deploy Hooks)
//   CRON_SECRET     — optional; when set, Vercel Cron sends it as a Bearer token,
//                     and we reject any request that doesn't match.

export default async function handler(req, res) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.authorization || '';
        if (auth !== `Bearer ${secret}`) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
    }

    const hook = process.env.DEPLOY_HOOK_URL;
    if (!hook) {
        res.status(500).json({ error: 'DEPLOY_HOOK_URL is not configured.' });
        return;
    }

    try {
        const response = await fetch(hook, { method: 'POST' });
        res.status(200).json({ ok: true, triggered: response.ok, status: response.status });
    } catch (err) {
        res.status(502).json({ error: 'Failed to trigger the deploy hook.' });
    }
}
