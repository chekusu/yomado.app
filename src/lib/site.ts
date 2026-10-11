import config from '../../site.config.json';

export type Locale = 'en' | 'zh-cn';

export const LOCALES: Locale[] = ['en', 'zh-cn'];

export const SITE = config;
export const RELEASE = config.release;

/** Route prefix of each locale, relative to the site base. */
export const LOCALE_PATH: Record<Locale, string> = { en: '', 'zh-cn': 'zh-cn/' };

/** BCP 47 tags used for <html lang>, hreflang and Open Graph. */
export const LOCALE_TAG: Record<Locale, string> = { en: 'en', 'zh-cn': 'zh-CN' };

/** A site-relative path joined onto the build's base, e.g. '/', '/zh-cn/' or '/preview/zh-cn/'. */
export function withBase(path = ''): string {
  return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`;
}

/** Absolute canonical URL on the configured production origin. */
export function canonical(path = ''): string {
  return new URL(path.replace(/^\//, ''), `${config.siteUrl.replace(/\/?$/, '/')}`).href;
}

/** Decimal megabytes, as macOS Finder shows them. */
export function formatSize(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'zh-cn' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: locale === 'zh-cn' ? 'long' : 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** Release facts every locale interpolates into its copy. */
export function releaseFacts(locale: Locale) {
  return {
    ...RELEASE,
    size: formatSize(RELEASE.bytes),
    date: formatDate(RELEASE.publishedAt, locale),
    shortHash: `${RELEASE.sha256.slice(0, 8)}…${RELEASE.sha256.slice(-6)}`,
    appRepository: SITE.appRepository,
    siteRepository: SITE.siteRepository,
  };
}

export type ReleaseFacts = ReturnType<typeof releaseFacts>;
