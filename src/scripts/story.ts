// Ties the scenes to the page: scroll scrubs acts 1–3 of the story timeline, and the finale plays
// act 4 once when it comes into view. Under reduced motion each act jumps to its finished state.
import { ACT_END, FINALE } from '../lib/scene';
import { SceneView } from './scene-view';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const views: SceneView[] = [];

// Progress through the story section (0–1) → moment on the timeline. Each act animates, then
// holds while its headline is read.
const KEYS: [number, number][] = [
  [0, 0],
  [0.04, 0],
  [0.26, ACT_END[0]],
  [0.37, ACT_END[0]],
  [0.59, ACT_END[1]],
  [0.7, ACT_END[1]],
  [0.92, ACT_END[2]],
  [1, ACT_END[2]],
];
// Where each act's headline takes over.
const ACT_FROM = [0, 0.33, 0.66];

function timeAt(p: number): number {
  for (let i = 1; i < KEYS.length; i++) {
    const [p0, t0] = KEYS[i - 1];
    const [p1, t1] = KEYS[i];
    if (p <= p1) return t0 + (t1 - t0) * ((p - p0) / (p1 - p0 || 1));
  }
  return KEYS[KEYS.length - 1][1];
}

const story = document.querySelector<HTMLElement>('[data-story]');
const storyScene = story?.querySelector<HTMLElement>('[data-scene]');
if (story && storyScene) {
  const sticky = story.firstElementChild as HTMLElement;
  const acts = [...story.querySelectorAll<HTMLElement>('[data-act]')];
  const view = new SceneView(storyScene);
  views.push(view);
  let target = 0;
  let shown = 0;
  let frame = 0;
  let active = 0;

  const progress = () => {
    const r = story.getBoundingClientRect();
    const travel = r.height - sticky.offsetHeight;
    const top = parseFloat(getComputedStyle(sticky).top) || 0;
    return travel > 0 ? Math.min(1, Math.max(0, (top - r.top) / travel)) : 0;
  };

  const setAct = (i: number) => {
    if (i === active) return;
    active = i;
    acts.forEach((act, j) => act.classList.toggle('is-active', j === i));
  };

  // Ease the scene toward the scrolled-to moment, so wheel steps glide instead of jump.
  const tick = () => {
    frame = 0;
    const diff = target - shown;
    shown = Math.abs(diff) < 0.004 ? target : shown + diff * 0.18;
    view.render(shown);
    if (shown !== target) frame = requestAnimationFrame(tick);
  };

  const update = () => {
    const p = progress();
    const act = p >= ACT_FROM[2] ? 2 : p >= ACT_FROM[1] ? 1 : 0;
    setAct(act);
    if (reduce.matches) {
      target = shown = ACT_END[act];
      view.render(shown);
      return;
    }
    target = timeAt(p);
    if (!frame) frame = requestAnimationFrame(tick);
  };

  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  reduce.addEventListener('change', update);
  update();
  shown = target;
  view.render(shown);
}

const finale = document.querySelector<HTMLElement>('[data-finale]');
const finaleScene = finale?.querySelector<HTMLElement>('[data-scene]');
if (finale && finaleScene) {
  const view = new SceneView(finaleScene);
  views.push(view);
  view.nightFloor = 1;
  const [from, to] = FINALE;
  view.render(reduce.matches ? to : from);
  let played = false;
  new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting || played) return;
      played = true;
      if (reduce.matches) {
        view.render(to);
        return;
      }
      const start = performance.now();
      const length = (to - from) * 1000;
      const step = (now: number) => {
        const u = Math.min(1, (now - start) / length);
        view.render(from + (to - from) * u);
        if (u < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    { threshold: 0.6 },
  ).observe(finale);
  reduce.addEventListener('change', () => reduce.matches && view.render(to));
}

// Refit the scenes whenever their boxes change size.
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) views.find((v) => v.root === entry.target)?.measure();
});
for (const view of views) ro.observe(view.root);
