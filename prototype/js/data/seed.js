/* Dane przykładowe prototypu. Wszystkie firmy i osoby są wymyślone.
   Daty są liczone względem dnia dzisiejszego, żeby panel „Moje zadania” zawsze wyglądał sensownie. */
(function (CS) {
  'use strict';
  const U = CS.util;
  const d = (n) => U.addDays(U.today(), n);
  const at = (n, hm) => `${d(n)}T${hm || '10:00'}`;

  CS.seed = function () {
    let seq = 100;
    const id = (p) => p + (++seq);

    const permissions = [
      { key: 'users.manage', label: 'Zarządzanie użytkownikami i rolami' },
      { key: 'spaces.create', label: 'Tworzenie i archiwizacja klientów' },
      { key: 'spaces.all', label: 'Dostęp do wszystkich przestrzeni bez przypisania' },
      { key: 'templates.manage', label: 'Zarządzanie szablonami list' },
      { key: 'statuses.edit', label: 'Edycja list statusów' },
      { key: 'space.edit', label: 'Edycja list, notatek, zadań i plików w przestrzeni' },
      { key: 'files.delete', label: 'Usuwanie plików' },
      { key: 'data.export', label: 'Eksport danych klienta' },
      { key: 'audit.view', label: 'Podgląd dziennika zdarzeń' },
      { key: 'backup.manage', label: 'Backup i odtwarzanie' }
    ];

    const roles = [
      { id: 'admin', name: 'Administrator', perms: permissions.map((p) => p.key) },
      { id: 'worker', name: 'Pracownik', perms: ['spaces.create', 'templates.manage', 'space.edit', 'files.delete', 'data.export'] },
      { id: 'readonly', name: 'Tylko odczyt', perms: [] }
    ];

    const users = [
      { id: 'u1', name: 'Marta Wiśniewska', email: 'marta@firma.example', role: 'admin', group: 'Administracja', account: 'google' },
      { id: 'u2', name: 'Anna Kowalska', email: 'anna@firma.example', role: 'worker', group: 'Obsługa klienta', account: 'google' },
      { id: 'u3', name: 'Piotr Nowak', email: 'piotr@firma.example', role: 'worker', group: 'Wsparcie techniczne', account: 'google' },
      { id: 'u4', name: 'Jan Zewnętrzny', email: 'jan@partner.example', role: 'readonly', group: '—', account: 'local' }
    ];

    const itemStatuses = [
      { id: 'todo', name: 'Do uruchomienia', tone: 'blue' },
      { id: 'live', name: 'Uruchomiony', tone: 'green' },
      { id: 'hold', name: 'Wstrzymany', tone: 'amber' }
    ];

    const clientStatuses = [
      { name: 'Aktywny', tone: 'green' },
      { name: 'Wdrożenie', tone: 'blue' },
      { name: 'Zawieszony', tone: 'amber' }
    ];

    const fileCategories = ['Zamówienie', 'Zakres wdrożenia', 'Umowa', 'Inne'];

    const templates = [
      {
        id: 't1', name: 'Wdrożenie standardowe', version: 3,
        groups: [
          { name: 'Moduły podstawowe', items: ['Moduł zamówień', 'Moduł magazynu', 'Moduł raportów'] },
          { name: 'Integracje', items: ['Integracja z ERP', 'Integracja kurierska'] },
          { name: 'Szkolenia', items: ['Szkolenie administratorów', 'Szkolenie użytkowników'] }
        ]
      },
      {
        id: 't2', name: 'Rozszerzenie: integracje', version: 1,
        groups: [{ name: 'Integracje', items: ['API partnerskie', 'Eksport do BI', 'Powiadomienia SMS'] }]
      }
    ];

    /* Pomocnik: lista z grup. Wiersz pozycji: [nazwa, kod statusu (T/L/H), notatka, osoba, dni do daty planowanej] */
    const CODE = { T: 'todo', L: 'live', H: 'hold' };
    function mkList(name, groups, tpl) {
      const list = { id: id('l'), name, groups: [], items: [], template: tpl || null };
      groups.forEach(([gname, rows]) => {
        const g = { id: id('g'), name: gname };
        list.groups.push(g);
        rows.forEach(([iname, code, note, owner, plan]) => {
          const status = CODE[code || 'T'];
          const history = [{ at: at(-60), userId: 'u2', field: 'Utworzono', from: '', to: '' }];
          if (status === 'live') history.unshift({ at: at(-12, '14:20'), userId: owner || 'u3', field: 'Status', from: 'Do uruchomienia', to: 'Uruchomiony' });
          if (status === 'hold') history.unshift({ at: at(-5, '09:40'), userId: owner || 'u3', field: 'Status', from: 'Do uruchomienia', to: 'Wstrzymany' });
          list.items.push({
            id: id('i'), groupId: g.id, name: iname, status, note: note || '',
            owner: owner || null, planned: plan === undefined || plan === null ? '' : d(plan), history
          });
        });
      });
      return list;
    }

    const clients = [
      {
        id: 'c1', name: 'Alfa Logistics', status: 'Aktywny', caretaker: 'u2', tags: ['logistyka', 'premium'],
        contractFrom: d(-320), contractTo: d(45), notice: '3 miesiące', externalId: 'JIRA-ALFA',
        access: { u2: 'owner', u3: 'edit', u4: 'read' },
        contacts: [
          { id: id('p'), name: 'Ewa Malinowska', role: 'Dyrektor operacyjny', email: 'ewa.malinowska@alfa.example', phone: '+48 600 100 200' },
          { id: id('p'), name: 'Tomasz Zieliński', role: 'Administrator systemu', email: 't.zielinski@alfa.example', phone: '+48 600 100 201' }
        ],
        lists: [
          mkList('Moduły systemu', [
            ['Moduły podstawowe', [
              ['Moduł zamówień', 'L', '', 'u3', -20],
              ['Moduł magazynu', 'L', 'Po aktualizacji w październiku', 'u3', -14],
              ['Moduł raportów', 'T', 'Czekamy na zakres raportów od klienta', 'u3', 10]]],
            ['Integracje', [
              ['Integracja z ERP', 'H', 'Wstrzymane do czasu aktualizacji ERP po stronie klienta', 'u3', 30],
              ['Integracja kurierska', 'T', '', 'u3', 21]]],
            ['Szkolenia', [
              ['Szkolenie administratorów', 'L', '', 'u2', -9],
              ['Szkolenie użytkowników', 'T', 'Termin do potwierdzenia', 'u2', 14]]]
          ], { id: 't1', version: 2 }),
          mkList('Środowiska', [
            ['Środowiska', [
              ['Produkcja', 'L', '', 'u3', -40],
              ['Testowe', 'L', '', 'u3', -40],
              ['Szkoleniowe', 'T', 'Do uruchomienia przed szkoleniem użytkowników', 'u3', 12]]]
          ])
        ],
        files: [
          { id: id('f'), name: 'Zamowienie_2026-01.pdf', category: 'Zamówienie', version: 1, size: 251000, by: 'u2', at: at(-300), expires: '' },
          { id: id('f'), name: 'Zakres_wdrozenia.docx', category: 'Zakres wdrożenia', version: 2, size: 118000, by: 'u3', at: at(-120), expires: '' },
          { id: id('f'), name: 'Umowa_ramowa.pdf', category: 'Umowa', version: 1, size: 420000, by: 'u1', at: at(-320), expires: d(45) }
        ],
        notes: [
          { id: id('n'), authorId: 'u2', at: at(-6, '11:05'), text: 'Rozmowa z Ewą: klient chce przyspieszyć moduł raportów, ale zakres wciąż nieokreślony. Wysłałam szablon zakresu.' },
          { id: id('n'), authorId: 'u3', at: at(-3, '16:30'), text: 'Integracja z ERP wstrzymana, bo klient aktualizuje ERP. Wracamy do tematu po 20. dniu miesiąca.' }
        ],
        activity: [
          { at: at(0, '08:50'), userId: 'u3', text: 'Dodał(a) notatkę do pozycji „Moduł raportów”' },
          { at: at(-3, '16:30'), userId: 'u3', text: 'Dodał(a) notatkę' },
          { at: at(-5, '09:40'), userId: 'u3', text: 'Integracja z ERP: Do uruchomienia → Wstrzymany' },
          { at: at(-12, '14:20'), userId: 'u3', text: 'Moduł magazynu: Do uruchomienia → Uruchomiony' }
        ]
      },
      {
        id: 'c2', name: 'Beta Foods', status: 'Wdrożenie', caretaker: 'u2', tags: ['produkcja'],
        contractFrom: d(-40), contractTo: d(325), notice: '1 miesiąc', externalId: 'JIRA-BETA',
        access: { u2: 'owner', u3: 'edit' },
        contacts: [{ id: id('p'), name: 'Karolina Wójcik', role: 'Kierownik IT', email: 'k.wojcik@beta.example', phone: '+48 601 200 300' }],
        lists: [mkList('Moduły systemu', [
          ['Moduły podstawowe', [
            ['Moduł zamówień', 'L', '', 'u3', -10],
            ['Moduł magazynu', 'T', '', 'u2', 7],
            ['Moduł raportów', 'T', '', 'u2', 20]]],
          ['Integracje', [['Integracja z ERP', 'T', 'Wymaga dostępu do środowiska klienta', 'u3', 30]]]
        ], { id: 't1', version: 3 })],
        files: [{ id: id('f'), name: 'Zamowienie_2026-10.pdf', category: 'Zamówienie', version: 1, size: 180000, by: 'u2', at: at(-40), expires: '' }],
        notes: [{ id: id('n'), authorId: 'u2', at: at(-8, '09:15'), text: 'Kick-off odbył się. Priorytet to uruchomienie magazynu przed końcem miesiąca.' }],
        activity: [{ at: at(-10, '12:00'), userId: 'u3', text: 'Moduł zamówień: Do uruchomienia → Uruchomiony' }]
      },
      {
        id: 'c3', name: 'Gamma Clinic', status: 'Aktywny', caretaker: 'u2', tags: ['medycyna'],
        contractFrom: d(-500), contractTo: d(12), notice: '3 miesiące', externalId: 'JIRA-GAMMA',
        access: { u2: 'owner' },
        contacts: [{ id: id('p'), name: 'Dr Michał Lis', role: 'Dyrektor', email: 'm.lis@gamma.example', phone: '+48 602 300 400' }],
        lists: [mkList('Moduły systemu', [
          ['Moduły podstawowe', [['Rezerwacje', 'L', '', 'u2', -200], ['Faktury', 'L', '', 'u2', -200], ['Raporty', 'L', '', 'u2', -180]]],
          ['Integracje', [['Powiadomienia SMS', 'L', '', 'u3', -90], ['Kalendarz Google', 'T', 'Prośba klienta z ostatniego spotkania', 'u3', 5]]]
        ])],
        files: [{ id: id('f'), name: 'Umowa_serwisowa.pdf', category: 'Umowa', version: 3, size: 390000, by: 'u1', at: at(-30), expires: d(12) }],
        notes: [{ id: id('n'), authorId: 'u2', at: at(-2, '13:40'), text: 'Umowa kończy się za dwa tygodnie. Dr Lis zapowiedział przedłużenie, czekamy na formalne potwierdzenie.' }],
        activity: [{ at: at(-2, '13:40'), userId: 'u2', text: 'Dodał(a) notatkę' }]
      },
      {
        id: 'c4', name: 'Delta Energy', status: 'Wdrożenie', caretaker: 'u3', tags: ['energetyka'],
        contractFrom: d(-20), contractTo: d(345), notice: '2 miesiące', externalId: 'JIRA-DELTA',
        access: { u3: 'owner' },
        contacts: [{ id: id('p'), name: 'Robert Kaczmarek', role: 'Kierownik projektu', email: 'r.kaczmarek@delta.example', phone: '+48 603 400 500' }],
        lists: [mkList('Moduły systemu', [
          ['Moduły podstawowe', [['Dashboard', 'T', '', 'u3', 3], ['Alerty', 'T', '', 'u3', 9]]]
        ])],
        files: [{ id: id('f'), name: 'Zakres_wdrozenia_v1.docx', category: 'Zakres wdrożenia', version: 1, size: 96000, by: 'u3', at: at(-18), expires: '' }],
        notes: [],
        activity: [{ at: at(-18, '10:10'), userId: 'u3', text: 'Wgrano plik Zakres_wdrozenia_v1.docx' }]
      },
      {
        id: 'c5', name: 'Epsilon Retail', status: 'Zawieszony', caretaker: 'u2', tags: ['handel'],
        contractFrom: d(-210), contractTo: d(90), notice: '1 miesiąc', externalId: '',
        access: { u2: 'owner' },
        contacts: [{ id: id('p'), name: 'Alicja Mazur', role: 'Właścicielka', email: 'a.mazur@epsilon.example', phone: '+48 604 500 600' }],
        lists: [mkList('Moduły systemu', [
          ['Moduły podstawowe', [['POS', 'L', '', 'u3', -150], ['E-commerce', 'H', 'Zawieszone na prośbę klienta do końca kwartału', 'u2', null]]]
        ])],
        files: [],
        notes: [{ id: id('n'), authorId: 'u2', at: at(-14, '15:00'), text: 'Klient zawiesił rozwój e-commerce do końca kwartału. Kontakt wznawiamy w styczniu.' }],
        activity: [{ at: at(-14, '15:00'), userId: 'u2', text: 'Dodał(a) notatkę' }]
      },
      {
        id: 'c6', name: 'Zeta Studio', status: 'Aktywny', caretaker: 'u3', tags: ['usługi'],
        contractFrom: d(-100), contractTo: d(25), notice: '1 miesiąc', externalId: 'JIRA-ZETA',
        access: { u3: 'owner' },
        contacts: [{ id: id('p'), name: 'Paweł Sikora', role: 'Współwłaściciel', email: 'p.sikora@zeta.example', phone: '+48 605 600 700' }],
        lists: [mkList('Moduły systemu', [
          ['Moduły podstawowe', [['Panel klienta', 'L', '', 'u3', -60], ['Fakturowanie', 'T', '', 'u3', 12]]]
        ])],
        files: [{ id: id('f'), name: 'Zamowienie_2026-08.pdf', category: 'Zamówienie', version: 1, size: 140000, by: 'u3', at: at(-100), expires: '' }],
        notes: [],
        activity: []
      }
    ];

    /* Zadania: priorytet low | normal | high; przypomnienie none | same_day | day_before | three_days */
    const task = (clientId, title, ownerId, createdBy, due, priority, reminder, desc) => ({
      id: id('t'), clientId, title, desc: desc || '', ownerId, createdBy, due: due === null ? '' : d(due),
      priority, reminder: reminder || 'none', status: 'open'
    });
    const tasks = [
      task('c1', 'Potwierdzić termin szkolenia użytkowników', 'u2', 'u2', -3, 'high', 'day_before', 'Ewa miała odpisać do poniedziałku.'),
      task('c1', 'Przygotować zakres raportów do akceptacji', 'u3', 'u2', 0, 'normal', 'same_day'),
      task('c1', 'Przypomnieć klientowi o wygasającej umowie ramowej', 'u2', 'u1', 8, 'high', 'three_days'),
      task('c2', 'Uruchomić moduł magazynu u klienta', 'u2', 'u2', 6, 'high', 'day_before'),
      task('c2', 'Zebrać dostępy do środowiska ERP', 'u3', 'u2', 2, 'normal', 'day_before'),
      task('c3', 'Skontaktować się w sprawie przedłużenia umowy', 'u2', 'u1', 4, 'high', 'three_days', 'Dr Lis zapowiedział przedłużenie.'),
      task('c3', 'Przygotować ofertę przedłużenia', 'u1', 'u2', 3, 'normal', 'day_before'),
      task('c4', 'Skonfigurować dashboard dla Delta Energy', 'u3', 'u3', 3, 'normal', 'day_before'),
      task('c4', 'Zaplanować warsztat z kierownikiem projektu', 'u3', 'u3', 15, 'low', 'none'),
      task('c5', 'Wznowić kontakt w sprawie e-commerce', 'u2', 'u2', 45, 'low', 'day_before'),
      task('c6', 'Przetestować fakturowanie', 'u3', 'u3', 11, 'normal', 'day_before'),
      task('c6', 'Sprawdzić odnowienie umowy', 'u3', 'u1', 20, 'normal', 'three_days'),
      task('c1', 'Wysłać podsumowanie spotkania', 'u3', 'u2', null, 'low', 'none'),
      task('c2', 'Zaktualizować dokumentację wdrożenia', 'u2', 'u3', -1, 'normal', 'same_day')
    ];
    tasks[2].createdBy = 'u2';

    const mentions = [
      { id: id('m'), toId: 'u2', byId: 'u3', clientId: 'c1', at: at(-1, '15:20'), text: 'Czy możesz potwierdzić z Ewą termin szkolenia użytkowników?' },
      { id: id('m'), toId: 'u3', byId: 'u2', clientId: 'c2', at: at(-2, '10:05'), text: 'Potrzebuję dostępów do środowiska ERP Beta Foods.' }
    ];

    return {
      currentUserId: 'u2',
      permissions, roles, users, itemStatuses, clientStatuses, fileCategories,
      templates, clients, tasks, mentions
    };
  };
})(window.CS = window.CS || {});
