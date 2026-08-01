// ─────────────────────────────────────────────────────────────
// pokemon.js — 파티에 들일 수 있는 포켓몬 종
//
// 슬더스에서 캐릭터는 런 시작에 한 번 고르고 끝이지만, 여기서는
// 파티가 런 내내 자란다. 포켓몬 하나가 곧 세 가지를 동시에 준다:
//
//   1. HP 한 덩이   — 선두만 맞으므로 사실상 "예비 생명"
//   2. 방어 타입     — 적 기술을 반감·무효할 수 있는 교체 카드
//   3. 기술 카드 2장 — 덱에 바로 섞인다
//
// 그래서 "무엇을 잡을까" 가 "무슨 카드를 넣을까" 만큼 큰 결정이 된다.
// 잡는 순간 덱이 두 장 두꺼워지는 비용도 같이 치르기 때문이다.
//
// ★ 방어 무효를 가진 종(구구=땅 무효, 모래두지=전기 무효, 고오스=노말·격투 무효)은
//   의도적으로 배치했다. 적 의도를 읽고 교체하는 플레이의 최고점이 이 셋이다.
//
// ── HP 기준 ──
// 스타터는 54~64, 합류 종은 24~46. 처음엔 스타터를 40으로 뒀다가 1층에서
// 두 턴 만에 죽었다 — 슬더스가 80으로 시작하는데 여기는 포켓몬 하나뿐이니
// 사실상 그 절반이었던 것이다.
//
// ★ 스타터 HP는 **1막 적 구성에 대한 방어 상성**을 보정하는 손잡이다.
//   1막은 땅·바위·비행이 많다. 불꽃인 파이리는 여기에 두 배로 맞아 제일
//   불리하고, 풀/독인 이상해씨는 격투·독·벌레를 반감해 제일 유리하다.
//   같은 HP로 두면 승률이 56% 대 94%까지 벌어져서, 그 차이를 HP로 되돌렸다.
//
// ★ 이름·색은 원작을 참조한다. 도트는 원본을 옮긴 게 아니라 알아볼 특징만
//   살려 새로 찍었다. 공개 배포·수익화하려면 이 파일과 pokemonSprites.js 를
//   오리지널로 갈아야 한다.
// ─────────────────────────────────────────────────────────────

