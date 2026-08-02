// ─────────────────────────────────────────────────────────────
// tools/balance.js — 밸런스 측정기 (개발용, 게임에는 안 실려 있다)
//
// 난이도를 손으로 찍어 맞추면 반드시 틀린다. 사람이 한 판 도는 데 20분이
// 걸리는데, 숫자 하나 바꿀 때마다 세 스타터로 다시 돌 수는 없기 때문이다.
// 그래서 화면 없이 규칙만 돌리는 판을 만들어 두고 수백 판을 재서 고쳤다.
//
//   브라우저 콘솔에서
//     const B = await import('./tools/balance.js');
//     await B.measure(8);            // 스타터 3종 × 8판 = 24판
//     await B.encounterTable();      // 배율까지 반영한 적 수치표
//
// 여기 봇은 사람보다 못 둔다. 카드 순서를 안 짜고, 교체도 단순히 "다음
// 턴에 아플 것 같으면" 만 본다. 그래서 봇 승률은 사람 승률의 **아래쪽
// 경계**로 읽어야 한다 — 봇이 35% 면 사람은 대략 60~70% 근처다.
// ─────────────────────────────────────────────────────────────
import { createRun } from '../src/core/run.js';
import { createCombat } from '../src/combat/combat.js';
import { resolveCard, CARDS } from '../src/data/cards.js';
import { ACTS } from '../src/data/acts.js';
import { enemyOf } from '../src/data/enemies.js';
import { POKEMON } from '../src/data/pokemon.js';

/** 한 막에서 밟는 방 — 실제 지도에서 나오는 비율에 가깝게 */
const PLAN = ['M', 'M', 'C', 'M', 'M', 'E', 'R', 'M', 'M', 'S', 'M', 'R', 'B'];

/** 배율을 즉석에서 갈아 끼운다. [[hpMul,hpRamp,dmgMul,dmgRamp], ...] */
export function setKnobs(k) {
  k.forEach((v, i) => {
    const a = ACTS[i];
    [a.hpMul, a.hpRamp, a.dmgMul, a.dmgRamp] = v;
  });
  return ACTS.map((a) => `${a.n}: hp ${a.hpMul}+${a.hpRamp} / dmg ${a.dmgMul}+${a.dmgRamp}`).join('\n');
}

export const getKnobs = () => ACTS.map((a) => [a.hpMul, a.hpRamp, a.dmgMul, a.dmgRamp]);

/** 전투 하나를 봇이 끝까지 둔다 */
async function fight(run, kind) {
  const { hpMul, dmgMul } = run.actMul(kind);
  const multi = run.isMulti();
  const C = createCombat({
    party: run.state.party, deckCards: run.state.deck, relics: run.state.relics,
    // 멀티: 좌석마다 자기 덱. 봇은 좌석을 차례로 두게 된다(endTurn 이 넘긴다)
    seats: multi ? run.state.players.map((p) => ({ name: p.name, deck: p.deck })) : null,
    encounter: run.rollEncounter(kind), hpMul, dmgMul,
    rng: run.state.streams.combat, onChange: () => {}, onFx: () => {}, speed: 0,
  });
  C.begin();
  let turns = 0;
  while (C.state.phase === 'PLAYER' && turns < 60) {
    turns++;
    const S = C.state;
    const incomingFor = (i) => C.aliveEnemies()
      .reduce((s, e) => { const p = C.previewIntent(e, i); return s + (p && p.total ? p.total : 0); }, 0);

    let incoming = incomingFor();
    const hp = C.activeMember().hp;

    // 아플 것 같으면, 덜 아픈 애로 바꾼다.
    // 멀티에서는 "상성이 나은 애"만이 아니라 "아직 팔팔한 애"로 바꾸는 것도
    // 중요하다 — 앞사람 하나가 모든 피해를 받으므로 돌려 가며 맞아야 한다.
    if (C.canSwitch() && (incoming > hp * 0.5 || hp < C.activeMember().maxHp * 0.35)) {
      let best = -1, score = 0;
      S.party.forEach((m, i) => {
        if (i === S.active || m.fainted || m.hp < m.maxHp * 0.4) return;
        const after = incomingFor(i);
        // 줄어드는 피해 + 더 두꺼운 체력만큼 점수를 준다
        const gain = (incoming - after) + (m.hp - hp) * 0.35;
        if (gain > score) { score = gain; best = i; }
      });
      if (best >= 0 && score >= 8) { C.switchTo(best); incoming = incomingFor(); }
    }

    // 들어올 만큼은 막고, 나머지는 전부 때린다
    const needBlock = incoming >= Math.min(10, hp * 0.25) ? incoming : 0;
    let guard = 0;
    while (guard++ < 20) {
      const playable = S.hand.filter((h) => C.playability(h).ok);
      if (!playable.length) break;
      let pick = null;
      if (S.block < needBlock) {
        pick = playable.find((h) => resolveCard(h).effects.some((o) => o.op === 'block' || o.op === 'blockScaled'));
      }
      if (!pick) pick = playable.find((h) => resolveCard(h).kind === 'ATTACK') || playable[0];
      // 남은 HP가 제일 적은 놈부터 끊는다. 하나를 지우면 그 놈 몫의 피해가
      // 통째로 사라지므로, 둘을 고르게 깎는 것보다 언제나 낫다
      const foe = C.aliveEnemies().slice().sort((a, b) => a.hp + a.block - (b.hp + b.block))[0];
      C.playCard(pick.uid, foe && foe.uid);
    }
    if (S.phase !== 'PLAYER') break;
    await C.endTurn();
  }
  return { turns, lost: C.state.phase === 'LOST' };
}

