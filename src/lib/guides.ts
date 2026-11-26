/**
 * Guides: pages that answer what people ask a search engine or an AI assistant before they know
 * yomado's name ("give an AI agent its own screen on a Mac", "Codex computer use in Blender").
 * Unlike home, details and watch, they exist only in the languages most of yomado's visitors read
 * (English, Simplified Chinese, Japanese); every other language's menu links to its home page.
 */
import type { Locale, ReleaseFacts } from './site';
import { releaseFacts } from './site';
import en from '../i18n/guides/en';
import ja from '../i18n/guides/ja';
import zhCn from '../i18n/guides/zh-cn';

export const GUIDE_LOCALES = ['en', 'zh-cn', 'ja'] as const satisfies readonly Locale[];
export type GuideLocale = (typeof GUIDE_LOCALES)[number];

/** Each guide's path below a locale's root. */
export const GUIDE_ROUTES = { compare: 'compare/', codexBlender: 'guides/codex-blender/' } as const;
export type GuideKey = keyof typeof GUIDE_ROUTES;

export const isGuideLocale = (locale: Locale): locale is GuideLocale => (GUIDE_LOCALES as readonly Locale[]).includes(locale);

/**
 * One section of a guide. Strings in `html`, `items`, `steps` and table cells may hold inline
 * markup (<code>, <strong>, <a>). `request` is a sentence to give an agent, with a copy button.
 */
export interface GuideSection {
  id: string;
  title: string;
  html?: string[];
  items?: string[];
  steps?: string[];
  request?: string;
  table?: { caption: string; head: string[]; rows: string[][] };
  after?: string[];
}

export interface Guide {
  meta: { title: string; description: string };
  eyebrow: string;
  /** May mark phrase breaks with `|` (src/lib/text.ts). */
  title: string;
  lede: string;
  sections: GuideSection[];
  faq: { title: string; items: { q: string; a: string }[] };
  /** Link text for this guide from other pages (footer, details, the other guide). */
  linkText: string;
  /** A short name for the footer. */
  navText: string;
}

export interface GuideCopy {
  /** Names the list of guides in the footer and at the end of each guide. */
  label: string;
  cta: string;
  ctaMeta: string;
  updated: string;
  guides: Record<GuideKey, Guide>;
}

const builders: Record<GuideLocale, (r: ReleaseFacts) => GuideCopy> = { en, 'zh-cn': zhCn, ja };

export function guidesFor(locale: GuideLocale): GuideCopy {
  return builders[locale](releaseFacts(locale));
}

/** When the guides were last checked against the app and the tools they compare. */
export const GUIDES_UPDATED = '2026-11-24';
