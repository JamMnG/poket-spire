// ─────────────────────────────────────────────────────────────
// formula.js — 피해 계산
//
// 계산을 여기 몰아 둔 이유는 하나다. 적의 의도에 뜨는 숫자와 실제로
// 맞는 숫자가 다르면 게임이 거짓말을 하는 셈이 된다. 예고도 실제 피해도
// 전부 이 함수를 통과하므로 어긋날 수가 없다.
//
// 능력 랭크는 원작 공식을 그대로 쓴다:
//   +n → (2+n)/2   ( +1 = 1.5배,  +2 = 2배,  +6 = 4배 )
//   −n → 2/(2+n)   ( −1 = 0.67배, −2 = 0.5배, −6 = 0.25배 )
// 공격 랭크는 곱하고, 방어 랭크는 나눈다.
// ─────────────────────────────────────────────────────────────
import { offenseMultiplier, defenseMultiplier, stabBonus } from '../data/types.js';

export const RANK_MIN = -6;
export const RANK_MAX = 6;

/** 원작 랭크 배율 */
export const rankMul = (n) => {
  const r = Math.max(RANK_MIN, Math.min(RANK_MAX, n | 0));
  return r >= 0 ? (2 + r) / 2 : 2 / (2 - r);
};

export const clampRank = (n) => Math.max(RANK_MIN, Math.min(RANK_MAX, n));

/** 화상을 입은 쪽은 힘이 빠진다 — 원작에서 화상이 물리 공격력을 깎는 것과 같은 취지 */
export const BURN_ATK_PENALTY = 0.75;
/** 마비된 적은 굼뜨다 */
export const PARA_ATK_PENALTY = 0.75;

/**
 * 플레이어 카드 → 적에게 줄 피해.
 *
 * 방어도 차감 전 값이다. 반올림을 마지막에 한 번만 하므로
 * 상성 0.5배가 여러 번 곱해져도 1 미만으로 사라지지 않는다(최소 1).
 */
export function playerDamage({
  power,            // 카드 위력
  moveType,         // 카드 타입 (null = 무속성)
  attackerTypes,    // 선두 포켓몬 타입 → 자속보정
  defenderTypes,    // 적 타입
  atkRank = 0,
  defRank = 0,      // 적 방어 랭크
  powerAdd = 0,     // 도구·날씨가 더하는 위력
  damageMul = 1,    // 도구가 곱하는 배수
  nextMult = 1,     // 도우미
  burned = false,   // 선두가 화상이면 약해진다
  resistFloor = (m) => m,   // 만능조약돌
}) {
  if (!power) return { dmg: 0, mult: 1 };

  const base = power + powerAdd;
  const stab = stabBonus(moveType, attackerTypes);
  const typeMul = moveType ? resistFloor(offenseMultiplier(moveType, defenderTypes)) : 1;

  let d = base * stab * typeMul * rankMul(atkRank) * nextMult * damageMul;
  d /= rankMul(defRank);
  if (burned) d *= BURN_ATK_PENALTY;

  return { dmg: Math.max(1, Math.floor(d)), mult: typeMul, stab };
}

/**
 * 적 기술 → 선두 포켓몬이 받을 피해.
 *
 * 여기서만 상성 무효가 진짜 0 이다. 지진 예고를 보고 비행 타입으로
 * 바꿔 통째로 흘리는 장면을 위해 남겨 둔 규칙이다.
 */
export function enemyDamage({
  power,
  moveType,
  attackerTypes,      // 적 타입 → 자속보정
  defenderTypes,      // 선두 포켓몬 타입
  atkRank = 0,
  defRank = 0,        // 플레이어 방어 랭크
  burned = false,     // 적이 화상이면 약해진다
  paralyzed = false,  // 적이 마비면 굼뜨다
  powerMul = 1,       // 막 배율 (acts.js)
}) {
  if (!power) return { dmg: 0, mult: 1 };
  power *= powerMul;

  const stab = stabBonus(moveType, attackerTypes);
  const typeMul = moveType ? defenseMultiplier(moveType, defenderTypes) : 1;
  if (typeMul === 0) return { dmg: 0, mult: 0, stab };   // 무효 — 진짜 0

  let d = power * stab * typeMul * rankMul(atkRank);
  d /= rankMul(defRank);
  if (burned) d *= BURN_ATK_PENALTY;
  if (paralyzed) d *= PARA_ATK_PENALTY;

  return { dmg: Math.max(1, Math.floor(d)), mult: typeMul, stab };
}
