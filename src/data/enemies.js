// ─────────────────────────────────────────────────────────────
// enemies.js — 야생 포켓몬(적)과 등장 조합
//
// 슬더스의 적은 "다음에 무엇을 할지" 를 미리 보여 준다. 그 정보 위에서
// 플레이어가 이번 턴을 짠다. 여기서는 그 예고에 **타입**이 하나 더 붙는다.
//
//   구구가 다음 턴에 [비행 · 9] 를 쓴다  →  꼬마돌(바위)로 바꾸면 반감
//   모래두지가 [땅 · 12] 를 쓴다        →  구구(비행)로 바꾸면 아예 0
//
// 그래서 의도 표시가 "얼마나 아픈가" 가 아니라 "누구를 앞에 세울까" 를
// 묻는 질문이 된다. 적 설계에서 제일 신경 쓴 부분이다.
//
// nextMove(self, rng) 는 기술 id 를 돌려준다. self.turn 은 이 적이 겪은
// 턴 수, self.history 는 지금까지 쓴 기술 목록이다.
// ─────────────────────────────────────────────────────────────

/** 의도 종류 — 아이콘과 색을 고른다 */
export const INTENT = {
  ATTACK: '공격', DEFEND: '방어', BUFF: '강화', DEBUFF: '약화',
  ATTACK_DEBUFF: '공격·약화', ATTACK_DEFEND: '공격·방어', SLEEP: '수면',
};

/** 같은 기술을 n턴 연속 쓰지 않게 하는 도우미 — 패턴이 심심해지는 걸 막는다 */
const notLast = (self, id) => self.history[self.history.length - 1] !== id;

// ── 위력 기준 ────────────────────────────────────────────────
// ★ 여기 적힌 power 는 **자속보정 전** 값이다. 적이 자기 타입과 같은 기술을
//   쓰면 1.5배가 붙으므로, 실제로 화면에 뜨는 숫자는 대략 power×1.5 다.
//   처음엔 이걸 잊고 최종값처럼 적었다가 1층에서 두 턴 만에 전멸했다.
//
// 1막이 목표로 하는 턴당 총 피해 (파티 선두 HP 58~66 기준):
//   1~3층 잡몹  8~11      일반 잡몹  12~18
//   엘리트      20~26     보스       16~27