// ── 전투 밖에서의 판단 ────────────────────────────────────────
// 처음엔 여기를 통째로 비워 뒀다(보상은 첫 장, 모닥불은 무조건 회복,
// 돈은 한 푼도 안 씀). 그 봇으로 맞춘 난이도는 실제로 돌려 보면 훨씬
// 쉬웠다 — 사람은 3막쯤이면 상점에서 카드 예닐곱 장과 도구 서넛을
// 사 들고 온다. 그 차이를 빼놓고 맞춘 숫자는 의미가 없다.

const RANK = { RARE: 3, UNCOMMON: 2, COMMON: 1 };

/** 보상 세 장 중 무엇을 고를까 — 등급, 그리고 파티 타입과 맞는지 */
function bestCard(run, ids) {
  const mine = new Set();
  for (const m of run.state.party) for (const t of m.types) mine.add(t);
  let best = null, score = -1;
  for (const id of ids) {
    const c = CARDS[id];
    let s = RANK[c.rarity] ?? 1;
    if (c.type && mine.has(c.type)) s += 1.2;     // 자속이 붙는다
    if (c.kind === 'ATTACK') s += 0.4;            // 결국 죽여야 이긴다
    if (s > score) { score = s; best = id; }
  }
  return best;
}

function doShop(run) {
  const shop = run.rollShop();
  // 도구부터. 이 게임에서 도구는 카드보다 확실히 세다
  for (const r of shop.relics) {
    if (run.state.gold >= r.price) { run.addGold(-r.price); run.addRelic(r.id); }
  }
  const wanted = shop.cards
    .map((c) => ({ ...c, s: RANK[CARDS[c.id].rarity] ?? 1 }))
    .sort((a, b) => b.s - a.s);
  for (const c of wanted) {
    if (run.state.gold >= c.price + 40) { run.addGold(-c.price); run.addCard(c.id); }
  }
}

/**
 * 모닥불 — 아프거나 다음이 보스면 눕고, 멀쩡하면 기술을 다듬는다.
 *
 * ★ 판단 기준이 **제일 아픈 한 마리**여야 한다. 파티 전체 HP 비율로 봤더니
 *   3인에서는 안 맞은 두 명이 비율을 끌어올려 봇이 한 번도 안 누웠다.
 *   그 상태로 잰 3인 난이도는 실제보다 훨씬 어렵게 나온다 — 난이도가
 *   아니라 봇의 실수를 재고 있었던 것이다.
 */
function doRest(run, bossNext) {
  // 기절자가 있으면 무조건 치료 — 회복이 더는 부활을 겸하지 않는다
  if (run.state.party.some((m) => m.fainted)) { run.reviveFainted(0.4); return; }
  const worst = Math.min(...run.state.party.map((m) => m.hp / m.maxHp));
  if (bossNext || worst < 0.62) { run.healAllPercent(0.30); return; }
  const c = run.state.deck.find((x) => !x.upgraded);
  if (c) run.upgradeCard(c.uid); else run.healAllPercent(0.30);
}

/** 3막까지 한 판 */
export async function run1(seed, starter, playerCount = 1) {
  const run = playerCount > 1
    ? createRun({ seed, players: Array.from({ length: playerCount }, (_, i) => ({
        name: `${i + 1}P`, starter: ['charmander', 'squirtle', 'bulbasaur'][i % 3],
      })) })
    : createRun({ seed, starterId: starter });
  const stats = [];
  for (let act = 1; act <= 3; act++) {
    const floors = ACTS[act - 1].floors;
    for (let si = 0; si < PLAN.length; si++) {
      // 층 진행도를 흉내낸다 — 램프가 여기에 걸린다
      run.state.visitedFloors = Math.round((si / (PLAN.length - 1)) * (floors - 1));
      const step = PLAN[si];
      if (step === 'R') { doRest(run, PLAN[si + 1] === 'B'); continue; }
      if (step === 'S') { doShop(run); continue; }
      if (step === 'C') {
        const pool = run.catchablesHere();
        if (run.partyHasRoom() && pool.length) run.catchPokemon(pool[0]);
        continue;
      }
      const kind = step === 'E' ? 'ELITE' : step === 'B' ? 'BOSS' : 'MONSTER';
      const before = run.totalHp(), beforeMax = run.totalMaxHp();
      const r = await fight(run, kind);
      stats.push({ act, kind, turns: r.turns, lostPct: (before - run.totalHp()) / beforeMax });
      if (r.lost) return { dead: true, act, kind, stats };
      run.addGold(run.goldReward(kind));
      if (kind === 'BOSS') {
        run.grantRandomRelic(['BOSS']);
        if (act < 3) run.advanceAct();
      } else {
        // 사람마다 자기 몫을 굴려 자기 덱에 넣는다 (main.js 와 같은 순서)
        run.state.players.forEach((p, i) => {
          const ids = run.rollCardReward(3);
          run.asPlayer(i, () => { const id = bestCard(run, ids); if (id) run.addCard(id); });
        });
        if (kind === 'ELITE') run.grantRandomRelic();
      }
    }
  }
  return { dead: false, stats, hp: run.totalHp(), max: run.totalMaxHp(), gold: run.state.gold, deck: run.state.deck.length, relics: run.state.relics.length };
}

