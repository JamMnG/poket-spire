// ─────────────────────────────────────────────────────────────
// cards.js — 기술 카드
//
// 카드 정의는 "값(v) + 값으로부터 효과·설명을 만드는 함수" 로 되어 있다.
// 강화(vUp)는 바뀌는 값만 덮어쓰면 되고, 설명문은 늘 실제 값에서 나오므로
// 숫자를 고칠 때 설명이 따로 놀 수가 없다. 이 게임에서 제일 자주 만질
// 파일이라 그 안전장치가 값을 한다.
//
// v 안에 cost 도 넣는다 — 강화로 코스트가 내려가는 카드가 있기 때문이다.
//
// ── 효과 op 목록 (해석은 combat/effects.js) ──
//   damage      위력만큼 피해. 상성·자속·랭크·유물 보정을 전부 탄다
//   fixed       고정 피해. 보정을 하나도 타지 않는다 (나이트헤드)
//   damageAll   적 전체
//   block       선두에게 방어도
//   status      상태이상 부여 (BURN/POISON/PARA/FREEZE)
//   rank        능력 랭크 증감 (ATK/DEF, 원작 방식 −6~+6)
//   draw/energy/heal
//   drain       직전 damage 가 실제로 준 피해의 일부를 회복
//   recoil      자신에게 반동 피해 (방어도 무시)
//   switchOut   즉시 교체 (keepRanks 면 랭크를 들고 간다 = 바톤터치)
//   power       전투 내내 남는 지속 효과 등록 (날씨·모래바람·아쿠아링)
//   nextMult    이번 턴 다음 공격 카드의 위력 배수 (도우미)
// ─────────────────────────────────────────────────────────────

/** 카드 종류 — 색과 정렬에 쓴다 */
export const KIND = { ATTACK: '공격', SKILL: '변화', POWER: '지속' };

const A = 'ATTACK', S = 'SKILL', P = 'POWER';
const C = 'COMMON', U = 'UNCOMMON', R = 'RARE', B = 'BASIC';

/**
 * 카드 표.
 *  type   : null 이면 무속성 — 상성·자속을 타지 않는다 (방어·칼춤 같은 것)
 *  target : ENEMY(단일) / ALL(전체) / SELF(대상 없음)
 *  v/vUp  : 기본값 / 강화 시 덮어쓸 값
 */
