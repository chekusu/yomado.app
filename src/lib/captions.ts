/**
 * The film's captions in 16 languages (captions/index.json, rendered by scripts/caption-film.mjs),
 * the same 16 as the website's languages. A caption language comes with the narration it follows
 * and the film it goes with: zh-CN and zh-TW with the Chinese narration and the Chinese film, ja
 * with the English narration and the Japanese film, every other language with the English
 * narration and the English film. A website language starts with its own captions, and so with
 * that film and narration (PAGE_VISUAL, PAGE_NARRATION). The players get this as one JSON block
 * (src/scripts/captions.ts reads it).
 */
import captionIndex from '../../captions/index.json';
import type { Copy } from '../i18n';
import {
  FILM_LOCALES,
  bandFile,
  bandPosterFile,
  captionFile,
  captionedFile,
  downloadUrl,
  filmFile,
  mediaSize,
  mediaUrl,
  posterUrl,
  type FilmLayout,
  type FilmLocale,
} from './media';
import { LOCALES, LOCALE_TAG, type Locale } from './site';

type Narration = 'en' | 'zh';
interface CaptionLocale {
  name: string;
  short: string;
  dir: 'ltr' | 'rtl';
  family: Narration;
  visual: FilmLocale;
  narration: string;
}

export const CAPTION_TAGS: string[] = captionIndex.order;
export const CAPTION_LOCALES = captionIndex.locales as Record<string, CaptionLocale>;
/** The caption a page starts with when nothing else decides: its own language (same tag). */
export const PAGE_CAPTION: Record<Locale, string> = LOCALE_TAG;
const byPage = <T>(make: (caption: CaptionLocale) => T) => Object.fromEntries(LOCALES.map((l) => [l, make(CAPTION_LOCALES[LOCALE_TAG[l]])])) as Record<Locale, T>;
/** The film each website language shows (one of the three there are), by its own captions. */
export const PAGE_VISUAL: Record<Locale, FilmLocale> = byPage((c) => c.visual);
/** Which narration that film has. */
export const PAGE_NARRATION: Record<Locale, Narration> = byPage((c) => c.family);

const LAYOUTS: FilmLayout[] = ['wide', 'tall'];

interface Files {
  mp4: string;
  webm: string;
  poster: string;
}
export interface FilmConfig {
  /** The website language (a Locale), its own captions and the film it shows. */
  page: string;
  pageCaption: string;
  visual: string;
  order: string[];
  /**
   * Per film (en, zh-cn, ja): its narration, the full-size files (and each MP4 as a download) and
   * the band masters.
   */
  visuals: Record<string, { narration: Narration; plain: Record<FilmLayout, Files & { size: string; download: string }>; band: Record<FilmLayout, Files> }>;
  /** Per caption language: its film, its track and, as downloads, its captioned MP4s and SRT. */
  captions: Record<
    string,
    { name: string; short: string; dir: string; visual: string; narration: Narration; vtt: string; srt: string; exports: Record<FilmLayout, { url: string; size: string }> }
  >;
  text: { off: string; narration: Record<Narration, string>; narrationNote: Record<Narration, string>; label: string; soundOn: Record<Narration, string>; soundOnText: Record<Narration, string> };
}
const byLayout = <T>(make: (layout: FilmLayout) => T) => Object.fromEntries(LAYOUTS.map((layout) => [layout, make(layout)])) as Record<FilmLayout, T>;

/** Caption tags grouped by the narration they follow, the page's own narration first. */
export function captionGroups(locale: Locale): { narration: 'en' | 'zh'; tags: string[] }[] {
  const groups = (['en', 'zh'] as const).map((narration) => ({ narration, tags: CAPTION_TAGS.filter((t) => CAPTION_LOCALES[t].family === narration) }));
  return PAGE_NARRATION[locale] === 'zh' ? groups.reverse() : groups;
}

/** The tags whose captions go with a film (its tracks). */
export const tagsFor = (visual: FilmLocale) => CAPTION_TAGS.filter((t) => CAPTION_LOCALES[t].visual === visual);

export function filmConfig(locale: Locale, copy: Copy): FilmConfig {
  const film = copy.hero.film;
  const visuals: FilmConfig['visuals'] = Object.fromEntries(
    FILM_LOCALES.map((visual) => [
      visual,
      {
        narration: visual === 'zh-cn' ? 'zh' : 'en',
        plain: byLayout((layout) => ({
          mp4: mediaUrl(filmFile(visual, layout, 'mp4')),
          webm: mediaUrl(filmFile(visual, layout, 'webm')),
          poster: posterUrl(visual, layout),
          size: mediaSize(filmFile(visual, layout, 'mp4'), locale),
          download: downloadUrl(filmFile(visual, layout, 'mp4')),
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
          srt: downloadUrl(captionFile(tag, 'srt')),
          exports: byLayout((layout) => ({ url: downloadUrl(captionedFile(tag, layout)), size: mediaSize(captionedFile(tag, layout), locale) })),
        },
      ];
    }),
  );
  return {
    page: locale,
    pageCaption: PAGE_CAPTION[locale],
    visual: PAGE_VISUAL[locale],
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

