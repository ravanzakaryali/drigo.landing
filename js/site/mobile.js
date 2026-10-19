// Phone helpers: the floating "Get the app" button and the counter for the swipeable trip cards.
(() => {
  const phone = matchMedia('(max-width: 760px)');

  // The button shows once the hero has scrolled away, and stays out of the way of the
  // stacked reviews, the partner form, the download section and the footer.
  const cta = document.querySelector('.m-cta'), hero = document.querySelector('.map-hero');
  if (cta && hero && 'IntersectionObserver' in window) {
    const quiet = [...document.querySelectorAll('#reviews, #business, #get-the-app, .foot')], seen = new Map();
    const watcher = new IntersectionObserver(entries => {
      entries.forEach(entry => seen.set(entry.target, entry.isIntersecting));
      cta.classList.toggle('is-shown', seen.get(hero) === false && !quiet.some(node => seen.get(node)));
    });
    [hero, ...quiet].forEach(node => watcher.observe(node));
  }

  // 01/04 follows whichever step card is snapped into view.
  const track = document.querySelector('.ride-track'), now = document.querySelector('.ride-now');
  if (track && now) {
    const cards = [...track.children];
    let frame = 0;
    track.addEventListener('scroll', () => {
      if (!phone.matches || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
        const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
        const index = atEnd ? cards.length - 1 : Math.round(track.scrollLeft / step);
        now.textContent = String(index + 1).padStart(2, '0');
      });
    }, { passive: true });
  }
})();
