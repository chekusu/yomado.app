// The concept film: starts muted once the page has loaded and the film is in view, pauses when it
// leaves the view or the tab, and never starts by itself under reduced motion. One button plays,
// pauses and replays; the sound button turns the narration on and off.
//
// Sound only ever comes on because someone asked: the sound button, or the play or replay button
// (a film someone starts plays with its sound, unless they muted it themselves). The first time
// the narration comes on, the film goes back to the beginning so it is heard whole. Starting by
// itself (after loading, on scrolling back, on returning to the tab) only ever happens muted; a
// film that was playing with its sound waits for the play button instead.

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

for (const figure of document.querySelectorAll<HTMLElement>('[data-film]')) {
  const video = figure.querySelector<HTMLVideoElement>('video');
  const toggle = figure.querySelector<HTMLButtonElement>('[data-film-toggle]');
  const sound = figure.querySelector<HTMLButtonElement>('[data-film-sound]');
  const soundText = sound?.querySelector<HTMLElement>('[data-film-sound-text]');
  if (!video || !toggle || !sound) continue;

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
    sound.setAttribute('aria-label', (on ? sound.dataset.labelOff : sound.dataset.labelOn) ?? '');
    if (soundText) soundText.textContent = (on ? sound.dataset.textOff : sound.dataset.textOn) ?? '';
  };

  // Every start is numbered, and pausing, leaving the view or leaving the tab moves the number on:
  // a late answer to an older play() never undoes what happened since.
  let attempt = 0;
  const stop = () => {
    attempt++;
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
    if (loaded && visible && !heldByUser && !reduce.matches && !document.hidden && video.muted && video.paused && !video.ended) play();
  };

  // The narration on, from a click: the first time from the beginning, so none of it is missed.
  const listen = () => {
    choice = 'on';
    heldByUser = false;
    if (video.ended || (!heard && video.currentTime > 0.5)) video.currentTime = 0;
    heard = true;
    video.muted = false;
    if (video.paused) play();
  };

  video.addEventListener('play', () => setState('playing'));
  video.addEventListener('pause', () => setState(video.ended ? 'ended' : 'paused'));
  video.addEventListener('ended', () => setState('ended'));
  video.addEventListener('volumechange', setSound);

  // If no source can play, keep the poster and drop the buttons.
  const sources = [...video.querySelectorAll('source')];
  sources.at(-1)?.addEventListener('error', () => {
    toggle.hidden = true;
    sound.hidden = true;
  });

  sound.addEventListener('click', () => {
    if (video.muted) listen();
    else {
      choice = 'off';
      video.muted = true;
    }
  });

  toggle.addEventListener('click', () => {
    if (video.ended || video.paused) {
      // Started by someone: with its sound, unless they muted it.
      if (choice !== 'off' && video.muted) return listen();
      heldByUser = false;
      if (video.ended) video.currentTime = 0;
      play();
    } else {
      heldByUser = true;
      stop();
      setState('paused');
    }
  });

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
