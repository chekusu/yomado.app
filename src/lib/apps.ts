/**
 * The real applications the scene, the panel and the film show, with their own icons.
 *
 * Each icon in public/apps/ is a PNG copied byte for byte out of the app's .icns resource by
 * scripts/extract-icons.mjs; public/apps/sources.json records where every file came from. The
 * icons belong to their owners (see README.md), so they are only ever shown as themselves: never
 * redrawn, recoloured or used for another app. There are no Codex or GrokBot icons; those are
 * screen names, written out as text.
 */
import { withBase } from './site';

export type AppId = 'blender' | 'md' | 'chrome' | 'wechat' | 'yomado';

export interface App {
  /** The name macOS shows for the app with a Simplified Chinese interface, as in the panel and menu. */
  name: string;
  /** Pixel sizes extracted from the .icns, smallest first. */
  sizes: readonly number[];
}

export const APPS: Record<AppId, App> = {
  blender: { name: 'Blender', sizes: [128, 256, 512] },
  md: { name: 'Marvelous Designer', sizes: [128, 256, 512] },
  chrome: { name: 'Google Chrome', sizes: [128, 256] },
  wechat: { name: '微信', sizes: [128, 256] },
  yomado: { name: 'yomado', sizes: [128, 256, 512] },
};

/** URL of one extracted size of an app's icon. */
export function iconUrl(id: AppId, size: number): string {
  return withBase(`apps/${id}-${size}.png`);
}

/** Every extracted size, for `srcset` with width descriptors. */
export function iconSrcset(id: AppId): string {
  return APPS[id].sizes.map((size) => `${iconUrl(id, size)} ${size}w`).join(', ');
}

/** The largest extracted size, for scenes that are scaled up after layout (the film). */
export function iconLargest(id: AppId): string {
  return iconUrl(id, APPS[id].sizes.at(-1)!);
}
