/**
 * The one-minute film's files in public/media/, rendered by scripts/render-film.mjs: one film per
 * locale (its supers are in that language) in two compositions, wide 1920 × 1080 for screens and
 * tall 1080 × 1350 for phones, each as H.264 MP4 and VP9 WebM, with its first frame as poster.
 */
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { formatSize, withBase, type Locale } from './site';

export type FilmLayout = 'wide' | 'tall';

/** Viewports that get the tall composition. */
export const NARROW = '(max-width: 640px)';
/** H.264 High at level 4.0 (1080p at 30 fps, as rendered), and VP9. */
export const MP4_TYPE = 'video/mp4; codecs="avc1.640028"';
export const WEBM_TYPE = 'video/webm; codecs="vp9"';

export const filmName = (locale: Locale, layout: FilmLayout) => `film-${locale}-${layout}`;

export function filmUrl(locale: Locale, layout: FilmLayout, ext: 'mp4' | 'webm'): string {
  return withBase(`media/${filmName(locale, layout)}.${ext}`);
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
    return formatSize(statSync(join(process.cwd(), 'public/media', `${filmName(locale, layout)}.${ext}`)).size);
  } catch (error) {
    if (process.env.FILM_STAGE === '1') return '';
    throw error;
  }
}
