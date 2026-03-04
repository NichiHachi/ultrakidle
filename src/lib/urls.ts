import { isRunningInDiscord } from './discord';

/**
 * Resolves an external URL.
 * If running in Discord, it uses the local proxy path defined in vite.config.ts.
 * If running in a normal browser (production on Render), it resolves to the direct external URL.
 */
export function resolveExternalUrl(url: string): string {
    if (!url) return url;

    // If we are in Discord, we need the proxy to bypass CSP
    if (isRunningInDiscord()) {
        return url;
    }

    // If not in Discord, we need to resolve to the direct URL because the /external proxy
    // only exists in the Vite dev/preview server, not in the production build on Render.

    // Handle Ko-fi proxy
    if (url.startsWith('/external/kofi/')) {
        return `https://cdn.prod.website-files.com/${url.replace('/external/kofi/', '')}`;
    }

    // Handle Wiki proxy
    if (url.startsWith('/external/wiki/')) {
        return `https://ultrakill.wiki.gg/${url.replace('/external/wiki/', '')}`;
    }

    return url;
}
