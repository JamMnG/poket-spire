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
import { CARDS, POOL_IDS, makeCard } from '../data/cards.js';
import { RELICS, availableRelics, sumField } from '../data/relics.js';
import { ENCOUNTERS } from '../data/enemies.js';
import { generateMap, reachableFrom } from '../data/mapGen.js';
import { pickEvent } from '../data/events.js';

export const BASE_PARTY_SLOTS = 3;
export const STARTING_GOLD = 99;

export function createRun({ seed = randomSeed(), starterId = 'charmander' } = {}) {
  const streams = createStreams(seed);

  const R = {
    seed,
    streams,
    act: 1,
    party: [ createMember(starterId) ],
    deck: [],
    relics: [],
    gold: STARTING_GOLD,
    map: generateMap(streams.map),
    currentNode: null,
    visitedFloors: 0,
    eventsSeen: [],
    weakUsed: 0,
    usedEncounters: [],
    request: null,          // UI에 무언가를 띄워 달라는 신호
    lastRoom: null,
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

  // ── 파티 ─────────────────────────────────────────────────
  const partySlots = () => BASE_PARTY_SLOTS + (R.relics.some((id) => RELICS[id]?.extraPartySlot) ? 1 : 0);
  const partyHasRoom = () => R.party.length < partySlots();
  const hasSpecies = (id) => R.party.some((m) => m.species === id);

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
    if (kind === 'BOSS') return ENCOUNTERS.boss[0];
    if (kind === 'ELITE') return rng.pick(ENCOUNTERS.elite);
    // 처음 세 판은 쉬운 조합에서만 — 첫 전투에서 죽는 로그라이크는 배울 기회를 안 준다
    const table = R.weakUsed < 3 ? ENCOUNTERS.weak : ENCOUNTERS.normal;
    if (R.weakUsed < 3) R.weakUsed++;
    const fresh = table.filter((e) => !R.usedEncounters.includes(e.ids.join(',')));
    const chosen = rng.pick(fresh.length ? fresh : table);
    R.usedEncounters.push(chosen.ids.join(','));
    if (R.usedEncounters.length > 6) R.usedEncounters.shift();
    return chosen;
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
    hasSpecies, partyHasRoom, catchPokemon,
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
    partySlots, partyHasRoom, hasSpecies, catchPokemon, activeMember,
    healActive, healAll, healAllPercent, damageActive, raiseMaxHpAll, totalHp, totalMaxHp,
    // 자원
    addRelic, grantRandomRelic, addCard, removeCard, upgradeCard,
    addGold: (n) => { R.gold = Math.max(0, R.gold + n); },
    // 진행
    options, travelTo, rollEncounter, rollCardReward, goldReward, rollShop,
    pickEvent: () => {
      const id = pickEvent(streams.event, R.eventsSeen);
      R.eventsSeen.push(id);
      return id;
    },
    eventApi,
  };
}
