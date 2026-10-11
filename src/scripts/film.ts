// The concept film: starts muted once the page has loaded and the film is in view, pauses when it
// leaves, and never starts by itself under reduced motion. One button plays, pauses and replays.

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

for (const figure of document.querySelectorAll<HTMLElement>('[data-film]')) {
  const video = figure.querySelector<HTMLVideoElement>('video');
  const toggle = figure.querySelector<HTMLButtonElement>('[data-film-toggle]');
  if (!video || !toggle) continue;

  // Our button replaces the browser's controls; the right poster for the frame's shape.
  video.controls = false;
  toggle.hidden = false;
  if (video.dataset.narrow && matchMedia(video.dataset.narrow).matches && video.dataset.posterNarrow) {
    video.poster = video.dataset.posterNarrow;
  }

  let heldByUser = false;
  let visible = false;
  let loaded = document.readyState === 'complete';

  const setState = (state: 'playing' | 'paused' | 'ended') => {
    toggle.dataset.state = state;
    const label = state === 'playing' ? toggle.dataset.labelPause : state === 'ended' ? toggle.dataset.labelReplay : toggle.dataset.labelPlay;
    toggle.setAttribute('aria-label', label ?? '');
  };

  const play = () => {
    video.preload = 'auto';
    video.play().catch(() => setState('paused'));
  };

  const maybeAutoplay = () => {
    if (loaded && visible && !heldByUser && !reduce.matches && video.paused && !video.ended) play();
  };

  video.addEventListener('play', () => setState('playing'));
  video.addEventListener('pause', () => setState(video.ended ? 'ended' : 'paused'));
  video.addEventListener('ended', () => setState('ended'));

  // If no source can play, keep the poster and drop the button.
  const sources = [...video.querySelectorAll('source')];
  sources.at(-1)?.addEventListener('error', () => {
    toggle.hidden = true;
  });

  toggle.addEventListener('click', () => {
    if (video.ended) {
      heldByUser = false;
      video.currentTime = 0;
      play();
    } else if (video.paused) {
      heldByUser = false;
      play();
    } else {
      heldByUser = true;
      video.pause();
    }
  });

  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      if (visible) maybeAutoplay();
      else if (!video.paused) video.pause();
    },
    { threshold: [0, 0.5] },
  ).observe(video);

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
