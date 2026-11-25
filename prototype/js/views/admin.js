/* Ekran „Administracja”: użytkownicy i konta lokalne, role (zestawy uprawnień), statusy. */
(function (CS) {
  'use strict';
  const { h } = CS.dom;
  const S = CS.store;
  const U = CS.util;
  const ui = CS.ui;

  const TABS = [['uzytkownicy', 'Użytkownicy'], ['role', 'Role'], ['statusy', 'Statusy']];
  const TONES = [['blue', 'Niebieski'], ['green', 'Zielony'], ['amber', 'Żółty'], ['red', 'Czerwony'], ['gray', 'Szary']];
  const rerender = () => CS.app.rerender();

  function users() {
    const canManage = S.hasPerm('users.manage');
    const rows = S.state.users.map((u) => h('tr', null,
      h('td', null, h('span', { class: 'owner' }, ui.avatar(u, true), h('span', null, u.name))),
      h('td', null, u.email),
      h('td', null, u.group),
      h('td', null, canManage
        ? ui.select(S.state.roles.map((r) => ({ value: r.id, label: r.name })), u.role, (v) => { S.setUserRole(u.id, v); ui.toast('Zmieniono rolę'); rerender(); }, { 'aria-label': `Rola: ${u.name}` })
        : S.role(u.role).name),
      h('td', null, u.account === 'local'
        ? [ui.badge('konto lokalne', 'gray'), ' ', ui.badge('2FA wymagane', 'blue'), u.invited ? [' ', ui.badge(`zaproszenie ważne do ${U.fmtDate(u.invited)}`, 'amber')] : null]
        : ui.badge('Google Workspace', 'green'))));

    function openInvite() {
      const email = h('input', { class: 'input', type: 'email', placeholder: 'adres@firma-zewnetrzna.example' });
      const role = ui.select(S.state.roles.map((r) => ({ value: r.id, label: r.name })), 'readonly');
      ui.modal({
        title: 'Nowe konto lokalne',
        body: h('div', { class: 'form' },
          h('p', { class: 'muted' }, 'Osoba dostanie e-mail z zaproszeniem ważnym 7 dni, sama ustawi hasło i skonfiguruje drugi składnik (2FA). Dostęp do przestrzeni nadajesz osobno.'),
          ui.field('Adres e-mail', email), ui.field('Rola', role)),
        actions: [{ label: 'Anuluj' }, {
          label: 'Wyślij zaproszenie', primary: true,
          onClick: () => {
            if (!/^\S+@\S+\.\S+$/.test(email.value)) { email.focus(); email.classList.add('invalid'); return false; }
            S.addLocalUser(email.value.trim(), role.value);
            ui.toast('Wysłano zaproszenie (w prototypie bez prawdziwej wiadomości)');
            rerender();
          }
        }]
      });
    }

    return h('div', { class: 'stack' },
      h('div', { class: 'section-head' },
        h('p', { class: 'muted' }, 'Konta Google powstają przy pierwszym logowaniu, konta lokalne zakłada administrator.'),
        canManage ? h('button', { class: 'btn btn-primary', type: 'button', onclick: openInvite }, ui.icon('plus', 15), ' Konto lokalne') : null),
      h('div', { class: 'card flush' }, h('table', { class: 'table' },
        h('thead', null, h('tr', null, ['Użytkownik', 'E-mail', 'Grupa', 'Rola', 'Konto'].map((t) => h('th', null, t)))),
        h('tbody', null, rows))));
  }

  function roles() {
    const canManage = S.hasPerm('users.manage');
    const perms = S.state.permissions;
    const head = h('tr', null, h('th', null, 'Uprawnienie'), S.state.roles.map((r) => h('th', { class: 'center' }, r.name)));
    const rows = perms.map((p) => h('tr', null,
      h('td', null, p.label),
      S.state.roles.map((r) => h('td', { class: 'center' }, h('input', {
        type: 'checkbox', class: 'chk', checked: r.perms.includes(p.key), disabled: !canManage || r.id === 'admin',
        'aria-label': `${r.name}: ${p.label}`,
        onchange: (e) => { S.setRolePerm(r.id, p.key, e.target.checked); }
      })))));

    function openNewRole() {
      const name = h('input', { class: 'input', type: 'text', placeholder: 'np. Kierownik wdrożeń' });
      ui.modal({
        title: 'Nowa rola', body: ui.field('Nazwa roli', name),
        actions: [{ label: 'Anuluj' }, {
          label: 'Utwórz rolę', primary: true,
          onClick: () => { if (!name.value.trim()) { name.focus(); return false; } S.addRole(name.value.trim()); rerender(); }
        }]
      });
    }

    return h('div', { class: 'stack' },
      h('div', { class: 'section-head' },
        h('p', { class: 'muted' }, 'Rola to zestaw uprawnień. Zaznacz uprawnienia i sprawdź efekt, przełączając użytkownika w prawym górnym rogu. Rola Administrator jest zablokowana.'),
        canManage ? h('button', { class: 'btn btn-primary', type: 'button', onclick: openNewRole }, ui.icon('plus', 15), ' Nowa rola') : null),
      h('div', { class: 'card flush' }, h('table', { class: 'table' }, h('thead', null, head), h('tbody', null, rows))));
  }

  function statuses() {
    const canEdit = S.hasPerm('statuses.edit');
    const name = h('input', { class: 'input', type: 'text', placeholder: 'Nowy status, np. Wycofany', 'aria-label': 'Nazwa nowego statusu' });
    const tone = ui.select(TONES.map(([value, label]) => ({ value, label })), 'gray', null, { 'aria-label': 'Kolor statusu' });
    return h('div', { class: 'stack' },
      h('p', { class: 'muted' }, 'Statusy pozycji na listach. Status użyty w danych można dezaktywować, ale nie usunąć, żeby nie psuć historii.'),
      h('div', { class: 'card' },
        h('ul', { class: 'plain-list' }, S.state.itemStatuses.map((s, i) => h('li', null, ui.badge(s.name, s.tone), h('span', { class: 'muted small right' }, `kolejność ${i + 1}`)))),
        canEdit ? h('div', { class: 'inline-form' }, name, tone,
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { if (!name.value.trim()) { name.focus(); return; } S.addItemStatus(name.value.trim(), tone.value); ui.toast('Dodano status'); rerender(); } }, 'Dodaj status'))
          : h('p', { class: 'muted small' }, 'Edycja statusów wymaga uprawnienia „Edycja list statusów”.')));
  }

  CS.views = CS.views || {};
  CS.views.admin = function (params) {
    if (!(S.hasPerm('users.manage') || S.hasPerm('statuses.edit'))) {
      return h('div', { class: 'page' }, h('div', { class: 'empty-state' }, h('h2', null, 'Brak uprawnień'), h('p', null, 'Administracja jest dostępna dla administratorów.')));
    }
    const tab = TABS.some(([k]) => k === params.tab) ? params.tab : 'uzytkownicy';
    const body = { uzytkownicy: users, role: roles, statusy: statuses }[tab]();
    return h('div', { class: 'page' },
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Administracja'), h('p', { class: 'muted' }, 'Użytkownicy, role i listy słownikowe.'))),
      h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([key, label]) =>
        h('a', { class: 'tab' + (key === tab ? ' active' : ''), role: 'tab', 'aria-selected': String(key === tab), href: `#/admin/${key}` }, label))),
      h('div', { class: 'tab-panel' }, body));
  };
})(window.CS = window.CS || {});
