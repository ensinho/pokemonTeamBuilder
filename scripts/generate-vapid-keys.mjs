#!/usr/bin/env node
/**
 * Print a fresh VAPID key pair for Web Push (`npm run push:keys`).
 *
 * The pair identifies *this deployment* to the browsers' push services. It is
 * generated once and then lives in the environment, never in the repo:
 *
 *   VITE_VAPID_PUBLIC_KEY   client + server (it is public by design)
 *   VAPID_PRIVATE_KEY       server only
 *   VAPID_SUBJECT           mailto: address the push services can complain to
 *
 * Rotating the pair invalidates every existing subscription — each one is
 * bound to the public key it was created with — so trainers would have to
 * re-enable notifications. Generate once, keep it.
 */
import webPush from 'web-push';

const { publicKey, privateKey } = webPush.generateVAPIDKeys();

console.log('\nAdd these to your Vercel project environment (and your local .env):\n');
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:you@example.com\n');
console.log('Keep the private key secret; the public one ships in the bundle.\n');
