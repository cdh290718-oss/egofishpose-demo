(() => {
  const dialog = document.getElementById('viewer');
  if (!dialog || !dialog.showModal) return;
  const image = document.getElementById('viewer-image');
  const title = document.getElementById('viewer-title');
  const full = document.getElementById('viewer-full');
  const buttons = [...dialog.querySelectorAll('[data-version]')];
  let trigger, item;
  function show(version) {
    const name = version === 'original' ? '原流程' : '双目联合';
    image.src = version === 'original' ? item.before : item.after;
    image.alt = item.title + ' / ' + name;
    title.textContent = image.alt;
    full.href = image.src;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.version === version)));
  }
  document.querySelectorAll('.zoom').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      item = link.dataset;
      show(item.mode);
      dialog.showModal();
    });
  });
  buttons.forEach(button => button.addEventListener('click', () => show(button.dataset.version)));
  document.getElementById('close-viewer').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(event.key === 'ArrowLeft' ? 'original' : 'joint');
    }
  });
  dialog.addEventListener('close', () => { if (trigger) trigger.focus(); });
})();
