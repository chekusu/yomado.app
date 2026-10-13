import config from '../../site.config.json';

/**
 * The website's languages, the same 16 as the film's subtitles (captions/index.json): English at
 * the root, every other one under its own folder. Each page exists once per language.
 */
export type Locale = 'en' | 'zh-cn' | 'zh-tw' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'it' | 'pt-br' | 'nl' | 'pl' | 'tr' | 'ar' | 'hi' | 'id';

/** Every locale, in the order the language menu lists them. English is the default at the root. */
export const LOCALES: Locale[] = ['en', 'zh-cn', 'zh-tw', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt-br', 'nl', 'pl', 'tr', 'ar', 'hi', 'id'];

export const SITE = config;
export const RELEASE = config.release;

/** Route prefix of each locale, relative to the site base. */
export const LOCALE_PATH = Object.fromEntries(LOCALES.map((l) => [l, l === 'en' ? '' : `${l}/`])) as Record<Locale, string>;

/** BCP 47 tags used for <html lang> and hreflang; each is also that language's subtitle tag. */
export const LOCALE_TAG: Record<Locale, string> = {
  en: 'en',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  'pt-br': 'pt-BR',
  nl: 'nl',
  pl: 'pl',
  tr: 'tr',
  ar: 'ar',
  hi: 'hi',
  id: 'id',
};

/** Arabic reads right to left; everything else left to right. */
export const LOCALE_DIR = (locale: Locale): 'rtl' | 'ltr' => (locale === 'ar' ? 'rtl' : 'ltr');

/** Chinese and Japanese run sentences together; the others put a space between them. */
export const SENTENCE_GAP = (locale: Locale) => (['zh-cn', 'zh-tw', 'ja'].includes(locale) ? '' : ' ');

/** Open Graph locales. */
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  'zh-cn': 'zh_CN',
  'zh-tw': 'zh_TW',
  ja: 'ja_JP',
  ko: 'ko_KR',
  es: 'es_ES',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  'pt-br': 'pt_BR',
  nl: 'nl_NL',
  pl: 'pl_PL',
  tr: 'tr_TR',
  ar: 'ar_AR',
  hi: 'hi_IN',
  id: 'id_ID',
};

/** Each language by its own name: in full for menus, short for the compact header. */
export const LOCALE_NAME: Record<Locale, { full: string; short: string }> = {
  en: { full: 'English', short: 'EN' },
  'zh-cn': { full: '简体中文', short: '简体' },
  'zh-tw': { full: '繁體中文', short: '繁體' },
  ja: { full: '日本語', short: '日本語' },
  ko: { full: '한국어', short: '한국어' },
  es: { full: 'Español', short: 'ES' },
  fr: { full: 'Français', short: 'FR' },
  de: { full: 'Deutsch', short: 'DE' },
  it: { full: 'Italiano', short: 'IT' },
  'pt-br': { full: 'Português (Brasil)', short: 'PT' },
  nl: { full: 'Nederlands', short: 'NL' },
  pl: { full: 'Polski', short: 'PL' },
  tr: { full: 'Türkçe', short: 'TR' },
  ar: { full: 'العربية', short: 'عربي' },
  hi: { full: 'हिन्दी', short: 'हिन्दी' },
  id: { full: 'Bahasa Indonesia', short: 'ID' },
};

/** Dates as each language writes them: Oct 11, 2026 · 2026年10月11日 · 11. Oktober 2026. */
const DATE_FORMAT: Record<Locale, { tag: string; month: 'short' | 'long' }> = {
  en: { tag: 'en-US', month: 'short' },
  'zh-cn': { tag: 'zh-CN', month: 'long' },
  'zh-tw': { tag: 'zh-TW', month: 'long' },
  ja: { tag: 'ja-JP', month: 'long' },
  ko: { tag: 'ko-KR', month: 'long' },
  es: { tag: 'es-ES', month: 'long' },
  fr: { tag: 'fr-FR', month: 'long' },
  de: { tag: 'de-DE', month: 'long' },
  it: { tag: 'it-IT', month: 'long' },
  'pt-br': { tag: 'pt-BR', month: 'long' },
  nl: { tag: 'nl-NL', month: 'long' },
  pl: { tag: 'pl-PL', month: 'long' },
  tr: { tag: 'tr-TR', month: 'long' },
  // Western digits, as the version numbers next to it.
  ar: { tag: 'ar-u-nu-latn', month: 'long' },
  hi: { tag: 'hi-IN', month: 'long' },
  id: { tag: 'id-ID', month: 'long' },
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

/** Decimal megabytes, as macOS Finder shows them, the way each language writes them: 2.1 MB · 2,1 Mo. */
export function formatSize(bytes: number, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(DATE_FORMAT[locale].tag, {
    style: 'unit',
    unit: 'megabyte',
    // Arabic's abbreviation is little used; the word is clear.
    unitDisplay: locale === 'ar' ? 'long' : 'short',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(bytes / 1_000_000);
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
    size: formatSize(RELEASE.bytes, locale),
    date: formatDate(RELEASE.publishedAt, locale),
    shortHash: `${RELEASE.sha256.slice(0, 8)}…${RELEASE.sha256.slice(-6)}`,
    appRepository: SITE.appRepository,
    siteRepository: SITE.siteRepository,
  };
}

export type ReleaseFacts = ReturnType<typeof releaseFacts>;
