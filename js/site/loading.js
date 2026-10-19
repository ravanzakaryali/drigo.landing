(() => {
  const loader = document.getElementById('site-loader');
  const content = [...document.body.children].filter(node => node !== loader && !['SCRIPT', 'STYLE'].includes(node.tagName));
  const wasInert = content.map(node => node.inert);
  content.forEach(node => { node.inert = true; });
  let complete = false;
  // Loading progress, 0-100. The bar moves by CSS transition so it keeps gliding while the city
  // build holds the main thread; the percentage reads the bar's live position on every frame.
  const fill = loader.querySelector('.loader-progress i'), readout = loader.querySelector('.loader-percent');
  let target = 0, frame = 0;
  const progress = (value, seconds = .5) => {
    if (!fill || value <= target) return;
    target = Math.min(100, value);
    fill.style.transitionDuration = `${seconds}s`;
    fill.style.transform = `translate3d(${target - 100}%,0,0)`;
  };
  const read = () => {
    const shift = new DOMMatrixReadOnly(getComputedStyle(fill).transform).m41, width = fill.offsetWidth || 1;
    readout.textContent = `${Math.round(Math.max(0, Math.min(100, (shift / width + 1) * 100)))}%`;
    frame = requestAnimationFrame(read);
  };
  if (fill && readout) {
    fill.getBoundingClientRect();
    progress(22, 2.4);
    frame = requestAnimationFrame(read);
  }
  const fail = () => {
    if (complete) return;
    loader.querySelector('.loader-label').textContent = 'The map is taking longer than expected.';
    loader.querySelector('.loader-actions').hidden = false;
  };
  const timeout = setTimeout(fail, 30000);
  // Never hold the page for more than 3 s. The static city picture covers the hero until the
  // live 3D city is ready, so people arriving from an ad can start reading straight away.
  const cap = setTimeout(() => finish(), Math.max(0, 3000 - performance.now()));
  let revealed;
  const shown = new Promise(resolve => { revealed = resolve; });
  const finish = async () => {
    if (complete) return shown;
    complete = true;
    clearTimeout(timeout);
    clearTimeout(cap);
    progress(100, .35);
    // Settle typography and layout while the opaque cover is still in place, and let 100% land.
    await Promise.all([Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1000))]), new Promise(resolve => setTimeout(resolve, 420))]);
    cancelAnimationFrame(frame);
    if (readout) readout.textContent = '100%';
    document.body.classList.add('is-revealing');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const hide = () => {
        if (loader.hidden) return;
        loader.hidden = true;
        document.body.classList.remove('is-loading', 'is-revealing');
        content.forEach((node, index) => { node.inert = wasInert[index]; });
        revealed();
      };
      loader.addEventListener('transitionend', event => {
        if (event.target === loader && event.propertyName === 'opacity') hide();
      });
      loader.classList.add('is-leaving');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) hide();
      else setTimeout(hide, 600);
    }));
    return shown;
  };
  document.getElementById('loader-retry').addEventListener('click', () => location.reload());
  document.getElementById('loader-continue').addEventListener('click', finish);
  const assetsReady = Promise.all([...loader.querySelectorAll('img')].map(image => image.decode().catch(() => {})));
  // Creep slowly while the 3D code downloads, so a slow connection never looks stuck.
  assetsReady.then(() => progress(40, 12));
  window.drigoLoading = { finish, fail, assetsReady, progress };
})();