export const CARDS = {
  // ══ 시작 덱 ═══════════════════════════════════════════════
  tackle: {
    ko: '몸통박치기', type: 'NORMAL', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 6 }, vUp: { dmg: 9 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  defend: {
    ko: '방어', type: null, kind: S, rarity: B, target: 'SELF',
    v: { cost: 1, blk: 5 }, vUp: { blk: 8 },
    build: (v) => [{ op: 'block', amount: v.blk }],
    text: (v) => `방어도 ${v.blk}.`,
  },

  // ── 스타터 시그니처 ───────────────────────────────────────
  ember: {
    ko: '불꽃세례', type: 'FIRE', kind: A, rarity: B, target: 'ENEMY',
    // ★ 화상·독 피해는 타입표를 타지 않는다(status.js). 파이리와 이상해씨가
    //   약한 이유는 자속 배율이 낮아서인데(3막 평균 1.13 · 0.83 대 꼬부기
    //   1.46), 그 손해를 타입과 무관한 상태이상 쪽으로 되돌려 준다.
    v: { cost: 1, dmg: 6, burn: 4 }, vUp: { dmg: 9, burn: 5 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'BURN', amount: v.burn }],
    text: (v) => `${v.dmg}의 피해. 화상 ${v.burn}.`,
  },
  withdraw: {
    ko: '껍질에숨기', type: null, kind: S, rarity: B, target: 'SELF',
    // ★ 강화 전에는 방어 랭크를 주지 않는다. 방어 랭크는 전투 내내 남고
    //   겹치면 받는 피해가 2/(2+n) 로 줄어드는데, 1코 기본 카드가 방어도
    //   여덟에 그걸 같이 주니 두 장만 써도 피해가 절반이 됐다. 90판에서
    //   꼬부기만 13승, 나머지 스타터는 2승씩이었다. 랭크는 강화 보상으로.
    v: { cost: 1, blk: 8, def: 0 }, vUp: { blk: 11, def: 1 },
    build: (v) => [
      { op: 'block', amount: v.blk },
      ...(v.def ? [{ op: 'rank', stat: 'DEF', delta: v.def, to: 'self' }] : []),
    ],
    text: (v) => (v.def ? `방어도 ${v.blk}. 방어 랭크 +${v.def}.` : `방어도 ${v.blk}.`),
  },
  leechseed: {
    ko: '씨뿌리기', type: 'GRASS', kind: A, rarity: B, target: 'ENEMY',
    // 독 5 는 5+4+3+2+1 = 15 를 타입과 무관하게 뽑는다. 풀·독은 이 게임
    //   적 구성 상대로 자속 배율이 제일 나쁘므로, 이상해씨의 딜은 여기서 온다
    v: { cost: 1, dmg: 4, psn: 4 }, vUp: { dmg: 6, psn: 6 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'POISON', amount: v.psn }],
    text: (v) => `${v.dmg}의 피해. 독 ${v.psn}.`,
  },

  // ── 스타터 두 번째 카드 ───────────────────────────────────
  // ★ 처음엔 스타터마다 시그니처를 한 장만 줬다. 그랬더니 셋 다 몸통박치기 5 +
  //   방어 4 + 한 장이라 사실상 같은 덱으로 시작했고, 소개 문구가 약속한
  //   플레이(화상 축적 / 방어 랭크 / 독과 지속)가 첫 판에 하나도 안 나왔다.
  //   그래서 각자 **엮이는 두 장**을 준다 — 한 장이 깔고 한 장이 거둔다.
  kindle: {
    ko: '불쏘시개', type: 'FIRE', kind: A, rarity: B, target: 'ENEMY',
    // 계수 3으로 뒀더니 화상 6에서 63이 나왔다 — 2코 화염방사보다 센 1코
    // 기본 카드였다. 화상 4쯤에서 12, 즉 좋은 커먼 정도로 내렸다.
    v: { cost: 1, base: 5, mult: 2, burn: 2 }, vUp: { base: 7, mult: 3, burn: 2 },
    build: (v) => [
      { op: 'damageScaled', base: v.base, per: 'BURN', mult: v.mult },
      { op: 'status', status: 'BURN', amount: v.burn },
    ],
    text: (v) => `${v.base}의 피해. 상대의 화상 1당 ${v.mult}씩 늘어난다. 화상 ${v.burn}.`,
  },
  shellstrike: {
    ko: '껍질치기', type: 'WATER', kind: A, rarity: B, target: 'ENEMY',
    // ★ 이 카드 하나가 꼬부기를 두 번 흔들었다.
    //   처음엔 방어도의 '절반'만 얹었다. 그랬더니 방어를 쌓을 이유가 없어서
    //   소개 문구("쌓아 둔 방어도가 그대로 공격이 된다")가 거짓말이 됐다 —
    //   방어를 더 쌓는 봇이 오히려 승률이 반 토막 났다. 그래서 전부로 바꿨다.
    //   그런데 그 측정은 **방어도가 적 턴 전에 지워지던 버그** 위에서 한
    //   것이었다. 버그를 고치자 방어도가 막기도 하고 딜도 되는 이중 이득이
    //   되어, 90판에서 꼬부기 18승 · 파이리 3승 · 이상해씨 4승이 나왔다.
    //   그래서 값을 붙였다 — 방어도 전부를 얹되, 절반을 내놓는다.
    v: { cost: 1, base: 4, mult: 1 }, vUp: { base: 7, mult: 1 },
    build: (v) => [
      { op: 'damageScaled', base: v.base, per: 'BLOCK', mult: v.mult },
      { op: 'loseBlockRatio', ratio: 0.5 },
    ],
    text: (v) => `${v.base}의 피해. 지금 방어도만큼 더 준다. 그리고 방어도의 절반을 잃는다.`,
  },
  absorb: {
    ko: '흡수', type: 'GRASS', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 8, ratio: 1 }, vUp: { dmg: 11, ratio: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'drain', ratio: v.ratio }],
    text: (v) => `${v.dmg}의 피해. 준 피해만큼 HP를 회복한다.`,
  },

  // ══ 포켓몬 합류 카드 ══════════════════════════════════════
  // 소유 포켓몬이 기절하면 쓸 수 없다. 그래서 선두를 지키는 이유가 된다.
  scratch: {
    ko: '할퀴기', type: 'NORMAL', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 7 }, vUp: { dmg: 10 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  watergun: {
    ko: '물대포', type: 'WATER', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 9 }, vUp: { dmg: 12 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  vinewhip: {
    ko: '덩굴채찍', type: 'GRASS', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 8 }, vUp: { dmg: 11 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  thundershock: {
    ko: '전기쇼크', type: 'ELECTRIC', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 7, par: 1 }, vUp: { dmg: 10, par: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'PARA', amount: v.par }],
    text: (v) => `${v.dmg}의 피해. 마비 ${v.par}.`,
  },
  quickattack: {
    ko: '전광석화', type: 'NORMAL', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 0, dmg: 4 }, vUp: { dmg: 6 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  bite: {
    ko: '깨물기', type: 'DARK', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 8, def: -1 }, vUp: { dmg: 11, def: -1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'DEF', delta: v.def, to: 'enemy' }],
    text: (v) => `${v.dmg}의 피해. 상대 방어 랭크 ${v.def}.`,
  },
  gust: {
    ko: '바람일으키기', type: 'FLYING', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 8 }, vUp: { dmg: 11 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  sandattack: {
    ko: '모래뿌리기', type: 'GROUND', kind: S, rarity: B, target: 'ENEMY',
    v: { cost: 0, atk: -1 }, vUp: { atk: -2 },
    build: (v) => [{ op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }],
    text: (v) => `상대 공격 랭크 ${v.atk}.`,
  },
  dig: {
    ko: '구멍파기', type: 'GROUND', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 11 }, vUp: { dmg: 15 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  defensecurl: {
    ko: '웅크리기', type: null, kind: S, rarity: B, target: 'SELF',
    // 0코 영구 방어 랭크는 공짜 효과라 랭크는 강화 뒤에만 준다 (껍질에숨기와 같은 규칙)
    v: { cost: 0, blk: 3, def: 0 }, vUp: { blk: 5, def: 1 },
    build: (v) => [
      { op: 'block', amount: v.blk },
      ...(v.def ? [{ op: 'rank', stat: 'DEF', delta: v.def, to: 'self' }] : []),
    ],
    text: (v) => (v.def ? `방어도 ${v.blk}. 방어 랭크 +${v.def}.` : `방어도 ${v.blk}.`),
  },
  poisonfang: {
    ko: '독니', type: 'POISON', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 7, psn: 3 }, vUp: { dmg: 9, psn: 4 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'POISON', amount: v.psn }],
    text: (v) => `${v.dmg}의 피해. 독 ${v.psn}.`,
  },
  supersonic: {
    ko: '초음파', type: null, kind: S, rarity: B, target: 'ENEMY',
    v: { cost: 1, atk: -1, par: 1 }, vUp: { atk: -2, par: 1 },
    build: (v) => [{ op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }, { op: 'status', status: 'PARA', amount: v.par }],
    text: (v) => `상대 공격 랭크 ${v.atk}. 마비 ${v.par}.`,
  },
  willowisp: {
    ko: '도깨비불', type: 'FIRE', kind: S, rarity: B, target: 'ENEMY',
    v: { cost: 1, burn: 4, atk: -1 }, vUp: { burn: 6, atk: -1 },
    build: (v) => [{ op: 'status', status: 'BURN', amount: v.burn }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }],
    text: (v) => `화상 ${v.burn}. 상대 공격 랭크 ${v.atk}.`,
  },
  bubblebeam: {
    ko: '거품광선', type: 'WATER', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 2, dmg: 13, atk: -1 }, vUp: { dmg: 17, atk: -1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }],
    text: (v) => `${v.dmg}의 피해. 상대 공격 랭크 ${v.atk}.`,
  },
  rockthrow: {
    ko: '돌떨어뜨리기', type: 'ROCK', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 9 }, vUp: { dmg: 12 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  harden: {
    ko: '단단해지기', type: null, kind: S, rarity: B, target: 'SELF',
    v: { cost: 1, blk: 4, def: 1 }, vUp: { blk: 6, def: 2 },
    build: (v) => [{ op: 'block', amount: v.blk }, { op: 'rank', stat: 'DEF', delta: v.def, to: 'self' }],
    text: (v) => `방어도 ${v.blk}. 방어 랭크 +${v.def}.`,
  },
  confusion: {
    ko: '염동력', type: 'PSYCHIC', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 10 }, vUp: { dmg: 13 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  teleport: {
    ko: '텔레포트', type: null, kind: S, rarity: B, target: 'SELF',
    v: { cost: 0, draw: 1 }, vUp: { draw: 2 },
    build: (v) => [{ op: 'switchOut', keepRanks: false, free: true }, { op: 'draw', amount: v.draw }],
    text: (v) => `에너지 없이 교체한다. 카드를 ${v.draw}장 뽑는다.`,
  },
  nightshade: {
    ko: '나이트헤드', type: 'GHOST', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 12 }, vUp: { dmg: 16 },
    build: (v) => [{ op: 'fixed', amount: v.dmg }],
    text: (v) => `상성과 랭크를 무시하고 ${v.dmg}의 피해를 준다.`,
  },
  lick: {
    ko: '핥기', type: 'GHOST', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 6, par: 1 }, vUp: { dmg: 9, par: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'PARA', amount: v.par }],
    text: (v) => `${v.dmg}의 피해. 마비 ${v.par}.`,
  },
  stringshot: {
    ko: '실뿜기', type: 'BUG', kind: S, rarity: B, target: 'ENEMY',
    v: { cost: 0, atk: -1, par: 1 }, vUp: { atk: -1, par: 2 },
    build: (v) => [{ op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }, { op: 'status', status: 'PARA', amount: v.par }],
    text: (v) => `상대 공격 랭크 ${v.atk}. 마비 ${v.par}.`,
  },
  bugbite: {
    ko: '벌레먹음', type: 'BUG', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 8, heal: 4 }, vUp: { dmg: 11, heal: 5 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'heal', amount: v.heal }],
    text: (v) => `${v.dmg}의 피해. HP를 ${v.heal} 회복한다.`,
  },
  lowkick: {
    ko: '안다리걸기', type: 'FIGHT', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 9 }, vUp: { dmg: 12 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  bulkup: {
    ko: '벌크업', type: null, kind: S, rarity: B, target: 'SELF',
    v: { cost: 1, atk: 1, def: 1 }, vUp: { atk: 2, def: 1 },
    build: (v) => [{ op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' }, { op: 'rank', stat: 'DEF', delta: v.def, to: 'self' }],
    text: (v) => `공격 랭크 +${v.atk}. 방어 랭크 +${v.def}.`,
  },
  metalclaw: {
    ko: '메탈클로', type: 'STEEL', kind: A, rarity: B, target: 'ENEMY',
    v: { cost: 1, dmg: 8, atk: 1 }, vUp: { dmg: 11, atk: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' }],
    text: (v) => `${v.dmg}의 피해. 공격 랭크 +${v.atk}.`,
  },

  // ══ 보상·상점 풀 ══════════════════════════════════════════
  // ── 불꽃 ─────────────────────────────────────────────────
  flamewheel: {
    ko: '화염자동차', type: 'FIRE', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 11, rec: 3 }, vUp: { dmg: 15, rec: 3 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'recoil', amount: v.rec }],
    text: (v) => `${v.dmg}의 피해. 반동으로 ${v.rec}의 피해를 입는다.`,
  },
  flamethrower: {
    ko: '화염방사', type: 'FIRE', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 15, burn: 2 }, vUp: { dmg: 20, burn: 3 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'BURN', amount: v.burn }],
    text: (v) => `${v.dmg}의 피해. 화상 ${v.burn}.`,
  },
  nitrocharge: {
    ko: '니트로차지', type: 'FIRE', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 1, dmg: 7, atk: 1 }, vUp: { dmg: 10, atk: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' }],
    text: (v) => `${v.dmg}의 피해. 공격 랭크 +${v.atk}.`,
  },
  heatwave: {
    ko: '열풍', type: 'FIRE', kind: A, rarity: U, target: 'ALL',
    v: { cost: 2, dmg: 13, burn: 1 }, vUp: { dmg: 17, burn: 2 },
    build: (v) => [{ op: 'damageAll', power: v.dmg }, { op: 'statusAll', status: 'BURN', amount: v.burn }],
    text: (v) => `모든 적에게 ${v.dmg}의 피해. 화상 ${v.burn}.`,
  },
  fireblast: {
    ko: '불대문자', type: 'FIRE', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 2, dmg: 20, burn: 3 }, vUp: { dmg: 26, burn: 4 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'BURN', amount: v.burn }],
    text: (v) => `${v.dmg}의 피해. 화상 ${v.burn}.`,
  },
  sunnyday: {
    ko: '쾌청', type: 'FIRE', kind: P, rarity: R, target: 'SELF',
    v: { cost: 1, add: 4 }, vUp: { add: 6 },
    build: (v) => [{ op: 'power', id: 'SUN', amount: v.add }],
    text: (v) => `이 전투 동안 불꽃 기술의 위력이 ${v.add} 오른다. 겹쳐 쓰면 그만큼 더 쌓인다.`,
  },

  // ── 물 ───────────────────────────────────────────────────
  whirlpool: {
    ko: '소용돌이', type: 'WATER', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 7, blk: 4 }, vUp: { dmg: 10, blk: 6 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'block', amount: v.blk }],
    text: (v) => `${v.dmg}의 피해. 방어도 ${v.blk}.`,
  },
  surf: {
    ko: '파도타기', type: 'WATER', kind: A, rarity: U, target: 'ALL',
    v: { cost: 2, dmg: 14 }, vUp: { dmg: 18 },
    build: (v) => [{ op: 'damageAll', power: v.dmg }],
    text: (v) => `모든 적에게 ${v.dmg}의 피해를 준다.`,
  },
  aquaring: {
    ko: '아쿠아링', type: 'WATER', kind: P, rarity: U, target: 'SELF',
    v: { cost: 1, heal: 4 }, vUp: { heal: 6 },
    build: (v) => [{ op: 'power', id: 'AQUA_RING', amount: v.heal }],
    text: (v) => `이 전투 동안, 라운드가 끝날 때마다 HP를 ${v.heal} 회복한다. 겹쳐 쌓인다.`,
  },
  raindance: {
    ko: '비바라기', type: 'WATER', kind: P, rarity: R, target: 'SELF',
    v: { cost: 1, add: 4 }, vUp: { add: 6 },
    build: (v) => [{ op: 'power', id: 'RAIN', amount: v.add }],
    text: (v) => `이 전투 동안 물 기술의 위력이 ${v.add} 오른다. 겹쳐 쓰면 그만큼 더 쌓인다.`,
  },
  hydropump: {
    ko: '하이드로펌프', type: 'WATER', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 3, dmg: 30 }, vUp: { dmg: 38 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },

  // ── 풀 ───────────────────────────────────────────────────
  razorleaf: {
    ko: '잎날가르기', type: 'GRASS', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 10 }, vUp: { dmg: 14 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  bulletseed: {
    ko: '씨앗기관총', type: 'GRASS', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 4, hits: 3 }, vUp: { dmg: 4, hits: 4 },
    build: (v) => [{ op: 'damage', power: v.dmg, hits: v.hits }],
    text: (v) => `${v.dmg}의 피해를 ${v.hits}회 준다.`,
  },
  gigadrain: {
    ko: '기가드레인', type: 'GRASS', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 13, ratio: 0.5 }, vUp: { dmg: 17, ratio: 0.5 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'drain', ratio: v.ratio }],
    text: (v) => `${v.dmg}의 피해. 준 피해의 절반만큼 HP를 회복한다.`,
  },
  synthesis: {
    ko: '광합성', type: 'GRASS', kind: S, rarity: U, target: 'SELF', exhaust: true,
    v: { cost: 1, heal: 14 }, vUp: { heal: 20 },
    build: (v) => [{ op: 'heal', amount: v.heal }],
    text: (v) => `HP를 ${v.heal} 회복한다. 소멸.`,
  },
  leafstorm: {
    ko: '리프스톰', type: 'GRASS', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 2, dmg: 24, atk: -2 }, vUp: { dmg: 31, atk: -2 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' }],
    text: (v) => `${v.dmg}의 피해. 자신의 공격 랭크 ${v.atk}.`,
  },

  // ── 전기 ─────────────────────────────────────────────────
  thunderwave: {
    ko: '전기자석파', type: 'ELECTRIC', kind: S, rarity: U, target: 'ENEMY',
    v: { cost: 0, par: 2 }, vUp: { par: 3 },
    build: (v) => [{ op: 'status', status: 'PARA', amount: v.par }],
    text: (v) => `마비 ${v.par}.`,
  },
  thunderbolt: {
    ko: '10만볼트', type: 'ELECTRIC', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 16, par: 1 }, vUp: { dmg: 21, par: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'PARA', amount: v.par }],
    text: (v) => `${v.dmg}의 피해. 마비 ${v.par}.`,
  },
  volttackle: {
    ko: '볼트태클', type: 'ELECTRIC', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 2, dmg: 22, rec: 5 }, vUp: { dmg: 29, rec: 5 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'recoil', amount: v.rec }],
    text: (v) => `${v.dmg}의 피해. 반동으로 ${v.rec}의 피해를 입는다.`,
  },
  thunder: {
    ko: '번개', type: 'ELECTRIC', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 3, dmg: 28, par: 2 }, vUp: { dmg: 36, par: 2 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'PARA', amount: v.par }],
    text: (v) => `${v.dmg}의 피해. 마비 ${v.par}.`,
  },

  // ── 무속성 · 노말 (파티 구성과 무관하게 항상 등장) ────────
  glare: {
    ko: '노려보기', type: null, kind: S, rarity: C, target: 'ENEMY',
    // 랭크는 전투 내내 남는다 — 0코 영구 디버프는 공짜 효과지 카드가 아니다
    v: { cost: 1, atk: -1 }, vUp: { atk: -2 },
    build: (v) => [{ op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }],
    text: (v) => `상대 공격 랭크 ${v.atk}.`,
  },
  protect: {
    ko: '방어막', type: null, kind: S, rarity: C, target: 'SELF', exhaust: true,
    // "그냥 큰 방어"라 방어·껍질에숨기의 상위호환일 뿐이었다.
    // 한 판에 한 번뿐인 비상 버튼으로 — 큰 한 방이 예고된 턴에 아껴 쓴다.
    v: { cost: 1, blk: 14 }, vUp: { blk: 19 },
    build: (v) => [{ op: 'block', amount: v.blk }],
    text: (v) => `방어도 ${v.blk}. 소멸.`,
  },
  helpinghand: {
    ko: '도우미', type: null, kind: S, rarity: U, target: 'SELF',
    v: { cost: 0, mult: 1.5 }, vUp: { mult: 2 },
    build: (v) => [{ op: 'nextMult', mult: v.mult }],
    text: (v) => `이번 턴 다음에 쓰는 공격 카드의 위력이 ${v.mult}배가 된다.`,
  },
  substitute: {
    ko: '대타출동', type: null, kind: S, rarity: U, target: 'SELF',
    v: { cost: 2, blk: 17 }, vUp: { blk: 23 },
    build: (v) => [{ op: 'block', amount: v.blk }],
    text: (v) => `방어도 ${v.blk}.`,
  },
  recover: {
    ko: '자기재생', type: null, kind: S, rarity: U, target: 'SELF', exhaust: true,
    v: { cost: 1, heal: 12 }, vUp: { heal: 18 },
    build: (v) => [{ op: 'heal', amount: v.heal }],
    text: (v) => `HP를 ${v.heal} 회복한다. 소멸.`,
  },
  calmmind: {
    ko: '명상', type: 'PSYCHIC', kind: S, rarity: U, target: 'SELF',
    v: { cost: 1, atk: 1, draw: 1 }, vUp: { atk: 1, draw: 2 },
    build: (v) => [{ op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' }, { op: 'draw', amount: v.draw }],
    text: (v) => `공격 랭크 +${v.atk}. 카드를 ${v.draw}장 뽑는다.`,
  },
  swordsdance: {
    ko: '칼춤', type: null, kind: S, rarity: R, target: 'SELF', exhaust: true,
    v: { cost: 1, atk: 2 }, vUp: { atk: 3 },
    build: (v) => [{ op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' }],
    text: (v) => `공격 랭크 +${v.atk}. 소멸.`,
  },
  irondefense: {
    ko: '철벽', type: 'STEEL', kind: S, rarity: R, target: 'SELF', exhaust: true,
    v: { cost: 1, def: 2 }, vUp: { def: 3 },
    build: (v) => [{ op: 'rank', stat: 'DEF', delta: v.def, to: 'self' }],
    text: (v) => `방어 랭크 +${v.def}. 소멸.`,
  },
  batonpass: {
    ko: '바톤터치', type: null, kind: S, rarity: R, target: 'SELF',
    v: { cost: 0, draw: 1 }, vUp: { draw: 2 },
    build: (v) => [{ op: 'switchOut', keepRanks: true, free: true }, { op: 'draw', amount: v.draw }],
    text: (v) => `능력 랭크를 그대로 넘기며 교체한다. 카드를 ${v.draw}장 뽑는다.`,
  },
  bellydrum: {
    ko: '배북', type: null, kind: S, rarity: R, target: 'SELF', exhaust: true,
    v: { cost: 2, atk: 4 }, vUp: { atk: 5 },
    build: (v) => [{ op: 'loseHpRatio', ratio: 0.5 }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' }],
    text: (v) => `현재 HP의 절반을 잃고 공격 랭크 +${v.atk}. 소멸.`,
  },

  // ── 그 밖의 타입 ─────────────────────────────────────────
  poisonpowder: {
    ko: '독가루', type: 'POISON', kind: S, rarity: C, target: 'ENEMY',
    v: { cost: 1, psn: 4 }, vUp: { psn: 6 },
    build: (v) => [{ op: 'status', status: 'POISON', amount: v.psn }],
    text: (v) => `독 ${v.psn}.`,
  },
  sludgebomb: {
    ko: '오물폭탄', type: 'POISON', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 15, psn: 3 }, vUp: { dmg: 20, psn: 4 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'POISON', amount: v.psn }],
    text: (v) => `${v.dmg}의 피해. 독 ${v.psn}.`,
  },
  toxic: {
    ko: '맹독', type: 'POISON', kind: S, rarity: R, target: 'ENEMY',
    v: { cost: 1, psn: 7 }, vUp: { psn: 10 },
    build: (v) => [{ op: 'status', status: 'POISON', amount: v.psn }],
    text: (v) => `독 ${v.psn}.`,
  },
  fly: {
    ko: '공중날기', type: 'FLYING', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 16, blk: 5 }, vUp: { dmg: 21, blk: 7 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'block', amount: v.blk }],
    text: (v) => `${v.dmg}의 피해. 방어도 ${v.blk}.`,
  },
  bravebird: {
    ko: '브레이브버드', type: 'FLYING', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 2, dmg: 24, rec: 6 }, vUp: { dmg: 31, rec: 6 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'recoil', amount: v.rec }],
    text: (v) => `${v.dmg}의 피해. 반동으로 ${v.rec}의 피해를 입는다.`,
  },
  earthquake: {
    ko: '지진', type: 'GROUND', kind: A, rarity: U, target: 'ALL',
    v: { cost: 2, dmg: 17 }, vUp: { dmg: 22 },
    build: (v) => [{ op: 'damageAll', power: v.dmg }],
    text: (v) => `모든 적에게 ${v.dmg}의 피해를 준다.`,
  },
  psychicmove: {
    ko: '사이코키네시스', type: 'PSYCHIC', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 17, def: -1 }, vUp: { dmg: 22, def: -1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'DEF', delta: v.def, to: 'enemy' }],
    text: (v) => `${v.dmg}의 피해. 상대 방어 랭크 ${v.def}.`,
  },
  shadowball: {
    ko: '섀도볼', type: 'GHOST', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 15, def: -1 }, vUp: { dmg: 20, def: -1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'DEF', delta: v.def, to: 'enemy' }],
    text: (v) => `${v.dmg}의 피해. 상대 방어 랭크 ${v.def}.`,
  },
  crunch: {
    ko: '깨물어부수기', type: 'DARK', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 16, def: -1 }, vUp: { dmg: 21, def: -1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'DEF', delta: v.def, to: 'enemy' }],
    text: (v) => `${v.dmg}의 피해. 상대 방어 랭크 ${v.def}.`,
  },
  focusblast: {
    ko: '기합구슬', type: 'FIGHT', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 18 }, vUp: { dmg: 24 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  closecombat: {
    ko: '인파이트', type: 'FIGHT', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 2, dmg: 25, def: -2 }, vUp: { dmg: 32, def: -2 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'DEF', delta: v.def, to: 'self' }],
    text: (v) => `${v.dmg}의 피해. 자신의 방어 랭크 ${v.def}.`,
  },
  megahorn: {
    ko: '메가혼', type: 'BUG', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 2, dmg: 22 }, vUp: { dmg: 29 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  rockslide: {
    ko: '스톤샤워', type: 'ROCK', kind: A, rarity: U, target: 'ALL',
    v: { cost: 2, dmg: 14 }, vUp: { dmg: 18 },
    build: (v) => [{ op: 'damageAll', power: v.dmg }],
    text: (v) => `모든 적에게 ${v.dmg}의 피해를 준다.`,
  },
  icebeam: {
    ko: '냉동빔', type: 'ICE', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 16, frz: 1 }, vUp: { dmg: 21, frz: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'FREEZE', amount: v.frz }],
    text: (v) => `${v.dmg}의 피해. 상대를 ${v.frz}턴 얼린다.`,
  },
  blizzard: {
    ko: '눈보라', type: 'ICE', kind: A, rarity: R, target: 'ALL',
    v: { cost: 2, dmg: 14, frz: 1 }, vUp: { dmg: 19, frz: 1 },
    build: (v) => [{ op: 'damageAll', power: v.dmg }, { op: 'statusAll', status: 'FREEZE', amount: v.frz }],
    text: (v) => `모든 적에게 ${v.dmg}의 피해. ${v.frz}턴 얼린다.`,
  },
  sandstorm: {
    ko: '모래바람', type: 'ROCK', kind: P, rarity: R, target: 'SELF',
    v: { cost: 2, dmg: 3 }, vUp: { dmg: 5 },
    build: (v) => [{ op: 'power', id: 'SANDSTORM', amount: v.dmg }],
    text: (v) => `이 전투 동안, 라운드가 끝날 때마다 모든 적에게 ${v.dmg}의 피해. 겹쳐 쌓인다.`,
  },

  // ══ 상황에 값이 달라지는 카드 ═══════════════════════════════
  // 고정 수치만 있으면 후반 덱이 "좋은 카드를 더 많이" 로만 굴러간다.
  // 무엇에 비례하는지가 곧 덱의 방향이 되게 하려고 넣은 묶음이다.
  returnmove: {
    ko: '은혜갚기', type: 'NORMAL', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 1, base: 4, mult: 5 }, vUp: { base: 6, mult: 6 },
    build: (v) => [{ op: 'damageScaled', base: v.base, per: 'CARDS', mult: v.mult }],
    text: (v) => `${v.base}의 피해. 이번 턴에 이미 쓴 카드 한 장당 ${v.mult}씩 늘어난다.`,
  },
  venoshock: {
    ko: '벤오샥', type: 'POISON', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 1, base: 6, mult: 2 }, vUp: { base: 9, mult: 2 },
    build: (v) => [{ op: 'damageScaled', base: v.base, per: 'POISON', mult: v.mult }],
    text: (v) => `${v.base}의 피해. 상대의 독 1당 ${v.mult}씩 늘어난다.`,
  },
  eruption: {
    ko: '분화', type: 'FIRE', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 2, base: 12, mult: 3 }, vUp: { base: 16, mult: 4 },
    build: (v) => [{ op: 'damageScaled', base: v.base, per: 'BURN', mult: v.mult }],
    text: (v) => `${v.base}의 피해. 상대의 화상 1당 ${v.mult}씩 늘어난다.`,
  },
  hex: {
    ko: '재앙의불꽃', type: 'GHOST', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 1, base: 7, mult: 6 }, vUp: { base: 10, mult: 7 },
    build: (v) => [{ op: 'damageScaled', base: v.base, per: 'STATUS_KINDS', mult: v.mult }],
    text: (v) => `${v.base}의 피해. 상대가 걸린 상태이상 종류 하나당 ${v.mult}씩 늘어난다.`,
  },
  bodypress: {
    ko: '바디프레스', type: 'FIGHT', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 2, base: 9, mult: 1 }, vUp: { base: 14, mult: 1 },
    build: (v) => [{ op: 'damageScaled', base: v.base, per: 'BLOCK', mult: v.mult }],
    text: (v) => `${v.base}의 피해. 지금 방어도만큼 더 준다.`,
  },
  endurecard: {
    ko: '버티기', type: null, kind: S, rarity: U, target: 'SELF',
    v: { cost: 1, base: 5, mult: 4 }, vUp: { base: 8, mult: 5 },
    build: (v) => [{ op: 'blockScaled', base: v.base, per: 'PARTY', mult: v.mult }],
    text: (v) => `방어도 ${v.base}. 쓰러지지 않은 파티원 한 마리당 ${v.mult}씩 늘어난다.`,
  },
  venomdrench: {
    ko: '독노곤', type: 'POISON', kind: S, rarity: R, target: 'ENEMY',
    v: { cost: 1, psn: 2 }, vUp: { psn: 3 },
    build: (v) => [{ op: 'multiplyStatus', status: 'POISON', mult: v.psn }],
    text: (v) => `상대에게 걸린 독을 ${v.psn}배로 늘린다.`,
  },
  recycle: {
    ko: '리사이클', type: null, kind: S, rarity: R, target: 'SELF', exhaust: true,
    v: { cost: 1, n: 2 }, vUp: { n: 3 },
    build: (v) => [{ op: 'recoverFromDiscard', amount: v.n }],
    text: (v) => `버린 카드 더미에서 무작위로 ${v.n}장을 손으로 되돌린다. 소멸.`,
  },
  stockpile: {
    ko: '비축하기', type: null, kind: S, rarity: U, target: 'SELF',
    v: { cost: 1, blk: 7, en: 1 }, vUp: { blk: 10, en: 1 },
    build: (v) => [{ op: 'block', amount: v.blk }, { op: 'energyNextTurn', amount: v.en }],
    text: (v) => `방어도 ${v.blk}. 다음 턴에 에너지를 ${v.en} 더 얻는다.`,
  },
  ingrain: {
    ko: '뿌리박기', type: 'GRASS', kind: P, rarity: U, target: 'SELF',
    v: { cost: 1, blk: 5 }, vUp: { blk: 7 },
    build: (v) => [{ op: 'power', id: 'INGRAIN', amount: v.blk }],
    text: (v) => `이 전투 동안, 라운드가 끝날 때마다 방어도 ${v.blk}. 겹쳐 쌓인다.`,
  },

  // ══ 값싸고 흔한 카드 — 덱을 굴리는 살 ═══════════════════════
  firefang: {
    ko: '불꽃엄니', type: 'FIRE', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 9, burn: 1 }, vUp: { dmg: 12, burn: 2 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'BURN', amount: v.burn }],
    text: (v) => `${v.dmg}의 피해. 화상 ${v.burn}.`,
  },
  aquajet: {
    ko: '아쿠아제트', type: 'WATER', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 0, dmg: 6 }, vUp: { dmg: 9 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  waterpulse: {
    ko: '물의파동', type: 'WATER', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 9, atk: -1 }, vUp: { dmg: 12, atk: -1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }],
    text: (v) => `${v.dmg}의 피해. 상대 공격 랭크 ${v.atk}.`,
  },
  seedbomb: {
    ko: '씨폭탄', type: 'GRASS', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 12 }, vUp: { dmg: 16 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  spark: {
    ko: '스파크', type: 'ELECTRIC', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 9, par: 1 }, vUp: { dmg: 12, par: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'PARA', amount: v.par }],
    text: (v) => `${v.dmg}의 피해. 마비 ${v.par}.`,
  },
  chargebeam: {
    ko: '차지빔', type: 'ELECTRIC', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 1, dmg: 7, atk: 1 }, vUp: { dmg: 10, atk: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' }],
    text: (v) => `${v.dmg}의 피해. 공격 랭크 +${v.atk}.`,
  },
  struggle: {
    ko: '발버둥', type: 'NORMAL', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 0, dmg: 8, rec: 3 }, vUp: { dmg: 11, rec: 3 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'recoil', amount: v.rec }],
    text: (v) => `${v.dmg}의 피해. 반동으로 ${v.rec}의 피해를 입는다.`,
  },
  nightslash: {
    ko: '밤의칼날', type: 'DARK', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 10 }, vUp: { dmg: 14 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  airslash: {
    ko: '에어슬래시', type: 'FLYING', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 10 }, vUp: { dmg: 13 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  dragonbreath: {
    ko: '용의숨결', type: 'DRAGON', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 9, par: 1 }, vUp: { dmg: 12, par: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'status', status: 'PARA', amount: v.par }],
    text: (v) => `${v.dmg}의 피해. 마비 ${v.par}.`,
  },
  icywind: {
    ko: '냉풍', type: 'ICE', kind: A, rarity: C, target: 'ALL',
    v: { cost: 1, dmg: 7, atk: -1 }, vUp: { dmg: 10, atk: -1 },
    build: (v) => [{ op: 'damageAll', power: v.dmg }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }],
    text: (v) => `모든 적에게 ${v.dmg}의 피해. 상대 공격 랭크 ${v.atk}.`,
  },
  bulldoze: {
    ko: '땅고르기', type: 'GROUND', kind: A, rarity: U, target: 'ALL',
    v: { cost: 1, dmg: 9, atk: -1 }, vUp: { dmg: 12, atk: -1 },
    build: (v) => [{ op: 'damageAll', power: v.dmg }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }],
    text: (v) => `모든 적에게 ${v.dmg}의 피해. 상대 공격 랭크 ${v.atk}.`,
  },
  irontail: {
    ko: '아이언테일', type: 'STEEL', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 16, def: -1 }, vUp: { dmg: 21, def: -1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'DEF', delta: v.def, to: 'enemy' }],
    text: (v) => `${v.dmg}의 피해. 상대 방어 랭크 ${v.def}.`,
  },
  moonblast: {
    ko: '문포스', type: 'FAIRY', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 17, atk: -1 }, vUp: { dmg: 22, atk: -1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'rank', stat: 'ATK', delta: v.atk, to: 'enemy' }],
    text: (v) => `${v.dmg}의 피해. 상대 공격 랭크 ${v.atk}.`,
  },
  powergem: {
    ko: '파워젬', type: 'ROCK', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 15 }, vUp: { dmg: 20 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },

  // ══ 스타터 3계열 전용 카드 ═══════════════════════════════
  // 파이리·꼬부기·이상해씨와 그 진화형(리자몽·거북왕·이상해꽃)이 원작에서
  // 쓰는 기술들이다. 각 계열의 정체성을 한 방향으로 더 밀어 준다:
  //
  //   불꽃 — 화상을 쌓고 그 화상으로 때린다 (타입표를 안 타는 딜)
  //   물   — 방어도를 쌓고 그 방어도로 때린다
  //   풀   — 독을 얹고 빨아먹으며 길게 간다
  //
  // 보상 풀은 파티 타입으로 걸러지므로(run.js rewardPool), 파이리를 골랐다면
  // 불꽃 카드가 실제로 자주 보인다. 계열마다 커먼 2 · 언커먼 3 · 레어 2 로
  // 나눠 두어 초반에도 뽑히고, 후반에 판을 뒤집을 것도 남게 했다.

  // ── 파이리 → 리자드 → 리자몽 ────────────────────────────
  emberfang: {
    // ★ 원래 이름이 '불꽃엄니'였는데 기존 firefang 과 이름이 겹쳤다 —
    //   같은 이름의 카드 두 장이 서로 다른 효과를 들고 보상 화면에 나란히
    //   떴다. 화면 이름만 바꾸고 id 는 그대로 둔다. id 를 바꾸면 이 카드를
    //   덱에 넣고 저장한 판이 불러올 때 터진다 (resolveCard 가 던진다).
    ko: '회오리불꽃', type: 'FIRE', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 4, hits: 2 }, vUp: { dmg: 6, hits: 2 },
    build: (v) => [{ op: 'damage', power: v.dmg, hits: v.hits }],
    text: (v) => `${v.dmg}의 피해를 ${v.hits}번 준다.`,
  },
  dragonrage: {
    ko: '용의분노', type: 'DRAGON', kind: A, rarity: C, target: 'ENEMY',
    // 고정 피해라 상성·자속·랭크를 전부 무시한다. 불꽃이 안 통하는 상대
    // (물·바위 계열)를 만났을 때 파이리가 쥘 수 있는 답이다.
    v: { cost: 1, dmg: 12 }, vUp: { dmg: 18 },
    build: (v) => [{ op: 'fixed', amount: v.dmg }],
    text: (v) => `상성과 랭크를 무시하고 ${v.dmg}의 피해를 준다.`,
  },
  wingattack: {
    ko: '날개치기', type: 'FLYING', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 1, dmg: 9, draw: 1 }, vUp: { dmg: 12, draw: 1 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'draw', amount: v.draw }],
    text: (v) => `${v.dmg}의 피해. 카드를 ${v.draw}장 뽑는다.`,
  },
  dragondance: {
    ko: '용의춤', type: null, kind: S, rarity: U, target: 'SELF',
    v: { cost: 1, atk: 1, energy: 1 }, vUp: { atk: 2, energy: 1 },
    build: (v) => [
      { op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' },
      { op: 'energyNextTurn', amount: v.energy },
    ],
    text: (v) => `공격 랭크 +${v.atk}. 다음 턴에 에너지를 ${v.energy} 더 얻는다.`,
  },
  smokescreen: {
    ko: '연막', type: null, kind: S, rarity: U, target: 'ENEMY',
    v: { cost: 1, blk: 6, down: 1 }, vUp: { blk: 9, down: 1 },
    build: (v) => [
      { op: 'block', amount: v.blk },
      { op: 'rank', stat: 'ATK', delta: -v.down, to: 'enemy' },
    ],
    text: (v) => `방어도 ${v.blk}. 상대의 공격 랭크 -${v.down}.`,
  },
  overheat: {
    ko: '오버히트', type: 'FIRE', kind: A, rarity: R, target: 'ENEMY',
    // 원작처럼 쓰고 나면 특공이 떨어진다 — 마무리로 쓰라는 한 방
    v: { cost: 2, dmg: 26, back: 2 }, vUp: { dmg: 34, back: 2 },
    build: (v) => [
      { op: 'damage', power: v.dmg },
      { op: 'rank', stat: 'ATK', delta: -v.back, to: 'self' },
    ],
    text: (v) => `${v.dmg}의 피해. 내 공격 랭크가 ${v.back} 내려간다.`,
  },
  blastburn: {
    ko: '블러스트번', type: 'FIRE', kind: A, rarity: R, target: 'ALL',
    v: { cost: 3, dmg: 16, burn: 5 }, vUp: { dmg: 21, burn: 7 },
    build: (v) => [
      { op: 'damageAll', power: v.dmg },
      { op: 'statusAll', status: 'BURN', amount: v.burn },
    ],
    text: (v) => `모든 적에게 ${v.dmg}의 피해. 화상 ${v.burn}.`,
  },

  // ── 꼬부기 → 어니부기 → 거북왕 ──────────────────────────
  bubble: {
    ko: '거품', type: 'WATER', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 0, dmg: 5 }, vUp: { dmg: 8 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  rapidspin: {
    ko: '고속스핀', type: 'NORMAL', kind: A, rarity: C, target: 'ENEMY',
    v: { cost: 1, dmg: 5, blk: 5 }, vUp: { dmg: 8, blk: 7 },
    build: (v) => [{ op: 'damage', power: v.dmg }, { op: 'block', amount: v.blk }],
    text: (v) => `${v.dmg}의 피해. 방어도 ${v.blk}.`,
  },
  skullbash: {
    ko: '로케트박치기', type: 'NORMAL', kind: A, rarity: U, target: 'ENEMY',
    // 원작에서 한 턴 웅크렸다가 친다 — 여기서는 "먼저 쌓아 둔 방어도"가 그 값이다
    v: { cost: 2, base: 6, mult: 1, def: 1 }, vUp: { base: 10, mult: 1, def: 1 },
    build: (v) => [
      { op: 'damageScaled', base: v.base, per: 'BLOCK', mult: v.mult },
      { op: 'rank', stat: 'DEF', delta: v.def, to: 'self' },
    ],
    text: (v) => `${v.base}의 피해. 지금 방어도만큼 더 준다. 방어 랭크 +${v.def}.`,
  },
  aquatail: {
    ko: '아쿠아테일', type: 'WATER', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 18 }, vUp: { dmg: 24 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  shellarmor: {
    ko: '조가비갑옷', type: null, kind: P, rarity: U, target: 'SELF',
    // 꼬부기에게 "안 쓰고 남긴 방어도"의 값을 만들어 준다
    v: { cost: 1, blk: 3 }, vUp: { blk: 5 },
    build: (v) => [{ op: 'power', id: 'INGRAIN', amount: v.blk }],
    text: (v) => `이 전투 동안, 턴이 끝날 때마다 방어도 ${v.blk}를 얻는다.`,
  },
  irondefensecard: {
    ko: '껍질닫기', type: null, kind: S, rarity: R, target: 'SELF',
    v: { cost: 1, blk: 11, def: 1, draw: 1 }, vUp: { blk: 15, def: 1, draw: 1 },
    build: (v) => [
      { op: 'block', amount: v.blk },
      { op: 'rank', stat: 'DEF', delta: v.def, to: 'self' },
      { op: 'draw', amount: v.draw },
    ],
    text: (v) => `방어도 ${v.blk}. 방어 랭크 +${v.def}. 카드를 ${v.draw}장 뽑는다.`,
  },
  hydrocannon: {
    ko: '하이드로캐논', type: 'WATER', kind: A, rarity: R, target: 'ENEMY',
    // 껍질치기의 큰형. 쌓아 둔 방어도를 통째로 쏟아붓는다
    v: { cost: 3, base: 10, mult: 2 }, vUp: { base: 16, mult: 2 },
    build: (v) => [
      { op: 'damageScaled', base: v.base, per: 'BLOCK', mult: v.mult },
      { op: 'loseBlockRatio', ratio: 1 },
    ],
    text: (v) => `${v.base}의 피해. 지금 방어도 1당 ${v.mult}씩 늘어난다. 방어도를 전부 잃는다.`,
  },

  // ── 이상해씨 → 이상해풀 → 이상해꽃 ──────────────────────
  stunspore: {
    ko: '마비가루', type: 'GRASS', kind: S, rarity: C, target: 'ENEMY',
    v: { cost: 1, para: 2 }, vUp: { para: 3 },
    build: (v) => [{ op: 'status', status: 'PARA', amount: v.para }],
    text: (v) => `마비 ${v.para}. 상대의 공격이 25% 약해진다.`,
  },
  sleeppowder: {
    ko: '수면가루', type: 'GRASS', kind: S, rarity: C, target: 'ENEMY',
    v: { cost: 1, freeze: 1 }, vUp: { freeze: 2 },
    build: (v) => [{ op: 'status', status: 'FREEZE', amount: v.freeze }],
    text: (v) => `${v.freeze}턴 동안 상대가 행동하지 못한다.`,
  },
  growth: {
    ko: '성장', type: null, kind: S, rarity: U, target: 'SELF',
    // 0코였을 때는 낼지 말지를 고민할 이유가 없었다 — 공짜 랭크에 공짜 드로우
    v: { cost: 1, atk: 1, draw: 1 }, vUp: { atk: 1, draw: 2 },
    build: (v) => [
      { op: 'rank', stat: 'ATK', delta: v.atk, to: 'self' },
      { op: 'draw', amount: v.draw },
    ],
    text: (v) => `공격 랭크 +${v.atk}. 카드를 ${v.draw}장 뽑는다.`,
  },
  petaldance: {
    ko: '꽃잎댄스', type: 'GRASS', kind: A, rarity: U, target: 'ENEMY',
    v: { cost: 2, dmg: 6, hits: 3 }, vUp: { dmg: 8, hits: 3 },
    build: (v) => [{ op: 'damage', power: v.dmg, hits: v.hits }],
    text: (v) => `${v.dmg}의 피해를 ${v.hits}번 준다.`,
  },
  toxicvine: {
    ko: '독덩굴', type: 'POISON', kind: A, rarity: U, target: 'ENEMY',
    // 독 피해는 타입표를 안 탄다 — 풀/독의 나쁜 상성을 메우는 축이다
    v: { cost: 1, dmg: 5, psn: 4, drain: 1 }, vUp: { dmg: 7, psn: 6, drain: 1 },
    build: (v) => [
      { op: 'damage', power: v.dmg },
      { op: 'status', status: 'POISON', amount: v.psn },
      { op: 'drain', ratio: v.drain },
    ],
    text: (v) => `${v.dmg}의 피해. 독 ${v.psn}. 준 피해만큼 HP를 회복한다.`,
  },
  solarbeam: {
    ko: '솔라빔', type: 'GRASS', kind: A, rarity: R, target: 'ENEMY',
    v: { cost: 2, dmg: 25 }, vUp: { dmg: 33 },
    build: (v) => [{ op: 'damage', power: v.dmg }],
    text: (v) => `${v.dmg}의 피해를 준다.`,
  },
  frenzyplant: {
    ko: '하드플랜트', type: 'GRASS', kind: A, rarity: R, target: 'ALL',
    v: { cost: 3, dmg: 14, psn: 5 }, vUp: { dmg: 19, psn: 7 },
    build: (v) => [
      { op: 'damageAll', power: v.dmg },
      { op: 'statusAll', status: 'POISON', amount: v.psn },
    ],
    text: (v) => `모든 적에게 ${v.dmg}의 피해. 독 ${v.psn}.`,
  },
};

// ── 조회 도우미 ──────────────────────────────────────────────

export const ALL_CARD_IDS = Object.keys(CARDS);

/** 보상·상점에 등장할 수 있는 카드 (시작 덱·합류 카드는 제외) */
export const POOL_IDS = ALL_CARD_IDS.filter((id) => CARDS[id].rarity !== 'BASIC');

let uidSeq = 0;
/** 덱에 들어가는 개체 하나. 같은 카드를 여러 장 들어도 각자 강화 여부를 갖는다 */
export function makeCard(id, opts = {}) {
  return { uid: ++uidSeq, id, upgraded: !!opts.upgraded, owner: opts.owner ?? null };
}

/**
 * 저장을 불러올 때 uid 를 그대로 살린다.
 * uid 는 전투 더미가 덱의 어느 카드를 가리키는지 잇는 유일한 열쇠라, 새로
 * 매기면 이어했을 때 손패가 통째로 사라진다. 카운터도 같이 밀어 두지 않으면
 * 다음에 얻는 카드가 이미 있는 uid 를 받는다.
 */
export function reviveCard(saved) {
  if (saved.uid > uidSeq) uidSeq = saved.uid;
  return { uid: saved.uid, id: saved.id, upgraded: !!saved.upgraded, owner: saved.owner ?? null };
}

/**
 * 개체 → 화면·전투가 쓰는 완성된 카드.
 * 값(v)은 강화 여부에 따라 합쳐지고, 효과와 설명은 그 값에서 나온다.
 */
export function resolveCard(inst) {
  const def = CARDS[inst.id];
  if (!def) throw new Error(`알 수 없는 카드: ${inst.id}`);
  const v = inst.upgraded ? { ...def.v, ...def.vUp } : { ...def.v };
  return {
    uid: inst.uid,
    id: inst.id,
    owner: inst.owner,
    upgraded: inst.upgraded,
    ko: def.ko + (inst.upgraded ? '+' : ''),
    type: def.type,
    kind: def.kind,
    rarity: def.rarity,
    target: def.target,
    exhaust: !!def.exhaust,
    cost: v.cost,
    v,
    effects: def.build(v),
    text: def.text(v) + (def.exhaust && !/소멸/.test(def.text(v)) ? ' 소멸.' : ''),
  };
}

/** 강화 가능 여부 — 이미 강화된 카드는 모닥불에서 고를 수 없다 */
export const canUpgrade = (inst) => !inst.upgraded;
