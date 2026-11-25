/* Ekran „Moje zadania”: strona startowa po zalogowaniu. */
(function (CS) {
  'use strict';
  const { h } = CS.dom;
  const S = CS.store;
  const U = CS.util;
  const ui = CS.ui;

  const vs = { tab: 'mine', client: '', priority: '', showDone: false };

  const SECTIONS = [
    ['overdue', 'Przeterminowane'], ['today', 'Na dziś'], ['week', 'W tym tygodniu'], ['later', 'Później'], ['none', 'Bez terminu']
  ];
  const bucket = (t) => {
    if (!t.due) return 'none';
    const n = U.diffDays(t.due, U.today());
    if (n < 0) return 'overdue';
    if (n === 0) return 'today';
    return n <= 7 ? 'week' : 'later';
  };
  const PRIO_ORDER = { high: 0, normal: 1, low: 2 };

  function taskRow(t, showOwner) {
    const c = S.client(t.clientId);
    const canToggle = t.ownerId === S.me().id || S.canEditSpace(c);
    const late = t.status === 'open' && t.due && U.diffDays(t.due, U.today()) < 0;
    return h('li', { class: 'task' + (t.status === 'done' ? ' done' : '') },
      h('input', {
        type: 'checkbox', class: 'chk', checked: t.status === 'done', disabled: !canToggle,
        'aria-label': `Zrobione: ${t.title}`,
        onchange: () => { S.toggleTask(t.id); CS.app.rerender(); }
      }),
      h('div', { class: 'task-main' },
        h('div', { class: 'task-title' }, t.title),
        h('div', { class: 'task-meta' },
          h('a', { class: 'chip-link', href: `#/clients/${c.id}/notatki` }, c.name),
          t.desc ? h('span', { class: 'muted' }, ' · ' + t.desc) : null)),
      showOwner ? ui.avatar(S.user(t.ownerId), true) : null,
      ui.badge(CS.priorityLabels[t.priority], CS.priorityTone[t.priority]),
      h('div', { class: 'task-due' + (late ? ' overdue' : '') },
        t.due ? [U.fmtDate(t.due), h('span', { class: 'muted' }, ' · ' + U.relDay(t.due))] : h('span', { class: 'muted' }, 'bez terminu'),
        t.reminder !== 'none' && t.status === 'open'
          ? h('span', { class: 'reminder', title: 'Przypomnienie: ' + CS.reminderLabels[t.reminder] }, ui.icon('bell', 13)) : null));
  }

  CS.views = CS.views || {};
  CS.views.tasks = function () {
    const me = S.me();
    const visible = S.state.tasks.filter((t) => { const c = S.client(t.clientId); return c && S.canView(c); });
    const mine = visible.filter((t) => t.ownerId === me.id);
    const assigned = visible.filter((t) => t.createdBy === me.id && t.ownerId !== me.id);
    let list = vs.tab === 'mine' ? mine : assigned;
    if (vs.client) list = list.filter((t) => t.clientId === vs.client);
    if (vs.priority) list = list.filter((t) => t.priority === vs.priority);
    if (!vs.showDone) list = list.filter((t) => t.status === 'open');

    const clientsOpts = [{ value: '', label: 'Wszyscy klienci' }, ...S.visibleClients().map((c) => ({ value: c.id, label: c.name }))];
    const prioOpts = [{ value: '', label: 'Każdy priorytet' }, ...Object.entries(CS.priorityLabels).map(([value, label]) => ({ value, label }))];
    const openCount = (arr) => arr.filter((t) => t.status === 'open').length;

    const sections = SECTIONS.map(([key, label]) => {
      const items = list.filter((t) => (t.status === 'done' ? false : bucket(t) === key))
        .sort((a, b) => (a.due || '9').localeCompare(b.due || '9') || PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]);
      if (!items.length) return null;
      return h('section', { class: 'task-section' },
        h('h3', { class: 'section-title' + (key === 'overdue' ? ' danger' : '') }, label, h('span', { class: 'count' }, String(items.length))),
        h('ul', { class: 'task-list' }, items.map((t) => taskRow(t, vs.tab === 'assigned'))));
    }).filter(Boolean);

    const done = vs.showDone ? list.filter((t) => t.status === 'done') : [];
    if (done.length) {
      sections.push(h('section', { class: 'task-section' },
        h('h3', { class: 'section-title' }, 'Zrobione', h('span', { class: 'count' }, String(done.length))),
        h('ul', { class: 'task-list' }, done.map((t) => taskRow(t, vs.tab === 'assigned')))));
    }

    const myClients = S.visibleClients().filter((c) => c.caretaker === me.id);
    const myMentions = S.state.mentions.filter((m) => m.toId === me.id && S.canView(S.client(m.clientId)));

    return h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', null, h('h1', null, 'Moje zadania'), h('p', { class: 'muted' }, `${me.name} · ${openCount(mine)} otwartych`)),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => CS.openTaskModal({ onDone: () => CS.app.rerender() }) },
          ui.icon('plus', 15), ' Nowe zadanie')),
      h('div', { class: 'grid grid-main-aside' },
        h('div', null,
          h('div', { class: 'tabs', role: 'tablist' },
            h('button', { class: 'tab' + (vs.tab === 'mine' ? ' active' : ''), role: 'tab', 'aria-selected': String(vs.tab === 'mine'), type: 'button', onclick: () => { vs.tab = 'mine'; CS.app.rerender(); } }, `Moje (${openCount(mine)})`),
            h('button', { class: 'tab' + (vs.tab === 'assigned' ? ' active' : ''), role: 'tab', 'aria-selected': String(vs.tab === 'assigned'), type: 'button', onclick: () => { vs.tab = 'assigned'; CS.app.rerender(); } }, `Zlecone przeze mnie (${openCount(assigned)})`)),
          h('div', { class: 'filters' },
            ui.select(clientsOpts, vs.client, (v) => { vs.client = v; CS.app.rerender(); }, { 'aria-label': 'Filtr klienta' }),
            ui.select(prioOpts, vs.priority, (v) => { vs.priority = v; CS.app.rerender(); }, { 'aria-label': 'Filtr priorytetu' }),
            h('label', { class: 'check-label' },
              h('input', { type: 'checkbox', class: 'chk', checked: vs.showDone, onchange: (e) => { vs.showDone = e.target.checked; CS.app.rerender(); } }),
              ' Pokaż zrobione')),
          sections.length ? sections : h('div', { class: 'empty-state' }, 'Brak zadań dla wybranych filtrów.')),
        h('aside', { class: 'aside' },
          h('section', { class: 'card' },
            h('h3', null, 'Klienci, którymi się opiekuję'),
            myClients.length ? h('ul', { class: 'plain-list' }, myClients.map((c) =>
              h('li', null, h('a', { href: `#/clients/${c.id}` }, c.name), ' ', ui.badge(c.status, S.clientStatusTone(c.status)),
                h('span', { class: 'muted right' }, `${S.openTaskCount(c.id)} zad.`)))) : h('p', { class: 'muted' }, 'Brak przypisanych klientów.')),
          h('section', { class: 'card' },
            h('h3', null, 'Ostatnie wzmianki'),
            myMentions.length ? h('ul', { class: 'plain-list' }, myMentions.map((m) =>
              h('li', { class: 'mention' },
                h('div', null, h('strong', null, (S.user(m.byId) || {}).name), ' w ', h('a', { href: `#/clients/${m.clientId}/notatki` }, S.client(m.clientId).name)),
                h('div', { class: 'muted' }, m.text),
                h('div', { class: 'muted small' }, U.fmtDateTime(m.at))))) : h('p', { class: 'muted' }, 'Brak wzmianek.')))));
  };
})(window.CS = window.CS || {});
