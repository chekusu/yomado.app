// Poses the scene drawn by Scene.astro at any moment of the story timeline.
import { ICON, PHYS, STAGE, WINDOW, pose, type Box, type Layout, type ScreenId, type WindowId } from '../lib/scene';

const SCREENS: ScreenId[] = ['codex', 'grok'];
const WINDOWS: WindowId[] = ['blender', 'md', 'chrome'];

const n = (v: number) => +v.toFixed(2);
const at = (x: number, y: number, s = 1) => `translate(${n(x)}px, ${n(y)}px)${s === 1 ? '' : ` scale(${+s.toFixed(4)})`}`;

/** The same box scaled about its centre. */
function grow(b: Box, s: number): Box {
  return { x: b.x - (b.w * (s - 1)) / 2, y: b.y - (b.h * (s - 1)) / 2, w: b.w * s, h: b.h * s };
}

export class SceneView {
  readonly root: HTMLElement;
  layout: Layout = 'wide';
  t = 0;
  /** Keep the scene at least this dark (0–1), e.g. once the page has turned to night. */
  nightFloor = 0;

  private readonly stage: HTMLElement;
  private readonly part: Record<string, HTMLElement>;
  private readonly chips: Record<string, HTMLElement>;
  private readonly bite: SVGCircleElement | null;
  private readonly fixed?: Layout;

  constructor(root: HTMLElement) {
    this.root = root;
    this.stage = root.querySelector<HTMLElement>('[data-stage]')!;
    this.part = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-part]')].map((el) => [el.dataset.part, el]));
    this.chips = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-chip]')].map((el) => [el.dataset.chip, el]));
    this.bite = root.querySelector('[data-bite]');
    const fixed = root.dataset.fixedLayout;
    this.fixed = fixed === 'wide' || fixed === 'tall' ? fixed : undefined;
    this.measure();
  }

  /** Choose the layout from the container's shape and fit the stage inside it. */
  measure(): void {
    const { width, height } = this.root.getBoundingClientRect();
    if (!width || !height) return;
    this.layout = this.fixed ?? (width / height < 1.15 ? 'tall' : 'wide');
    this.root.dataset.layout = this.layout;
    const stage = STAGE[this.layout];
    const k = Math.min(width / stage.w, height / stage.h);
    this.stage.style.width = `${stage.w}px`;
    this.stage.style.height = `${stage.h}px`;
    this.stage.style.transform = `${at((width - stage.w * k) / 2, (height - stage.h * k) / 2)} scale(${+k.toFixed(5)})`;
    this.render(this.t);
  }

  render(t: number): void {
    this.t = t;
    const p = pose(t, this.layout);
    const night = Math.max(p.night, this.nightFloor);
    this.root.style.setProperty('--night', `${n(night)}`);
    this.root.style.setProperty('--dusk', `${n(Math.sin(Math.PI * Math.min(p.night, 1)))}`);

    const phys = this.part.phys;
    phys.style.transform = at(p.phys.box.x, p.phys.box.y, p.phys.box.w / PHYS.w);
    phys.style.opacity = `${n(p.phys.opacity)}`;
    phys.style.visibility = p.phys.opacity > 0 ? '' : 'hidden';

    for (const id of SCREENS) {
      const s = p.screens[id];
      const el = this.part[id];
      el.style.transform = at(s.box.x, s.box.y);
      el.style.width = `${n(s.box.w)}px`;
      el.style.height = `${n(s.box.h)}px`;
      el.style.borderRadius = `${n(s.radius[0])}px ${n(s.radius[1])}px ${n(s.radius[1])}px ${n(s.radius[1])}px`;
      el.style.opacity = `${n(Math.min(s.reveal * 1.6, 1) * s.opacity)}`;
      el.style.setProperty('--reveal', `${n(s.reveal)}`);
      el.style.setProperty('--lit', `${n(s.lit)}`);
      el.style.setProperty('--glow', `${n(Math.max(s.glow, 0.35 + 0.65 * night))}`);

      const l = p.labels[id];
      const label = this.part[`${id}-label`];
      label.style.transform = at(l.x, l.y);
      label.style.width = `${n(l.w)}px`;
      label.style.opacity = `${n(l.opacity)}`;
      label.style.setProperty('--name', `${n(l.name)}`);
      label.style.setProperty('--meta', `${n(l.meta)}`);
      for (const chip of l.chips) this.chips[chip.id]?.style.setProperty('--pop', `${n(chip.pop)}`);
    }

    for (const id of WINDOWS) {
      const w = p.windows[id];
      const el = this.part[id];
      const box = grow(w.box, 1 + 0.035 * w.lift);
      el.style.transform = at(box.x, box.y, box.w / WINDOW.w);
      el.style.opacity = `${n(w.opacity)}`;
      el.style.visibility = w.opacity > 0 ? '' : 'hidden';
      el.style.setProperty('--lift', `${n(w.lift)}`);
      el.style.setProperty('--work', `${+w.work.toFixed(4)}`);
    }

    const m = p.mark;
    const mark = this.part.mark;
    const markScale = (m.box.w / 300) * (0.94 + 0.06 * m.opacity);
    const markBox = grow(m.box, 0.94 + 0.06 * m.opacity);
    mark.style.transform = at(markBox.x, markBox.y, markScale);
    mark.style.opacity = `${n(m.opacity)}`;
    mark.style.visibility = m.opacity > 0 ? '' : 'hidden';
    mark.style.setProperty('--tile', `${n(m.tile)}`);
    if (this.bite) {
      // The crescent slides in over the top-right corner, like the moon in front of a lit window.
      const cx = ICON.x + ICON.w - 0.646 * ICON.r;
      const cy = ICON.y + 0.67 * ICON.r;
      const away = (1 - m.bite) * 22;
      this.bite.setAttribute('cx', `${n(cx + away)}`);
      this.bite.setAttribute('cy', `${n(cy - away)}`);
    }

    const word = this.part.word;
    word.style.transform = at(0, p.word.y);
    word.style.fontSize = `${p.word.size}px`;
    word.style.opacity = `${n(p.word.opacity)}`;
    word.style.visibility = p.word.opacity > 0 ? '' : 'hidden';
  }
}
