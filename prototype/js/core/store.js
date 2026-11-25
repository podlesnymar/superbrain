/* Stan aplikacji i wszystkie operacje na danych.
   Widoki nie zmieniają danych bezpośrednio: zawsze wołają funkcje stąd.
   W wersji produkcyjnej każda z tych funkcji stanie się wywołaniem API, a zasady
   uprawnień (can*) będą sprawdzane także po stronie serwera. */
(function (CS) {
  'use strict';
  const U = CS.util;
  const state = CS.seed();
  let seq = 1000;
  const nid = (p) => p + (++seq);

  const S = {
    state,

    /* ---------- użytkownik i uprawnienia ---------- */
    me() { return S.user(state.currentUserId); },
    user(id) { return state.users.find((u) => u.id === id) || null; },
    role(id) { return state.roles.find((r) => r.id === id) || null; },
    setCurrentUser(id) { state.currentUserId = id; },

    hasPerm(perm, user) {
      const u = user || S.me();
      const r = S.role(u.role);
      return !!r && r.perms.includes(perm);
    },
    /** Poziom dostępu do przestrzeni: 'owner' | 'edit' | 'read' | null */
    level(client, user) {
      const u = user || S.me();
      if (S.hasPerm('spaces.all', u)) return 'owner';
      return client.access[u.id] || null;
    },
    canView(client, user) { return S.level(client, user) !== null; },
    /** Część wspólna roli i poziomu dostępu (patrz specyfikacja, sekcja o rolach). */
    canEditSpace(client, user) {
      const lv = S.level(client, user);
      return S.hasPerm('space.edit', user) && (lv === 'edit' || lv === 'owner');
    },
    canManageAccess(client, user) {
      return S.hasPerm('users.manage', user) || S.level(client, user) === 'owner';
    },

    /* ---------- klienci ---------- */
    client(id) { return state.clients.find((c) => c.id === id) || null; },
    visibleClients() { return state.clients.filter((c) => S.canView(c)); },
    findList(listId) {
      for (const client of state.clients) {
        const list = client.lists.find((l) => l.id === listId);
        if (list) return { client, list };
      }
      return null;
    },
    itemStatus(id) { return state.itemStatuses.find((s) => s.id === id) || state.itemStatuses[0]; },
    itemStatusByName(name) {
      const n = U.norm(name);
      return state.itemStatuses.find((s) => U.norm(s.name) === n) || null;
    },
    clientStatusTone(name) {
      const s = state.clientStatuses.find((x) => x.name === name);
      return s ? s.tone : 'gray';
    },

    log(clientId, text, userId) {
      const c = S.client(clientId);
      if (!c) return;
      c.activity.unshift({ at: U.nowStamp(), userId: userId || S.me().id, text });
    },

    addClient({ name, status, caretaker }) {
      const c = {
        id: nid('c'), name, status, caretaker, tags: [], contractFrom: '', contractTo: '', notice: '', externalId: '',
        access: { [caretaker]: 'owner' }, contacts: [], lists: [], files: [], notes: [], activity: []
      };
      const me = S.me();
      if (!c.access[me.id]) c.access[me.id] = 'owner';
      state.clients.push(c);
      S.log(c.id, 'Utworzono przestrzeń klienta');
      return c;
    },

    /* ---------- listy, grupy, pozycje ---------- */
    addList(clientId, name, templateId) {
      const client = S.client(clientId);
      const list = { id: nid('l'), name, groups: [], items: [], template: null };
      const tpl = templateId ? state.templates.find((t) => t.id === templateId) : null;
      if (tpl) {
        list.template = { id: tpl.id, version: tpl.version };
        tpl.groups.forEach((tg) => {
          const g = { id: nid('g'), name: tg.name };
          list.groups.push(g);
          tg.items.forEach((iname) => list.items.push(S.newItem(g.id, iname)));
        });
      } else {
        list.groups.push({ id: nid('g'), name: 'Pozycje' });
      }
      client.lists.push(list);
      S.log(clientId, tpl ? `Dodano listę „${name}” z szablonu „${tpl.name}”` : `Dodano listę „${name}”`);
      return list;
    },
    newItem(groupId, name) {
      return {
        id: nid('i'), groupId, name: name || '', status: state.itemStatuses[0].id, note: '', owner: null, planned: '',
        history: [{ at: U.nowStamp(), userId: S.me().id, field: 'Utworzono', from: '', to: '' }]
      };
    },
    addItem(listId, groupId) {
      const { list } = S.findList(listId);
      const it = S.newItem(groupId);
      list.items.push(it);
      return it;
    },
    addGroup(listId, name) {
      const { list } = S.findList(listId);
      const g = { id: nid('g'), name };
      list.groups.push(g);
      return g;
    },
    renameGroup(listId, groupId, name) {
      const { list } = S.findList(listId);
      const g = list.groups.find((x) => x.id === groupId);
      if (g && name.trim()) g.name = name.trim();
    },
    updateItem(listId, itemId, key, value) {
      const { client, list } = S.findList(listId);
      const it = list.items.find((x) => x.id === itemId);
      if (!it || it[key] === value) return false;
      const labels = { name: 'Nazwa', status: 'Status', note: 'Notatka', owner: 'Osoba odpowiedzialna', planned: 'Data planowana' };
      const show = (k, v) => {
        if (k === 'status') return S.itemStatus(v).name;
        if (k === 'owner') return (S.user(v) || {}).name || '—';
        if (k === 'planned') return v ? U.fmtDate(v) : '—';
        return v || '—';
      };
      const old = it[key];
      it[key] = value;
      it.history.unshift({ at: U.nowStamp(), userId: S.me().id, field: labels[key], from: show(key, old), to: show(key, value) });
      if (key === 'status') S.log(client.id, `${it.name || 'Pozycja'}: ${show('status', old)} → ${show('status', value)}`);
      return true;
    },
    bulkStatus(listId, itemIds, statusId) {
      itemIds.forEach((id) => S.updateItem(listId, id, 'status', statusId));
    },

    /* ---------- notatki, zadania ---------- */
    addNote(clientId, text) {
      const c = S.client(clientId);
      c.notes.unshift({ id: nid('n'), authorId: S.me().id, at: U.nowStamp(), text });
      S.log(clientId, 'Dodał(a) notatkę');
    },
    addTask(t) {
      const task = Object.assign({ id: nid('t'), createdBy: S.me().id, status: 'open', desc: '', due: '', priority: 'normal', reminder: 'none' }, t);
      state.tasks.push(task);
      S.log(task.clientId, `Dodał(a) zadanie „${task.title}”`);
      return task;
    },
    toggleTask(taskId) {
      const t = state.tasks.find((x) => x.id === taskId);
      t.status = t.status === 'done' ? 'open' : 'done';
      S.log(t.clientId, `${t.status === 'done' ? 'Zamknął(ęła)' : 'Otworzył(a) ponownie'} zadanie „${t.title}”`);
    },
    tasksFor(clientId) { return state.tasks.filter((t) => t.clientId === clientId); },
    openTaskCount(clientId) { return S.tasksFor(clientId).filter((t) => t.status === 'open').length; },

    /* ---------- pliki ---------- */
    addFile(clientId, { name, size, category }) {
      const c = S.client(clientId);
      const same = c.files.filter((f) => f.name === name && f.category === category);
      const version = same.length ? Math.max(...same.map((f) => f.version)) + 1 : 1;
      const file = { id: nid('f'), name, category, version, size, by: S.me().id, at: U.nowStamp(), expires: '' };
      c.files.unshift(file);
      S.log(clientId, `Wgrano plik ${name}${version > 1 ? ` (wersja ${version})` : ''}`);
      return file;
    },

    /* ---------- dostęp i administracja ---------- */
    setAccess(clientId, userId, level) {
      const c = S.client(clientId);
      if (level) c.access[userId] = level; else delete c.access[userId];
      S.log(clientId, `Zmieniono dostęp: ${(S.user(userId) || {}).name} → ${level || 'brak'}`);
    },
    setUserRole(userId, roleId) { S.user(userId).role = roleId; },
    addLocalUser(email, roleId) {
      const u = { id: nid('u'), name: email.split('@')[0], email, role: roleId, group: '—', account: 'local', invited: U.addDays(U.today(), 7) };
      state.users.push(u);
      return u;
    },
    setRolePerm(roleId, perm, on) {
      const r = S.role(roleId);
      r.perms = r.perms.filter((p) => p !== perm);
      if (on) r.perms.push(perm);
    },
    addRole(name) {
      const r = { id: nid('role'), name, perms: [] };
      state.roles.push(r);
      return r;
    },
    addItemStatus(name, tone) {
      state.itemStatuses.push({ id: nid('s'), name, tone });
    },

    /* ---------- wyszukiwanie ---------- */
    searchClients(q) {
      const n = U.norm(q);
      if (!n) return [];
      return S.visibleClients().filter((c) =>
        U.norm(c.name).includes(n) || c.tags.some((t) => U.norm(t).includes(n)));
    }
  };

  CS.store = S;
})(window.CS = window.CS || {});
