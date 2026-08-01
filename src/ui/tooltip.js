// ─────────────────────────────────────────────────────────────
// tooltip.js — 마우스를 올리면 뜨는 설명
//
// 이 게임은 숫자 뒤에 규칙이 많다(상성 배율, 상태이상, 도구). 그걸 전부
// 화면에 적으면 화면이 죽고, 아무 데도 안 적으면 배울 방법이 없다.
// 그래서 "필요할 때만" 보이게 한다.
// ─────────────────────────────────────────────────────────────
import { $ } from './dom.js';

let node = null;
const getNode = () => (node ||= $('#tooltip'));

export function showTip(target, html) {
  const t = getNode();
  if (!t) return;
  t.innerHTML = html;
  t.classList.add('is-on');

  const r = target.getBoundingClientRect();
  const tr = t.getBoundingClientRect();
  let x = r.left + r.width / 2 - tr.width / 2;
  let y = r.top - tr.height - 10;
  if (y < 8) y = r.bottom + 10;                              // 위가 좁으면 아래로
  x = Math.max(8, Math.min(x, window.innerWidth - tr.width - 8));
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
}

export function hideTip() {
  getNode()?.classList.remove('is-on');
}

/** 요소에 툴팁을 달아 준다. html 은 값이거나 값을 만드는 함수 */
export function attachTip(node, html) {
  node.addEventListener('mouseenter', () => showTip(node, typeof html === 'function' ? html() : html));
  node.addEventListener('mouseleave', hideTip);
  return node;
}
