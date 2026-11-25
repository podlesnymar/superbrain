/* Prosty router oparty o hash (#/clients/c1/lists).
   Wzorce: '/clients/:id/:tab?' – segment z ? jest opcjonalny. */
(function (CS) {
  'use strict';

  const routes = [];

  function compile(pattern) {
    const segs = pattern.split('/').filter(Boolean);
    return { pattern, segs };
  }

  function match(route, path) {
    const parts = path.split('/').filter(Boolean);
    const params = {};
    for (let i = 0; i < route.segs.length; i++) {
      const seg = route.segs[i];
      if (seg.startsWith(':')) {
        const optional = seg.endsWith('?');
        const name = seg.slice(1).replace('?', '');
        if (parts[i] === undefined) { if (optional) continue; return null; }
        params[name] = decodeURIComponent(parts[i]);
      } else if (parts[i] !== seg) {
        return null;
      }
    }
    if (parts.length > route.segs.length) return null;
    return params;
  }

  /* Tryb „w pamięci” (window.CS_MEMORY_ROUTING): ścieżka nie trafia do adresu strony.
     Potrzebny tam, gdzie adres nie może przenosić #/ścieżek, np. w osadzonym podglądzie. */
  const memory = !!window.CS_MEMORY_ROUTING;
  let memPath = '/tasks';

  const router = {
    add(pattern, handler) { routes.push(Object.assign(compile(pattern), { handler })); },
    path() { return memory ? memPath : ((location.hash || '#/tasks').slice(1) || '/tasks'); },
    /** Przejście do ścieżki; po zmianie odświeża ekran. */
    navigate(path) {
      if (memory) { memPath = path; CS.app.onRoute(); }
      else if (router.path() === path) CS.app.rerender();
      else location.hash = '#' + path;
    },
    go(path) { router.navigate(path); },
    resolve() {
      const path = router.path();
      for (const r of routes) {
        const params = match(r, path);
        if (params) return { handler: r.handler, params, path };
      }
      return null;
    },
    /** Włącza obsługę linków #/… w trybie w pamięci. */
    start() {
      if (!memory) return;
      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href^="#/"]');
        if (!a || e.defaultPrevented) return;
        e.preventDefault();
        const target = a.getAttribute('href').slice(1);
        setTimeout(() => router.navigate(target), 0); // po obsłudze kliknięcia przez sam link
      }, true);
    }
  };

  CS.router = router;
})(window.CS = window.CS || {});
