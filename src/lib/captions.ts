/**
 * The film's captions in 16 languages (captions/index.json, rendered by scripts/caption-film.mjs).
 * A caption language comes with the narration it follows and the film it goes with: zh-CN and zh-TW
 * with the Chinese narration and the Chinese film, ja with the English narration and the Japanese
 * film, every other language with the English narration and the English film. The players get
 * this as one JSON block (src/scripts/captions.ts reads it).
 */
import captionIndex from '../../captions/index.json';
import type { Copy } from '../i18n';
import {
  bandFile,
  bandPosterFile,
  captionFile,
  captionedFile,
  filmFile,
  mediaSize,
  mediaUrl,
  posterUrl,
  type FilmLayout,
} from './media';
import type { Locale } from './site';

interface CaptionLocale {
  name: string;
  short: string;
  dir: 'ltr' | 'rtl';
  family: 'en' | 'zh';
  visual: Locale;
  narration: string;
}

export const CAPTION_TAGS: string[] = captionIndex.order;
export const CAPTION_LOCALES = captionIndex.locales as Record<string, CaptionLocale>;
/** The caption a page starts with when nothing else decides: its own language. */
export const PAGE_CAPTION: Record<Locale, string> = { en: 'en', 'zh-cn': 'zh-CN', ja: 'ja' };
/** Which narration each page's own film has. */
export const PAGE_NARRATION: Record<Locale, 'en' | 'zh'> = { en: 'en', 'zh-cn': 'zh', ja: 'en' };

const LAYOUTS: FilmLayout[] = ['wide', 'tall'];
const VISUALS: Locale[] = ['en', 'zh-cn', 'ja'];

type Narration = 'en' | 'zh';
interface Files {
  mp4: string;
  webm: string;
  poster: string;
}
export interface FilmConfig {
  page: string;
  pageCaption: string;
  order: string[];
  /** Per film (en, zh-cn, ja): its narration, the full-size files and the band masters. */
  visuals: Record<string, { narration: Narration; plain: Record<FilmLayout, Files & { size: string }>; band: Record<FilmLayout, Files> }>;
  captions: Record<string, { name: string; short: string; dir: string; visual: string; narration: Narration; vtt: string; srt: string; exports: Record<FilmLayout, { url: string; size: string }> }>;
  text: { off: string; narration: Record<Narration, string>; narrationNote: Record<Narration, string>; label: string; soundOn: Record<Narration, string>; soundOnText: Record<Narration, string> };
}
const byLayout = <T>(make: (layout: FilmLayout) => T) => Object.fromEntries(LAYOUTS.map((layout) => [layout, make(layout)])) as Record<FilmLayout, T>;

/** Caption tags grouped by the narration they follow, the page's own narration first. */
export function captionGroups(locale: Locale): { narration: 'en' | 'zh'; tags: string[] }[] {
  const groups = (['en', 'zh'] as const).map((narration) => ({ narration, tags: CAPTION_TAGS.filter((t) => CAPTION_LOCALES[t].family === narration) }));
  return PAGE_NARRATION[locale] === 'zh' ? groups.reverse() : groups;
}

/** The tags whose captions go with a film (its tracks). */
export const tagsFor = (visual: Locale) => CAPTION_TAGS.filter((t) => CAPTION_LOCALES[t].visual === visual);

export function filmConfig(locale: Locale, copy: Copy): FilmConfig {
  const film = copy.hero.film;
  const visuals: FilmConfig['visuals'] = Object.fromEntries(
    VISUALS.map((visual) => [
      visual,
      {
        narration: visual === 'zh-cn' ? 'zh' : 'en',
        plain: byLayout((layout) => ({
          mp4: mediaUrl(filmFile(visual, layout, 'mp4')),
          webm: mediaUrl(filmFile(visual, layout, 'webm')),
          poster: posterUrl(visual, layout),
          size: mediaSize(filmFile(visual, layout, 'mp4')),
        })),
        band: byLayout((layout) => ({ mp4: mediaUrl(bandFile(visual, layout, 'mp4')), webm: mediaUrl(bandFile(visual, layout, 'webm')), poster: mediaUrl(bandPosterFile(visual, layout)) })),
      },
    ]),
  );
  const captions: FilmConfig['captions'] = Object.fromEntries(
    CAPTION_TAGS.map((tag) => {
      const l = CAPTION_LOCALES[tag];
      return [
        tag,
        {
          name: l.name,
          short: l.short,
          dir: l.dir,
          visual: l.visual,
          narration: l.family,
          vtt: mediaUrl(captionFile(tag, 'vtt')),
          srt: mediaUrl(captionFile(tag, 'srt')),
          exports: byLayout((layout) => ({ url: mediaUrl(captionedFile(tag, layout)), size: mediaSize(captionedFile(tag, layout)) })),
        },
      ];
    }),
  );
  return {
    page: locale,
    pageCaption: PAGE_CAPTION[locale],
    order: CAPTION_TAGS,
    visuals,
    captions,
    text: {
      off: film.captionsOff,
      narration: film.narration,
      narrationNote: film.narrationNote,
      label: film.label,
      soundOn: film.soundOn,
      soundOnText: film.soundOnText,
    },
  };
}

