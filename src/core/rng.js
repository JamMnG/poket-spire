// ─────────────────────────────────────────────────────────────
// rng.js — 시드 난수
//
// 로그라이크는 "이번 판이 어땠는지" 말할 수 있어야 한다. 그러려면
// 같은 시드가 같은 판을 내야 한다. Math.random 은 그걸 못 하므로
// 런 전체가 이 스트림 하나만 쓴다.
//
// 스트림을 나눠 두는 이유: 맵 생성과 전투 굴림이 같은 스트림을 쓰면
// 전투에서 굴림 한 번이 늘어날 때마다 이후 맵이 통째로 달라진다.
// 디버깅할 때 "맵은 그대로 두고 전투만 다시" 가 불가능해진다.
// ─────────────────────────────────────────────────────────────

/** mulberry32 — 32비트 시드 하나로 도는 짧고 품질 괜찮은 PRNG */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 문자열 시드 → 32비트 정수 */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed) {
  const next = mulberry32(typeof seed === 'string' ? hashSeed(seed) : seed);

  const R = {
    /** [0,1) */
    next,
    /** [0,n) 정수 */
    int: (n) => Math.floor(next() * n),
    /** [min,max] 정수 */
    range: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** 확률 p 로 참 */
    chance: (p) => next() < p,
    /** 배열에서 하나 */
    pick: (arr) => arr[Math.floor(next() * arr.length)],

    /** 제자리 셔플 (Fisher-Yates) */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },

    /**
     * 중복 없이 n 개 뽑기.
     * 카드 보상 3장이 같은 카드로 나오면 선택이 아니게 되므로 필요하다.
     */
    sample(arr, n) {
      const pool = arr.slice();
      const out = [];
      while (out.length < n && pool.length) out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
      return out;
    },

    /** weight 필드를 가진 항목들에서 가중 추첨 */
    weighted(items, weightOf = (x) => x.weight ?? 1) {
      let total = 0;
      for (const it of items) total += weightOf(it);
      let r = next() * total;
      for (const it of items) {
        r -= weightOf(it);
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },
  };
  return R;
}

/**
 * 런 하나가 쓰는 난수 스트림 묶음.
 * 시드 문자열에 용도를 덧붙여 서로 독립적인 스트림을 만든다.
 */
export function createStreams(seed) {
  return {
    seed,
    map: createRng(seed + ':map'),
    reward: createRng(seed + ':reward'),
    shop: createRng(seed + ':shop'),
    event: createRng(seed + ':event'),
    combat: createRng(seed + ':combat'),
  };
}

/** 사람이 읽고 옮겨 적을 수 있는 시드 — 대문자·숫자 8자리 */
export function randomSeed() {
  const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += CH[Math.floor(Math.random() * CH.length)];
  return s;
}
