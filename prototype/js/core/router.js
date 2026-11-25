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

  const router = {
    add(pattern, handler) { routes.push(Object.assign(compile(pattern), { handler })); },
    path() { return (location.hash || '#/tasks').slice(1) || '/tasks'; },
    go(path) {
      if (router.path() === path) CS.app.rerender();
      else location.hash = '#' + path;
    },
    resolve() {
      const path = router.path();
      for (const r of routes) {
        const params = match(r, path);
        if (params) return { handler: r.handler, params, path };
      }
      return null;
    }
  };

  CS.router = router;
})(window.CS = window.CS || {});
