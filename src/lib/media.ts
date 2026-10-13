/**
 * The one-minute film's files in public/media/, rendered by scripts/render-film.mjs and narrated by
 * scripts/narrate-film.mjs: three films, English, Simplified Chinese and Japanese (their supers are
 * in that language), in two compositions, wide 1920 × 1080 for screens and tall 1080 × 1350 for
 * phones, each as H.264 + AAC MP4 and VP9 + Opus WebM, with its first frame as poster. The
 * narration is English or Simplified Chinese; the Japanese film has the English narration
 * (film-media.json). Every other website language shows one of the three (src/lib/captions.ts).
 * The version in the file names changes whenever the films do, so no browser or CDN keeps serving
 * an older file.
 */
import { statSync } from 'node:fs';
import { join } from 'node:path';
import filmMedia from './film-media.json';
import { formatSize, withBase, type Locale } from './site';

export type FilmLayout = 'wide' | 'tall';

/** The films there are, by the language of their supers. */
export type FilmLocale = 'en' | 'zh-cn' | 'ja';
export const FILM_LOCALES: FilmLocale[] = ['en', 'zh-cn', 'ja'];

/** Viewports that get the tall composition. */
export const NARROW = '(max-width: 640px)';
/** H.264 High at level 4.0 (1080p at 30 fps, as rendered) with AAC-LC, and VP9 with Opus. */
export const MP4_TYPE = 'video/mp4; codecs="avc1.640028, mp4a.40.2"';
export const WEBM_TYPE = 'video/webm; codecs="vp9, opus"';

/** The language of each film's narration. */
export const NARRATION: Record<FilmLocale, 'en' | 'zh-cn'> = filmMedia.narration as Record<FilmLocale, 'en' | 'zh-cn'>;

export const filmName = (film: FilmLocale, layout: FilmLayout) => `film-${film}-${layout}`;
/** The video file's name: the film's name and its version. Posters keep the film's name. */
export const filmFile = (film: FilmLocale, layout: FilmLayout, ext: 'mp4' | 'webm') => `${filmName(film, layout)}-${filmMedia.version}.${ext}`;

export function filmUrl(film: FilmLocale, layout: FilmLayout, ext: 'mp4' | 'webm'): string {
  return withBase(`media/${filmFile(film, layout, ext)}`);
}

export function posterUrl(film: FilmLocale, layout: FilmLayout): string {
  return withBase(`media/${filmName(film, layout)}-poster.webp`);
}

/**
 * The size of a file under public/media/, as Finder shows it, in a page's language; read at build
 * time. Only the film's own render build (FILM_STAGE=1), which runs before the files exist, may go
 * without.
 */
export function mediaSize(path: string, locale: Locale = 'en'): string {
  try {
    return formatSize(statSync(join(process.cwd(), 'public/media', path)).size, locale);
  } catch (error) {
    if (process.env.FILM_STAGE === '1') return '';
    throw error;
  }
}

export const filmSize = (film: FilmLocale, layout: FilmLayout, ext: 'mp4' | 'webm', locale: Locale = 'en'): string => mediaSize(filmFile(film, layout, ext), locale);

/**
 * Captions (scripts/caption-film.mjs, captions/): a caption file per locale, the film with that
 * locale's captions in its pixels for sharing, and the website's band masters: the same films,
 * the picture a little smaller above a night-blue caption band, so the switchable tracks never
 * cover the film's own titles, panel or typing (also in full screen).
 */
export const captionFile = (tag: string, ext: 'vtt' | 'srt') => `captions/yomado-film-${tag}-${filmMedia.captions}.${ext}`;
export const captionedFile = (tag: string, layout: FilmLayout) => `captioned/yomado-film-${tag}-${layout}-${filmMedia.captions}.mp4`;
export const bandFile = (visual: FilmLocale, layout: FilmLayout, ext: 'mp4' | 'webm') => `film-${visual}-${layout}-band-${filmMedia.captions}.${ext}`;
export const bandPosterFile = (visual: FilmLocale, layout: FilmLayout) => `film-${visual}-${layout}-band-poster-${filmMedia.captions}.webp`;
export const mediaUrl = (path: string) => withBase(`media/${path}`);
/**
 * A media file as a download: the media Pages Function (functions/media/[[path]].js) answers this
 * address with `Content-Disposition: attachment` and the file's name, so phones save the file
 * instead of opening a player. The plain address still plays inline.
 */
export const downloadUrl = (path: string) => `${mediaUrl(path)}?download`;
