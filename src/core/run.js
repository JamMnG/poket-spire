// ─────────────────────────────────────────────────────────────
// run.js — 런 하나의 상태와 진행
//
// 화면(main.js)은 여기 있는 값을 읽어 그리고, 여기 있는 함수만 부른다.
// 규칙이 화면 코드로 새어 나가면 나중에 화면을 바꿀 때마다 밸런스가
// 같이 흔들리기 때문이다.
//
// 카드 보상은 **파티가 가진 타입** 으로 거른다. 이게 이 게임에서 파티
// 구성이 갖는 가장 큰 무게다 — 잡은 포켓몬이 앞으로 볼 카드를 정한다.
// 무속성·노말은 언제나 나온다(누구나 쓸 수 있으므로).
// ─────────────────────────────────────────────────────────────
import { createStreams, randomSeed } from './rng.js';
import { POKEMON, createMember } from '../data/pokemon.js';
import { CARDS, POOL_IDS, makeCard, reviveCard } from '../data/cards.js';
import { RELICS, availableRelics, sumField } from '../data/relics.js';
import { ACTS, actOf, ACT_COUNT, ACT_CLEAR_REWARD } from '../data/acts.js';
import { generateMap, reachableFrom } from '../data/mapGen.js';
import { pickEvent } from '../data/events.js';

export const BASE_PARTY_SLOTS = 3;
export const STARTING_GOLD = 99;

