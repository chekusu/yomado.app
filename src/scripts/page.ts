// Small progressive enhancements shared by every page. The pages work without them.
import { CAPTION_KEY, LANGUAGE_KEY } from '../lib/language';

// The header turns to night over night sections.
const header = document.querySelector<HTMLElement>('[data-header]');
const nights = [...document.querySelectorAll<HTMLElement>('[data-tone="night"]')];
if (header && nights.length) {
  let queued = false;
  const update = () => {
    queued = false;
    const y = header.offsetHeight / 2;
    // data-tone-from: how far down a section (0–1) it is dark enough to count as night.
    const night = nights.some((section) => {
      const r = section.getBoundingClientRect();
      const from = r.top + r.height * (parseFloat(section.dataset.toneFrom ?? '0') || 0);
      return from <= y && r.bottom > y;
    });
    header.dataset.tone = night ? 'night' : 'day';
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
}

// Copy the release checksum; if the clipboard is unavailable, select it instead.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const target = document.querySelector<HTMLElement>(button.dataset.copy ?? '');
  const status = button.parentElement?.querySelector<HTMLElement>('[data-copy-status]');
  const label = button.textContent?.trim() ?? '';
  let timer: number | undefined;

  button.addEventListener('click', async () => {
    if (!target) return;
    let message = button.dataset.copied ?? '';
    try {
      await navigator.clipboard.writeText(target.textContent?.trim() ?? '');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      message = button.dataset.fallback ?? '';
    }
    button.textContent = message;
    if (status) status.textContent = message;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      button.textContent = label;
    }, 2400);
  });
}

// Keep the reader's place when switching language: every locale has the same sections, so a
// hash that points at something on this page points at the same thing on the other. The links
// carry no query, so a ?cc= asking this page for other subtitles stays behind.
for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]')) {
  link.addEventListener('click', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    link.hash = id && document.getElementById(id) ? location.hash : '';
    // Remember a language picked by hand for the bare home page, and start its subtitles afresh:
    // a subtitle choice made before (in this or another language) gives way to the new language's
    // own subtitles, narration and downloads. If storage is off the link still works, and links to
    // the English home carry ?lang=en for exactly that case.
    try {
      if (link.dataset.locale) localStorage.setItem(LANGUAGE_KEY, link.dataset.locale);
      localStorage.removeItem(CAPTION_KEY);
    } catch {
      // Private browsing or blocked storage.
    }
  });
}

// The language menu is a native <details>; close it on Escape or a click elsewhere.
for (const menu of document.querySelectorAll<HTMLDetailsElement>('[data-lang-menu]')) {
  document.addEventListener('click', (event) => {
    if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    menu.querySelector('summary')?.focus();
  });
}
