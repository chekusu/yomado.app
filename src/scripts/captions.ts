// Subtitles for the film, shared by the hero (src/scripts/film.ts) and the watch page
// (src/scripts/watch.ts). Which language a visit starts with: ?cc= in the address, else a choice
// made in the subtitle menu before (kept in this browser), else the page's own language. On the
// Chinese page a browser that prefers Traditional Chinese gets zh-TW; on the English page the
// browser's first language picks when it is one of the 16 (a Chinese or Japanese browser on the
// English page chose English). A language that follows the other narration brings its own film:
// switching keeps the time, whether it was playing, and the sound as it was (filmSwitcher).
import type { FilmConfig } from '../lib/captions';

export type { FilmConfig };
export const CAPTION_KEY = 'yomado.captions';

export const readConfig = (root: ParentNode): FilmConfig | null => {
  const el = root.querySelector<HTMLScriptElement>('[data-film-config]');
  try {
    return el ? (JSON.parse(el.textContent ?? '') as FilmConfig) : null;
  } catch {
    return null;
  }
};

/** A browser language tag as one of the 16 subtitle languages, if it is one. */
export function captionFor(language: string, order: string[]): string | null {
  const l = language.toLowerCase();
  if (/^zh-(tw|hk|mo)\b|^zh-hant/.test(l)) return 'zh-TW';
  if (l.startsWith('zh')) return 'zh-CN';
  if (l.startsWith('pt')) return 'pt-BR';
  const primary = l.split('-')[0];
  return order.find((t) => t.toLowerCase() === primary) ?? null;
}

const valid = (config: FilmConfig, choice: string | null): choice is string => !!choice && (choice === 'off' || choice in config.captions);

export function storedCaption(config: FilmConfig): string | null {
  try {
    const value = localStorage.getItem(CAPTION_KEY);
    return valid(config, value) ? value : null;
  } catch {
    return null;
  }
}

export function saveCaption(choice: string) {
  try {
    localStorage.setItem(CAPTION_KEY, choice);
  } catch {
    // Private browsing or blocked storage: the choice lasts for this page.
  }
}

export function defaultCaption(config: FilmConfig): string {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (config.page === 'zh-cn') {
    const zh = languages.map((l) => captionFor(l, config.order)).find((t) => t === 'zh-CN' || t === 'zh-TW');
    return zh ?? 'zh-CN';
  }
  if (config.page === 'ja') return 'ja';
  for (const language of languages) {
    const tag = captionFor(language, config.order);
    if (tag) return tag === 'zh-CN' || tag === 'zh-TW' || tag === 'ja' ? 'en' : tag;
  }
  return config.pageCaption;
}

export function initialCaption(config: FilmConfig): string {
  const asked = new URLSearchParams(location.search).get('cc');
  const fromUrl = asked && (asked === 'off' ? 'off' : captionFor(asked, config.order));
  return (valid(config, fromUrl) ? fromUrl : null) ?? storedCaption(config) ?? defaultCaption(config);
}

/** The film (by its supers) and narration a choice plays: a language's own, or for "off" the current one. */
export const visualOf = (config: FilmConfig, choice: string, current: string) => (choice === 'off' ? current : config.captions[choice].visual);

type FilmFiles = { tall: { mp4: string; webm: string }; wide: { mp4: string; webm: string } };

/**
 * Switching a video to other files as one transaction: the latest switch wins, and a switch keeps
 * the film where it was. Where it was, whether it was playing and whether it had ended are taken
 * once, before the first of overlapping switches (a reloading video reads 0 s and paused, which is
 * not anyone's intent). While a switch waits for its new file, what the page does in the meantime
 * counts more: a pause, leaving the view or the tab (`revoke`) drop the resume; a time the page
 * sets (`seek`) replaces the kept one, and so does a seek made on the video while it loads. When
 * the new file's metadata arrives, the switch checks that it is still the latest one and seeks (a
 * film that had ended is put at its end, ended); it plays again only if it was playing, nothing
 * revoked that, and the page says it may resume now. A replaced or failed switch ends quietly.
 */
export function filmSwitcher(video: HTMLVideoElement, options: { mayResume: () => boolean; play: () => void }) {
  let generation = 0;
  let intent: { time: number; playing: boolean; ended: boolean } | null = null;
  let stopWaiting: (() => void) | null = null;

  const switcher = {
    /** A switch is waiting for its file. */
    get busy() {
      return intent !== null;
    },
    /** Where the film is, counting a switch in progress. */
    time: () => (intent ? intent.time : video.currentTime),
    /** Playing, or about to play again when the switch lands. */
    playing: () => (intent ? intent.playing : !video.paused && !video.ended),
    /** At its end (or paused within a tenth of a second of it), or put there when the switch lands. */
    ended: () => (intent ? intent.ended : video.ended || (video.paused && Number.isFinite(video.duration) && video.duration - video.currentTime < 0.1)),
    seek(time: number) {
      if (intent) {
        intent.time = time;
        intent.ended = false;
      } else video.currentTime = time;
    },
    /** Pause, hidden, out of view: whatever a switch was going to resume stays paused. */
    revoke() {
      if (intent) intent.playing = false;
    },
    /** Play once the switch lands (or now, when none is in progress). */
    resume() {
      if (intent) intent.playing = true;
      else options.play();
    },
    /** Resolves true when this switch landed, false when a later one replaced it or the files failed. */
    async to(files: FilmFiles): Promise<boolean> {
      const id = ++generation;
      stopWaiting?.();
      const started = intent !== null || video.readyState > 0 || video.currentTime > 0;
      if (!intent && started) intent = { time: video.currentTime, playing: !video.paused && !video.ended, ended: video.ended };
      const [tallMp4, tallWebm, wideMp4, wideWebm] = video.querySelectorAll('source');
      tallMp4.src = files.tall.mp4;
      tallWebm.src = files.tall.webm;
      wideMp4.src = files.wide.mp4;
      wideWebm.src = files.wide.webm;
      video.load();
      if (!started) return true;
      const loaded = await new Promise<boolean>((resolve) => {
        const last = video.querySelector('source:last-of-type');
        const done = (ok: boolean) => {
          video.removeEventListener('loadedmetadata', onMeta);
          last?.removeEventListener('error', onError);
          stopWaiting = null;
          resolve(ok);
        };
        const onMeta = () => done(true);
        const onError = () => done(false);
        video.addEventListener('loadedmetadata', onMeta);
        last?.addEventListener('error', onError);
        stopWaiting = () => done(false);
      });
      if (id !== generation) return false;
      const kept = intent;
      intent = null;
      if (!loaded || !kept) return false;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (kept.ended && duration) {
        video.currentTime = duration;
        return true;
      }
      // A seek made on the video while it loaded is newer than the kept time.
      if (video.currentTime < 0.01 && duration) video.currentTime = Math.min(Math.max(0, kept.time), Math.max(0, duration - 0.05));
      if (kept.playing && options.mayResume()) options.play();
      return true;
    },
  };
  return switcher;
}

export const narrowMatches = (video: HTMLVideoElement) => !!video.dataset.narrow && matchMedia(video.dataset.narrow).matches;
