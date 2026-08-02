// ─────────────────────────────────────────────────────────────
// types.js — 원작 18타입 상성표
//
// 이 게임에서 상성은 장식이 아니라 덱빌딩의 두 번째 축이다.
// 슬더스가 "카드끼리 얼마나 맞물리는가" 하나로 덱을 평가한다면,
// 여기서는 "무엇을 때릴 수 있는가(커버리지)" 를 같이 봐야 한다.
//
// ★ 무효(0배)를 공격과 방어에서 다르게 다룬다 — 의도한 비대칭이다.
//
//   공격 무효 → ×0.25 로 눌렀다. 손에 든 카드가 완전히 0이 되면
//   플레이어는 선택지가 아니라 고장을 만난 기분이 든다. 아프긴 하되
//   막히지는 않게 두고, UI에 "거의 통하지 않는다"로 이유를 밝힌다.
//
//   방어 무효 → 진짜 0 으로 남긴다. 적의 지진 예고를 보고 비행 타입으로
//   교체해 통째로 흘리는 순간이 이 게임에서 제일 포켓몬다운 장면이다.
//   그건 플레이어가 정보를 읽고 내린 판단이므로 온전히 보상해야 한다.
// ─────────────────────────────────────────────────────────────

export const TYPES = {
  NORMAL:   { ko: '노말',   color: '#9fa07f', ink: '#6d6e54' },
  FIRE:     { ko: '불꽃',   color: '#f0803c', ink: '#a04c1c' },
  WATER:    { ko: '물',     color: '#5090d6', ink: '#2d5b91' },
  GRASS:    { ko: '풀',     color: '#5fbc5a', ink: '#357a36' },
  ELECTRIC: { ko: '전기',   color: '#f0c419', ink: '#a8850a' },
  ICE:      { ko: '얼음',   color: '#63cec0', ink: '#348d84' },
  FIGHT:    { ko: '격투',   color: '#ce4069', ink: '#8c2342' },
  POISON:   { ko: '독',     color: '#a552cc', ink: '#6b2c88' },
  GROUND:   { ko: '땅',     color: '#d97845', ink: '#8f4a24' },
  FLYING:   { ko: '비행',   color: '#8caee0', ink: '#546e96' },
  PSYCHIC:  { ko: '에스퍼', color: '#f85888', ink: '#a92f56' },
  BUG:      { ko: '벌레',   color: '#91c12f', ink: '#5c7d17' },
  ROCK:     { ko: '바위',   color: '#b8a878', ink: '#7c6f46' },
  GHOST:    { ko: '고스트', color: '#5f6dbc', ink: '#39447c' },
  DRAGON:   { ko: '드래곤', color: '#4a6ec7', ink: '#2a4384' },
  DARK:     { ko: '악',     color: '#5a5366', ink: '#332f3c' },
  STEEL:    { ko: '강철',   color: '#6f97a8', ink: '#42606e' },
  FAIRY:    { ko: '페어리', color: '#ec8fe6', ink: '#a4529f' },
};

export const TYPE_IDS = Object.keys(TYPES);

export const typeKo    = (t) => TYPES[t]?.ko ?? t;
export const typeColor = (t) => TYPES[t]?.color ?? '#9fa07f';
export const typeInk   = (t) => TYPES[t]?.ink ?? '#6d6e54';

/** 복합 타입을 "불꽃 · 비행" 처럼 */
export const typesKo = (list) => (list || []).map(typeKo).join(' · ');

// ── 원작 상성표 그대로. 적히지 않은 조합은 1배 ──────────────
const CHART = {
  NORMAL:   { ROCK: .5, GHOST: 0, STEEL: .5 },
  FIRE:     { FIRE: .5, WATER: .5, GRASS: 2, ICE: 2, BUG: 2, ROCK: .5, DRAGON: .5, STEEL: 2 },
  WATER:    { FIRE: 2, WATER: .5, GRASS: .5, GROUND: 2, ROCK: 2, DRAGON: .5 },
  ELECTRIC: { WATER: 2, ELECTRIC: .5, GRASS: .5, GROUND: 0, FLYING: 2, DRAGON: .5 },
  GRASS:    { FIRE: .5, WATER: 2, GRASS: .5, POISON: .5, GROUND: 2, FLYING: .5, BUG: .5, ROCK: 2, DRAGON: .5, STEEL: .5 },
  ICE:      { FIRE: .5, WATER: .5, GRASS: 2, ICE: .5, GROUND: 2, FLYING: 2, DRAGON: 2, STEEL: .5 },
  FIGHT:    { NORMAL: 2, ICE: 2, POISON: .5, FLYING: .5, PSYCHIC: .5, BUG: .5, ROCK: 2, GHOST: 0, DARK: 2, STEEL: 2, FAIRY: .5 },
  POISON:   { GRASS: 2, POISON: .5, GROUND: .5, ROCK: .5, GHOST: .5, STEEL: 0, FAIRY: 2 },
  GROUND:   { FIRE: 2, ELECTRIC: 2, GRASS: .5, POISON: 2, FLYING: 0, BUG: .5, ROCK: 2, STEEL: 2 },
  FLYING:   { ELECTRIC: .5, GRASS: 2, FIGHT: 2, BUG: 2, ROCK: .5, STEEL: .5 },
  PSYCHIC:  { FIGHT: 2, POISON: 2, PSYCHIC: .5, DARK: 0, STEEL: .5 },
  BUG:      { FIRE: .5, GRASS: 2, FIGHT: .5, POISON: .5, FLYING: .5, PSYCHIC: 2, GHOST: .5, DARK: 2, STEEL: .5, FAIRY: .5 },
  ROCK:     { FIRE: 2, ICE: 2, FIGHT: .5, GROUND: .5, FLYING: 2, BUG: 2, STEEL: .5 },
  GHOST:    { NORMAL: 0, PSYCHIC: 2, GHOST: 2, DARK: .5 },
  DRAGON:   { DRAGON: 2, STEEL: .5, FAIRY: 0 },
  DARK:     { FIGHT: .5, PSYCHIC: 2, GHOST: 2, DARK: .5, FAIRY: .5 },
  STEEL:    { FIRE: .5, WATER: .5, ELECTRIC: .5, ICE: 2, ROCK: 2, STEEL: .5, FAIRY: 2 },
  FAIRY:    { FIRE: .5, FIGHT: 2, POISON: .5, DRAGON: 2, DARK: 2, STEEL: .5 },
};

