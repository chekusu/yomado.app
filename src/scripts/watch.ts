// The watch page: the film with the browser's own controls, and subtitles in 16 languages.
//
// With subtitles on it plays the band master (the picture above a night-blue band) and shows the
// chosen track in that band, through the browser's own rendering, so it works in full screen too;
// off, it plays the film full size. The page starts with its own language's subtitles and film
// (src/scripts/captions.ts decides when the address or an earlier choice on this language asks for
// others). A language that follows the other narration brings that narration's film and its
// tracks, where the film was, playing or paused. The browser's own subtitle menu works as well:
// choosing there is remembered the same way. The downloads under the player follow the choice:
// that language's captioned MP4s, landscape and portrait, and subtitle file, or the film without
// subtitles, each as a download (the file is saved, not opened in a player).
import { filmSwitcher, initialCaption, narrowMatches, readConfig, saveCaption } from './captions';

const config = readConfig(document);
const video = document.querySelector<HTMLVideoElement>('[data-watch-video]');

if (video) {
  // The poster that matches the composition this screen gets.
  if (narrowMatches(video) && video.dataset.posterNarrow) video.poster = video.dataset.posterNarrow;
}

if (video && config) {
  const menu = document.querySelector<HTMLElement>('[data-watch-cc]');
  const select = menu?.querySelector<HTMLSelectElement>('select');
  const label = document.querySelector<HTMLElement>('[data-watch-files-label]');
  const wide = document.querySelector<HTMLAnchorElement>('[data-mp4="wide"]');
  const tall = document.querySelector<HTMLAnchorElement>('[data-mp4="tall"]');
  const srt = document.querySelector<HTMLAnchorElement>('[data-srt]');
  const note = document.querySelector<HTMLElement>('[data-watch-narration]');

  let current = initialCaption(config);
  let visual = config.visual;
  let band = true;
  // Our own changes to the tracks fire the same events as the browser's menu, and the browser may
  // pick a track by itself when tracks or files change (by its language): for a moment after each,
  // those events are let pass, and then the chosen track is put back if anything else moved.
  let quiet = 0;
  const hush = () => {
    quiet++;
    setTimeout(() => {
      quiet--;
      if (!quiet) showTrack();
    }, 250);
  };
  // The page's own track is the default without JavaScript; from here on the choice decides.
  for (const el of video.querySelectorAll('track')) el.default = false;
  // Switching films is a transaction (src/scripts/captions.ts): a film that was playing plays on
  // where it was, unless the tab was left while the new file loaded.
  const switcher = filmSwitcher(video, {
    mayResume: () => !document.hidden,
    play: () => {
      video.play().catch(() => {});
    },
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) switcher.revoke();
  });
  // The browser's own play and pause buttons while a film loads are the newest intent (a reload
  // itself fires neither).
  video.addEventListener('play', () => switcher.busy && switcher.resume());
  video.addEventListener('pause', () => switcher.busy && switcher.revoke());

  const tagsFor = (v: string) => config.order.filter((tag) => config.captions[tag].visual === v);
  // Each film carries the tracks timed to its own narration, so the browser's menu offers only those.
  const setTracks = (v: string) => {
    hush();
    for (const el of video.querySelectorAll('track')) el.remove();
    for (const tag of tagsFor(v)) {
      const el = document.createElement('track');
      el.kind = 'subtitles';
      el.srclang = tag;
      el.label = config.captions[tag].name;
      el.src = config.captions[tag].vtt;
      video.append(el);
    }
  };
  const wanted = (track: TextTrack) => (current !== 'off' && track.language === current ? 'showing' : 'disabled');
  // Only what differs is changed, so a settled page fires nothing.
  const showTrack = () => {
    const off = [...video.textTracks].filter((track) => track.mode !== wanted(track));
    if (!off.length) return;
    hush();
    for (const track of off) track.mode = wanted(track);
  };
  const setDownloads = () => {
    const name = (a: HTMLAnchorElement | null, href: string, size: string) => {
      const meta = a?.querySelector<HTMLElement>('[data-meta]');
      if (!a || !meta) return;
      a.href = href;
      meta.textContent = (meta.dataset.template ?? '').replace('{size}', size);
    };
    if (current === 'off') {
      const films = config.visuals[visual].plain;
      name(wide, films.wide.download, films.wide.size);
      name(tall, films.tall.download, films.tall.size);
      if (srt) srt.hidden = true;
      if (label) label.textContent = label.dataset.without ?? '';
    } else {
      const c = config.captions[current];
      name(wide, c.exports.wide.url, c.exports.wide.size);
      name(tall, c.exports.tall.url, c.exports.tall.size);
      if (srt) {
        srt.hidden = false;
        srt.href = c.srt;
      }
      if (label) label.textContent = (label.dataset.with ?? '').replace('{language}', c.name);
    }
  };
  const setNarration = () => {
    const narration = config.visuals[visual].narration as 'en' | 'zh';
    if (note) note.textContent = config.text.narrationNote[narration];
    video.setAttribute('aria-label', config.text.label.replace('{narration}', config.text.narration[narration]));
  };
  const setFilm = async (nextVisual: string, nextBand: boolean) => {
    if (nextVisual === visual && nextBand === band) return;
    if (nextVisual !== visual) setTracks(nextVisual);
    visual = nextVisual;
    band = nextBand;
    const films = config.visuals[visual][band ? 'band' : 'plain'];
    video.dataset.posterNarrow = films.tall.poster;
    video.poster = narrowMatches(video) ? films.tall.poster : films.wide.poster;
    setNarration();
    showTrack();
    await switcher.to(films);
  };
  // Show a choice; when its film lands, show its track again unless a later choice took over.
  const show = async (next: string) => {
    current = next;
    if (select) select.value = next;
    setDownloads();
    await setFilm(next === 'off' ? visual : config.captions[next].visual, next !== 'off');
    if (current === next) showTrack();
  };
  const choose = (next: string) => {
    saveCaption(config, next);
    void show(next);
  };

  if (menu && select) {
    menu.hidden = false;
    select.value = current;
    select.addEventListener('change', () => choose(select.value));
  }
  // The browser's own menu (and full screen): follow what it shows. Our own changes to the tracks
  // fire the same event; those, and anything while a film is switching, are ours.
  video.textTracks.addEventListener('change', () => {
    const tracks = [...video.textTracks];
    const showing = tracks.filter((t) => t.mode === 'showing');
    // Two at once is the browser's own pick on top of ours: ours stands.
    if (showing.length > 1) return showTrack();
    const [one] = showing;
    if (one) {
      if (one.language === current || !(one.language in config.captions)) return;
      // Ours went off and another came on: the browser's menu, which shows one at a time, even
      // while a film loads. With ours off, a track coming on in a quiet moment may be the
      // browser's own pick; only a later one is a choice.
      if (current !== 'off' || !quiet) choose(one.language);
      return;
    }
    // Nothing showing: the menu's Off, unless we are the ones changing tracks or films.
    if (!quiet && !switcher.busy && current !== 'off' && tracks.some((t) => t.language === current)) choose('off');
  });
  video.textTracks.addEventListener('addtrack', hush);
  video.addEventListener('loadedmetadata', hush);

  // Start with the language this visit asks for (not stored: only a choice is).
  void show(current);
  setNarration();
}
