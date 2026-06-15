import { isRunningInDiscord } from './discord';

/**
 * Actually adding a comment mysefl because I tend to forget how these work:
 * resolveExternalUrl changes url to:
 *   - proxied path if running on discord
 *   - true url if running on browser
 * This is independend on whether the original url is proxied or not. Kinda like a
 * 2 way conversion thingy
 *
 * toExternalUrl works similarly but only returns true urls independently of whether
 * the original is proxied or not. Useful for when we want ACTUAL external links
 * within the discord activity (for navigation using the SDK)
 *
 * toProxiedUrl behavior spec is left as an excercise for the reader
 * :) 
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const MAPPINGS = [
  {
    external: SUPABASE_URL,
    proxy: '',
    matchExternal: (url: string) => SUPABASE_URL && url.startsWith(SUPABASE_URL),
    matchProxy: (url: string) =>
      url.startsWith('/storage/v1/') || url.startsWith('/rest/v1/'),
  },
  {
    external: 'https://img.icons8.com',
    proxy: '/external/icons8',
  },
  {
    external: 'https://bucket.ultrakidle.online',
    proxy: '/external/infernoguessr-images',
  },
  {
    external: 'https://cgimages.ultrakidle.online',
    proxy: '/external/ig-cg-images',
  },
  {
    external: 'https://proxy.ultrakidle.online',
    proxy: '/external/proxy',
  },
  {
    external: 'https://cdn.prod.website-files.com',
    proxy: '/external/kofi',
  },
  {
    external: 'https://ultrakill.wiki.gg',
    proxy: '/external/wiki',
  },
];

export function toExternalUrl(url: string): string {
  if (!url) return url;

  for (const { external, proxy, matchProxy } of MAPPINGS) {
    const isMatch = matchProxy ? matchProxy(url) : url.startsWith(proxy + '/');

    if (isMatch) {
      return url.replace(proxy, external);
    }
  }

  return url;
}

export function toProxiedUrl(url: string): string {
  if (!url) return url;

  for (const { external, proxy, matchExternal } of MAPPINGS) {
    const isMatch = matchExternal
      ? matchExternal(url)
      : external && url.startsWith(external);

    if (isMatch && external) {
      const baseUrl = external.endsWith('/') ? external.slice(0, -1) : external;
      return url.replace(baseUrl, proxy);
    }
  }

  return url;
}

export function resolveExternalUrl(url: string): string {
  if (!url) return url;

  if (isRunningInDiscord()) {
    return toProxiedUrl(url);
  }

  return toExternalUrl(url);
}

export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};
