// Small progressive enhancements. The page works fully without them.

// Replay the hero illustration.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-replay]')) {
  button.addEventListener('click', () => {
    const scene = document.getElementById(button.dataset.replay ?? '');
    if (!scene) return;
    scene.classList.remove('play');
    void scene.getBoundingClientRect();
    scene.classList.add('play');
  });
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
