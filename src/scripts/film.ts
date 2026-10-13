// The concept film: starts muted once the page has loaded and the film is in view, pauses when it
// leaves the view or the tab, and never starts by itself under reduced motion. One button plays,
// pauses and replays; the sound button turns the narration on and off.
//
// Sound only ever comes on because someone asked: the sound button, or the play or replay button
// (a film someone starts plays with its sound, unless they muted it themselves). The first time
// the narration comes on, the film goes back to the beginning so it is heard whole. Starting by
// itself (after loading, on scrolling back, on returning to the tab) only ever happens muted; a
// film that was playing with its sound waits for the play button instead.
//
// Subtitles (src/scripts/captions.ts) show in a line under the film, never over the picture. The
// menu offers 16 languages grouped by the narration they follow; choosing one that follows the
// other narration loads that narration's film where this one was, playing or paused, with the
// sound as it was. The note under the film names the narration that plays.
import { filmSwitcher, initialCaption, narrowMatches, readConfig, saveCaption } from './captions';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

for (const figure of document.querySelectorAll<HTMLElement>('[data-film]')) {
  const video = figure.querySelector<HTMLVideoElement>('video');
  const toggle = figure.querySelector<HTMLButtonElement>('[data-film-toggle]');
  const sound = figure.querySelector<HTMLButtonElement>('[data-film-sound]');
  const soundText = sound?.querySelector<HTMLElement>('[data-film-sound-text]');
  if (!video || !toggle || !sound) continue;
  const config = readConfig(figure);
  const cc = figure.querySelector<HTMLElement>('[data-film-cc]');
  const ccSelect = cc?.querySelector<HTMLSelectElement>('select');
  const ccText = cc?.querySelector<HTMLElement>('[data-film-cc-text]');
  const subtitle = figure.querySelector<HTMLElement>('[data-film-subtitle]');
  const narrationNote = figure.querySelector<HTMLElement>('[data-film-narration]');
  const soundLabelOn = sound.getAttribute('aria-label') ?? '';
  const soundTextOn = soundText?.textContent ?? '';
  // The narration that plays: the page's own film (the one its language shows), until a subtitle
  // language brings the other one.
  let narration: 'en' | 'zh' = config ? (config.visuals[config.visual].narration as 'en' | 'zh') : 'en';

  // Our buttons replace the browser's controls, and a film that starts by itself is muted.
  video.controls = false;
  video.muted = true;
  toggle.hidden = false;
  sound.hidden = false;
  // The right poster for the frame's shape.
  if (video.dataset.narrow && matchMedia(video.dataset.narrow).matches && video.dataset.posterNarrow) {
    video.poster = video.dataset.posterNarrow;
  }

  let heldByUser = false;
  let visible = false;
  let loaded = document.readyState === 'complete';
  // Nobody has chosen yet; then 'on' (sound button, or play) or 'off' (muted with the sound button).
  let choice: 'auto' | 'on' | 'off' = 'auto';
  // Whether the narration has been on during this visit.
  let heard = false;

  const setState = (state: 'playing' | 'paused' | 'ended') => {
    toggle.dataset.state = state;
    const label = state === 'playing' ? toggle.dataset.labelPause : state === 'ended' ? toggle.dataset.labelReplay : toggle.dataset.labelPlay;
    toggle.setAttribute('aria-label', label ?? '');
  };

  const setSound = () => {
    const on = !video.muted;
    sound.dataset.state = on ? 'on' : 'muted';
    sound.setAttribute('aria-label', (on ? sound.dataset.labelOff : config?.text.soundOn[narration] ?? soundLabelOn) ?? '');
    if (soundText) soundText.textContent = (on ? sound.dataset.textOff : config?.text.soundOnText[narration] ?? soundTextOn) ?? '';
  };

  // Every start is numbered, and pausing, leaving the view or leaving the tab moves the number on:
  // a late answer to an older play() never undoes what happened since.
  let attempt = 0;
  // Switching to the other narration's film is a transaction (src/scripts/captions.ts): while it
  // loads, the buttons act on what it will resume, and only a film in view, in a visible tab and
  // not paused by hand plays again when it lands.
  const switcher = filmSwitcher(video, { mayResume: () => visible && !document.hidden && !heldByUser, play: () => play() });
  const stop = () => {
    attempt++;
    if (switcher.busy) {
      switcher.revoke();
      setState('paused');
    }
    if (!video.paused) video.pause();
  };

  const play = () => {
    const id = ++attempt;
    video.preload = 'auto';
    video.play().catch((error: unknown) => {
      const name = error instanceof DOMException ? error.name : '';
      // Interrupted (by a pause or a new load) or overtaken: whatever happened since stands.
      if (id !== attempt || name === 'AbortError') return;
      // A browser that refuses to play it with sound may still play it muted.
      if (name === 'NotAllowedError' && !video.muted) {
        video.muted = true;
        choice = 'auto';
        play();
        return;
      }
      setState(video.ended ? 'ended' : 'paused');
    });
  };

  const maybeAutoplay = () => {
    if (loaded && visible && !heldByUser && !reduce.matches && !document.hidden && !switcher.busy && video.muted && video.paused && !switcher.ended()) play();
  };

  // The narration on, from a click: the first time from the beginning, so none of it is missed.
  const listen = () => {
    choice = 'on';
    heldByUser = false;
    if (switcher.ended() || (!heard && switcher.time() > 0.5)) switcher.seek(0);
    heard = true;
    video.muted = false;
    if (!switcher.playing()) switcher.resume();
  };

  video.addEventListener('play', () => setState('playing'));
  video.addEventListener('pause', () => setState(video.ended ? 'ended' : 'paused'));
  video.addEventListener('ended', () => setState('ended'));
  video.addEventListener('volumechange', setSound);

  // If no source can play, keep the poster and drop the buttons; a film that loads brings them back.
  const sources = [...video.querySelectorAll('source')];
  sources.at(-1)?.addEventListener('error', () => {
    toggle.hidden = true;
    sound.hidden = true;
  });
  video.addEventListener('loadedmetadata', () => {
    toggle.hidden = false;
    sound.hidden = false;
  });

  sound.addEventListener('click', () => {
    if (video.muted) listen();
    else {
      choice = 'off';
      video.muted = true;
    }
  });

  toggle.addEventListener('click', () => {
    if (!switcher.playing()) {
      // Started by someone: with its sound, unless they muted it.
      if (choice !== 'off' && video.muted) return listen();
      heldByUser = false;
      if (switcher.ended()) switcher.seek(0);
      switcher.resume();
    } else {
      heldByUser = true;
      stop();
      setState('paused');
    }
  });

  // Subtitles: a track per language (only the chosen one loads), shown in the line under the film.
  if (config && cc && ccSelect && subtitle) {
    cc.hidden = false;
    const tracks = new Map<string, HTMLTrackElement>();
    let current = initialCaption(config);
    let visual = config.visual;
    const show = () => {
      const track = current === 'off' ? null : tracks.get(current)?.track;
      const cues = track?.activeCues ? [...track.activeCues] : [];
      subtitle.textContent = cues.map((cue) => (cue as VTTCue).text).join('\n');
    };
    for (const tag of config.order) {
      const el = document.createElement('track');
      el.kind = 'subtitles';
      el.srclang = tag;
      el.label = config.captions[tag].name;
      el.src = config.captions[tag].vtt;
      el.addEventListener('cuechange', () => tag === current && show());
      video.append(el);
      tracks.set(tag, el);
    }
    // The chosen track is read, never drawn by the browser over the film: if anything else turns a
    // track on (the browser may pick one by its language), it goes back.
    const keepModes = () => {
      for (const [tag, el] of tracks) {
        const wanted = tag === current ? 'hidden' : 'disabled';
        if (el.track.mode !== wanted) el.track.mode = wanted;
      }
    };
    video.textTracks.addEventListener('change', keepModes);
    const applyCaption = () => {
      keepModes();
      subtitle.hidden = current === 'off';
      if (current !== 'off') {
        subtitle.lang = current;
        subtitle.dir = config.captions[current].dir;
      }
      show();
      cc.dataset.state = current === 'off' ? 'off' : 'on';
      if (ccText) ccText.textContent = current === 'off' ? config.text.off : config.captions[current].short;
      ccSelect.value = current;
    };
    // The note, the film's description and the sound button follow the narration that plays.
    const applyNarration = () => {
      narration = config.visuals[visual].narration as 'en' | 'zh';
      if (narrationNote) narrationNote.textContent = config.text.narrationNote[narration];
      video.setAttribute('aria-label', config.text.label.replace('{narration}', config.text.narration[narration]));
      setSound();
    };
    const showFilm = async (next: string) => {
      if (next === visual) return;
      visual = next;
      const films = config.visuals[visual].plain;
      video.dataset.posterNarrow = films.tall.poster;
      video.poster = narrowMatches(video) ? films.tall.poster : films.wide.poster;
      applyNarration();
      // Everything shown already follows this choice; a switch that a later one replaced just ends.
      // One that lands starts by itself only as any film does: muted, in view, in a visible tab (it
      // may have left and come back while loading, when starting had to wait).
      if (await switcher.to(films)) maybeAutoplay();
    };
    ccSelect.addEventListener('change', () => {
      current = ccSelect.value;
      saveCaption(config, current);
      applyCaption();
      if (current !== 'off') void showFilm(config.captions[current].visual);
    });
    applyCaption();
    if (current !== 'off' && config.captions[current].visual !== visual) void showFilm(config.captions[current].visual);
    else applyNarration();
  }

  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      if (visible) maybeAutoplay();
      else stop();
    },
    { threshold: [0, 0.5] },
  ).observe(video);

  // Another tab or a minimised window: pause; on return, only a muted film resumes by itself.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else maybeAutoplay();
  });

  if (!loaded) {
    addEventListener(
      'load',
      () => {
        // Let the poster settle as the first thing people see, then start.
        setTimeout(() => {
          loaded = true;
          maybeAutoplay();
        }, 400);
      },
      { once: true },
    );
  }
}
