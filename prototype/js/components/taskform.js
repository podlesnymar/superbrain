/* Okno dodawania zadania. Używane w panelu „Moje zadania” i w przestrzeni klienta. */
(function (CS) {
  'use strict';
  const { h } = CS.dom;
  const S = CS.store;
  const U = CS.util;

  CS.reminderLabels = {
    none: 'Bez przypomnienia',
    same_day: 'W dniu terminu',
    day_before: 'Dzień przed terminem',
    three_days: '3 dni przed terminem'
  };
  CS.priorityLabels = { low: 'Niski', normal: 'Normalny', high: 'Wysoki' };
  CS.priorityTone = { low: 'gray', normal: 'blue', high: 'red' };

  /** opts: { clientId (opcjonalnie, stały), onDone } */
  CS.openTaskModal = function (opts) {
    const clients = S.visibleClients().filter((c) => S.canEditSpace(c));
    if (!clients.length) { CS.ui.toast('Brak przestrzeni, w których możesz dodawać zadania.'); return; }
    const first = opts.clientId || clients[0].id;

    const clientSel = CS.ui.select(clients.map((c) => ({ value: c.id, label: c.name })), first, () => refreshOwners());
    if (opts.clientId) clientSel.disabled = true;
    const title = h('input', { class: 'input', type: 'text', placeholder: 'Co trzeba zrobić?' });
    const desc = h('textarea', { class: 'input', rows: 3, placeholder: 'Opis (opcjonalnie)' });
    const ownerSel = h('select', { class: 'select' });
    const due = h('input', { class: 'input', type: 'date', value: U.addDays(U.today(), 1) });
    const prio = CS.ui.select(Object.entries(CS.priorityLabels).map(([value, label]) => ({ value, label })), 'normal');
    const rem = CS.ui.select(Object.entries(CS.reminderLabels).map(([value, label]) => ({ value, label })), 'day_before');

    function refreshOwners() {
      const client = S.client(clientSel.value);
      ownerSel.innerHTML = '';
      S.state.users.filter((u) => S.canView(client, u)).forEach((u) => {
        ownerSel.appendChild(h('option', { value: u.id, selected: u.id === S.me().id }, u.name));
      });
    }
    refreshOwners();

    const body = h('div', { class: 'form' },
      CS.ui.field('Klient', clientSel),
      CS.ui.field('Tytuł', title),
      CS.ui.field('Opis', desc),
      h('div', { class: 'form-row' },
        CS.ui.field('Osoba odpowiedzialna', ownerSel),
        CS.ui.field('Termin', due)),
      h('div', { class: 'form-row' },
        CS.ui.field('Priorytet', prio),
        CS.ui.field('Przypomnienie e-mail', rem)));

    CS.ui.modal({
      title: 'Nowe zadanie',
      body,
      actions: [
        { label: 'Anuluj' },
        {
          label: 'Dodaj zadanie', primary: true,
          onClick: () => {
            if (!title.value.trim()) { title.focus(); title.classList.add('invalid'); return false; }
            S.addTask({
              clientId: clientSel.value, title: title.value.trim(), desc: desc.value.trim(), ownerId: ownerSel.value,
              due: due.value, priority: prio.value, reminder: due.value ? rem.value : 'none'
            });
            CS.ui.toast('Dodano zadanie');
            if (opts.onDone) opts.onDone();
          }
        }
      ]
    });
  };
})(window.CS = window.CS || {});
