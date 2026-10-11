import config from '../../site.config.json';

export type Locale = 'en' | 'zh-cn' | 'ja';

/** Every locale, in the order the language menu lists them. English is the default at the root. */
export const LOCALES: Locale[] = ['en', 'zh-cn', 'ja'];

export const SITE = config;
export const RELEASE = config.release;

/** Route prefix of each locale, relative to the site base. */
export const LOCALE_PATH: Record<Locale, string> = { en: '', 'zh-cn': 'zh-cn/', ja: 'ja/' };

/** BCP 47 tags used for <html lang> and hreflang. */
export const LOCALE_TAG: Record<Locale, string> = { en: 'en', 'zh-cn': 'zh-CN', ja: 'ja' };

/** Open Graph locales. */
export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', 'zh-cn': 'zh_CN', ja: 'ja_JP' };

/** Each language by its own name: in full for menus, short for the compact header. */
export const LOCALE_NAME: Record<Locale, { full: string; short: string }> = {
  en: { full: 'English', short: 'EN' },
  'zh-cn': { full: '简体中文', short: '中文' },
  ja: { full: '日本語', short: '日本語' },
};

/** Dates as each language writes them: Oct 11, 2026 · 2026年10月11日. */
const DATE_FORMAT: Record<Locale, { tag: string; month: 'short' | 'long' }> = {
  en: { tag: 'en-US', month: 'short' },
  'zh-cn': { tag: 'zh-CN', month: 'long' },
  ja: { tag: 'ja-JP', month: 'long' },
};

/** A site-relative path joined onto the build's base, e.g. '/', '/zh-cn/' or '/preview/zh-cn/'. */
export function withBase(path = ''): string {
  return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`;
}

/**
 * Link to a locale's version of a page ('' for home, 'details/'). The bare home page follows the
 * browser's language, so a link to the English home says ?lang=en: choosing English then sticks
 * even where storage is off. Canonical and hreflang URLs stay without it.
 */
export function localeHref(locale: Locale, route = ''): string {
  return withBase(LOCALE_PATH[locale] + route) + (locale === 'en' && route === '' ? '?lang=en' : '');
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
  const { tag, month } = DATE_FORMAT[locale];
  return new Intl.DateTimeFormat(tag, { year: 'numeric', month, day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
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
