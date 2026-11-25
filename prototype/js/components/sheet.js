/* Lista w stylu arkusza (jedyne miejsce w systemie z edycją „jak w Excelu”).
   Funkcje:
   - zaznaczanie komórek, strzałki, Tab / Shift+Tab, Enter i F2 (edycja), pisanie startuje edycję,
     Esc anuluje, Delete czyści komórkę,
   - Ctrl+C kopiuje komórkę, Ctrl+V wkleja zakres z Excela (także nowe wiersze),
   - grupy zwijane i zmieniana nazwa (dwuklik), zaznaczanie wielu pozycji i zbiorcza zmiana statusu,
   - filtr po statusie i sortowanie po nagłówku, historia zmian pozycji. */
(function (CS) {
  'use strict';
  const { h } = CS.dom;
  const S = CS.store;
  const U = CS.util;
  const ui = CS.ui;

  const COLS = [
    { key: 'name', label: 'Pozycja', type: 'text', cls: 'c-name' },
    { key: 'status', label: 'Status', type: 'status', cls: 'c-status' },
    { key: 'note', label: 'Notatka', type: 'text', cls: 'c-note' },
    { key: 'owner', label: 'Odpowiedzialny', type: 'user', cls: 'c-owner' },
    { key: 'planned', label: 'Planowana data', type: 'date', cls: 'c-date' }
  ];

  /* Stan interfejsu listy. Przeżywa przerysowanie strony. */
  const st = {
    listId: null, itemId: null, col: 0, active: false, editing: false, initial: null,
    checked: new Set(), collapsed: new Set(), filter: '', sort: null, renamingGroup: null
  };

  function resetFor(list) {
    st.listId = list.id; st.itemId = null; st.col = 0; st.active = false; st.editing = false;
    st.initial = null; st.checked = new Set(); st.collapsed = new Set(); st.filter = ''; st.sort = null;
    st.renamingGroup = null;
  }

  function sortItems(items) {
    if (!st.sort) return items;
    const { key, dir } = st.sort;
    const val = (it) => {
      if (key === 'status') return S.state.itemStatuses.findIndex((s) => s.id === it.status);
      if (key === 'owner') return U.norm((S.user(it.owner) || {}).name || '~');
      if (key === 'planned') return it.planned || '9999-99-99';
      return U.norm(it[key]);
    };
    return items.slice().sort((a, b) => {
      const x = val(a), y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }

  /** Grupy z pozycjami po filtrze i sortowaniu. */
  function groupsView(list) {
    return list.groups.map((g) => ({
      group: g,
      items: sortItems(list.items.filter((i) => i.groupId === g.id && (!st.filter || i.status === st.filter)))
    }));
  }
  /** Pozycje w kolejności wyświetlania (bez zwiniętych grup). */
  function order(list) {
    return groupsView(list).filter((gv) => !st.collapsed.has(gv.group.id)).flatMap((gv) => gv.items);
  }

  function cellText(it, col) {
    if (col.key === 'status') return S.itemStatus(it.status).name;
    if (col.key === 'owner') return (S.user(it.owner) || {}).name || '';
    return it[col.key] || '';
  }

  function parseValue(col, raw) {
    if (col.type === 'text') return raw;
    if (col.type === 'status') { const s = S.itemStatusByName(raw); return s ? s.id : undefined; }
    if (col.type === 'user') {
      if (!raw) return null;
      const n = U.norm(raw);
      const u = S.state.users.find((x) => U.norm(x.name).includes(n));
      return u ? u.id : undefined;
    }
    if (col.type === 'date') { if (!raw) return ''; const p = U.parseDate(raw); return p === null ? undefined : p; }
    return undefined;
  }

  function showHistory(item) {
    const rows = item.history.map((e) => h('tr', null,
      h('td', { class: 'nowrap' }, U.fmtDateTime(e.at)),
      h('td', null, (S.user(e.userId) || {}).name || '—'),
      h('td', null, e.field),
      h('td', null, e.from || e.to ? [e.from || '—', ' → ', h('strong', null, e.to || '—')] : '')));
    ui.modal({
      title: `Historia: ${item.name || 'pozycja bez nazwy'}`,
      wide: true,
      body: h('div', null,
        h('p', { class: 'muted' }, 'Historii nie da się edytować ani usuwać.'),
        h('table', { class: 'table' },
          h('thead', null, h('tr', null, ['Kiedy', 'Kto', 'Co', 'Zmiana'].map((t) => h('th', null, t)))),
          h('tbody', null, rows))),
      actions: [{ label: 'Zamknij', primary: true }]
    });
  }

  /**
   * Buduje listę. rerender() ma przerysować stronę z aktualnymi danymi.
   */
  function sheet(list, client, rerender) {
    if (st.listId !== list.id) resetFor(list);
    const canEdit = S.canEditSpace(client);
    const statuses = S.state.itemStatuses;
    const users = S.state.users.filter((u) => S.canView(client, u));
    const cells = {};

    const ord = order(list);
    if (!st.itemId || !ord.find((i) => i.id === st.itemId)) st.itemId = ord.length ? ord[0].id : null;

    /* ----- nawigacja ----- */
    function selectCell(itemId, col) {
      const prev = cells[st.itemId + ':' + st.col];
      if (prev) prev.classList.remove('sel');
      st.itemId = itemId; st.col = col; st.active = true;
      const cur = cells[itemId + ':' + col];
      if (cur) cur.classList.add('sel');
      scroll.focus({ preventScroll: true });
    }
    function move(dr, dc) {
      const o = order(list);
      if (!o.length) return;
      let r = Math.max(0, o.findIndex((i) => i.id === st.itemId));
      let c = st.col + dc;
      if (c > COLS.length - 1) { c = 0; r += 1; } else if (c < 0) { c = COLS.length - 1; r -= 1; }
      r = Math.min(o.length - 1, Math.max(0, r + dr));
      st.itemId = o[r].id; st.col = c; st.active = true;
      rerender();
    }

    /* ----- edycja ----- */
    function startEdit(initial) {
      if (!canEdit || !st.itemId) return;
      st.editing = true; st.initial = initial; st.active = true;
      rerender();
    }
    function finish(itemId, colKey, commitValue, dir) {
      if (commitValue !== undefined) S.updateItem(list.id, itemId, colKey, commitValue);
      st.editing = false; st.initial = null;
      if (dir === 'down') { move(1, 0); return; }
      if (dir === 'right') { move(0, 1); return; }
      rerender();
    }

    function buildEditor(it, col) {
      let done = false;
      const end = (v, dir) => { if (done) return; done = true; finish(it.id, col.key, v, dir); };
      if (col.type === 'status' || col.type === 'user') {
        const opts = col.type === 'status'
          ? statuses.map((s) => h('option', { value: s.id, selected: s.id === it.status }, s.name))
          : [h('option', { value: '' }, '— brak'), ...users.map((u) => h('option', { value: u.id, selected: u.id === it.owner }, u.name))];
        const sel = h('select', { class: 'cell-editor' }, opts);
        sel.addEventListener('change', () => end(col.type === 'user' ? (sel.value || null) : sel.value));
        sel.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { e.preventDefault(); end(undefined); }
          else if (e.key === 'Enter') { e.preventDefault(); end(col.type === 'user' ? (sel.value || null) : sel.value, 'down'); }
          else if (e.key === 'Tab') { e.preventDefault(); end(col.type === 'user' ? (sel.value || null) : sel.value, e.shiftKey ? undefined : 'right'); }
        });
        sel.addEventListener('blur', () => end(undefined));
        queueMicrotask(() => { sel.focus(); try { sel.showPicker(); } catch (err) { /* nie wszystkie przeglądarki */ } });
        return sel;
      }
      const input = h('input', {
        class: 'cell-editor', type: col.type === 'date' ? 'date' : 'text',
        value: col.type === 'date' ? (it.planned || '') : (st.initial !== null && col.type === 'text' ? st.initial : it[col.key])
      });
      input.addEventListener('keydown', (e) => {
        const val = () => (col.type === 'date' ? input.value : input.value);
        if (e.key === 'Escape') { e.preventDefault(); end(undefined); }
        else if (e.key === 'Enter') { e.preventDefault(); end(val(), 'down'); }
        else if (e.key === 'Tab') { e.preventDefault(); end(val(), e.shiftKey ? undefined : 'right'); }
        e.stopPropagation();
      });
      input.addEventListener('blur', () => end(input.value));
      queueMicrotask(() => {
        input.focus();
        const len = input.value.length;
        try { input.setSelectionRange(len, len); } catch (err) { /* pole daty */ }
      });
      return input;
    }

    function cellContent(it, col) {
      switch (col.key) {
        case 'name': return it.name ? it.name : h('span', { class: 'muted' }, '(bez nazwy)');
        case 'status': { const s = S.itemStatus(it.status); return ui.badge(s.name, s.tone); }
        case 'note': return it.note ? h('span', { class: 'note-text', title: it.note }, it.note) : '';
        case 'owner': {
          const u = S.user(it.owner);
          return u ? h('span', { class: 'owner' }, ui.avatar(u, true), h('span', null, u.name)) : h('span', { class: 'muted' }, '—');
        }
        case 'planned': {
          const late = it.planned && it.status !== 'live' && U.diffDays(it.planned, U.today()) < 0;
          return it.planned
            ? h('span', { class: late ? 'overdue' : '', title: late ? 'Termin minął' : '' }, U.fmtDate(it.planned))
            : h('span', { class: 'muted' }, '—');
        }
        default: return '';
      }
    }

    /* ----- budowa tabeli ----- */
    function headerCell(col) {
      const active = st.sort && st.sort.key === col.key;
      return h('th', { class: col.cls },
        h('button', {
          type: 'button', class: 'th-btn',
          title: 'Sortuj',
          onclick: () => {
            if (!active) st.sort = { key: col.key, dir: 1 };
            else if (st.sort.dir === 1) st.sort = { key: col.key, dir: -1 };
            else st.sort = null;
            rerender();
          }
        }, col.label, active ? h('span', { class: 'sort-mark' }, st.sort.dir === 1 ? ' ▲' : ' ▼') : ''));
    }

    const body = h('tbody');
    groupsView(list).forEach(({ group, items }) => {
      const collapsed = st.collapsed.has(group.id);
      const all = list.items.filter((i) => i.groupId === group.id);
      const liveCount = all.filter((i) => i.status === 'live').length;

      const nameEl = st.renamingGroup === group.id
        ? (() => {
          let done = false;
          const fin = (save) => { if (done) return; done = true; if (save) S.renameGroup(list.id, group.id, inp.value); st.renamingGroup = null; rerender(); };
          const inp = h('input', { class: 'group-input', type: 'text', value: group.name });
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); e.stopPropagation(); });
          inp.addEventListener('blur', () => fin(true));
          queueMicrotask(() => { inp.focus(); inp.select(); });
          return inp;
        })()
        : h('span', {
          class: 'group-name', title: canEdit ? 'Dwuklik, aby zmienić nazwę' : '',
          ondblclick: () => { if (canEdit) { st.renamingGroup = group.id; rerender(); } }
        }, group.name);

      const groupChecked = items.length > 0 && items.every((i) => st.checked.has(i.id));
      body.appendChild(h('tr', { class: 'group-row' },
        h('td', { colspan: COLS.length + 2 },
          h('div', { class: 'group-head' },
            canEdit ? h('input', {
              type: 'checkbox', class: 'chk', 'aria-label': `Zaznacz grupę ${group.name}`, checked: groupChecked,
              onchange: (e) => { items.forEach((i) => (e.target.checked ? st.checked.add(i.id) : st.checked.delete(i.id))); rerender(); }
            }) : null,
            h('button', {
              type: 'button', class: 'btn-icon', 'aria-label': collapsed ? 'Rozwiń grupę' : 'Zwiń grupę', 'aria-expanded': String(!collapsed),
              onclick: () => { collapsed ? st.collapsed.delete(group.id) : st.collapsed.add(group.id); rerender(); }
            }, ui.icon(collapsed ? 'right' : 'down', 14)),
            nameEl,
            h('span', { class: 'group-count' }, `${liveCount} z ${all.length} uruchomione`),
            canEdit ? h('button', {
              type: 'button', class: 'btn btn-sm btn-ghost',
              onclick: () => {
                if (st.filter) st.filter = '';
                const it = S.addItem(list.id, group.id);
                st.collapsed.delete(group.id);
                st.itemId = it.id; st.col = 0; st.active = true; st.editing = true; st.initial = null;
                rerender();
              }
            }, ui.icon('plus', 14), ' Pozycja') : null))));

      if (collapsed) return;
      items.forEach((it) => {
        const tr = h('tr', { class: 'item-row' + (st.checked.has(it.id) ? ' checked' : '') });
        tr.appendChild(h('td', { class: 'c-chk' }, canEdit ? h('input', {
          type: 'checkbox', class: 'chk', 'aria-label': `Zaznacz ${it.name}`, checked: st.checked.has(it.id),
          onchange: (e) => { e.target.checked ? st.checked.add(it.id) : st.checked.delete(it.id); rerender(); }
        }) : null));
        COLS.forEach((col, ci) => {
          const selected = st.itemId === it.id && st.col === ci;
          const editing = selected && st.editing;
          const td = h('td', {
            class: `cell ${col.cls}` + (selected ? ' sel' : '') + (editing ? ' editing' : ''),
            dataset: { item: it.id, col: String(ci) },
            onmousedown: (e) => { if (editing) return; if (!e.target.closest('button')) selectCell(it.id, ci); },
            ondblclick: () => { if (canEdit && !editing) { selectCell(it.id, ci); startEdit(null); } }
          }, editing ? buildEditor(it, col) : cellContent(it, col));
          cells[it.id + ':' + ci] = td;
          tr.appendChild(td);
        });
        tr.appendChild(h('td', { class: 'c-hist' }, h('button', {
          type: 'button', class: 'btn-icon', title: 'Historia zmian', 'aria-label': `Historia: ${it.name}`,
          onclick: () => showHistory(it)
        }, ui.icon('clock', 15))));
        body.appendChild(tr);
      });
    });

    if (!list.items.length) {
      body.appendChild(h('tr', null, h('td', { colspan: COLS.length + 2, class: 'empty' }, 'Brak pozycji. Dodaj pierwszą w wybranej grupie.')));
    } else if (!ord.length && st.filter) {
      body.appendChild(h('tr', null, h('td', { colspan: COLS.length + 2, class: 'empty' }, 'Żadna pozycja nie ma wybranego statusu.')));
    }

    const table = h('table', { class: 'sheet' },
      h('colgroup', null, h('col', { style: { width: '36px' } }), COLS.map((c) => h('col', { class: c.cls })), h('col', { style: { width: '44px' } })),
      h('thead', null, h('tr', null, h('th', { class: 'c-chk' }), COLS.map(headerCell), h('th', { class: 'c-hist' }))),
      body);

    const scroll = h('div', { class: 'sheet-scroll', tabindex: '0', role: 'grid', 'aria-label': `Lista ${list.name}` }, table);

    /* ----- klawiatura, schowek ----- */
    scroll.addEventListener('keydown', (e) => {
      if (e.target !== scroll || st.editing) return;
      const k = e.key;
      let handled = true;
      if (k === 'ArrowDown') move(1, 0);
      else if (k === 'ArrowUp') move(-1, 0);
      else if (k === 'ArrowRight') move(0, 1);
      else if (k === 'ArrowLeft') move(0, -1);
      else if (k === 'Tab') move(0, e.shiftKey ? -1 : 1);
      else if (k === 'Enter' || k === 'F2') startEdit(null);
      else if ((k === 'Delete' || k === 'Backspace') && canEdit) {
        const col = COLS[st.col];
        if (col.type === 'text') S.updateItem(list.id, st.itemId, col.key, '');
        else if (col.type === 'date') S.updateItem(list.id, st.itemId, 'planned', '');
        else if (col.type === 'user') S.updateItem(list.id, st.itemId, 'owner', null);
        rerender();
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && canEdit) {
        startEdit(COLS[st.col].type === 'text' ? k : null);
      } else handled = false;
      if (handled) e.preventDefault();
    });

    scroll.addEventListener('copy', (e) => {
      if (st.editing || e.target !== scroll) return;
      const it = list.items.find((i) => i.id === st.itemId);
      if (!it) return;
      e.clipboardData.setData('text/plain', cellText(it, COLS[st.col]));
      e.preventDefault();
    });

    scroll.addEventListener('paste', (e) => {
      if (!canEdit || st.editing || e.target !== scroll) return;
      const text = e.clipboardData.getData('text/plain');
      if (!text) return;
      e.preventDefault();
      const rows = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((r) => r.split('\t'));
      const o = order(list);
      const start = Math.max(0, o.findIndex((i) => i.id === st.itemId));
      const current = list.items.find((i) => i.id === st.itemId);
      let lastGroup = current ? current.groupId : list.groups[list.groups.length - 1].id;
      let applied = 0, created = 0;
      rows.forEach((cellsRow, ro) => {
        let it = o[start + ro];
        if (!it) { it = S.addItem(list.id, lastGroup); created++; }
        lastGroup = it.groupId;
        cellsRow.forEach((raw, co) => {
          const col = COLS[st.col + co];
          if (!col) return;
          const v = parseValue(col, raw.trim());
          if (v !== undefined && S.updateItem(list.id, it.id, col.key, v)) applied++;
        });
      });
      ui.toast(applied ? `Wklejono ${applied} komórek${created ? `, nowe wiersze: ${created}` : ''}` : 'Nie dopasowano wartości do kolumn');
      rerender();
    });

    /* ----- pasek narzędzi ----- */
    const toolbar = h('div', { class: 'sheet-toolbar' },
      h('div', { class: 'toolbar-left' },
        canEdit ? h('button', {
          type: 'button', class: 'btn btn-sm',
          onclick: () => {
            const inp = h('input', { class: 'input', type: 'text', placeholder: 'Nazwa grupy' });
            ui.modal({
              title: 'Nowa grupa', body: ui.field('Nazwa', inp),
              actions: [{ label: 'Anuluj' }, {
                label: 'Dodaj grupę', primary: true,
                onClick: () => { if (!inp.value.trim()) { inp.focus(); return false; } S.addGroup(list.id, inp.value.trim()); rerender(); }
              }]
            });
          }
        }, ui.icon('plus', 14), ' Grupa') : null,
        h('label', { class: 'inline-field' }, h('span', { class: 'muted' }, 'Status:'),
          ui.select([{ value: '', label: 'wszystkie' }, ...statuses.map((s) => ({ value: s.id, label: s.name }))], st.filter,
            (v) => { st.filter = v; rerender(); }, { class: 'select select-sm', 'aria-label': 'Filtr statusu' })),
        st.checked.size ? h('div', { class: 'bulk' },
          h('strong', null, `Zaznaczone: ${st.checked.size}`),
          ui.select([{ value: '', label: 'Zmień status na…' }, ...statuses.map((s) => ({ value: s.id, label: s.name }))], '',
            (v) => {
              if (!v) return;
              S.bulkStatus(list.id, [...st.checked], v);
              ui.toast(`Zmieniono status: ${st.checked.size} poz.`);
              rerender();
            }, { class: 'select select-sm', 'aria-label': 'Zbiorcza zmiana statusu' }),
          h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { st.checked.clear(); rerender(); } }, 'Wyczyść')) : null),
      h('div', { class: 'toolbar-right muted' },
        canEdit ? 'Strzałki, Tab, Enter / F2 – edycja, Esc – anuluj, Ctrl+V – wklej z Excela' : 'Tylko odczyt'));

    const wrap = h('div', { class: 'sheet-wrap' }, toolbar, scroll);

    if (st.active) {
      queueMicrotask(() => {
        if (!st.editing) scroll.focus({ preventScroll: true });
        const cur = cells[st.itemId + ':' + st.col];
        if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    }
    return wrap;
  }

  CS.components = CS.components || {};
  CS.components.sheet = sheet;
})(window.CS = window.CS || {});
