// ─────────────────────────────────────────────────────────────
// shading.js — 공용 조명·색 유틸
//
// 광원은 왼쪽 위 고정. 도트도 UI도 전부 이 함수들만 쓰기 때문에
// 무엇을 새로 그리든 같은 빛 아래 있는 것처럼 보인다.
// ─────────────────────────────────────────────────────────────

export const INK = '#2b2118';

/** #rrggbb 를 밝게(+)/어둡게(−) — 색 하나에서 명암 여러 단을 만든다 */
export function shade(hex, amt) {
  if (typeof hex !== 'string' || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** #rrggbb 두 색을 섞는다 */
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const f = (sh) => Math.round((((pa >> sh) & 255) * (1 - t)) + (((pb >> sh) & 255) * t));
  return `rgb(${f(16)},${f(8)},${f(0)})`;
}

/** shade()가 돌려주는 rgb() 문자열을 다시 #hex 로 */
export function hexOf(css) {
  if (typeof css !== 'string') return '#000000';
  if (css[0] === '#') return css;
  const m = css.match(/\d+/g);
  if (!m) return '#000000';
  return '#' + m.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('');
}

/**
 * 외곽선 색 — 색상별로 조금씩 다르지만 충분히 어둡다.
 * 순수 검정만 쓰면 스티커처럼 보이고, 색만 어둡히면 밝은 유닛이 배경에 묻힌다.
 */
export const inkOf = (color) => (typeof color === 'string' && color[0] === '#')
  ? mix(hexOf(shade(color, -0.62)), INK, 0.55)
  : INK;

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 굵은 진한 외곽선을 두른 글자 — 어떤 배경 위에서도 읽히게 하는 아트 규칙 */
export function outlinedText(ctx, text, x, y, font, fill, lw = 3.5) {
  ctx.font = font;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