export const POKEMON = {
  // ── 스타터 3종 ────────────────────────────────────────────
  // 시작 카드 한 장이 그 스타터의 플레이 방향을 그대로 말해 준다.
  // signatures: 시작 덱에 들어가는 두 장. 한 장이 깔고 한 장이 거둔다.
  //             cards: 야생으로 만나 합류했을 때 덱에 섞이는 두 장.
  charmander: {
    id: 'charmander', ko: '파이리', types: ['FIRE'], hp: 64,
    body: '#f2803c', accent: '#ffd257', belly: '#f8e3bb',
    starter: true,
    signatures: ['ember', 'kindle'],          // 화상을 붙이고 → 화상만큼 때린다
    cards: ['ember', 'scratch'],
    blurb: '꼬리의 불꽃이 기분을 말해 준다. 화상을 쌓을수록 한 방이 커진다.',
    style: '쌓아서 태운다',
  },
  squirtle: {
    id: 'squirtle', ko: '꼬부기', types: ['WATER'], hp: 66,
    body: '#5aa8dc', accent: '#a8dcf0', belly: '#f2e2b8',
    starter: true,
    signatures: ['withdraw', 'shellstrike'],  // 방어도를 쌓고 → 방어도로 때린다
    cards: ['withdraw', 'watergun'],
    blurb: '등껍질에 숨어 버틴다. 쌓아 둔 방어도가 그대로 공격이 된다.',
    style: '버티며 되받아친다',
  },
  bulbasaur: {
    id: 'bulbasaur', ko: '이상해씨', types: ['GRASS', 'POISON'], hp: 54,
    body: '#63bc7a', accent: '#4f9e52', belly: '#bfe0a8',
    starter: true,
    signatures: ['leechseed', 'absorb'],      // 독을 얹고 → 빨아먹으며 버틴다
    cards: ['leechseed', 'vinewhip'],
    blurb: '등의 씨앗이 자란다. 독을 얹고 빨아먹으며 시간을 번다.',
    style: '독과 흡수로 길게 간다',
  },

  // ── 야생에서 합류하는 종 ──────────────────────────────────
  pikachu: {
    id: 'pikachu', ko: '피카츄', types: ['ELECTRIC'], hp: 30,
    body: '#f2cf2e', accent: '#8a5a1a', belly: '#f8e88a',
    cards: ['thundershock', 'quickattack'],
    blurb: '볼주머니에 전기를 모은다. 마비로 적의 에너지를 깎는다.',
  },
  rattata: {
    id: 'rattata', ko: '꼬렛', types: ['NORMAL'], hp: 26,
    body: '#9b6ac4', accent: '#f2e2b8', belly: '#e8d8b0',
    cards: ['bite', 'tackle'],
    blurb: '어디에나 있고 무엇이든 문다. 값싸게 덱을 굴린다.',
  },
  pidgey: {
    id: 'pidgey', ko: '구구', types: ['NORMAL', 'FLYING'], hp: 32,
    body: '#c8a878', accent: '#f0e0c0', belly: '#f4ead4',
    cards: ['gust', 'sandattack'],
    blurb: '땅 기술이 통하지 않는다. 지진 예고를 통째로 흘려보낸다.',
  },
  sandshrew: {
    id: 'sandshrew', ko: '모래두지', types: ['GROUND'], hp: 42,
    body: '#e8d08a', accent: '#c4a860', belly: '#f4e8c0',
    cards: ['dig', 'defensecurl'],
    blurb: '전기가 통하지 않는다. 몸을 말아 단단해진다.',
  },
  zubat: {
    id: 'zubat', ko: '주뱃', types: ['POISON', 'FLYING'], hp: 28,
    body: '#7a8ad0', accent: '#5a68a8', belly: '#a8b4e0',
    cards: ['poisonfang', 'supersonic'],
    blurb: '격투·땅이 통하지 않는다. 독을 물어 넣는다.',
  },
  vulpix: {
    id: 'vulpix', ko: '식스테일', types: ['FIRE'], hp: 32,
    body: '#d4703c', accent: '#f0c060', belly: '#f4d8a0',
    cards: ['willowisp', 'quickattack'],
    blurb: '꼬리가 여섯이다. 도깨비불로 상대의 이빨을 뽑는다.',
  },
  poliwag: {
    id: 'poliwag', ko: '발챙이', types: ['WATER'], hp: 34,
    body: '#4a8ad0', accent: '#2b2118', belly: '#f4f0e0',
    cards: ['bubblebeam', 'watergun'],
    blurb: '배의 소용돌이가 돈다. 물로 밀어붙인다.',
  },
  geodude: {
    id: 'geodude', ko: '꼬마돌', types: ['ROCK', 'GROUND'], hp: 46,
    body: '#a09080', accent: '#786858', belly: '#b8a898',
    cards: ['rockthrow', 'harden'],
    blurb: '단단하지만 물·풀에 네 배로 녹는다. 감수하고 쓰는 벽.',
  },
  abra: {
    id: 'abra', ko: '캐이시', types: ['PSYCHIC'], hp: 24,
    body: '#e8c060', accent: '#9b6a3a', belly: '#f0d890',
    cards: ['confusion', 'teleport'],
    blurb: '거의 자고 있다. 텔레포트로 교체를 공짜로 만든다.',
  },
  gastly: {
    id: 'gastly', ko: '고오스', types: ['GHOST', 'POISON'], hp: 26,
    body: '#6a5a9c', accent: '#3a3060', belly: '#8a7ac0',
    cards: ['nightshade', 'lick'],
    blurb: '노말·격투·벌레가 통하지 않는다. 실체가 없는 벽.',
  },
  caterpie: {
    id: 'caterpie', ko: '캐터피', types: ['BUG'], hp: 30,
    body: '#8ac03c', accent: '#d04030', belly: '#b8d878',
    cards: ['stringshot', 'bugbite'],
    blurb: '실을 뿜어 적을 묶는다. 값싸고 성가시다.',
  },
  machop: {
    id: 'machop', ko: '알통몬', types: ['FIGHT'], hp: 40,
    body: '#a8b0c0', accent: '#d05840', belly: '#c0c8d8',
    cards: ['lowkick', 'bulkup'],
    blurb: '팔뚝이 전부다. 랭크를 올려 한 방을 키운다.',
  },
  magnemite: {
    id: 'magnemite', ko: '코일', types: ['ELECTRIC', 'STEEL'], hp: 36,
    body: '#b8c4d2', accent: '#d04030', belly: '#e0e8f0',
    cards: ['metalclaw', 'thundershock'],
    blurb: '내성이 열 가지가 넘는다. 독이 아예 통하지 않는다.',
  },
};

export const ALL_SPECIES = Object.keys(POKEMON);
export const STARTERS = ALL_SPECIES.filter((id) => POKEMON[id].starter);
/** 런 중 합류 후보 — 스타터도 야생으로 만날 수 있다 */
export const RECRUITABLE = ALL_SPECIES;

export const speciesOf = (id) => POKEMON[id];

/**
 * 종 데이터 → 파티에 들어가는 실제 개체.
 * 종은 읽기 전용 표이고, 개체가 HP 같은 변하는 값을 들고 다닌다.
 */
export function createMember(speciesId) {
  const sp = POKEMON[speciesId];
  return {
    species: speciesId,
    ko: sp.ko,
    types: sp.types.slice(),
    maxHp: sp.hp,
    hp: sp.hp,
    fainted: false,
    // 상태이상은 개체에 붙는다 — 교체해도 따라가고, 전투가 끝나면 낫는다
    status: { POISON: 0, BURN: 0, PARA: 0, FREEZE: 0 },
  };
}
