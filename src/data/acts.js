// ─────────────────────────────────────────────────────────────
// acts.js — 막(act) 구성과 난이도 곡선
//
// 막마다 "어떤 적이 나오는가"와 "얼마나 센가"를 한곳에 모았다.
// 적 정의(enemies.js)는 1막 기준 수치로 적고, 여기 배율을 곱해 2·3막에서
// 재활용한다. 같은 종을 다시 만나되 확실히 강해져 있는 건 원작에서도
// 자연스럽고, 종을 60개 새로 그리는 것보다 훨씬 튼튼하다.
//
// ── 난이도 원칙 ──
// "한두 번 실패해도 결국 깰 수 있어야 한다"가 목표다. 그래서
//   · 적 수치는 막마다 확실히 오르되(HP·피해 각각 배율),
//   · 플레이어도 같이 자란다 — 막을 넘길 때 최대 HP가 오르고 완전 회복,
//     보스 도구를 하나씩 받고, 카드 보상 등급도 올라간다.
// 한쪽만 올리면 벽이 되고, 양쪽 다 안 올리면 3막이 1막처럼 심심해진다.
//
// ── 왜 막 안에서도 올라가는가(ramp) ──
// 막마다 배율 하나만 두고 재 봤더니, 어떤 값을 넣어도 한쪽이 망가졌다.
// 1막 첫 층의 플레이어는 포켓몬 한 마리에 카드 10장이라 조금만 세게 해도
// 그냥 죽고, 같은 막 마지막 층의 플레이어는 카드가 스무 장이라 뭘 만나도
// 한 턴에 쓸어버린다. 실제로 배율을 1.25로만 올려도 1막 보스에서 6번
// 죽으면서 2·3막은 여전히 심심했다.
//
// 그래서 난이도를 **막 안의 진행도**에 얹었다. 층이 오를수록 같은 종이라도
// 더 크고 더 아프게 나온다. 덱이 자라는 속도를 적이 따라가는 셈이다.
//   실효 배율 = hpMul * (1 + hpRamp * 진행도)      진행도 = 밟은 층 / 총 층
// ─────────────────────────────────────────────────────────────

export const ACTS = [
  {
    n: 1,
    name: '상록의 숲',
    blurb: '풀숲에서 부스럭거리는 것들.',
    floors: 15,
    hpMul: 1.00, hpRamp: 0.85,
    dmgMul: 0.90, dmgRamp: 0.55,
    // 이 막에서 야생으로 만나 잡을 수 있는 종
    catchable: ['pikachu', 'rattata', 'pidgey', 'sandshrew', 'zubat', 'caterpie', 'vulpix'],
    weak:   [['rattata'], ['pidgey'], ['caterpie', 'weedle'], ['rattata', 'rattata']],
    normal: [
      ['zubat', 'zubat'], ['ekans'], ['sandshrew', 'rattata'], ['geodude'],
      ['oddish', 'caterpie'], ['mankey', 'pidgey'], ['weedle', 'caterpie'],
      ['ekans', 'zubat'], ['geodude', 'oddish'], ['mankey'],
    ],
    elite: [['onix'], ['arbok'], ['primeape']],
    boss: ['beedrill'],
  },
  {
    n: 2,
    name: '달의 신전',
    blurb: '월장석이 박힌 동굴. 빛이 닿지 않는 곳에서 무언가 웃는다.',
    floors: 16,
    hpMul: 1.00, hpRamp: 0.55,
    dmgMul: 0.95, dmgRamp: 0.38,
    catchable: ['geodude', 'machop', 'abra', 'gastly', 'poliwag', 'magnemite'],
    weak:   [['diglett', 'diglett'], ['paras'], ['zubat', 'zubat']],
    normal: [
      ['golbat'], ['diglett', 'diglett', 'diglett'], ['paras', 'paras'],
      ['machop', 'geodude'], ['gastlyE', 'zubat'], ['nidorino'],
      ['golbat', 'paras'], ['machop', 'machop'], ['gastlyE', 'gastlyE'],
      ['nidorino', 'diglett'],
    ],
    elite: [['golduck'], ['marowak'], ['machoke']],
    boss: ['gengar'],
  },
  {
    n: 3,
    name: '첨탑',
    blurb: '끝까지 오른 자만 만나는 것들이 기다린다.',
    floors: 17,
    hpMul: 1.30, hpRamp: 0.60,
    dmgMul: 1.20, dmgRamp: 0.46,
    // 3막 전용 5종 — 여기까지 온 값이다
    catchable: ['scyther', 'pinsir', 'electabuzz', 'magmar', 'jynx'],
    weak:   [['electabuzz'], ['magmar'], ['jynx']],
    normal: [
      ['scyther'], ['pinsir'], ['electabuzz', 'magmar'], ['victreebel'],
      ['tentacruel'], ['scyther', 'jynx'], ['victreebel', 'tentacruel'],
      ['pinsir', 'electabuzz'], ['magmar', 'jynx'], ['golbat', 'scyther'],
    ],
    elite: [['gyarados'], ['charizard'], ['blastoise']],
    boss: ['mewtwo'],
  },
];

export const ACT_COUNT = ACTS.length;
export const actOf = (n) => ACTS[Math.min(ACTS.length, Math.max(1, n)) - 1];

/**
 * 막을 넘길 때 플레이어가 받는 것.
 * 적만 세지면 벽이 되므로 여기서 같이 올려 준다.
 */
export const ACT_CLEAR_REWARD = {
  maxHpUp: 12,      // 파티 전원 최대 HP
  fullHeal: true,   // 그리고 완전 회복
  gold: 120,
};
