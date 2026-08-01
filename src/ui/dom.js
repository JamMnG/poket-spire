// ─────────────────────────────────────────────────────────────
// dom.js — 화면 코드가 반복해서 쓰는 최소한의 도구
// 프레임워크를 쓰지 않으므로 이 정도만 있으면 충분하다.
// ─────────────────────────────────────────────────────────────

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * el('div.card.is-on', { onclick }, [자식...])
 * 태그에 .클래스 를 붙여 쓴다 — 대부분의 노드가 클래스 하나뿐이라서.
 */
export function el(spec, props = {}, children = []) {
  const [tag, ...classes] = spec.split('.');
  const n = document.createElement(tag || 'div');
  if (classes.length) n.className = classes.join(' ');

  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }

  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return n;
}

export const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); return n; };

export function mount(parent, ...children) {
  clear(parent);
  for (const c of children.flat()) if (c) parent.appendChild(c);
  return parent;
}

export const show = (n, on = true) => n.classList.toggle('is-on', on);

/** 숫자를 굵게 — 카드 설명에서 값이 먼저 눈에 들어오게 */
export const boldNums = (s) => String(s).replace(/(\d+(?:\.\d+)?)/g, '<b>$1</b>');

/**
 * 같은 틱에 여러 번 불려도 한 번만 그린다.
 *
 * requestAnimationFrame 을 쓰지 않는다 — 브라우저가 배경 탭의 rAF 를
 * 세워 버리기 때문이다. 턴제 게임이라 프레임에 맞출 이유가 없고,
 * 오히려 탭을 잠깐 가렸다 돌아왔을 때 화면이 비어 있는 쪽이 문제다.
 * 마이크로태스크는 항상 도므로 어느 상태에서도 그려진다.
 */
export function batched(fn) {
  let queued = false;
  return (...args) => {
    if (queued) return;
    queued = true;
    Promise.resolve().then(() => { queued = false; fn(...args); });
  };
}
