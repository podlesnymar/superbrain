/* Powłoka aplikacji: pasek boczny, górny pasek (wyszukiwarka, przełącznik użytkownika) i trasy. */
(function (CS) {
  'use strict';
  const { h, clear } = CS.dom;
  const S = CS.store;
  const R = CS.router;
  const ui = CS.ui;

  R.add('/tasks', () => CS.views.tasks());
  R.add('/clients', () => CS.views.clients());
  R.add('/clients/:id/:tab?', (p) => CS.views.client(p));
  R.add('/templates', () => CS.views.templates());
  R.add('/admin/:tab?', (p) => CS.views.admin(p));

  const NAV = [
    { path: '/tasks', label: 'Moje zadania', icon: 'tasks', match: (p) => p.startsWith('/tasks') },
    { path: '/clients', label: 'Klienci', icon: 'users', match: (p) => p.startsWith('/clients') },
    { path: '/templates', label: 'Szablony', icon: 'layers', match: (p) => p.startsWith('/templates') },
    { path: '/admin', label: 'Administracja', icon: 'settings', match: (p) => p.startsWith('/admin'), visible: () => S.hasPerm('users.manage') || S.hasPerm('statuses.edit') }
  ];

  let shell = null;

  function sidebar(path) {
    return h('nav', { class: 'sidebar', 'aria-label': 'Menu główne' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, 'OK'), h('span', null, 'Obsługa klienta')),
      h('ul', null, NAV.filter((n) => !n.visible || n.visible()).map((n) =>
        h('li', null, h('a', { href: '#' + n.path, class: n.match(path) ? 'active' : '', 'aria-current': n.match(path) ? 'page' : null }, ui.icon(n.icon, 18), h('span', null, n.label))))),
      h('div', { class: 'sidebar-foot muted small' }, 'Prototyp interfejsu. Dane są przykładowe i nie są zapisywane.'));
  }

  function topbar() {
    const results = h('div', { class: 'search-results', hidden: true });
    const input = h('input', { class: 'input', type: 'search', placeholder: 'Szukaj klienta…', 'aria-label': 'Wyszukiwarka klientów' });
    const hide = () => { results.hidden = true; };
    input.addEventListener('input', () => {
      const found = S.searchClients(input.value);
      clear(results);
      if (!input.value.trim()) { hide(); return; }
      results.hidden = false;
      if (!found.length) results.appendChild(h('div', { class: 'search-empty muted' }, 'Brak wyników'));
      found.slice(0, 6).forEach((c) => results.appendChild(h('a', {
        href: `#/clients/${c.id}`, class: 'search-item',
        onclick: () => { input.value = ''; hide(); }
      }, h('strong', null, c.name), ' ', ui.badge(c.status, S.clientStatusTone(c.status)))));
    });
    input.addEventListener('blur', () => setTimeout(hide, 150));
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; hide(); } });

    const me = S.me();
    const userSel = ui.select(S.state.users.map((u) => ({ value: u.id, label: `${u.name} (${S.role(u.role).name})` })), me.id, (v) => {
      S.setCurrentUser(v);
      const m = R.resolve();
      // po zmianie użytkownika wracamy na listę, jeśli traci dostęp do bieżącej przestrzeni
      if (m && m.params.id) { const c = S.client(m.params.id); if (!c || !S.canView(c)) { R.navigate('/clients'); return; } }
      if (m && m.path.startsWith('/admin') && !(S.hasPerm('users.manage') || S.hasPerm('statuses.edit'))) { R.navigate('/tasks'); return; }
      CS.app.rerender(true);
    }, { 'aria-label': 'Przełącz użytkownika (demo)' });

    return h('header', { class: 'topbar' },
      h('div', { class: 'search-wrap' }, ui.icon('search', 15), input, results),
      h('div', { class: 'topbar-right' },
        h('span', { class: 'muted small' }, 'Zalogowany jako (demo):'),
        userSel,
        ui.avatar(me)));
  }

  function render(full) {
    const root = document.getElementById('app');
    const resolved = R.resolve();
    const path = R.path();
    const main = shell && !full ? shell.main : null;
    const prevScroll = main ? main.scrollTop : 0;

    if (!shell || full) {
      clear(root);
      const mainEl = h('main', { class: 'main', id: 'main', tabindex: '-1' });
      shell = { main: mainEl, sidebar: null, topbar: null };
      shell.sidebar = sidebar(path);
      shell.topbar = topbar();
      root.appendChild(h('div', { class: 'shell' }, shell.sidebar, h('div', { class: 'content' }, shell.topbar, mainEl)));
    } else {
      const nav = sidebar(path);
      shell.sidebar.replaceWith(nav);
      shell.sidebar = nav;
    }

    const view = resolved ? resolved.handler(resolved.params) : h('div', { class: 'page' }, h('div', { class: 'empty-state' }, 'Nie znaleziono strony.'));
    clear(shell.main);
    shell.main.appendChild(view);
    shell.main.scrollTop = prevScroll;
  }

  let lastPath = null;
  CS.app = {
    rerender(full) {
      lastPath = R.path();
      render(!!full);
    },
    /** Wołane po zmianie trasy (zmiana hasha albo nawigacja w pamięci). */
    onRoute() {
      const path = R.path();
      const changed = path !== lastPath;
      CS.app.rerender();
      if (changed && shell) shell.main.scrollTop = 0;
    }
  };

  window.addEventListener('hashchange', () => CS.app.onRoute());
  document.addEventListener('DOMContentLoaded', () => {
    R.start();
    if (!location.hash && !window.CS_MEMORY_ROUTING) location.hash = '#/tasks';
    CS.app.rerender(true);
  });
})(window.CS = window.CS || {});
