document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.glass-nav');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a'));
  const activeLink = links.find(a => a.classList.contains('active'));
  if (!activeLink) return;

  const pill = document.createElement('span');
  pill.className = 'nav-pill';
  nav.insertBefore(pill, nav.firstChild);

  function placePill(link, animate) {
    const linkRect = link.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const x = linkRect.left - navRect.left;

    if (!animate) pill.style.transition = 'none';
    pill.style.width = linkRect.width + 'px';
    pill.style.transform = `translateX(${x}px)`;
    if (!animate) {
      void pill.offsetHeight; // force reflow so the "no transition" state applies
      pill.style.transition = '';
    }
  }

  const STORAGE_KEY = 'navPillFrom';
  const fromHref = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);

  const startLink = (fromHref && links.find(a => a.getAttribute('href') === fromHref)) || activeLink;

  // Snap instantly to the tab we arrived from (or the current tab on first visit)
  placePill(startLink, false);

  // Then slide to the actual active tab
  requestAnimationFrame(() => {
    requestAnimationFrame(() => placePill(activeLink, true));
  });

  nav.classList.add('js-ready');

  links.forEach(link => {
    link.addEventListener('click', () => {
      sessionStorage.setItem(STORAGE_KEY, activeLink.getAttribute('href'));
    });
  });

  window.addEventListener('resize', () => placePill(activeLink, false));
});