// ─────────────────────────────────────────────────────────────
// status.js — 상태이상
//
// 네 가지만 쓴다. 원작에는 더 있지만, 확률로 행동을 막는 것들(혼란·잠듦)은
// 카드 게임에서 "내 계획이 이유 없이 무너졌다"는 느낌만 남긴다.
// 그래서 전부 결정적인 효과로 바꿨다 — 얼마나 아플지 미리 셀 수 있다.
//
// ★ 상태이상은 필드가 아니라 포켓몬 개체에 붙는다.
//   원작에서 독 걸린 포켓몬을 뒤로 빼도 독이 낫지 않는 것과 같고,
//   덕분에 "독 먹은 애를 벤치로 빼서 굴린다" 는 판단이 생긴다.
//   반면 방어도와 능력 랭크는 필드(선두 자리)에 붙어 교체하면 사라진다.
// ─────────────────────────────────────────────────────────────

export const STATUS = {
  POISON: {
    ko: '독', color: '#a552cc', icon: '☠',
    desc: (n) => `턴이 끝날 때 ${n}의 피해를 입고, 독이 1 줄어든다.`,
  },
  BURN: {
    ko: '화상', color: '#f0803c', icon: '♨',
    desc: (n) => `턴이 끝날 때 ${n}의 피해를 입는다. 공격력이 25% 준다. 화상은 절반씩 준다.`,
  },
  PARA: {
    ko: '마비', color: '#f0c419', icon: '⚡',
    desc: (n) => `에너지를 1 덜 얻는다(적은 공격력 25% 감소). 턴마다 1 줄어든다. 남은 ${n}턴.`,
  },
  FREEZE: {
    ko: '얼음', color: '#63cec0', icon: '❄',
    desc: (n) => `${n}턴 동안 행동하지 못한다.`,
  },
};

export const STATUS_IDS = Object.keys(STATUS);

/** 빈 상태이상 주머니 */
export const emptyStatus = () => ({ POISON: 0, BURN: 0, PARA: 0, FREEZE: 0 });

export const hasStatus = (bag, id) => (bag?.[id] || 0) > 0;

export function addStatus(bag, id, amount) {
  if (!bag || !amount) return;
  bag[id] = Math.max(0, (bag[id] || 0) + amount);
}

/**
 * 턴 종료 시 도트 피해를 계산한다. 스택 감소까지 여기서 처리하고
 * "얼마를 깎을지" 만 돌려준다 — 실제 HP 차감은 부르는 쪽 몫이다.
 * (플레이어와 적이 HP를 다루는 방식이 달라서 그렇게 나눴다)
 */
export function tickStatus(bag, { burnMul = 1 } = {}) {
  let damage = 0;

  if (bag.POISON > 0) {
    damage += bag.POISON;
    bag.POISON -= 1;
  }
  if (bag.BURN > 0) {
    damage += Math.round(bag.BURN * burnMul);
    bag.BURN = Math.floor(bag.BURN / 2);   // 화상은 절반씩 식는다
  }
  if (bag.PARA > 0) bag.PARA -= 1;
  if (bag.FREEZE > 0) bag.FREEZE -= 1;

  return damage;
}

/** UI 배지용 — 값이 0 이 아닌 것만 */
export const activeStatuses = (bag) =>
  STATUS_IDS.filter((id) => (bag?.[id] || 0) > 0).map((id) => ({ id, n: bag[id], ...STATUS[id] }));
