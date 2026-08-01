// ─────────────────────────────────────────────────────────────
// relics.js — 지닌 도구 (슬더스의 유물)
//
// 도구는 훅으로 쓴다. 전투 코드가 정해진 지점에서 훅을 부르고, 도구는
// 자기가 아는 지점에만 함수를 단다. 새 도구를 넣을 때 전투 코드를
// 건드릴 일이 없게 하려는 것이다.
//
// 훅 목록:
//   onCombatStart(C)              전투 시작 (드로우 전)
//   onTurnStart(C)                내 턴 시작 (드로우 전)
//   onTurnEnd(C)                  내 턴 종료 처리 직전
//   onCombatEnd(C)                전투 승리 직후
//   onCardPlayed(C, card)         카드를 쓴 뒤
//   powerMod(C, card) → 위력 가산   공격 카드 위력에 더할 값
//   damageMul(C, card) → 배수      최종 피해에 곱할 값
//   goldMul() → 배수               전투 보상 골드
//   blockKeepRatio() → 비율        턴 종료 시 남기는 방어도 비율
//   resistFloor(mult) → 배율       불리 상성 완화
//   freeSwitch() → bool            교체 에너지 면제
//   extraPartySlot() → bool        파티 슬롯 확장
// ─────────────────────────────────────────────────────────────

const C = 'COMMON', U = 'UNCOMMON', R = 'RARE', BOSS = 'BOSS';

/** 특정 타입 기술의 위력을 올리는 도구를 한 줄로 찍어 낸다 */
const typeBooster = (ko, type, add, blurb, icon) => ({
  ko, rarity: C, boostType: type, icon,
  desc: `${blurb} 기술의 위력이 ${add} 오른다.`,
  powerMod: (_C, card) => (card.type === type ? add : 0),
});

export const RELICS = {
  // ── 흔함 ─────────────────────────────────────────────────
  charcoal:    typeBooster('목탄', 'FIRE', 3, '불꽃', 'charcoal'),
  mysticwater: typeBooster('신비의물방울', 'WATER', 3, '물', 'mystic-water'),
  miracleseed: typeBooster('기적의씨앗', 'GRASS', 3, '풀', 'miracle-seed'),
  magnet:      typeBooster('자석', 'ELECTRIC', 3, '전기', 'magnet'),
  silkscarf:   typeBooster('실크스카프', 'NORMAL', 3, '노말', 'silk-scarf'),

  powerankle: {
    ko: '파워앵클', icon: 'power-anklet', rarity: C,
    desc: '파티 전원의 최대 HP가 8 오른다.',
    maxHpBonus: 8,
  },
  assaultvest: {
    ko: '방어조끼', icon: 'assault-vest', rarity: C,
    desc: '전투를 시작할 때 방어도 6을 얻는다.',
    onCombatStart: (K) => K.gainBlock(6),
  },
  oranberry: {
    ko: '오랭열매', icon: 'oran-berry', rarity: C,
    desc: '전투가 끝나면 선두 포켓몬의 HP를 6 회복한다.',
    onCombatEnd: (K) => K.healActive(6),
  },
  amuletcoin: {
    ko: '부적금화', icon: 'amulet-coin', rarity: C,
    desc: '전투에서 얻는 돈이 30% 늘어난다.',
    goldMul: () => 1.3,
  },

  // ── 안 흔함 ──────────────────────────────────────────────
  rarecandy: {
    ko: '이상한사탕', icon: 'rare-candy', rarity: U,
    desc: '전투를 시작할 때 카드를 1장 더 뽑는다.',
    extraOpeningDraw: 1,
  },
  quickpowder: {
    ko: '스피드파우더', icon: 'quick-powder', rarity: U,
    desc: '전투의 첫 턴에 에너지를 1 더 얻는다.',
    onTurnStart: (K) => { if (K.turn === 1) K.gainEnergy(1); },
  },
  evereststone: {
    ko: '만능조약돌', icon: 'everstone', rarity: U,
    desc: '불리한 상성으로 받는 손해가 줄어든다. (0.5배 → 0.75배)',
    resistFloor: (m) => (m < 1 && m > 0 ? Math.min(1, m * 1.5) : m),
  },
  lightclay: {
    ko: '빛의점토', icon: 'light-clay', rarity: U,
    desc: '턴이 끝나도 방어도의 절반이 남는다.',
    blockKeepRatio: () => 0.5,
  },
  escaperope: {
    ko: '탈출버튼', icon: 'escape-rope', rarity: U,
    desc: '교체에 에너지가 들지 않는다.',
    freeSwitch: () => true,
  },
  flameorb: {
    ko: '화염구슬', icon: 'flame-orb', rarity: U,
    desc: '적이 받는 화상 피해가 2배가 된다.',
    burnMul: 2,
  },
  toxicspikes: {
    ko: '독압정', icon: 'toxic-orb', rarity: U,
    desc: '전투를 시작할 때 모든 적에게 독 3을 준다.',
    onCombatStart: (K) => K.statusAllEnemies('POISON', 3),
  },

  // ── 희귀 ─────────────────────────────────────────────────
  scopelens: {
    ko: '집중렌즈', icon: 'scope-lens', rarity: R,
    desc: '한 턴에 세 번째로 쓰는 공격 카드는 피해가 2배가 된다.',
    damageMul: (K, card) => (card.kind === 'ATTACK' && K.attacksThisTurn % 3 === 2 ? 2 : 1),
  },
  choiceband: {
    ko: '구애머리띠', icon: 'choice-band', rarity: R,
    desc: '매 턴 처음 쓰는 카드의 피해가 2배. 그 턴의 나머지 카드는 피해가 25% 준다.',
    damageMul: (K) => (K.cardsThisTurn === 0 ? 2 : 0.75),
  },
  focussash: {
    ko: '기합의띠', icon: 'focus-sash', rarity: R,
    desc: '전투마다 한 번, 쓰러질 피해를 HP 1로 버틴다.',
    endure: true,
  },
  leftovers: {
    ko: '먹다남은음식', icon: 'leftovers', rarity: R,
    desc: '턴이 끝날 때마다 HP를 3 회복한다.',
    onTurnEnd: (K) => K.healActive(3),
  },

  // ── 보스 도구 (엘리트·보스 처치 보상) ─────────────────────
  evolutionstone: {
    ko: '진화의돌', icon: 'moon-stone', rarity: BOSS,
    desc: '파티 전원의 최대 HP가 15 오르고 즉시 그만큼 회복한다.',
    maxHpBonus: 15, healOnPickup: true,
  },
  boulderbadge: {
    ko: '회색뱃지', icon: 'metal-coat', rarity: BOSS,
    desc: '에너지를 1 더 얻는다. 대신 매 턴 카드를 1장 덜 뽑는다.',
    energyBonus: 1, drawPenalty: 1,
  },
  masterball: {
    ko: '마스터볼', icon: 'master-ball', rarity: BOSS,
    desc: '파티 자리가 하나 늘고, 야생 포켓몬 포획에 실패하지 않는다.',
    extraPartySlot: () => true, alwaysCatch: true,
  },
};