/** 방어 측을 배열로 정규화 — 단일 타입도 복합 타입도 같은 경로를 타게 */
const defList = (d) => (Array.isArray(d) ? d : d ? [d] : []);

/** 원작 값 그대로의 배율 (무효는 0). 복합 타입은 곱한다 → 물▶꼬마돌 4배 */
export function rawMultiplier(atkType, defTypes) {
  const row = CHART[atkType];
  if (!row || !atkType) return 1;
  let m = 1;
  for (const t of defList(defTypes)) m *= row[t] ?? 1;
  return m;
}

/**
 * 원작 배율을 게임용으로 눌러 담는다.
 *
 *   원작   0    0.25  0.5   1    2    4
 *   여기  (아래) 0.6   0.75  1    1.5  2
 *
 * 원작 값(2배·4배)을 그대로 썼더니 두 가지가 무너졌다. 3막에서 자속 1.5에
 * 4배가 곱해지면 평타가 100을 넘었고, 반대로 역상성 엘리트(물카드 없이 만난
 * 롱스톤 같은)는 4배로 맞아 한 방에 갈렸다. 상성이 "유리하게 싸울 이유"가
 * 아니라 "만나는 순간 승패가 정해지는 복권"이 된 것이다.
 * 눌러 담은 표에서는 최고 2배·최저 0.6배라, 상성은 이득이되 답 없는 판은
 * 없다. 표(CHART)는 원작 그대로 두고 여기서만 누른다 — 약점·내성 표시는
 * 원본 관계를 그대로 쓰기 때문이다.
 */
function compress(raw) {
  if (raw >= 4) return 2;
  if (raw >= 2) return 1.5;
  if (raw === 1) return 1;
  if (raw >= 0.5) return 0.75;
  if (raw > 0) return 0.6;
  return 0;
}

/** 내가 적을 때릴 때 — 무효도 0.5 로 완화. 카드가 아예 죽는 일은 없게 */
export function offenseMultiplier(atkType, defTypes) {
  const m = compress(rawMultiplier(atkType, defTypes));
  return m === 0 ? 0.5 : m;
}

/** 적이 나를 때릴 때 — 무효는 진짜 0. 교체 판단에 대한 보상은 남긴다 */
export function defenseMultiplier(atkType, defTypes) {
  return compress(rawMultiplier(atkType, defTypes));
}

/** 자속보정(STAB) — 선두 포켓몬의 타입과 기술 타입이 겹치면 1.5배 */
export function stabBonus(moveType, ownerTypes) {
  return defList(ownerTypes).includes(moveType) ? 1.5 : 1;
}

/** 'super' | 'resist' | 'immune' | 'neutral' — UI 색·문구를 고르는 데 쓴다 */
export function relation(atkType, defTypes) {
  const raw = rawMultiplier(atkType, defTypes);
  if (raw === 0) return 'immune';
  if (raw > 1) return 'super';
  if (raw < 1) return 'resist';
  return 'neutral';
}

/** 배율 자체를 문구로 — 4배와 2배를 구분해 보여 준다 */
export function relationText(mult) {
  if (mult === 0) return '효과가 없다!';
  if (mult >= 2) return '효과가 발군이다!!';
  if (mult > 1) return '효과가 굉장하다!';
  if (mult <= 0.6) return '거의 통하지 않는다';
  if (mult < 1) return '효과가 별로다…';
  return '';
}

/** 이 타입을 2배로 때리는 공격 타입들 — 적 정보 패널에서 "약점" 으로 쓴다 */
export const weaknessesOf = (defTypes) =>
  TYPE_IDS.filter((a) => rawMultiplier(a, defTypes) > 1);

/** 이 타입이 반감·무효하는 공격 타입들 — "내성" */
export const resistancesOf = (defTypes) =>
  TYPE_IDS.filter((a) => rawMultiplier(a, defTypes) < 1);