/** n판 × 스타터별로 돌려 표를 만든다 */
export async function measure(n = 8, starters = ['charmander', 'squirtle', 'bulbasaur'], playerCount = 1) {
  const agg = {}, deaths = {}, perStarter = {};
  let win = 0, total = 0;
  for (const st of starters) {
    perStarter[st] = 0;
    for (let i = 0; i < n; i++) {
      const r = await run1('S' + i, st, playerCount);
      total++;
      if (r.dead) { const k = `a${r.act}-${r.kind}`; deaths[k] = (deaths[k] || 0) + 1; }
      else { win++; perStarter[st]++; }
      for (const s of r.stats) {
        const k = `a${s.act}-${s.kind}`;
        (agg[k] = agg[k] || { n: 0, turns: 0, lost: 0 });
        agg[k].n++; agg[k].turns += s.turns; agg[k].lost += s.lostPct;
      }
    }
  }
  const t = {};
  for (const k of Object.keys(agg).sort()) {
    const a = agg[k];
    t[k] = `${(a.lost / a.n * 100).toFixed(0)}%HP ${(a.turns / a.n).toFixed(1)}턴 n${a.n}`;
  }
  return { win: `${win}/${total}`, pct: Math.round(win / total * 100), perStarter, deaths, t };
}

/** 2·3인 협동 난이도 — 인원수 배율(acts.js PLAYER_SCALE)을 맞출 때 쓴다 */
export async function measureMulti(n = 8) {
  const out = {};
  for (const c of [1, 2, 3]) {
    const m = await measure(n, ['charmander'], c);
    out[`${c}인`] = { 승률: m.win, 잡몹: [m.t['a1-MONSTER'], m.t['a2-MONSTER'], m.t['a3-MONSTER']],
      보스: [m.t['a1-BOSS'], m.t['a2-BOSS'], m.t['a3-BOSS']], 죽은자리: m.deaths };
  }
  return out;
}

/** 배율까지 반영한 적 수치표 — 어디가 튀는지 눈으로 본다 */
export function encounterTable() {
  const dpt = (d) => {
    const ms = Object.values(d.moves).filter((m) => m.power);
    return ms.length ? ms.reduce((s, m) => s + m.power * (m.hits || 1), 0) / ms.length : 0;
  };
  const at = (a, grp, p) => {
    const hm = a.hpMul * (1 + a.hpRamp * p), dm = a.dmgMul * (1 + a.dmgRamp * p);
    const hp = grp.reduce((s, id) => s + (enemyOf(id).hp[0] + enemyOf(id).hp[1]) / 2, 0) * hm;
    const d = grp.reduce((s, id) => s + dpt(enemyOf(id)), 0) * dm;
    return `${grp.join('+')} HP${Math.round(hp)} 턴당${d.toFixed(1)}`;
  };
  return ACTS.map((a) => ({
    act: `${a.n}막 ${a.name}`,
    '초반 weak': a.weak.map((g) => at(a, g, 0.1)),
    '중반 normal': a.normal.map((g) => at(a, g, 0.5)),
    '후반 normal': a.normal.map((g) => at(a, g, 1)),
    '엘리트(중반)': a.elite.map((g) => at(a, g, 0.5)),
    보스: at(a, a.boss, 0),
  }));
}

/**
 * acts.js 가 가리키는 id 가 전부 실재하는지.
 * 이걸 안 넣었을 때 없는 적 id 로 전투가 터지고, 없는 종 id 로 포획이
 * 터졌다. 둘 다 그 막에 처음 도달해야 보이는 버그라 손으로는 못 잡는다.
 */
export function validate() {
  const bad = [];
  for (const a of ACTS) {
    for (const grp of [...a.weak, ...a.normal, ...a.elite, a.boss]) {
      for (const id of grp) if (!enemyOf(id)) bad.push(`${a.n}막 적: ${id}`);
    }
    for (const id of a.catchable) {
      if (!POKEMON[id]) { bad.push(`${a.n}막 포획: ${id}`); continue; }
      for (const c of POKEMON[id].cards) if (!CARDS[c]) bad.push(`${id} 카드: ${c}`);
    }
  }
  return bad.length ? bad : 'ok';
}