export const ALL_RELIC_IDS = Object.keys(RELICS);
export const relicOf = (id) => RELICS[id];

/** 등급별 후보 — 보상 추첨에 쓴다 */
export const relicsByRarity = (rarity) => ALL_RELIC_IDS.filter((id) => RELICS[id].rarity === rarity);

/** 이미 가진 것을 뺀 후보 */
export function availableRelics(owned, rarities = [ 'COMMON', 'UNCOMMON', 'RARE' ]) {
  const has = new Set(owned);
  return ALL_RELIC_IDS.filter((id) => !has.has(id) && rarities.includes(RELICS[id].rarity));
}

/**
 * 가진 도구들에서 한 훅을 모아 실행한다.
 * 도구가 훅을 안 달았으면 그냥 건너뛰므로 호출부는 조건을 몰라도 된다.
 */
export function runHook(owned, name, ...args) {
  for (const id of owned) {
    const fn = RELICS[id]?.[name];
    if (typeof fn === 'function') fn(...args);
  }
}

/** 숫자를 더하는 훅들의 합 */
export function sumHook(owned, name, ...args) {
  let total = 0;
  for (const id of owned) {
    const fn = RELICS[id]?.[name];
    if (typeof fn === 'function') total += fn(...args) || 0;
  }
  return total;
}

/** 배수를 곱하는 훅들의 곱 */
export function mulHook(owned, name, ...args) {
  let total = 1;
  for (const id of owned) {
    const fn = RELICS[id]?.[name];
    if (typeof fn === 'function') total *= fn(...args) ?? 1;
  }
  return total;
}

/** 필드값(함수가 아닌 것)의 합 — maxHpBonus 처럼 단순한 것들 */
export function sumField(owned, field) {
  let total = 0;
  for (const id of owned) total += RELICS[id]?.[field] || 0;
  return total;
}

/** 하나라도 이 필드를 참으로 가지고 있는가 */
export const anyField = (owned, field) => owned.some((id) => !!RELICS[id]?.[field]);
