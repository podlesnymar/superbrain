/* Ekran „Klienci”: lista przestrzeni, do których użytkownik ma dostęp. */
(function (CS) {
  'use strict';
  const { h } = CS.dom;
  const S = CS.store;
  const U = CS.util;
  const ui = CS.ui;

  const vs = { q: '', status: '' };

  function listProgress(client) {
    const items = client.lists.flatMap((l) => l.items);
    const live = items.filter((i) => i.status === 'live').length;
    return { live, total: items.length };
  }

  function openAddClient() {
    const name = h('input', { class: 'input', type: 'text', placeholder: 'Nazwa klienta' });
    const status = ui.select(S.state.clientStatuses.map((s) => ({ value: s.name, label: s.name })), 'Wdrożenie');
    const care = ui.select(S.state.users.filter((u) => u.role !== 'readonly').map((u) => ({ value: u.id, label: u.name })), S.me().id);
    ui.modal({
      title: 'Nowy klient',
      body: h('div', { class: 'form' }, ui.field('Nazwa', name), h('div', { class: 'form-row' }, ui.field('Status', status), ui.field('Opiekun', care))),
      actions: [{ label: 'Anuluj' }, {
        label: 'Utwórz przestrzeń', primary: true,
        onClick: () => {
          if (!name.value.trim()) { name.focus(); name.classList.add('invalid'); return false; }
          const c = S.addClient({ name: name.value.trim(), status: status.value, caretaker: care.value });
          ui.toast('Utworzono przestrzeń klienta');
          CS.router.go(`/clients/${c.id}`);
        }
      }]
    });
  }

  CS.views = CS.views || {};
  CS.views.clients = function () {
    const all = S.visibleClients();
    const q = U.norm(vs.q);
    const rows = all.filter((c) =>
      (!vs.status || c.status === vs.status) &&
      (!q || U.norm(c.name).includes(q) || c.tags.some((t) => U.norm(t).includes(q))));

    const body = rows.map((c) => {
      const p = listProgress(c);
      const days = c.contractTo ? U.diffDays(c.contractTo, U.today()) : null;
      const soon = days !== null && days >= 0 && days <= 60;
      const caretaker = S.user(c.caretaker);
      return h('tr', { class: 'row-link', onclick: () => CS.router.go(`/clients/${c.id}`) },
        h('td', null,
          h('a', { class: 'strong', href: `#/clients/${c.id}`, onclick: (e) => e.stopPropagation() }, c.name),
          h('div', { class: 'tags' }, c.tags.map((t) => h('span', { class: 'tag' }, t)))),
        h('td', null, ui.badge(c.status, S.clientStatusTone(c.status))),
        h('td', null, caretaker ? h('span', { class: 'owner' }, ui.avatar(caretaker, true), h('span', null, caretaker.name)) : '—'),
        h('td', null, c.contractTo ? [U.fmtDate(c.contractTo), soon ? [' ', ui.badge(`za ${days} dni`, 'amber')] : null] : '—'),
        h('td', { class: 'num' }, String(S.openTaskCount(c.id))),
        h('td', null, p.total ? h('div', { class: 'progress-row' },
          h('div', { class: 'progress', title: `${p.live} z ${p.total} pozycji uruchomionych` }, h('span', { style: { width: Math.round(100 * p.live / p.total) + '%' } })),
          h('span', { class: 'muted small' }, `${p.live}/${p.total}`)) : h('span', { class: 'muted' }, '—')));
    });

    return h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', null, h('h1', null, 'Klienci'), h('p', { class: 'muted' }, `${all.length} przestrzeni z Twoim dostępem`)),
        S.hasPerm('spaces.create') ? h('button', { class: 'btn btn-primary', type: 'button', onclick: openAddClient }, ui.icon('plus', 15), ' Nowy klient') : null),
      h('div', { class: 'filters' },
        h('div', { class: 'search-field' }, ui.icon('search', 15),
          h('input', {
            class: 'input', type: 'search', placeholder: 'Szukaj po nazwie lub tagu', value: vs.q, 'aria-label': 'Szukaj klienta',
            oninput: (e) => {
              vs.q = e.target.value; CS.app.rerender();
              const el = document.querySelector('.search-field input'); if (el) { el.focus(); el.setSelectionRange(vs.q.length, vs.q.length); }
            }
          })),
        ui.select([{ value: '', label: 'Każdy status' }, ...S.state.clientStatuses.map((s) => ({ value: s.name, label: s.name }))], vs.status,
          (v) => { vs.status = v; CS.app.rerender(); }, { 'aria-label': 'Filtr statusu klienta' })),
      rows.length
        ? h('div', { class: 'card flush' }, h('table', { class: 'table table-hover' },
          h('thead', null, h('tr', null, ['Klient', 'Status', 'Opiekun', 'Umowa do', 'Otwarte zadania', 'Uruchomione pozycje'].map((t, i) => h('th', { class: i === 4 ? 'num' : '' }, t)))),
          h('tbody', null, body)))
        : h('div', { class: 'empty-state' }, all.length ? 'Brak klientów pasujących do filtrów.' : 'Nie masz jeszcze dostępu do żadnej przestrzeni klienta.'));
  };
})(window.CS = window.CS || {});
