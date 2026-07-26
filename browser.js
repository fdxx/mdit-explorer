(() => {
  const loaded = Symbol.for('mdit-explorer.loaded');
  if (window[loaded]) return;
  window[loaded] = true;

  const ensureLineNumbers = view => {
    if (!view?.dataset.lineCount || view.querySelector('.mexp__lines')) return;
    const lineCount = Number.parseInt(view.dataset.lineCount, 10);
    if (!Number.isSafeInteger(lineCount) || lineCount < 1) return;

    const gutter = document.createElement('pre');
    gutter.className = 'mexp__lines';
    gutter.setAttribute('aria-hidden', 'true');
    gutter.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
    view.prepend(gutter);
    view.classList.add('mexp__view--with-lines');
  };

  const select = (root, button) => {
    const path = button.dataset.path;
    const selectedView = [...root.querySelectorAll('.mexp__view')]
      .find(element => element.dataset.path === path);
    ensureLineNumbers(selectedView);
    root.querySelectorAll('.mexp__file').forEach(element => {
      element.setAttribute('aria-selected', String(element === button));
    });
    root.querySelectorAll('.mexp__view').forEach(element => {
      element.hidden = element.dataset.path !== path;
    });
    root.querySelector('.mexp__tab-name').textContent = button.dataset.name;
    root.querySelector('.mexp__crumb').textContent = path;
    root.querySelector('.mexp__copy').dataset.path = path;
  };

  const initialize = () => {
    document.querySelectorAll('.mexp__view[data-line-count]:not([hidden])')
      .forEach(ensureLineNumbers);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  const copyText = async text => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    if (!copied) throw new Error('Copy failed');
  };

  document.addEventListener('click', async event => {
    const file = event.target.closest('.mexp__file');
    if (file) {
      const root = file.closest('[data-mdit-explorer]');
      if (!root) return;
      select(root, file);
      return;
    }

    const copy = event.target.closest('.mexp__copy');
    if (!copy) return;
    const root = copy.closest('[data-mdit-explorer]');
    if (!root) return;
    const view = [...root.querySelectorAll('.mexp__view')]
      .find(element => element.dataset.path === copy.dataset.path);
    if (!view) return;

    try {
      await copyText(view.querySelector('code').textContent);
      copy.setAttribute('aria-label', 'Copied');
      setTimeout(() => copy.setAttribute('aria-label', 'Copy code'), 1200);
    } catch {
      copy.setAttribute('aria-label', 'Copy failed');
    }
  });
})();