export function createRun({ seed = randomSeed(), starterId = 'charmander', saved = null } = {}) {
  // 이어하기면 적어 둔 시드로 되살린다 — 시드가 다르면 지도부터 딴 판이 된다
  if (saved) { seed = saved.seed; starterId = saved.starter || starterId; }
  const streams = createStreams(seed);

  const R = {
    seed,
    starter: starterId,
    streams,
    act: 1,
    party: [ createMember(starterId) ],
    deck: [],
    relics: [],
    gold: STARTING_GOLD,
    map: generateMap(streams.map, ACTS[0].floors),
    currentNode: null,
    visitedFloors: 0,
    eventsSeen: [],
    weakUsed: 0,
    usedEncounters: [],
    request: null,          // UI에 무언가를 띄워 달라는 신호
    lastRoom: null,
    lastCombatRoom: null,   // 전투 중 저장했을 때 어떤 방이었는지
    won: false,
    dead: false,
  };

  // ── 시작 덱 (10장) ────────────────────────────────────────
  // 기본 공격 4 / 기본 방어 4 / 스타터 고유 2.
  // 고유 카드를 두 장 주는 게 핵심이다 — 한 장뿐이던 시절에는 스타터 셋이
  // 사실상 같은 덱으로 시작해서, 고른 파트너가 첫 판에 아무 차이도 안 냈다.
  const sp = POKEMON[starterId];
  for (let i = 0; i < 4; i++) R.deck.push(makeCard('tackle'));
  for (let i = 0; i < 4; i++) R.deck.push(makeCard('defend'));
  for (const id of sp.signatures) R.deck.push(makeCard(id, { owner: starterId }));

  // ── 저장에서 되살리기 ─────────────────────────────────────
  // 위에서 만든 기본값을 통째로 덮어쓴다. 지도를 다시 만들지 않고 적어 둔
  // 것을 그대로 쓰는 게 중요하다 — 같은 시드라도 스트림을 몇 번 굴렸느냐에
  // 따라 다음 지도가 달라지기 때문이다.
  if (saved) {
    R.act = saved.act;
    R.party = saved.party.map((m) => {
      const mem = createMember(m.species);
      mem.hp = m.hp; mem.maxHp = m.maxHp; mem.fainted = !!m.fainted;
      mem.status = { ...mem.status, ...(m.status || {}) };
      return mem;
    });
    R.deck = saved.deck.map(reviveCard);
    R.relics = saved.relics.slice();
    R.gold = saved.gold;
    R.map = saved.map;
    R.currentNode = saved.currentNode;
    R.visitedFloors = saved.visitedFloors;
    R.eventsSeen = (saved.eventsSeen || []).slice();
    R.weakUsed = saved.weakUsed || 0;
    R.usedEncounters = (saved.usedEncounters || []).slice();
    R.lastRoom = saved.lastRoom;
    streams.setState(saved.rng);
  }

  // ── 파티 ─────────────────────────────────────────────────
  const partySlots = () => BASE_PARTY_SLOTS + (R.relics.some((id) => RELICS[id]?.extraPartySlot) ? 1 : 0);
  const partyHasRoom = () => R.party.length < partySlots();
  const hasSpecies = (id) => R.party.some((m) => m.species === id);

  /** 이 막에서 만날 수 있는 야생 종 */
  const catchablesHere = () => actOf(R.act).catchable.filter((id) => !hasSpecies(id));

  function catchPokemon(speciesId) {
    if (!partyHasRoom() || hasSpecies(speciesId)) return false;
    const m = createMember(speciesId);
    m.maxHp += sumField(R.relics, 'maxHpBonus');
    m.hp = m.maxHp;
    R.party.push(m);
    // 합류 카드는 그 포켓몬 소유다 — 쓰러지면 못 쓴다
    for (const cid of POKEMON[speciesId].cards) R.deck.push(makeCard(cid, { owner: speciesId }));
    return true;
  }

  // ── HP ───────────────────────────────────────────────────
  const activeMember = () => R.party.find((m) => !m.fainted) || R.party[0];
  const healActive = (n) => { const m = activeMember(); m.hp = Math.min(m.maxHp, m.hp + n); };
  const damageActive = (n) => { const m = activeMember(); m.hp = Math.max(1, m.hp - n); };
  const healAll = (n) => { for (const m of R.party) { m.fainted = false; m.hp = Math.min(m.maxHp, m.hp + n); } };
  const healAllPercent = (p) => { for (const m of R.party) { m.fainted = false; m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp * p)); } };
  const raiseMaxHpAll = (n) => { for (const m of R.party) { m.maxHp += n; m.hp += n; } };

  const totalHp = () => R.party.reduce((s, m) => s + m.hp, 0);
  const totalMaxHp = () => R.party.reduce((s, m) => s + m.maxHp, 0);

  // ── 도구 ─────────────────────────────────────────────────
  function addRelic(id) {
    if (!id || R.relics.includes(id)) return null;
    R.relics.push(id);
    const rel = RELICS[id];
    if (rel.maxHpBonus) {
      for (const m of R.party) {
        m.maxHp += rel.maxHpBonus;
        if (rel.healOnPickup) m.hp += rel.maxHpBonus;
      }
    }
    return rel.ko;
  }

  function grantRandomRelic(rarities) {
    const pool = availableRelics(R.relics, rarities);
    if (!pool.length) return null;
    return addRelic(streams.reward.pick(pool));
  }

  // ── 덱 ───────────────────────────────────────────────────
  const addCard = (id, opts) => { R.deck.push(makeCard(id, opts)); };
  const removeCard = (uid) => { R.deck = R.deck.filter((c) => c.uid !== uid); };
  const upgradeCard = (uid) => { const c = R.deck.find((x) => x.uid === uid); if (c) c.upgraded = true; };

  /** 파티 타입 + 무속성/노말 로 거른 보상 후보 */
  function rewardPool() {
    const mine = new Set();
    for (const m of R.party) for (const t of m.types) mine.add(t);
    return POOL_IDS.filter((id) => {
      const t = CARDS[id].type;
      return t === null || t === 'NORMAL' || mine.has(t);
    });
  }

  /** 등급을 굴려 카드 세 장. 한 번에 같은 카드가 두 번 나오지 않는다 */
  function rollCardReward(count = 3, { rareBias = 0 } = {}) {
    const pool = rewardPool();
    const rng = streams.reward;
    const out = [];
    const taken = new Set();
    let guard = 0;
    while (out.length < count && guard++ < 200) {
      const roll = rng.next() + rareBias;
      const want = roll > 0.94 ? 'RARE' : roll > 0.62 ? 'UNCOMMON' : 'COMMON';
      const tier = pool.filter((id) => CARDS[id].rarity === want && !taken.has(id));
      const pick = tier.length ? rng.pick(tier) : rng.pick(pool.filter((id) => !taken.has(id)) || pool);
      if (!pick) break;
      taken.add(pick);
      out.push(pick);
    }
    return out;
  }

  // ── 적 편성 ──────────────────────────────────────────────
  function rollEncounter(kind) {
    const rng = streams.map;
    const act = actOf(R.act);
    if (kind === 'BOSS') return { ids: act.boss };
    if (kind === 'ELITE') return { ids: rng.pick(act.elite) };
    // 막마다 처음 두세 판은 쉬운 조합에서만 — 들어서자마자 죽으면 배울 기회가 없다
    const table = R.weakUsed < (R.act === 1 ? 3 : 2) ? act.weak : act.normal;
    if (table === act.weak) R.weakUsed++;
    const fresh = table.filter((ids) => !R.usedEncounters.includes(ids.join(',')));
    const chosen = rng.pick(fresh.length ? fresh : table);
    R.usedEncounters.push(chosen.join(','));
    if (R.usedEncounters.length > 6) R.usedEncounters.shift();
    return { ids: chosen };
  }

  /**
   * 지금 이 자리의 난이도 배율 — 전투를 만들 때 넘긴다.
   * 막 배율에 **막 안의 진행도**를 얹는다. 같은 종이라도 위층에서 만나면
   * 더 크고 더 아프다. 덱은 한 층 오를 때마다 카드가 붙으며 자라는데
   * 적이 막 내내 그대로면, 막 후반부는 무조건 심심해지기 때문이다.
   */
  const actMul = (kind) => {
    const a = actOf(R.act);
    // 보스는 램프를 안 받는다. 어차피 막 꼭대기에만 있어서 진행도가 늘 1이고,
    // 거기에 램프까지 곱하면 수치가 두 번 올라 벽이 된다 — 그렇게 뒀더니
    // 24판 중 16판이 1막 보스에서 끝났다. 보스 수치는 enemies.js 에 "막
    // 마지막에 만나는 것" 기준으로 적혀 있으니 막 배율만 곱한다.
    const p = kind === 'BOSS' ? 0 : Math.min(1, R.visitedFloors / Math.max(1, a.floors - 1));
    return {
      hpMul: a.hpMul * (1 + (a.hpRamp ?? 0) * p),
      dmgMul: a.dmgMul * (1 + (a.dmgRamp ?? 0) * p),
    };
  };

  /**
   * 보스를 잡고 다음 막으로. 마지막 막이면 false 를 돌려준다.
   * 적만 세지면 벽이 되므로 여기서 플레이어도 같이 키운다.
   */
  function advanceAct() {
    if (R.act >= ACT_COUNT) { R.won = true; return false; }
    R.act += 1;
    const rw = ACT_CLEAR_REWARD;
    raiseMaxHpAll(rw.maxHpUp);
    if (rw.fullHeal) healAll(999);
    R.gold += rw.gold;
    // 새 막 = 새 지도
    R.map = generateMap(streams.map, actOf(R.act).floors);
    R.currentNode = null;
    R.visitedFloors = 0;
    R.weakUsed = 0;
    R.usedEncounters = [];
    R.eventsSeen = [];
    return true;
  }

  // ── 보상 ─────────────────────────────────────────────────
  function goldReward(kind) {
    const rng = streams.reward;
    const base = kind === 'BOSS' ? rng.range(95, 110)
      : kind === 'ELITE' ? rng.range(25, 35)
      : rng.range(10, 20);
    const mul = R.relics.reduce((acc, id) => acc * (RELICS[id]?.goldMul?.() ?? 1), 1);
    return Math.round(base * mul);
  }

  // ── 지도 이동 ────────────────────────────────────────────
  const options = () => reachableFrom(R.map, R.currentNode);

  function travelTo(nodeId) {
    if (!options().includes(nodeId)) return null;
    R.currentNode = nodeId;
    const node = R.map.nodes[nodeId];
    R.visitedFloors = node.floor + 1;
    R.lastRoom = node.type;
    return node;
  }

  // ── 상점 ─────────────────────────────────────────────────
  function rollShop() {
    const rng = streams.shop;
    const pool = rewardPool();
    const cardIds = rng.sample(pool, 5);
    const relicPool = availableRelics(R.relics);
    const relicIds = rng.sample(relicPool, 2);
    const priceOf = (rarity) => ({ COMMON: 50, UNCOMMON: 75, RARE: 110 }[rarity] ?? 60);
    return {
      cards: cardIds.map((id) => ({ id, price: Math.round(priceOf(CARDS[id].rarity) * rng.range(90, 110) / 100) })),
      relics: relicIds.map((id) => ({ id, price: Math.round(({ COMMON: 130, UNCOMMON: 170, RARE: 240 }[RELICS[id].rarity] ?? 150) * rng.range(90, 110) / 100) })),
      removal: { price: 75, used: false },
    };
  }

  // ── 이벤트가 쓰는 창구 ────────────────────────────────────
  const eventApi = {
    get rng() { return streams.event; },
    get gold() { return R.gold; },
    hasSpecies, partyHasRoom, catchPokemon, catchablesHere,
    healActive, healAll, damageActive, raiseMaxHpAll,
    addGold: (n) => { R.gold = Math.max(0, R.gold + n); },
    grantRandomRelic: () => grantRandomRelic(),
    openUpgrade: () => { R.request = { kind: 'UPGRADE' }; },
    openRemove: () => { R.request = { kind: 'REMOVE' }; },
    startElite: () => { R.request = { kind: 'COMBAT', roomType: 'ELITE' }; },
  };

  return {
    state: R,
    // 파티
    partySlots, partyHasRoom, hasSpecies, catchPokemon, catchablesHere, activeMember,
    healActive, healAll, healAllPercent, damageActive, raiseMaxHpAll, totalHp, totalMaxHp,
    // 자원
    addRelic, grantRandomRelic, addCard, removeCard, upgradeCard,
    addGold: (n) => { R.gold = Math.max(0, R.gold + n); },
    // 진행
    options, travelTo, rollEncounter, rollCardReward, goldReward, rollShop,
    actMul, advanceAct, act: () => actOf(R.act), actCount: ACT_COUNT,
    pickEvent: () => {
      const id = pickEvent(streams.event, R.eventsSeen);
      R.eventsSeen.push(id);
      return id;
    },
    eventApi,
  };
}
