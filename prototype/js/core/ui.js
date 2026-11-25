/* Wspólne elementy interfejsu: ikony, plakietki, awatary, okna modalne, komunikaty. */
(function (CS) {
  'use strict';
  const { h } = CS.dom;
  const U = CS.util;

  const ICONS = {
    tasks: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    down: '<polyline points="6 9 12 15 18 9"/>',
    right: '<polyline points="9 18 15 12 9 6"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  };

  function icon(name, size) {
    const s = size || 16;
    const span = document.createElement('span');
    span.className = 'icon';
    span.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    return span;
  }

  function badge(text, tone) {
    return h('span', { class: `badge tone-${tone || 'gray'}` }, text);
  }

  function avatar(user, small) {
    if (!user) return h('span', { class: 'avatar avatar-empty' }, '–');
    return h('span', {
      class: 'avatar' + (small ? ' avatar-sm' : ''),
      title: user.name,
      style: { background: `hsl(${U.hue(user.id)} 45% 90%)`, color: `hsl(${U.hue(user.id)} 55% 28%)` }
    }, U.initials(user.name));
  }

  /** Lista rozwijana: options = [{value, label}]. */
  function select(options, value, onChange, attrs) {
    const el = h('select', Object.assign({ class: 'select' }, attrs || {}),
      options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
    if (onChange) el.addEventListener('change', () => onChange(el.value));
    return el;
  }

  function toast(message) {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = h('div', { id: 'toast-host', class: 'toast-host', role: 'status' });
      document.body.appendChild(host);
    }
    const t = h('div', { class: 'toast' }, message);
    host.appendChild(t);
    setTimeout(() => t.classList.add('toast-out'), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  /**
   * Okno modalne.
   * opts: { title, body (Node), actions: [{label, primary, onClick}], wide }
   * onClick zwracające false zostawia okno otwarte.
   */
  function modal(opts) {
    const close = () => {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const actions = (opts.actions || []).map((a) =>
      h('button', {
        class: 'btn' + (a.primary ? ' btn-primary' : ''),
        type: 'button',
        onclick: () => { if (a.onClick && a.onClick() === false) return; close(); }
      }, a.label));
    const backdrop = h('div', {
      class: 'modal-backdrop',
      onmousedown: (e) => { if (e.target === backdrop) close(); }
    },
    h('div', { class: 'modal' + (opts.wide ? ' modal-wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title },
      h('div', { class: 'modal-head' },
        h('h2', null, opts.title),
        h('button', { class: 'btn-icon', type: 'button', 'aria-label': 'Zamknij', onclick: close }, '×')),
      h('div', { class: 'modal-body' }, opts.body),
      actions.length ? h('div', { class: 'modal-foot' }, actions) : null));
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', onKey);
    const first = backdrop.querySelector('input, select, textarea');
    if (first) first.focus();
    return { close };
  }

  /** Pole formularza z etykietą. */
  function field(label, control) {
    return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control);
  }

  CS.ui = { icon, badge, avatar, select, toast, modal, field };
})(window.CS = window.CS || {});
