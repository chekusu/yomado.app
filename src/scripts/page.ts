// Small progressive enhancements shared by every page. The pages work without them.

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

// Keep the reader's place when switching language.
for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]')) {
  link.addEventListener('click', () => {
    if (location.hash) link.hash = location.hash;
  });
}
