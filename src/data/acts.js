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
    hpMul: 0.77, hpRamp: 0.56,
    dmgMul: 0.69, dmgRamp: 0.36,
    // 이 막에서 야생으로 만나 잡을 수 있는 종
    catchable: ['pikachu', 'rattata', 'pidgey', 'sandshrew', 'zubat', 'caterpie', 'vulpix'],
    weak:   [['rattata'], ['pidgey'], ['caterpie', 'weedle'], ['rattata', 'rattata']],
    normal: [
      ['zubat', 'zubat'], ['ekans'], ['sandshrew', 'rattata'], ['geodude'],
      ['oddish', 'caterpie'], ['mankey', 'pidgey'], ['weedle', 'caterpie'],
      ['ekans', 'zubat'], ['geodude', 'oddish'], ['mankey'],
    ],
    // ★ 엘리트는 혼자 안 나온다. 혼자 나오면 디버프를 겹겹이 발라 바보로
    //   만들 수 있었다(대상이 하나뿐이므로). 부하가 있으면 광역기와 대상
    //   선택이 생기고, 엘리트 저항(combat.js inflict)과 함께 잠금이 풀린다.
    // 1막 부하는 제일 약한 축으로 — 덱 10장 시절에 만나는 엘리트다
    elite: [['onix', 'rattata'], ['arbok', 'weedle'], ['primeape', 'rattata']],
    boss: ['beedrill'],
  },
  {
    n: 2,
    name: '달의 신전',
    blurb: '월장석이 박힌 동굴. 빛이 닿지 않는 곳에서 무언가 웃는다.',
    floors: 16,
    hpMul: 0.89, hpRamp: 0.44,
    dmgMul: 0.81, dmgRamp: 0.31,
    catchable: ['geodude', 'machop', 'abra', 'gastly', 'poliwag', 'magnemite'],
    weak:   [['diglett', 'diglett'], ['paras'], ['zubat', 'zubat']],
    normal: [
      ['golbat'], ['diglett', 'diglett', 'diglett'], ['paras', 'paras'],
      ['machop', 'geodude'], ['gastlyE', 'zubat'], ['nidorino'],
      ['golbat', 'paras'], ['machop', 'machop'], ['gastlyE', 'gastlyE'],
      ['nidorino', 'diglett'],
    ],
    elite: [['golduck', 'golbat'], ['marowak', 'diglett'], ['machoke', 'machop']],
    boss: ['gengar'],
  },
  {
    n: 3,
    name: '첨탑',
    blurb: '끝까지 오른 자만 만나는 것들이 기다린다.',
    floors: 17,
    hpMul: 1.18, hpRamp: 0.50,
    dmgMul: 1.02, dmgRamp: 0.38,
    // 3막 전용 5종 — 여기까지 온 값이다
    catchable: ['scyther', 'pinsir', 'electabuzz', 'magmar', 'jynx'],
    weak:   [['electabuzz'], ['magmar'], ['jynx']],
    normal: [
      ['scyther'], ['pinsir'], ['electabuzz', 'magmar'], ['victreebel'],
      ['tentacruel'], ['scyther', 'jynx'], ['victreebel', 'tentacruel'],
      ['pinsir', 'electabuzz'], ['magmar', 'jynx'], ['golbat', 'scyther'],
    ],
    elite: [['gyarados', 'tentacruel'], ['charizard', 'magmar'], ['blastoise', 'victreebel']],
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

/**
 * 인원수 배율 — 2·3인 협동에서 적을 얼마나 키울까.
 *
 * 사람이 하나 늘면 덱도 에너지도 손패도 통째로 하나 더 붙는다. 그래서 딜은
 * 거의 인원수에 비례해 늘어나는데, 맞는 쪽은 **한 번에 한 명**뿐이라 실효
 * 체력은 그만큼 안 는다(뒤에 있는 사람은 안 맞는다). 그래서 HP 는 인원수보다
 * 조금 더, 피해는 그보다 덜 올린다.
 *
 * 피해까지 인원수만큼 올리면 앞사람이 한 라운드에 녹아 버려서, 협동이 아니라
 * "누가 죽을 차례인가"가 된다. 반대로 안 올리면 뒤에서 방어도를 얹어 주는
 * 것만으로 앞사람이 절대 안 죽는다 — 실제로 3인 시뮬이 그렇게 나왔다.
 */
export const PLAYER_SCALE = {
  1: { hp: 1,    dmg: 1    },
  2: { hp: 2.35, dmg: 1.64 },
  3: { hp: 3.75, dmg: 2.15 },
};
// tools/balance.js 로 재서 맞췄다:
//   1인 봇 승률 0.99% (504판 5승) — "봇 500판에 3~4승" 요청에 맞춘 극악.
// 주의: 이 배율은 언뜻 예전(봇 10%)보다 **낮아 보인다**. 난이도의 무게가
// 배율에서 규칙으로 옮겨 갔기 때문이다 — 쓰러진 포켓몬이 전투 후 안
// 일어나고, 상성 최대치가 2배로 눌리고(내 4배 딜도 사라짐), 엘리트가
// 부하를 데리고 나오며 상태이상을 반만 받는다. 배율만 보고 되돌리지 말 것.
// 사람 수가 늘수록 조금씩 더 어렵되, 죽는 자리가 아홉 종류 방에 고르게
// 흩어지도록 맞췄다 — 한 군데가 벽이면 "어렵다"가 아니라 "막혔다"가 된다.
//
// 처음엔 HP 3.35 · 피해 1.95 로 뒀다가 3인 승률이 53% 로 **혼자보다 쉽게**
// 나왔다. 셋이 방어 카드를 한 사람에게 겹쳐 쌓을 수 있어서다(방어도는
// 앞자리에 붙는다). 반대로 피해를 3.1 까지 올렸더니 1막에서만 절반이
// 죽었다 — 1막 첫 층은 어차피 각자 카드 열 장짜리 덱이라 인원수가
// 늘어도 별로 안 세지기 때문이다. 그래서 HP 를 크게, 피해는 덜 올렸다.
export const scaleFor = (n) => PLAYER_SCALE[Math.min(3, Math.max(1, n | 0))] || PLAYER_SCALE[1];

/**
 * 방 종류 배율 — 막 배율 **위에** 곱한다.
 *
 * ★ 왜 필요했나: 엘리트를 HP 로만 키웠더니 "긴 일반 전투"가 됐다.
 *   1막 기준 일반 HP53·턴당17 대 엘리트 HP113·턴당23 — 몸은 두 배인데
 *   때리는 힘이 거의 같으니, 방어 카드를 쥔 쪽에서는 오래 걸릴 뿐 위험하지
 *   않았다. 슬더스의 엘리트가 무서운 건 체력이 아니라 **한 턴에 훅 들어오는
 *   것**이기 때문이다. 그래서 엘리트는 HP 보다 피해를 크게 올린다.
 *
 * ★ 그리고 보스가 엘리트보다 약했다(1막 보스 HP93·턴당18 < 엘리트 113·23).
 *   엘리트에 부하를 붙이면서 보스는 그대로 뒀기 때문이다. 막의 마지막이
 *   그 앞 방보다 쉬우면 곡선이 거꾸로 선다.
 */
export const ROOM_SCALE = {
  MONSTER: { hp: 1,    dmg: 1    },
  ELITE:   { hp: 1.06, dmg: 1.14 },
  BOSS:    { hp: 1.35, dmg: 1.24 },
};
// 방 배율을 새로 얹은 만큼 위의 막 배율은 같이 내렸다 — 둘을 곱한 값이
// 최종 난이도다. 막 배율만 보고 "약해졌네" 하고 되돌리면 안 된다.
export const roomScale = (kind) => ROOM_SCALE[kind] || ROOM_SCALE.MONSTER;