export const ENEMIES = {
  // ══ 1막 · 잡몹 ════════════════════════════════════════════
  pidgey: {
    ko: '구구', types: ['NORMAL', 'FLYING'], hp: [16, 19],
    body: '#c8a878', accent: '#f0e0c0',
    moves: {
      peck:       { ko: '쪼기', intent: 'ATTACK', type: 'FLYING', power: 5 },
      sandattack: { ko: '모래뿌리기', intent: 'DEBUFF', rank: { stat: 'ATK', delta: -1, to: 'player' } },
      gust:       { ko: '바람일으키기', intent: 'ATTACK', type: 'FLYING', power: 7 },
    },
    // 첫 턴은 반드시 모래뿌리기 — 플레이어가 공격 랭크 손해를 먼저 배우게 한다
    nextMove: (self, rng) => (self.turn === 1 ? 'sandattack'
      : rng.chance(0.35) ? 'gust' : 'peck'),
  },

  rattata: {
    ko: '꼬렛', types: ['NORMAL'], hp: [14, 17],
    body: '#9b6ac4', accent: '#f2e2b8',
    moves: {
      tackle: { ko: '몸통박치기', intent: 'ATTACK', type: 'NORMAL', power: 5 },
      bite:   { ko: '깨물기', intent: 'ATTACK_DEBUFF', type: 'DARK', power: 5, rank: { stat: 'DEF', delta: -1, to: 'player' } },
    },
    nextMove: (self, rng) => (rng.chance(0.4) && notLast(self, 'bite') ? 'bite' : 'tackle'),
  },

  caterpie: {
    ko: '캐터피', types: ['BUG'], hp: [14, 18],
    body: '#8ac03c', accent: '#d04030',
    moves: {
      tackle:     { ko: '몸통박치기', intent: 'ATTACK', type: 'NORMAL', power: 6 },
      stringshot: { ko: '실뿜기', intent: 'DEBUFF', rank: { stat: 'ATK', delta: -1, to: 'player' }, status: { kind: 'PARA', amount: 1 } },
    },
    nextMove: (self) => (self.turn % 3 === 1 ? 'stringshot' : 'tackle'),
  },

  weedle: {
    ko: '뿔충이', types: ['BUG', 'POISON'], hp: [14, 18],
    body: '#e8c060', accent: '#d04030',
    moves: {
      poisonsting: { ko: '독침', intent: 'ATTACK', type: 'POISON', power: 4, status: { kind: 'POISON', amount: 2 } },
      tackle:      { ko: '몸통박치기', intent: 'ATTACK', type: 'NORMAL', power: 5 },
    },
    nextMove: (self, rng) => (rng.chance(0.6) ? 'poisonsting' : 'tackle'),
  },

  zubat: {
    ko: '주뱃', types: ['POISON', 'FLYING'], hp: [19, 23],
    body: '#7a8ad0', accent: '#5a68a8',
    moves: {
      leechlife: { ko: '흡혈', intent: 'ATTACK', type: 'BUG', power: 6, heal: 4 },
      supersonic:{ ko: '초음파', intent: 'DEBUFF', rank: { stat: 'ATK', delta: -1, to: 'player' } },
      wingattack:{ ko: '날개치기', intent: 'ATTACK', type: 'FLYING', power: 7 },
    },
    nextMove: (self, rng) => (self.turn === 1 ? 'supersonic'
      : rng.chance(0.45) ? 'leechlife' : 'wingattack'),
  },

  ekans: {
    ko: '아보', types: ['POISON'], hp: [22, 26],
    body: '#9b52a8', accent: '#e0d060',
    moves: {
      wrap:        { ko: '감기', intent: 'ATTACK', type: 'NORMAL', power: 4, hits: 2 },
      poisonpowder:{ ko: '독가루', intent: 'DEBUFF', status: { kind: 'POISON', amount: 4 } },
      glare:       { ko: '눈싸움', intent: 'DEBUFF', rank: { stat: 'DEF', delta: -1, to: 'player' } },
    },
    nextMove: (self, rng) => (self.turn === 2 ? 'poisonpowder'
      : rng.chance(0.25) ? 'glare' : 'wrap'),
  },

  sandshrew: {
    ko: '모래두지', types: ['GROUND'], hp: [26, 30],
    body: '#e8d08a', accent: '#c4a860',
    moves: {
      // 땅 기술 — 비행 타입 앞에 세우면 통째로 0 이 된다. 교체를 가르치는 적
      magnitude:   { ko: '매그니튜드', intent: 'ATTACK', type: 'GROUND', power: 10 },
      defensecurl: { ko: '웅크리기', intent: 'DEFEND', block: 6, rank: { stat: 'DEF', delta: 1, to: 'self' } },
      scratch:     { ko: '할퀴기', intent: 'ATTACK', type: 'NORMAL', power: 5 },
    },
    nextMove: (self) => ([ 'defensecurl', 'scratch', 'magnitude' ][(self.turn - 1) % 3]),
  },

  geodude: {
    ko: '꼬마돌', types: ['ROCK', 'GROUND'], hp: [28, 33],
    body: '#a09080', accent: '#786858',
    moves: {
      rockthrow: { ko: '돌떨어뜨리기', intent: 'ATTACK', type: 'ROCK', power: 7 },
      harden:    { ko: '단단해지기', intent: 'DEFEND', block: 8 },
      tackle:    { ko: '몸통박치기', intent: 'ATTACK', type: 'NORMAL', power: 6 },
    },
    nextMove: (self, rng) => (self.turn % 4 === 0 ? 'harden'
      : rng.chance(0.6) ? 'rockthrow' : 'tackle'),
  },

  oddish: {
    ko: '뚜벅쵸', types: ['GRASS', 'POISON'], hp: [21, 25],
    body: '#5a8ac0', accent: '#5fbc5a',
    moves: {
      absorb:     { ko: '흡수', intent: 'ATTACK', type: 'GRASS', power: 6, heal: 5 },
      sleeppowder:{ ko: '수면가루', intent: 'DEBUFF', status: { kind: 'PARA', amount: 2 } },
    },
    nextMove: (self, rng) => (self.turn === 1 || rng.chance(0.3) ? 'sleeppowder' : 'absorb'),
  },

  mankey: {
    ko: '망키', types: ['FIGHT'], hp: [23, 27],
    body: '#e0d0b0', accent: '#a06840',
    moves: {
      lowkick: { ko: '안다리걸기', intent: 'ATTACK', type: 'FIGHT', power: 7 },
      rage:    { ko: '분노', intent: 'BUFF', rank: { stat: 'ATK', delta: 1, to: 'self' } },
      furyswipes: { ko: '분노의발톱', intent: 'ATTACK', type: 'NORMAL', power: 3, hits: 3 },
    },
    // 분노를 먼저 쌓고 몰아친다 — 방치하면 아프다는 걸 배우는 적
    nextMove: (self, rng) => (self.turn === 1 ? 'rage'
      : rng.chance(0.5) ? 'furyswipes' : 'lowkick'),
  },

  // ══ 1막 · 엘리트 ══════════════════════════════════════════
  onix: {
    ko: '롱스톤', types: ['ROCK', 'GROUND'], hp: [62, 62], elite: true, scale: 1.35,
    body: '#9a9aa8', accent: '#6a6a78',
    moves: {
      bind:        { ko: '조이기', intent: 'ATTACK', type: 'NORMAL', power: 4, hits: 2 },
      rockslide:   { ko: '스톤샤워', intent: 'ATTACK', type: 'ROCK', power: 9 },
      earthquake:  { ko: '지진', intent: 'ATTACK', type: 'GROUND', power: 14 },
      // ★ 방어 랭크를 같이 올리면 안 된다. 3턴마다 +1이 쌓여 +6까지 가면
      //   플레이어 피해가 1/4로 줄어 아예 죽일 수 없는 벽이 된다. 실제로
      //   시뮬에서 21턴을 싸우고도 못 이기는 판이 나왔다. 방어도만 준다.
      irondefense: { ko: '철벽', intent: 'DEFEND', block: 12 },
    },
    // 3턴마다 지진. 비행 타입을 하나 데리고 있느냐로 난이도가 갈린다
    nextMove: (self) => (self.turn % 3 === 0 ? 'earthquake'
      : self.turn % 3 === 1 ? 'irondefense' : (self.turn % 2 ? 'bind' : 'rockslide')),
  },

  arbok: {
    ko: '아보크', types: ['POISON'], hp: [55, 55], elite: true, scale: 1.25,
    body: '#9b52a8', accent: '#e0d060',
    moves: {
      toxic:      { ko: '맹독', intent: 'DEBUFF', status: { kind: 'POISON', amount: 6 } },
      crunch:     { ko: '깨물어부수기', intent: 'ATTACK_DEBUFF', type: 'DARK', power: 10, rank: { stat: 'DEF', delta: -1, to: 'player' } },
      acid:       { ko: '녹기', intent: 'ATTACK', type: 'POISON', power: 8, status: { kind: 'POISON', amount: 2 } },
    },
    nextMove: (self, rng) => (self.turn === 1 ? 'toxic'
      : rng.chance(0.45) ? 'crunch' : 'acid'),
  },

  primeape: {
    ko: '성원숭', types: ['FIGHT'], hp: [53, 53], elite: true, scale: 1.2,
    body: '#e0d0b0', accent: '#c04030',
    moves: {
      thrash:     { ko: '난동부리기', intent: 'ATTACK', type: 'NORMAL', power: 4, hits: 3 },
      crosschop:  { ko: '크로스촙', intent: 'ATTACK', type: 'FIGHT', power: 11 },
      rage:       { ko: '분노', intent: 'BUFF', rank: { stat: 'ATK', delta: 2, to: 'self' } },
      screech:    { ko: '울음소리', intent: 'DEBUFF', rank: { stat: 'DEF', delta: -2, to: 'player' } },
    },
    // 계속 강해진다. 오래 끌면 진다 — 속도를 요구하는 엘리트
    nextMove: (self) => ([ 'rage', 'thrash', 'screech', 'crosschop' ][(self.turn - 1) % 4]),
  },

  // ══ 1막 · 보스 ════════════════════════════════════════════
  beedrill: {
    ko: '비주기', types: ['BUG', 'POISON'], hp: [95, 95], boss: true, scale: 1.5,
    body: '#f0c43c', accent: '#3a3028',
    moves: {
      twineedle:   { ko: '더블니들', intent: 'ATTACK', type: 'BUG', power: 5, hits: 2, status: { kind: 'POISON', amount: 2 } },
      agility:     { ko: '고속이동', intent: 'BUFF', rank: { stat: 'ATK', delta: 1, to: 'self' }, block: 8 },
      poisonjab:   { ko: '독찌르기', intent: 'ATTACK', type: 'POISON', power: 12, status: { kind: 'POISON', amount: 3 } },
      furyattack:  { ko: '마구찌르기', intent: 'ATTACK', type: 'NORMAL', power: 4, hits: 4 },
      // 후반부 대기술. 예고를 보고 무엇을 앞에 세울지 한 턴 먼저 정해야 한다
      megahorn:    { ko: '메가혼', intent: 'ATTACK', type: 'BUG', power: 22 },
    },
    nextMove: (self, rng) => {
      const half = self.hp <= self.maxHp / 2;
      if (self.turn === 1) return 'agility';
      if (half && self.turn % 4 === 0) return 'megahorn';
      if (self.turn % 4 === 0) return 'agility';
      return rng.chance(0.5) ? 'twineedle' : (rng.chance(0.5) ? 'poisonjab' : 'furyattack');
    },
  },

  // ══ 2막 · 달의 신전 ═══════════════════════════════════════
  // 여기 적힌 수치도 1막 기준이다. 2·3막에서는 acts.js 의 배율이 곱해진다.
  diglett: {
    ko: '디그다', types: ['GROUND'], hp: [18, 22],
    body: '#b07a4a', accent: '#f2c9a0',
    moves: {
      scratch:    { ko: '할퀴기', intent: 'ATTACK', type: 'NORMAL', power: 5 },
      sandattack: { ko: '모래뿌리기', intent: 'DEBUFF', rank: { stat: 'ATK', delta: -1, to: 'player' } },
      digmove:    { ko: '구멍파기', intent: 'ATTACK', type: 'GROUND', power: 7 },
    },
    // 셋이 몰려 나온다. 하나하나는 약하지만 전체기가 없으면 성가시다
    nextMove: (self, rng) => (self.turn === 1 ? 'sandattack' : rng.chance(0.5) ? 'digmove' : 'scratch'),
  },

  paras: {
    ko: '파라스', types: ['BUG', 'GRASS'], hp: [27, 32],
    body: '#e2703c', accent: '#d84a3a',
    moves: {
      absorb:    { ko: '흡수', intent: 'ATTACK', type: 'GRASS', power: 6, heal: 5 },
      stunspore: { ko: '저리가루', intent: 'DEBUFF', status: { kind: 'PARA', amount: 2 } },
      scratch:   { ko: '할퀴기', intent: 'ATTACK', type: 'BUG', power: 6 },
    },
    nextMove: (self, rng) => (self.turn % 3 === 1 ? 'stunspore' : rng.chance(0.5) ? 'absorb' : 'scratch'),
  },

  golbat: {
    ko: '골뱃', types: ['POISON', 'FLYING'], hp: [46, 54],
    body: '#5a6ec0', accent: '#3f4d90',
    moves: {
      leechlife:  { ko: '흡혈', intent: 'ATTACK', type: 'BUG', power: 8, heal: 7 },
      wingattack: { ko: '날개치기', intent: 'ATTACK', type: 'FLYING', power: 9 },
      screech:    { ko: '초음파', intent: 'DEBUFF', rank: { stat: 'DEF', delta: -1, to: 'player' } },
    },
    nextMove: (self, rng) => (self.turn === 1 ? 'screech'
      : rng.chance(0.45) ? 'leechlife' : 'wingattack'),
  },

  nidorino: {
    ko: '니드리노', types: ['POISON'], hp: [50, 58],
    body: '#9b52a8', accent: '#6b2c88',
    moves: {
      hornattack:  { ko: '뿔찌르기', intent: 'ATTACK', type: 'NORMAL', power: 9 },
      poisonjab:   { ko: '독찌르기', intent: 'ATTACK', type: 'POISON', power: 8, status: { kind: 'POISON', amount: 3 } },
      focusenergy: { ko: '기충전', intent: 'BUFF', rank: { stat: 'ATK', delta: 1, to: 'self' } },
    },
    nextMove: (self, rng) => (self.turn === 1 ? 'focusenergy'
      : rng.chance(0.5) ? 'poisonjab' : 'hornattack'),
  },

  machop: {
    ko: '알통몬', types: ['FIGHT'], hp: [40, 46],
    body: '#9aa4b8', accent: '#d86850',
    moves: {
      karatechop: { ko: '태권당수', intent: 'ATTACK', type: 'FIGHT', power: 9 },
      // 먼저 몸을 키우고 때린다 — 첫 턴에 안 끊으면 뒤가 아프다
      focusenergy: { ko: '기충전', intent: 'BUFF', rank: { stat: 'ATK', delta: 1, to: 'self' } },
      lowkick:    { ko: '안다리걸기', intent: 'ATTACK_DEBUFF', type: 'FIGHT', power: 7, rank: { stat: 'DEF', delta: -1, to: 'player' } },
    },
    nextMove: (self, rng) => (self.turn === 1 ? 'focusenergy'
      : rng.chance(0.35) ? 'lowkick' : 'karatechop'),
  },

  gastlyE: {
    ko: '고오스', types: ['GHOST', 'POISON'], hp: [32, 38],
    body: '#6a5a9c', accent: '#3a3060', sprite: 'gastly',
    moves: {
      lick:       { ko: '핥기', intent: 'ATTACK', type: 'GHOST', power: 7, status: { kind: 'PARA', amount: 1 } },
      nightshade: { ko: '나이트헤드', intent: 'ATTACK', type: 'GHOST', power: 8 },
      hypnosis:   { ko: '최면술', intent: 'DEBUFF', status: { kind: 'PARA', amount: 2 } },
    },
    nextMove: (self, rng) => (rng.chance(0.3) ? 'hypnosis' : rng.chance(0.5) ? 'lick' : 'nightshade'),
  },

  // ── 2막 엘리트 ────────────────────────────────────────────
  golduck: {
    ko: '골덕', types: ['WATER'], hp: [105, 105], elite: true, scale: 1.2,
    body: '#4a8ad0', accent: '#e0c060',
    moves: {
      surf:      { ko: '파도타기', intent: 'ATTACK', type: 'WATER', power: 13 },
      confusion: { ko: '염동력', intent: 'ATTACK_DEBUFF', type: 'PSYCHIC', power: 10, rank: { stat: 'ATK', delta: -1, to: 'player' } },
      screech:   { ko: '울음소리', intent: 'DEBUFF', rank: { stat: 'DEF', delta: -2, to: 'player' } },
      recovermv: { ko: '회복', intent: 'DEFEND', block: 14, heal: 10 },
    },
    nextMove: (self) => (['confusion', 'surf', 'screech', 'surf', 'recovermv'][(self.turn - 1) % 5]),
  },

  marowak: {
    ko: '텅구리', types: ['GROUND'], hp: [100, 100], elite: true, scale: 1.15,
    body: '#c8a878', accent: '#e8e0d0',
    moves: {
      bonemerang: { ko: '본메랑', intent: 'ATTACK', type: 'GROUND', power: 8, hits: 2 },
      thrash:     { ko: '박치기', intent: 'ATTACK', type: 'NORMAL', power: 12 },
      // 뼈를 세워 막으며 때린다 — 오래 끌수록 손해다
      bonerush:   { ko: '뼈다귀치기', intent: 'ATTACK_DEFEND', type: 'GROUND', power: 10, block: 10 },
    },
    nextMove: (self, rng) => (self.turn % 3 === 0 ? 'bonerush'
      : rng.chance(0.55) ? 'bonemerang' : 'thrash'),
  },

  machoke: {
    ko: '근육몬', types: ['FIGHT'], hp: [112, 112], elite: true, scale: 1.2,
    body: '#8a94a8', accent: '#d05840',
    moves: {
      karatechop:  { ko: '태권당수', intent: 'ATTACK', type: 'FIGHT', power: 11 },
      bulkup:      { ko: '벌크업', intent: 'BUFF', rank: { stat: 'ATK', delta: 1, to: 'self' }, block: 8 },
      seismictoss: { ko: '지구던지기', intent: 'ATTACK', type: 'FIGHT', power: 16 },
      lowkick:     { ko: '안다리걸기', intent: 'ATTACK_DEBUFF', type: 'FIGHT', power: 8, rank: { stat: 'DEF', delta: -1, to: 'player' } },
    },
    nextMove: (self) => (['bulkup', 'karatechop', 'lowkick', 'seismictoss'][(self.turn - 1) % 4]),
  },

  // ── 2막 보스 ──────────────────────────────────────────────
  gengar: {
    ko: '팬텀', types: ['GHOST', 'POISON'], hp: [195, 195], boss: true, scale: 1.4,
    body: '#6a4a9c', accent: '#3a2060',
    moves: {
      shadowball: { ko: '섀도볼', intent: 'ATTACK_DEBUFF', type: 'GHOST', power: 13, rank: { stat: 'DEF', delta: -1, to: 'player' } },
      hypnosis:   { ko: '최면술', intent: 'DEBUFF', status: { kind: 'PARA', amount: 3 } },
      sludgebomb: { ko: '오물폭탄', intent: 'ATTACK', type: 'POISON', power: 12, status: { kind: 'POISON', amount: 4 } },
      curse:      { ko: '저주', intent: 'BUFF', rank: { stat: 'ATK', delta: 1, to: 'self' }, block: 10 },
      // 고스트라 노말·격투는 아예 통하지 않는다. 파티에 답이 없으면 벽이 된다
      dreameater: { ko: '꿈먹기', intent: 'ATTACK', type: 'PSYCHIC', power: 24, heal: 10 },
    },
    nextMove: (self, rng) => {
      const half = self.hp <= self.maxHp / 2;
      if (self.turn === 1) return 'hypnosis';
      if (self.turn % 4 === 0) return half ? 'dreameater' : 'curse';
      return rng.chance(0.5) ? 'shadowball' : 'sludgebomb';
    },
  },

  // ══ 3막 · 첨탑 ════════════════════════════════════════════
  electabuzz: {
    ko: '에레브', types: ['ELECTRIC'], hp: [46, 52],
    body: '#f0c419', accent: '#2b2118',
    moves: {
      thunderpunch: { ko: '번개펀치', intent: 'ATTACK', type: 'ELECTRIC', power: 10, status: { kind: 'PARA', amount: 1 } },
      swift:        { ko: '스피드스타', intent: 'ATTACK', type: 'NORMAL', power: 5, hits: 3 },
      magnetwave:   { ko: '전기자석파', intent: 'DEBUFF', status: { kind: 'PARA', amount: 2 } },
    },
    nextMove: (self, rng) => (self.turn === 1 ? 'magnetwave'
      : rng.chance(0.5) ? 'thunderpunch' : 'swift'),
  },

  magmar: {
    ko: '마그마', types: ['FIRE'], hp: [46, 52],
    body: '#e0483a', accent: '#f0c060',
    moves: {
      firepunch:    { ko: '불꽃펀치', intent: 'ATTACK', type: 'FIRE', power: 10, status: { kind: 'BURN', amount: 3 } },
      smokescreen:  { ko: '연막', intent: 'DEBUFF', rank: { stat: 'ATK', delta: -1, to: 'player' } },
      flamethrower: { ko: '화염방사', intent: 'ATTACK', type: 'FIRE', power: 13 },
    },
    nextMove: (self, rng) => (self.turn === 1 ? 'smokescreen'
      : rng.chance(0.5) ? 'firepunch' : 'flamethrower'),
  },

  jynx: {
    ko: '루주라', types: ['ICE', 'PSYCHIC'], hp: [42, 48],
    body: '#d84a7a', accent: '#e0c060',
    moves: {
      icepunch:   { ko: '냉동펀치', intent: 'ATTACK', type: 'ICE', power: 10 },
      lovelykiss: { ko: '악마의키스', intent: 'DEBUFF', status: { kind: 'PARA', amount: 2 }, rank: { stat: 'ATK', delta: -1, to: 'player' } },
      psychicmv:  { ko: '사이코키네시스', intent: 'ATTACK', type: 'PSYCHIC', power: 12 },
    },
    nextMove: (self, rng) => (self.turn % 3 === 1 ? 'lovelykiss'
      : rng.chance(0.5) ? 'icepunch' : 'psychicmv'),
  },

  scyther: {
    ko: '스라크', types: ['BUG', 'FLYING'], hp: [54, 60],
    body: '#5fbc5a', accent: '#e8e0d0',
    moves: {
      slash:      { ko: '베어가르기', intent: 'ATTACK', type: 'NORMAL', power: 12 },
      furycutter: { ko: '연속자르기', intent: 'ATTACK', type: 'BUG', power: 6, hits: 2 },
      agility:    { ko: '고속이동', intent: 'BUFF', rank: { stat: 'ATK', delta: 1, to: 'self' } },
    },
    // 계속 빨라진다. 오래 끌면 손을 못 댄다
    nextMove: (self) => (self.turn % 4 === 1 ? 'agility'
      : self.turn % 2 ? 'furycutter' : 'slash'),
  },

  pinsir: {
    ko: '쁘사이저', types: ['BUG'], hp: [58, 66],
    body: '#8a7a5a', accent: '#5a4a30',
    moves: {
      vicegrip:   { ko: '조르기', intent: 'ATTACK', type: 'NORMAL', power: 11 },
      guillotine: { ko: '싹둑자르기', intent: 'ATTACK', type: 'BUG', power: 18 },
      harden:     { ko: '단단해지기', intent: 'DEFEND', block: 14, rank: { stat: 'DEF', delta: 1, to: 'self' } },
    },
    nextMove: (self) => (['harden', 'vicegrip', 'guillotine'][(self.turn - 1) % 3]),
  },

  victreebel: {
    ko: '우츠보트', types: ['GRASS', 'POISON'], hp: [56, 64],
    body: '#e8d02c', accent: '#5fbc5a',
    moves: {
      razorleaf:   { ko: '잎날가르기', intent: 'ATTACK', type: 'GRASS', power: 11 },
      acid:        { ko: '녹기', intent: 'ATTACK', type: 'POISON', power: 9, status: { kind: 'POISON', amount: 4 } },
      sleeppowder: { ko: '수면가루', intent: 'DEBUFF', status: { kind: 'PARA', amount: 3 } },
      gigadrain:   { ko: '기가드레인', intent: 'ATTACK', type: 'GRASS', power: 10, heal: 12 },
    },
    nextMove: (self, rng) => (self.turn % 4 === 0 ? 'sleeppowder'
      : rng.chance(0.35) ? 'gigadrain' : rng.chance(0.5) ? 'acid' : 'razorleaf'),
  },

  tentacruel: {
    ko: '독파리', types: ['WATER', 'POISON'], hp: [62, 70],
    body: '#5a68c0', accent: '#d84a7a',
    moves: {
      wrap:  { ko: '감기', intent: 'ATTACK', type: 'WATER', power: 6, hits: 2 },
      toxic: { ko: '맹독', intent: 'DEBUFF', status: { kind: 'POISON', amount: 7 } },
      surf:  { ko: '파도타기', intent: 'ATTACK', type: 'WATER', power: 13 },
    },
    nextMove: (self, rng) => (self.turn === 1 ? 'toxic'
      : rng.chance(0.5) ? 'wrap' : 'surf'),
  },

  // ── 3막 엘리트 ────────────────────────────────────────────
  gyarados: {
    ko: '갸라도스', types: ['WATER', 'FLYING'], hp: [175, 175], elite: true, scale: 1.45,
    body: '#4a68c8', accent: '#e0c060',
    moves: {
      dragonrage:  { ko: '용의분노', intent: 'ATTACK', type: 'DRAGON', power: 14 },
      hydropump:   { ko: '하이드로펌프', intent: 'ATTACK', type: 'WATER', power: 20 },
      dragondance: { ko: '용의춤', intent: 'BUFF', rank: { stat: 'ATK', delta: 2, to: 'self' } },
      bitemv:      { ko: '깨물기', intent: 'ATTACK_DEBUFF', type: 'DARK', power: 12, rank: { stat: 'DEF', delta: -1, to: 'player' } },
    },
    // 전기에 4배로 녹는다. 피카츄·코일을 데려왔는지가 곧 난이도
    nextMove: (self) => (['dragondance', 'bitemv', 'hydropump', 'dragonrage'][(self.turn - 1) % 4]),
  },

  charizard: {
    ko: '리자몽', types: ['FIRE', 'FLYING'], hp: [170, 170], elite: true, scale: 1.4,
    body: '#f2803c', accent: '#4a9ec8',
    moves: {
      flamethrower: { ko: '화염방사', intent: 'ATTACK', type: 'FIRE', power: 14, status: { kind: 'BURN', amount: 3 } },
      wingattack:   { ko: '날개치기', intent: 'ATTACK', type: 'FLYING', power: 13 },
      firespin:     { ko: '회오리불꽃', intent: 'ATTACK', type: 'FIRE', power: 6, hits: 3 },
      dragonclaw:   { ko: '드래곤클로', intent: 'ATTACK', type: 'DRAGON', power: 18 },
    },
    nextMove: (self, rng) => (self.turn % 4 === 0 ? 'dragonclaw'
      : rng.chance(0.4) ? 'firespin' : rng.chance(0.5) ? 'flamethrower' : 'wingattack'),
  },

  blastoise: {
    ko: '거북왕', types: ['WATER'], hp: [190, 190], elite: true, scale: 1.4,
    body: '#5aa8dc', accent: '#a8703a',
    moves: {
      hydropump: { ko: '하이드로펌프', intent: 'ATTACK', type: 'WATER', power: 19 },
      withdrawm: { ko: '껍질에숨기', intent: 'DEFEND', block: 20, rank: { stat: 'DEF', delta: 1, to: 'self' } },
      skullbash: { ko: '로케트박치기', intent: 'ATTACK', type: 'NORMAL', power: 15 },
      bitemv:    { ko: '깨물기', intent: 'ATTACK', type: 'DARK', power: 11 },
    },
    nextMove: (self) => (['withdrawm', 'skullbash', 'hydropump', 'bitemv'][(self.turn - 1) % 4]),
  },

  // ── 3막 보스 ──────────────────────────────────────────────
  mewtwo: {
    ko: '뮤츠', types: ['PSYCHIC'], hp: [255, 255], boss: true, scale: 1.5,
    body: '#c8a8d8', accent: '#8a5a9c',
    moves: {
      psychicmv: { ko: '사이코키네시스', intent: 'ATTACK_DEBUFF', type: 'PSYCHIC', power: 17, rank: { stat: 'DEF', delta: -1, to: 'player' } },
      barrier:   { ko: '배리어', intent: 'DEFEND', block: 18, rank: { stat: 'DEF', delta: 1, to: 'self' } },
      swift:     { ko: '스피드스타', intent: 'ATTACK', type: 'NORMAL', power: 7, hits: 4 },
      recovermv: { ko: '자기재생', intent: 'DEFEND', block: 8, heal: 14 },
      // 절반 아래로 떨어지면 쓴다. 한 방에 파티 하나가 날아갈 수 있다
      psystrike: { ko: '사이코브레이크', intent: 'ATTACK', type: 'PSYCHIC', power: 34 },
    },
    nextMove: (self, rng) => {
      const half = self.hp <= self.maxHp / 2;
      if (self.turn === 1) return 'barrier';
      if (half && self.turn % 5 === 0) return 'psystrike';
      if (half && self.turn % 5 === 3) return 'recovermv';
      if (self.turn % 5 === 0) return 'barrier';
      return rng.chance(0.55) ? 'psychicmv' : 'swift';
    },
  },
};

export const enemyOf = (id) => ENEMIES[id];

// 등장 조합·포획 후보는 acts.js 로 옮겼다. 막마다 달라야 하는 값이라
// 적 정의 옆에 두면 1막용 표 하나가 세 막을 다 떠맡게 된다.
