/* Ekran „Szablony”: szablony list z grupami i pozycjami. W prototypie tylko podgląd. */
(function (CS) {
  'use strict';
  const { h } = CS.dom;
  const S = CS.store;
  const ui = CS.ui;

  CS.views = CS.views || {};
  CS.views.templates = function () {
    const canManage = S.hasPerm('templates.manage');
    const usage = (tplId) => S.state.clients.flatMap((c) => c.lists).filter((l) => l.template && l.template.id === tplId).length;

    return h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', null, h('h1', null, 'Szablony list'), h('p', { class: 'muted' }, 'Gotowe listy z grupami i pozycjami do użycia przy nowym kliencie.')),
        canManage ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => ui.toast('Prototyp pokazuje tylko podgląd szablonów') }, ui.icon('plus', 15), ' Nowy szablon') : null),
      h('div', { class: 'grid grid-two' }, S.state.templates.map((t) =>
        h('section', { class: 'card' },
          h('h3', null, t.name, ' ', ui.badge(`wersja ${t.version}`, 'gray')),
          h('p', { class: 'muted small' }, `Użyty w ${usage(t.id)} listach klientów`),
          t.groups.map((g) => h('div', { class: 'tpl-group' },
            h('strong', null, g.name),
            h('ul', { class: 'plain-list tight' }, g.items.map((i) => h('li', null, i)))))))));
  };
})(window.CS = window.CS || {});
