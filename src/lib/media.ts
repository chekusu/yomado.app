/**
 * The one-minute film's files in public/media/, rendered by scripts/render-film.mjs and narrated by
 * scripts/narrate-film.mjs: one film per locale (its supers are in that language) in two
 * compositions, wide 1920 × 1080 for screens and tall 1080 × 1350 for phones, each as H.264 + AAC
 * MP4 and VP9 + Opus WebM, with its first frame as poster. The narration is English or Simplified
 * Chinese; the Japanese film has the English narration (film-media.json). The version in the file
 * names changes whenever the films do, so no browser or CDN keeps serving an older file.
 */
import { statSync } from 'node:fs';
import { join } from 'node:path';
import filmMedia from './film-media.json';
import { formatSize, withBase, type Locale } from './site';

export type FilmLayout = 'wide' | 'tall';

/** Viewports that get the tall composition. */
export const NARROW = '(max-width: 640px)';
/** H.264 High at level 4.0 (1080p at 30 fps, as rendered) with AAC-LC, and VP9 with Opus. */
export const MP4_TYPE = 'video/mp4; codecs="avc1.640028, mp4a.40.2"';
export const WEBM_TYPE = 'video/webm; codecs="vp9, opus"';

/** The language of each locale's narration. */
export const NARRATION: Record<Locale, 'en' | 'zh-cn'> = filmMedia.narration as Record<Locale, 'en' | 'zh-cn'>;

export const filmName = (locale: Locale, layout: FilmLayout) => `film-${locale}-${layout}`;
/** The video file's name: the film's name and its version. Posters keep the film's name. */
export const filmFile = (locale: Locale, layout: FilmLayout, ext: 'mp4' | 'webm') => `${filmName(locale, layout)}-${filmMedia.version}.${ext}`;

export function filmUrl(locale: Locale, layout: FilmLayout, ext: 'mp4' | 'webm'): string {
  return withBase(`media/${filmFile(locale, layout, ext)}`);
}

export function posterUrl(locale: Locale, layout: FilmLayout): string {
  return withBase(`media/${filmName(locale, layout)}-poster.webp`);
}

/**
 * The size of a rendered file, as Finder shows it; read at build time. Only the film's own render
 * build (FILM_STAGE=1), which runs before the files exist, may go without.
 */
export function filmSize(locale: Locale, layout: FilmLayout, ext: 'mp4' | 'webm'): string {
  try {
    return formatSize(statSync(join(process.cwd(), 'public/media', filmFile(locale, layout, ext))).size);
  } catch (error) {
    if (process.env.FILM_STAGE === '1') return '';
    throw error;
  }
}
