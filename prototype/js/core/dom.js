/* Minimalny pomocnik do budowania DOM: h('div', {class: 'x'}, dzieci...). */
(function (CS) {
  'use strict';

  const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'textContent', 'innerHTML', 'htmlFor', 'readOnly']);

  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach((c) => append(el, c)); return; }
    el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'for') el.htmlFor = v;
        else if (PROPS.has(k)) el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    append(el, children);
    return el;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  CS.dom = { h, clear };
})(window.CS = window.CS || {});
