// ─────────────────────────────────────────────────────────────
// ko.js — 한국어 조사
//
// "파이리이(가) 쓰러졌다" 같은 문장이 한 번 눈에 들어오면 그 뒤로는
// 게임 전체가 대충 만든 것처럼 읽힌다. 받침 유무만 보면 되는 일이라
// 여기서 한 번에 해결한다.
// ─────────────────────────────────────────────────────────────

/** 마지막 글자에 받침이 있는가 */
export function hasFinal(word) {
  if (!word) return false;
  const ch = word[word.length - 1];
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;   // 한글이 아니면 없는 것으로 본다
  return (code - 0xac00) % 28 !== 0;
}

const pair = (a, b) => (word) => word + (hasFinal(word) ? a : b);

export const eunNeun = pair('은', '는');
export const iGa     = pair('이', '가');
export const eulReul = pair('을', '를');
export const gwaWa    = pair('과', '와');

/** "파이리로" / "꼬부기로" — ㄹ 받침은 '로' 를 쓴다 */
export function euro(word) {
  if (!word) return word;
  const code = word[word.length - 1].charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return word + '로';
  const jong = (code - 0xac00) % 28;
  return word + (jong === 0 || jong === 8 ? '로' : '으로');
}
