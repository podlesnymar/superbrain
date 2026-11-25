/* Narzędzia ogólne: daty, formatowanie, identyfikatory. */
(function (CS) {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');
  const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());

  const parts = (s) => s.slice(0, 10).split('-').map(Number);
  const addDays = (s, n) => {
    const [y, m, d] = parts(s);
    return iso(new Date(y, m - 1, d + n));
  };
  /** Liczba dni od b do a (a - b), na datach YYYY-MM-DD. */
  const diffDays = (a, b) => {
    const p = (s) => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d); };
    return Math.round((p(a) - p(b)) / 864e5);
  };

  const nowStamp = () => {
    const n = new Date();
    return `${iso(n)}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
  };

  const fmtDate = (s) => {
    if (!s) return '—';
    const [y, m, d] = parts(s);
    const cur = new Date().getFullYear();
    return `${d} ${MONTHS[m - 1]}${y !== cur ? ' ' + y : ''}`;
  };
  const fmtDateTime = (s) => {
    if (!s) return '—';
    const time = s.length > 10 ? s.slice(11, 16) : '';
    return fmtDate(s) + (time ? ', ' + time : '');
  };
  const relDay = (s) => {
    if (!s) return '';
    const n = diffDays(s, today());
    if (n === 0) return 'dziś';
    if (n === 1) return 'jutro';
    if (n === -1) return 'wczoraj';
    if (n > 1) return `za ${n} dni`;
    return `${-n} dni temu`;
  };
  /** Parsuje YYYY-MM-DD albo DD.MM.YYYY; zwraca YYYY-MM-DD lub null. */
  const parseDate = (s) => {
    s = (s || '').trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return s;
    m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
    if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    return null;
  };

  const fmtSize = (b) => {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  };

  /** Normalizacja do wyszukiwania: małe litery, bez polskich znaków. */
  const norm = (s) =>
    String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');

  const initials = (name) =>
    String(name || '?').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  const hue = (s) => {
    let h = 0;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  };

  CS.util = { iso, today, addDays, diffDays, nowStamp, fmtDate, fmtDateTime, relDay, parseDate, fmtSize, norm, initials, hue };
})(window.CS = window.CS || {});
