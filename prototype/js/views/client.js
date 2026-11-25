/* Przestrzeń klienta: Przegląd, Listy, Pliki, Notatki i zadania, Dostęp. */
(function (CS) {
  'use strict';
  const { h } = CS.dom;
  const S = CS.store;
  const U = CS.util;
  const ui = CS.ui;

  const TABS = [
    ['przeglad', 'Przegląd'], ['listy', 'Listy'], ['pliki', 'Pliki'], ['notatki', 'Notatki i zadania'], ['dostep', 'Dostęp']
  ];
  const LEVELS = [['', 'Brak dostępu'], ['read', 'Odczyt'], ['edit', 'Edycja'], ['owner', 'Właściciel']];
  const LEVEL_LABEL = { read: 'Odczyt', edit: 'Edycja', owner: 'Właściciel' };
  const selectedList = {}; // clientId -> listId

  const rerender = () => CS.app.rerender();
  const card = (title, ...children) => h('section', { class: 'card' }, h('h3', null, title), children);
  const dl = (rows) => h('dl', { class: 'dl' }, rows.filter(Boolean).map(([k, v]) => [h('dt', null, k), h('dd', null, v)]));

  /* ---------- Przegląd ---------- */
  function overview(c) {
    const caretaker = S.user(c.caretaker);
    const days = c.contractTo ? U.diffDays(c.contractTo, U.today()) : null;
    const open = S.tasksFor(c.id).filter((t) => t.status === 'open')
      .sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 5);

    return h('div', { class: 'grid grid-two' },
      h('div', { class: 'stack' },
        card('Karta klienta', dl([
          ['Status', ui.badge(c.status, S.clientStatusTone(c.status))],
          ['Opiekun', caretaker ? h('span', { class: 'owner' }, ui.avatar(caretaker, true), h('span', null, caretaker.name)) : '—'],
          ['Umowa', c.contractFrom ? `${U.fmtDate(c.contractFrom)} – ${U.fmtDate(c.contractTo)}` : '—'],
          days !== null && days >= 0 && days <= 60 ? ['Uwaga', ui.badge(`Umowa kończy się za ${days} dni`, 'amber')] : null,
          ['Okres wypowiedzenia', c.notice || '—'],
          ['Tagi', c.tags.length ? h('span', { class: 'tags' }, c.tags.map((t) => h('span', { class: 'tag' }, t))) : '—'],
          ['Identyfikator zewnętrzny', c.externalId || '—']
        ])),
        card('Osoby kontaktowe', c.contacts.length
          ? h('ul', { class: 'plain-list' }, c.contacts.map((p) => h('li', { class: 'contact' },
            h('strong', null, p.name), h('span', { class: 'muted' }, ` · ${p.role}`),
            h('div', { class: 'small' }, h('a', { href: `mailto:${p.email}` }, p.email), ' · ', p.phone))))
          : h('p', { class: 'muted' }, 'Brak kontaktów.'))),
      h('div', { class: 'stack' },
        card('Stan list', c.lists.length ? h('ul', { class: 'plain-list' }, c.lists.map((l) => {
          const live = l.items.filter((i) => i.status === 'live').length;
          const hold = l.items.filter((i) => i.status === 'hold').length;
          return h('li', null,
            h('a', { href: `#/clients/${c.id}/listy`, onclick: () => { selectedList[c.id] = l.id; } }, l.name),
            h('div', { class: 'progress-row' },
              h('div', { class: 'progress' }, h('span', { style: { width: l.items.length ? Math.round(100 * live / l.items.length) + '%' : '0' } })),
              h('span', { class: 'muted small' }, `${live}/${l.items.length} uruchomione${hold ? `, ${hold} wstrzymane` : ''}`)));
        })) : h('p', { class: 'muted' }, 'Brak list. Dodaj pierwszą w zakładce Listy.')),
        card('Otwarte zadania', open.length ? h('ul', { class: 'plain-list' }, open.map((t) => {
          const late = t.due && U.diffDays(t.due, U.today()) < 0;
          return h('li', null, h('span', null, t.title), ' ',
            h('span', { class: 'muted right' + (late ? ' overdue' : '') }, t.due ? U.fmtDate(t.due) : 'bez terminu'));
        })) : h('p', { class: 'muted' }, 'Brak otwartych zadań.')),
        card('Ostatnia aktywność', c.activity.length ? h('ul', { class: 'activity' }, c.activity.slice(0, 8).map((a) =>
          h('li', null, ui.avatar(S.user(a.userId), true),
            h('div', null, h('div', null, a.text), h('div', { class: 'muted small' }, `${(S.user(a.userId) || {}).name || '—'} · ${U.fmtDateTime(a.at)}`)))))
          : h('p', { class: 'muted' }, 'Brak aktywności.'))));
  }

  /* ---------- Listy ---------- */
  function openAddList(c) {
    const name = h('input', { class: 'input', type: 'text', placeholder: 'np. Moduły systemu' });
    const preview = h('div', { class: 'tpl-preview' });
    const tplSel = ui.select([{ value: '', label: 'Pusta lista' }, ...S.state.templates.map((t) => ({ value: t.id, label: `${t.name} (wersja ${t.version})` }))], '', () => refresh());
    function refresh() {
      const tpl = S.state.templates.find((t) => t.id === tplSel.value);
      CS.dom.clear(preview);
      if (tpl) {
        if (!name.value || S.state.templates.some((t) => t.name === name.value)) name.value = tpl.name;
        tpl.groups.forEach((g) => preview.appendChild(h('div', null, h('strong', null, g.name), h('div', { class: 'muted small' }, g.items.join(', ')))));
      } else if (S.state.templates.some((t) => t.name === name.value)) name.value = '';
    }
    ui.modal({
      title: 'Nowa lista',
      body: h('div', { class: 'form' }, ui.field('Szablon', tplSel), ui.field('Nazwa listy', name),
        h('p', { class: 'muted small' }, 'Pozycje z szablonu dostaną status „Do uruchomienia”. Później można je dowolnie zmieniać; zmiana szablonu nie wpłynie na utworzoną listę.'), preview),
      actions: [{ label: 'Anuluj' }, {
        label: 'Dodaj listę', primary: true,
        onClick: () => {
          if (!name.value.trim()) { name.focus(); name.classList.add('invalid'); return false; }
          const l = S.addList(c.id, name.value.trim(), tplSel.value || null);
          selectedList[c.id] = l.id;
          ui.toast('Dodano listę');
          rerender();
        }
      }]
    });
  }

  function lists(c) {
    const canEdit = S.canEditSpace(c);
    if (!c.lists.length) {
      return h('div', { class: 'empty-state' },
        h('p', null, 'Ten klient nie ma jeszcze żadnej listy.'),
        canEdit ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openAddList(c) }, ui.icon('plus', 15), ' Dodaj listę') : null);
    }
    let list = c.lists.find((l) => l.id === selectedList[c.id]) || c.lists[0];
    selectedList[c.id] = list.id;
    const tpl = list.template ? S.state.templates.find((t) => t.id === list.template.id) : null;
    const outdated = tpl && tpl.version > list.template.version;

    return h('div', null,
      h('div', { class: 'list-tabs' },
        c.lists.map((l) => h('button', {
          class: 'chip' + (l.id === list.id ? ' active' : ''), type: 'button',
          onclick: () => { selectedList[c.id] = l.id; rerender(); }
        }, l.name, h('span', { class: 'count' }, String(l.items.length)))),
        canEdit ? h('button', { class: 'chip chip-add', type: 'button', onclick: () => openAddList(c) }, ui.icon('plus', 14), ' Nowa lista') : null),
      tpl ? h('p', { class: 'muted small' }, `Utworzona z szablonu „${tpl.name}” (wersja ${list.template.version}). `,
        outdated ? ui.badge(`Dostępna nowsza wersja szablonu: ${tpl.version}`, 'amber') : null) : null,
      CS.components.sheet(list, c, rerender));
  }

  /* ---------- Pliki ---------- */
  function files(c) {
    const canEdit = S.canEditSpace(c);
    const cat = ui.select(S.state.fileCategories.map((x) => ({ value: x, label: x })), S.state.fileCategories[0], null, { 'aria-label': 'Kategoria nowych plików' });
    const input = h('input', {
      type: 'file', multiple: true, class: 'visually-hidden', id: 'file-input',
      onchange: () => {
        [...input.files].forEach((f) => S.addFile(c.id, { name: f.name, size: f.size, category: cat.value }));
        if (input.files.length) { ui.toast(`Wgrano plików: ${input.files.length}`); rerender(); }
      }
    });
    const rows = c.files.map((f) => {
      const soon = f.expires && U.diffDays(f.expires, U.today()) <= 60;
      return h('tr', null,
        h('td', null, h('span', { class: 'file-name' }, ui.icon('file', 15), ' ', f.name)),
        h('td', null, ui.badge(f.category, 'gray')),
        h('td', null, `v${f.version}`),
        h('td', null, U.fmtSize(f.size)),
        h('td', null, (S.user(f.by) || {}).name || '—'),
        h('td', null, U.fmtDate(f.at)),
        h('td', null, f.expires ? [U.fmtDate(f.expires), soon ? [' ', ui.badge('wkrótce', 'amber')] : null] : '—'),
        h('td', null, h('button', { class: 'btn-icon', type: 'button', title: 'Pobierz', 'aria-label': `Pobierz ${f.name}`, onclick: () => ui.toast('To prototyp: pobieranie plików będzie dostępne w wersji docelowej') }, ui.icon('download', 15))));
    });
    return h('div', { class: 'stack' },
      canEdit ? h('div', { class: 'dropzone' },
        ui.icon('upload', 20),
        h('div', null, h('strong', null, 'Wgraj pliki'), h('div', { class: 'muted small' }, 'Plik o tej samej nazwie i kategorii dostanie kolejną wersję.')),
        ui.field('Kategoria', cat),
        h('label', { class: 'btn btn-primary', for: 'file-input' }, 'Wybierz pliki'), input) : null,
      c.files.length ? h('div', { class: 'card flush' }, h('table', { class: 'table' },
        h('thead', null, h('tr', null, ['Plik', 'Kategoria', 'Wersja', 'Rozmiar', 'Dodał', 'Data', 'Ważny do', ''].map((t) => h('th', null, t)))),
        h('tbody', null, rows))) : h('div', { class: 'empty-state' }, 'Brak plików. Wgraj zamówienie, zakres wdrożenia lub umowę.'));
  }

  /* ---------- Notatki i zadania ---------- */
  function notesAndTasks(c) {
    const canEdit = S.canEditSpace(c);
    const ta = h('textarea', { class: 'input', rows: 3, placeholder: 'Dodaj notatkę…', 'aria-label': 'Treść notatki' });
    const tasks = S.tasksFor(c.id).sort((a, b) => (a.status === b.status ? (a.due || '9').localeCompare(b.due || '9') : a.status === 'open' ? -1 : 1));
    return h('div', { class: 'grid grid-two' },
      h('div', { class: 'stack' },
        h('h3', { class: 'section-title' }, 'Notatki'),
        canEdit ? h('div', { class: 'card' }, ta, h('div', { class: 'card-actions' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { if (!ta.value.trim()) { ta.focus(); return; } S.addNote(c.id, ta.value.trim()); rerender(); } }, 'Dodaj notatkę'))) : null,
        c.notes.length ? c.notes.map((n) => h('article', { class: 'card note' },
          h('div', { class: 'note-head' }, ui.avatar(S.user(n.authorId), true), h('strong', null, (S.user(n.authorId) || {}).name), h('span', { class: 'muted small' }, U.fmtDateTime(n.at))),
          h('p', null, n.text))) : h('p', { class: 'muted' }, 'Brak notatek.')),
      h('div', { class: 'stack' },
        h('div', { class: 'section-head' }, h('h3', { class: 'section-title' }, 'Zadania klienta'),
          canEdit ? h('button', { class: 'btn btn-sm', type: 'button', onclick: () => CS.openTaskModal({ clientId: c.id, onDone: rerender }) }, ui.icon('plus', 14), ' Nowe zadanie') : null),
        tasks.length ? h('div', { class: 'card flush' }, h('ul', { class: 'task-list' }, tasks.map((t) => {
          const late = t.status === 'open' && t.due && U.diffDays(t.due, U.today()) < 0;
          return h('li', { class: 'task' + (t.status === 'done' ? ' done' : '') },
            h('input', { type: 'checkbox', class: 'chk', checked: t.status === 'done', disabled: !(canEdit || t.ownerId === S.me().id), 'aria-label': `Zrobione: ${t.title}`, onchange: () => { S.toggleTask(t.id); rerender(); } }),
            h('div', { class: 'task-main' }, h('div', { class: 'task-title' }, t.title),
              h('div', { class: 'task-meta muted' }, (S.user(t.ownerId) || {}).name, t.reminder !== 'none' ? ` · przypomnienie: ${CS.reminderLabels[t.reminder].toLowerCase()}` : '')),
            ui.badge(CS.priorityLabels[t.priority], CS.priorityTone[t.priority]),
            h('div', { class: 'task-due' + (late ? ' overdue' : '') }, t.due ? U.fmtDate(t.due) : h('span', { class: 'muted' }, 'bez terminu')));
        }))) : h('p', { class: 'muted' }, 'Brak zadań.')));
  }

  /* ---------- Dostęp ---------- */
  function access(c) {
    const canManage = S.canManageAccess(c);
    const rows = S.state.users.map((u) => {
      const admin = S.hasPerm('spaces.all', u);
      const lv = S.level(c, u);
      const eff = lv === null ? ['Brak dostępu', 'gray'] : S.canEditSpace(c, u) ? ['Może edytować', 'green'] : ['Tylko podgląd', 'blue'];
      return h('tr', null,
        h('td', null, h('span', { class: 'owner' }, ui.avatar(u, true), h('span', null, u.name))),
        h('td', null, S.role(u.role).name, u.account === 'local' ? [' ', ui.badge('konto lokalne', 'gray')] : null),
        h('td', null, admin ? h('span', { class: 'muted' }, 'Administrator: dostęp do wszystkich przestrzeni')
          : canManage ? ui.select(LEVELS.map(([value, label]) => ({ value, label })), c.access[u.id] || '', (v) => { S.setAccess(c.id, u.id, v || null); rerender(); }, { 'aria-label': `Poziom dostępu: ${u.name}` })
            : (LEVEL_LABEL[lv] || 'Brak')),
        h('td', null, ui.badge(eff[0], eff[1])));
    });
    return h('div', { class: 'stack' },
      h('p', { class: 'muted' }, 'Efektywne uprawnienia to część wspólna roli użytkownika i jego poziomu dostępu do tej przestrzeni. Użytkownik z rolą „Tylko odczyt” nie edytuje nawet z poziomem Edycja.'),
      h('div', { class: 'card flush' }, h('table', { class: 'table' },
        h('thead', null, h('tr', null, ['Użytkownik', 'Rola', 'Poziom dostępu', 'Efektywnie'].map((t) => h('th', null, t)))),
        h('tbody', null, rows))),
      canManage ? null : h('p', { class: 'muted small' }, 'Dostępem zarządza właściciel przestrzeni lub administrator.'));
  }

  CS.views = CS.views || {};
  CS.views.client = function (params) {
    const c = S.client(params.id);
    if (!c || !S.canView(c)) {
      return h('div', { class: 'page' }, h('div', { class: 'empty-state' },
        h('h2', null, 'Brak dostępu'), h('p', null, 'Ta przestrzeń nie istnieje albo nie masz do niej dostępu.'),
        h('a', { class: 'btn', href: '#/clients' }, 'Wróć do klientów')));
    }
    const tab = TABS.some(([k]) => k === params.tab) ? params.tab : 'przeglad';
    const caretaker = S.user(c.caretaker);
    const views = { przeglad: overview, listy: lists, pliki: files, notatki: notesAndTasks, dostep: access };
    const lv = S.level(c);

    return h('div', { class: 'page' },
      h('div', { class: 'crumbs' }, h('a', { href: '#/clients' }, 'Klienci'), ' / '),
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, c.name, ' ', ui.badge(c.status, S.clientStatusTone(c.status))),
          h('p', { class: 'muted' }, caretaker ? `Opiekun: ${caretaker.name}` : 'Bez opiekuna', ' · Twój dostęp: ', S.canEditSpace(c) ? (lv === 'owner' ? 'właściciel' : 'edycja') : 'tylko odczyt'))),
      h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([key, label]) =>
        h('a', { class: 'tab' + (key === tab ? ' active' : ''), role: 'tab', 'aria-selected': String(key === tab), href: `#/clients/${c.id}/${key}` }, label))),
      h('div', { class: 'tab-panel', role: 'tabpanel' }, views[tab](c)));
  };
})(window.CS = window.CS || {});
