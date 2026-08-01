// ─────────────────────────────────────────────────────────────
// combat.js — 전투 엔진
//
// 슬더스의 뼈대(에너지 3 / 5장 드로우 / 턴 끝에 방어도 소멸 / 적 의도 공개)
// 위에 포켓몬의 두 축을 얹었다.
//
//   · 타입 상성 — 내 카드가 적을 얼마나 아프게 하는지, 적 기술이 내 선두를
//                 얼마나 아프게 하는지를 동시에 바꾼다
//   · 교체     — 에너지 1을 내고 선두를 바꾼다. 턴에 한 번.
//
// 교체에 값을 매긴 게 이 게임의 중심 저울이다. 공짜면 매 턴 최적 타입을
// 세우게 되어 상성이 퍼즐이 아니라 절차가 되고, 턴을 통째로 쓰게 하면
// (원작 방식) 아무도 안 쓴다. 3에너지 중 1이면 "이번 턴 딜을 3분의 1
// 포기하고 다음 턴 20 피해를 0으로 만들까" 라는 계산이 남는다.
//
// 무엇이 어디에 붙는지:
//   개체(포켓몬)에 — HP, 상태이상        → 교체해도 따라간다
//   필드(선두 자리)에 — 방어도, 능력 랭크 → 교체하면 사라진다 (원작과 같다)
// ─────────────────────────────────────────────────────────────
import { resolveCard } from '../data/cards.js';
import { enemyOf } from '../data/enemies.js';
import { playerDamage, enemyDamage, clampRank, rankMul } from './formula.js';
import { emptyStatus, addStatus, tickStatus } from './status.js';
import { RELICS, runHook, sumHook, mulHook, sumField, anyField } from '../data/relics.js';
import { iGa, eulReul, eunNeun, euro } from '../core/ko.js';

export const HAND_LIMIT = 10;
export const BASE_ENERGY = 3;
export const BASE_DRAW = 5;
export const SWITCH_COST = 1;

let enemyUid = 0;

/**
 * @param party      런의 파티 배열 (그대로 변형한다 — 전투 결과가 런에 남아야 하므로)
 * @param deckCards  덱 개체 배열 [{uid,id,upgraded,owner}]
 * @param relics     가진 도구 id 배열
 * @param encounter  { ids: ['pidgey', ...] }
 * @param rng        전투용 난수 스트림
 * @param onChange   상태가 바뀔 때마다 (UI 리렌더)
 * @param onFx       연출 이벤트
 */
export function createCombat({ party, deckCards, relics = [], encounter, rng, onChange, onFx, speed = 1, hpMul = 1, dmgMul = 1 }) {
  // 화면 쪽 콜백은 엔진 안에서 동기로 불린다. 거기서 난 예외가 그대로
  // 올라오면 전투 진행이 통째로 멈추므로(예전에 그렇게 판이 굳었다),
  // 연출이 실패하더라도 규칙은 계속 돌게 여기서 끊는다.
  const notify = () => {
    if (!onChange) return;
    try { onChange(); } catch (err) { console.error('화면 갱신 실패 — 전투는 계속된다', err); }
  };
  const fx = (e) => {
    if (!onFx) return;
    try { onFx(e); } catch (err) { console.error('연출 실패 — 전투는 계속된다', err); }
  };

  // ── 적 편성 ──────────────────────────────────────────────
  // 적 수치는 1막 기준으로 적혀 있다. 막이 올라가면 여기서 배율을 곱한다.
  // 종을 새로 60개 그리는 대신 같은 종을 다시 만나되 확실히 강해져 있게 한다.
  const enemies = encounter.ids.map((id, i) => {
    const def = enemyOf(id);
    const [lo, hi] = def.hp;
    const maxHp = Math.round(rng.range(lo, hi) * hpMul);
    return {
      uid: ++enemyUid, slot: i, id, ko: def.ko, def,
      types: def.types.slice(),
      hp: maxHp, maxHp,
      block: 0,
      ranks: { ATK: 0, DEF: 0 },
      status: emptyStatus(),
      turn: 0, history: [],
      intent: null,
      dead: false,
    };
  });

  const S = {
    turn: 0,
    phase: 'PLAYER',          // PLAYER | ENEMY | WON | LOST
    busy: false,
    energy: 0,
    maxEnergy: BASE_ENERGY + sumField(relics, 'energyBonus'),
    party,
    active: party.findIndex((m) => !m.fainted),
    block: 0,
    ranks: { ATK: 0, DEF: 0 },
    enemies,
    drawPile: [], hand: [], discardPile: [], exhaustPile: [],
    switchedThisTurn: false,
    cardsThisTurn: 0,
    attacksThisTurn: 0,
    nextMult: 1,
    bonusEnergyNext: 0,
    powers: { SUN: 0, RAIN: 0, AQUA_RING: 0, SANDSTORM: 0, INGRAIN: 0 },
    enduresLeft: anyField(relics, 'endure') ? 1 : 0,
    log: [],
  };

  const active = () => S.party[S.active];
  const aliveEnemies = () => S.enemies.filter((e) => !e.dead);
  const aliveMembers = () => S.party.filter((m) => !m.fainted);
  const say = (t) => { S.log.push(t); if (S.log.length > 40) S.log.shift(); };

  // ── 도구가 부르는 창구 ────────────────────────────────────
  // 도구 정의가 전투 내부 구조를 몰라도 되게 이 얇은 층만 알게 한다.
  const K = {
    get turn() { return S.turn; },
    get cardsThisTurn() { return S.cardsThisTurn; },
    get attacksThisTurn() { return S.attacksThisTurn; },
    gainBlock: (n) => { S.block += n; },
    gainEnergy: (n) => { S.energy += n; },
    healActive: (n) => healMember(active(), n),
    statusAllEnemies: (id, n) => { for (const e of aliveEnemies()) addStatus(e.status, id, n); },
  };

  const resistFloor = (m) => {
    let out = m;
    for (const id of relics) {
      const fn = RELICS[id]?.resistFloor;
      if (fn) out = fn(out);
    }
    return out;
  };
  const burnMul = () => relics.reduce((acc, id) => acc * (RELICS[id]?.burnMul || 1), 1);

  /** 날씨가 더하는 위력 */
  const weatherAdd = (card) =>
    (card.type === 'FIRE' ? S.powers.SUN : 0) + (card.type === 'WATER' ? S.powers.RAIN : 0);

  // ── HP 조작 ──────────────────────────────────────────────
  function healMember(m, n) {
    if (!m || m.fainted || n <= 0) return;
    const before = m.hp;
    m.hp = Math.min(m.maxHp, m.hp + n);
    if (m.hp > before) fx({ kind: 'heal', side: 'player', value: m.hp - before });
  }

  /** 방어도를 거치지 않는 직접 피해 (반동·독·화상) */
  function hurtMemberDirect(m, n) {
    if (!m || n <= 0) return;
    m.hp -= n;
    fx({ kind: 'damage', side: 'player', value: n });
    checkFaint(m);
  }

  function checkFaint(m) {
    if (m.hp > 0 || m.fainted) return;
    m.hp = 0;
    m.fainted = true;
    say(`${iGa(m.ko)} 쓰러졌다!`);
    fx({ kind: 'faint', side: 'player' });

    if (aliveMembers().length === 0) { S.phase = 'LOST'; return; }
    // 강제 교체는 공짜다 — 벌은 이미 포켓몬 하나를 잃은 것으로 충분하다
    const next = S.party.findIndex((x) => !x.fainted);
    S.active = next;
    S.block = 0;
    S.ranks = { ATK: 0, DEF: 0 };
    say(`${euro(S.party[next].ko)} 교체됐다.`);
  }

  /** 적에게 피해 — 방어도부터 깎는다 */
  function hurtEnemy(e, raw, meta = {}) {
    if (e.dead || raw <= 0) return 0;
    let n = raw;
    if (e.block > 0) {
      const absorbed = Math.min(e.block, n);
      e.block -= absorbed;
      n -= absorbed;
    }
    e.hp -= n;
    fx({ kind: 'damage', side: 'enemy', uid: e.uid, value: raw, ...meta });
    if (e.hp <= 0) {
      e.hp = 0; e.dead = true;
      say(`${eulReul(e.ko)} 쓰러뜨렸다!`);
      fx({ kind: 'faint', side: 'enemy', uid: e.uid });
    }
    return n;
  }

  // ── 덱 조작 ──────────────────────────────────────────────
  function reshuffle() {
    if (!S.discardPile.length) return;
    S.drawPile = rng.shuffle(S.discardPile.slice());
    S.discardPile = [];
    say('버린 카드를 다시 섞었다.');
  }

  function draw(n) {
    for (let i = 0; i < n; i++) {
      if (!S.drawPile.length) reshuffle();
      if (!S.drawPile.length) return;              // 덱이 통째로 비었다
      if (S.hand.length >= HAND_LIMIT) {           // 손이 꽉 차면 버려진다
        S.discardPile.push(S.drawPile.pop());
        continue;
      }
      S.hand.push(S.drawPile.pop());
    }
  }

  /** 이 카드를 지금 쓸 수 있나 — 못 쓰면 이유를 돌려준다 */
  function playability(inst) {
    const c = resolveCard(inst);
    if (S.phase !== 'PLAYER' || S.busy) return { ok: false, reason: '내 턴이 아니다' };
    if (c.cost > S.energy) return { ok: false, reason: '에너지가 부족하다' };
    if (c.owner) {
      const owner = S.party.find((m) => m.species === c.owner);
      if (owner && owner.fainted) return { ok: false, reason: `${owner.ko}이(가) 쓰러져 쓸 수 없다` };
    }
    if (c.target === 'ENEMY' && !aliveEnemies().length) return { ok: false, reason: '대상이 없다' };
    return { ok: true };
  }

  // ── 피해 미리보기 ────────────────────────────────────────
  // 카드에 표시되는 숫자와 실제 피해가 같은 함수에서 나오게 한다.
  function previewCard(inst, enemy) {
    const c = resolveCard(inst);
    const dmgOp = c.effects.find((o) =>
      o.op === 'damage' || o.op === 'damageAll' || o.op === 'fixed' || o.op === 'damageScaled');
    if (!dmgOp) return null;
    if (dmgOp.op === 'fixed') return { dmg: dmgOp.amount, hits: 1, mult: 1, fixed: true };

    const target = enemy || aliveEnemies()[0];
    if (!target) return null;
    // 상황 비례 카드는 지금 값으로 환산해 보여 준다 — 실제 계산과 같은 함수를 쓴다
    const power = dmgOp.op === 'damageScaled'
      ? dmgOp.base + scaleValue(dmgOp.per, target) * (dmgOp.mult ?? 1)
      : dmgOp.power;
    const r = playerDamage({
      power,
      moveType: c.type,
      attackerTypes: active()?.types || [],
      defenderTypes: target.types,
      atkRank: S.ranks.ATK,
      defRank: target.ranks.DEF,
      powerAdd: sumHook(relics, 'powerMod', K, c) + weatherAdd(c),
      damageMul: mulHook(relics, 'damageMul', K, c),
      nextMult: c.kind === 'ATTACK' ? S.nextMult : 1,
      burned: (active()?.status?.BURN || 0) > 0,
      resistFloor,
    });
    return { ...r, hits: dmgOp.hits || 1 };
  }

  /**
   * 적 의도가 실제로 몇 대미지인지.
   * memberIndex 를 주면 "그 포켓몬을 앞에 세웠다면" 을 계산한다 —
   * 벤치에 마우스를 올렸을 때 숫자가 바뀌는 게 이 게임의 핵심 정보다.
   */
  function previewIntent(e, memberIndex = S.active) {
    if (!e.intent) return null;
    const mv = e.def.moves[e.intent];
    if (!mv || !mv.power) return null;
    const m = S.party[memberIndex];
    if (!m) return null;
    const r = enemyDamage({
      power: mv.power,
      moveType: mv.type,
      attackerTypes: e.types,
      defenderTypes: m.types,
      atkRank: e.ranks.ATK,
      defRank: memberIndex === S.active ? S.ranks.DEF : 0,   // 교체하면 랭크가 사라지므로
      burned: e.status.BURN > 0,
      paralyzed: e.status.PARA > 0,
      powerMul: dmgMul,
    });
    return { ...r, hits: mv.hits || 1, total: r.dmg * (mv.hits || 1), move: mv };
  }

  // ── 효과 실행 ────────────────────────────────────────────
  function runEffects(c, target) {
    const ctx = { lastDamage: 0 };

    for (const op of c.effects) {
      switch (op.op) {
        case 'damage': {
          const t = target && !target.dead ? target : aliveEnemies()[0];
          if (!t) break;
          const hits = op.hits || 1;
          for (let i = 0; i < hits; i++) {
            if (t.dead) break;
            const r = playerDamage({
              power: op.power,
              moveType: c.type,
              attackerTypes: active().types,
              defenderTypes: t.types,
              atkRank: S.ranks.ATK,
              defRank: t.ranks.DEF,
              powerAdd: sumHook(relics, 'powerMod', K, c) + weatherAdd(c),
              damageMul: mulHook(relics, 'damageMul', K, c),
              nextMult: c.kind === 'ATTACK' ? S.nextMult : 1,
              burned: active().status.BURN > 0,
              resistFloor,
            });
            ctx.lastDamage += hurtEnemy(t, r.dmg, { mult: r.mult, type: c.type });
          }
          break;
        }
        case 'damageAll': {
          for (const t of aliveEnemies()) {
            const r = playerDamage({
              power: op.power,
              moveType: c.type,
              attackerTypes: active().types,
              defenderTypes: t.types,
              atkRank: S.ranks.ATK,
              defRank: t.ranks.DEF,
              powerAdd: sumHook(relics, 'powerMod', K, c) + weatherAdd(c),
              damageMul: mulHook(relics, 'damageMul', K, c),
              nextMult: c.kind === 'ATTACK' ? S.nextMult : 1,
              burned: active().status.BURN > 0,
              resistFloor,
            });
            ctx.lastDamage += hurtEnemy(t, r.dmg, { mult: r.mult, type: c.type });
          }
          break;
        }
        case 'fixed': {
          const t = target && !target.dead ? target : aliveEnemies()[0];
          if (t) ctx.lastDamage += hurtEnemy(t, op.amount, { mult: 1, fixed: true });
          break;
        }
        case 'block':
          S.block += op.amount;
          fx({ kind: 'block', side: 'player', value: op.amount });
          break;
        // 쌓아 둔 방어도를 대가로 쓰는 카드용. 방어도가 실제로 피해를 막게
        // 고친 뒤로, "방어도만큼 때린다" 류가 막기와 때리기를 동시에 하는
        // 이중 이득이 됐다(꼬부기 승률이 다른 스타터의 여섯 배였다).
        // 값을 치르게 해서 둘 중 하나를 고르게 만든다.
        case 'loseBlockRatio':
          S.block = Math.floor(S.block * (1 - op.ratio));
          notify();
          break;
        case 'status': {
          const t = op.to === 'self' ? null : (target && !target.dead ? target : aliveEnemies()[0]);
          if (op.to === 'self') addStatus(active().status, op.status, op.amount);
          else if (t) addStatus(t.status, op.status, op.amount);
          break;
        }
        case 'statusAll':
          for (const t of aliveEnemies()) addStatus(t.status, op.status, op.amount);
          break;
        case 'rank': {
          if (op.to === 'self') {
            S.ranks[op.stat] = clampRank(S.ranks[op.stat] + op.delta);
            fx({ kind: 'rank', side: 'player', stat: op.stat, delta: op.delta });
          } else {
            const t = target && !target.dead ? target : aliveEnemies()[0];
            if (t) {
              t.ranks[op.stat] = clampRank(t.ranks[op.stat] + op.delta);
              fx({ kind: 'rank', side: 'enemy', uid: t.uid, stat: op.stat, delta: op.delta });
            }
          }
          break;
        }
        // ── 상황에 따라 값이 변하는 효과 ──
        // 덱이 두꺼워질수록, 상태이상을 쌓을수록, 파티가 늘수록 세지는 카드들.
        // 고정 수치 카드만 있으면 후반 덱이 "좋은 카드를 더 많이"로만 굴러간다.
        case 'damageScaled': {
          const t = target && !target.dead ? target : aliveEnemies()[0];
          if (!t) break;
          const n = scaleValue(op.per, t);
          const power = op.base + n * (op.mult ?? 1);
          const r = playerDamage({
            power,
            moveType: c.type,
            attackerTypes: active().types,
            defenderTypes: t.types,
            atkRank: S.ranks.ATK,
            defRank: t.ranks.DEF,
            powerAdd: sumHook(relics, 'powerMod', K, c) + weatherAdd(c),
            damageMul: mulHook(relics, 'damageMul', K, c),
            nextMult: c.kind === 'ATTACK' ? S.nextMult : 1,
            burned: active().status.BURN > 0,
            resistFloor,
          });
          ctx.lastDamage += hurtEnemy(t, r.dmg, { mult: r.mult, type: c.type });
          break;
        }
        case 'blockScaled': {
          const n = scaleValue(op.per, aliveEnemies()[0]);
          const amount = op.base + n * (op.mult ?? 1);
          S.block += amount;
          fx({ kind: 'block', side: 'player', value: amount });
          break;
        }
        case 'multiplyStatus': {
          const t = target && !target.dead ? target : aliveEnemies()[0];
          if (!t) break;
          const cur = t.status[op.status] || 0;
          if (cur > 0) addStatus(t.status, op.status, Math.round(cur * (op.mult - 1)));
          break;
        }
        case 'recoverFromDiscard': {
          // 버린 더미에서 무작위로 골라 손으로 되돌린다
          for (let i = 0; i < op.amount && S.discardPile.length; i++) {
            if (S.hand.length >= HAND_LIMIT) break;
            const idx = rng.int(S.discardPile.length);
            S.hand.push(S.discardPile.splice(idx, 1)[0]);
          }
          break;
        }
        case 'energyNextTurn': S.bonusEnergyNext += op.amount; break;

        case 'draw':   draw(op.amount); break;
        case 'energy': S.energy += op.amount; break;
        case 'heal':   healMember(active(), op.amount); break;
        case 'drain':  healMember(active(), Math.floor(ctx.lastDamage * op.ratio)); break;
        case 'recoil': hurtMemberDirect(active(), op.amount); break;
        case 'loseHpRatio': {
          const m = active();
          hurtMemberDirect(m, Math.floor(m.hp * op.ratio));
          break;
        }
        case 'nextMult': S.nextMult = op.mult; break;
        case 'power':
          S.powers[op.id] = (S.powers[op.id] || 0) + op.amount;
          say(`${c.ko}의 효과가 계속된다.`);
          break;
        case 'switchOut':
          pendingSwitch = { keepRanks: !!op.keepRanks, free: !!op.free };
          break;
        default:
          console.warn('알 수 없는 효과', op.op);
      }
      if (S.phase === 'LOST') return;
    }
  }

  /**
   * "무엇에 비례하는가" 를 숫자로 바꾼다.
   * 카드 설명에 뜨는 값도 같은 함수를 쓰므로(previewCard) 예고와 실제가 어긋나지 않는다.
   */
  function scaleValue(per, target) {
    switch (per) {
      case 'CARDS':  return S.cardsThisTurn;                       // 이번 턴 낸 카드 수
      case 'POISON': return target?.status.POISON || 0;
      case 'BURN':   return target?.status.BURN || 0;
      case 'PARTY':  return aliveMembers().length;
      case 'BLOCK':  return S.block;
      case 'STATUS_KINDS':                                          // 대상이 걸린 상태이상 종류 수
        return target ? ['POISON', 'BURN', 'PARA', 'FREEZE'].filter((k) => target.status[k] > 0).length : 0;
      default: return 0;
    }
  }

  /** switchOut 을 가진 카드는 효과가 다 돈 뒤에 교체 화면을 띄운다 */
  let pendingSwitch = null;

  // ── 공개 동작 ────────────────────────────────────────────

  function playCard(uid, targetUid) {
    const i = S.hand.findIndex((c) => c.uid === uid);
    if (i < 0) return false;
    const inst = S.hand[i];
    const check = playability(inst);
    if (!check.ok) return false;

    const c = resolveCard(inst);
    const target = S.enemies.find((e) => e.uid === targetUid) || aliveEnemies()[0];

    S.energy -= c.cost;
    S.hand.splice(i, 1);

    runEffects(c, target);

    // 도우미는 공격 카드 하나만 밀어 준다
    if (c.kind === 'ATTACK' && S.nextMult !== 1) S.nextMult = 1;

    if (c.exhaust) S.exhaustPile.push(inst);
    else S.discardPile.push(inst);

    S.cardsThisTurn++;
    if (c.kind === 'ATTACK') S.attacksThisTurn++;
    runHook(relics, 'onCardPlayed', K, c);
    say(`${c.ko}!`);

    if (pendingSwitch) {
      const opt = pendingSwitch;
      pendingSwitch = null;
      // 바꿀 상대가 없으면 조용히 넘어간다 — 고를 게 없는 선택창은 방해일 뿐이다
      S.awaitSwitch = aliveMembers().length > 1 ? opt : null;
    }

    checkWin();
    notify();
    finish();          // 카드 한 장으로 전투가 끝나는 경우가 대부분이다
    return true;
  }

  /** 교체. free 면 에너지·횟수 제한을 안 탄다 (텔레포트·바톤터치·강제교체) */
  function switchTo(index, opt = {}) {
    if (index === S.active) return false;
    const m = S.party[index];
    if (!m || m.fainted) return false;

    const free = opt.free || anyField(relics, 'freeSwitch');
    if (!opt.free) {
      if (S.switchedThisTurn) return false;
      if (!free && S.energy < SWITCH_COST) return false;
    }

    if (!opt.free && !free) S.energy -= SWITCH_COST;
    if (!opt.free) S.switchedThisTurn = true;

    S.active = index;
    S.block = 0;                                   // 방어도는 자리에 붙어 있다
    if (!opt.keepRanks) S.ranks = { ATK: 0, DEF: 0 };
    S.awaitSwitch = null;
    say(`가랏, ${m.ko}!`);
    fx({ kind: 'switch', side: 'player' });
    notify();
    return true;
  }

  const canSwitch = () =>
    S.phase === 'PLAYER' && !S.busy && !S.switchedThisTurn &&
    (anyField(relics, 'freeSwitch') || S.energy >= SWITCH_COST) &&
    aliveMembers().length > 1;

  function checkWin() {
    if (S.phase !== 'PLAYER' && S.phase !== 'ENEMY') return;
    if (aliveEnemies().length === 0) {
      S.phase = 'WON';
      // 쓰러진 포켓몬은 HP 1로 일어난다. 완전 회복은 포켓몬센터에서.
      for (const m of S.party) if (m.fainted) { m.fainted = false; m.hp = 1; }
      runHook(relics, 'onCombatEnd', K);
      say('전투에서 이겼다!');
    }
  }

  // ── 턴 흐름 ──────────────────────────────────────────────
  function rollIntents() {
    for (const e of aliveEnemies()) {
      e.turn++;
      if (e.status.FREEZE > 0) { e.intent = null; continue; }
      e.intent = e.def.nextMove(e, rng);
    }
  }

  function startPlayerTurn() {
    // ★ 방어도는 **여기서** 사라진다. 예전에는 내 턴이 끝날 때 지웠는데,
    //   그러면 적이 때리기도 전에 0이 되어 방어 카드가 게임 내내 아무 일도
    //   하지 않았다. 방어도 20에 7 피해를 받으면 HP 가 그대로 7 깎였다.
    //   막으라고 있는 것이 적 턴을 못 버티면 존재 이유가 없다.
    //   (빛의점토가 있으면 그 비율만큼 다음 턴으로 넘어간다)
    const keep = Math.max(0, ...relics.map((id) => RELICS[id]?.blockKeepRatio?.() || 0));
    S.block = Math.floor(S.block * keep);

    S.turn++;
    S.phase = 'PLAYER';
    S.switchedThisTurn = false;
    S.cardsThisTurn = 0;
    S.attacksThisTurn = 0;
    S.nextMult = 1;

    S.energy = S.maxEnergy + S.bonusEnergyNext;
    S.bonusEnergyNext = 0;
    runHook(relics, 'onTurnStart', K);
    if (active().status.PARA > 0) S.energy = Math.max(0, S.energy - 1);

    const extra = S.turn === 1 ? sumField(relics, 'extraOpeningDraw') : 0;
    draw(Math.max(1, BASE_DRAW + extra - sumField(relics, 'drawPenalty')));
    notify();
  }

  function discardHand() {
    S.discardPile.push(...S.hand);
    S.hand = [];
  }

  /**
   * 적 턴 연출 사이의 뜸.
   *
   * speed = 0 이면 기다리지 않는다 — 밸런스를 볼 때 수백 판을 돌려야 하는데
   * 연출 시간까지 그대로 기다리면 확인 자체가 불가능해진다.
   *
   * ★ 탭이 가려져 있을 때도 기다리지 않는다. 크롬은 배경 탭의 setTimeout 을
   *   초당 한 번으로 조이기 때문에, 적 턴 한 번에 뜸이 예닐곱 번 들어가는
   *   이 게임에서는 8초씩 걸려 **멈춘 것처럼 보인다**. 실제로 그렇게 굳은 줄
   *   알고 한참 헤맸다. 어차피 아무도 안 보고 있는 연출이므로 건너뛴다.
   */
  const pause = (ms) => (
    speed <= 0 || (typeof document !== 'undefined' && document.hidden)
      ? Promise.resolve()
      : new Promise((r) => setTimeout(r, ms / speed))
  );

  /**
   * 턴 종료 → 적 턴 → 다음 내 턴.
   *
   * ★ 본체를 try/finally 로 감싼 이유: 예전에는 busy 를 마지막에 손으로 껐는데,
   *   적 턴 도중 어디서든 예외가 하나 나면 busy 가 true 로 남아 판이 영구히
   *   굳었다. 실제로 그렇게 멈춘 판을 만났다 — 버튼은 "적의 턴…" 인 채
   *   아무 입력도 받지 않는다. 무엇이 터지든 조종권은 플레이어에게 돌려준다.
   */
  async function endTurn() {
    if (S.phase !== 'PLAYER' || S.busy) return;
    S.busy = true;
    S.awaitSwitch = null;
    try {
      await runTurn();
    } catch (err) {
      console.error('적 턴 처리 중 오류 — 내 턴으로 되돌린다', err);
      if (S.phase === 'ENEMY') { rollIntents(); startPlayerTurn(); }
    } finally {
      S.busy = false;
      notify();                 // busy 가 풀린 걸 화면에 반영해야 버튼이 다시 살아난다
    }
    return finish();
  }

  async function runTurn() {
    // ── 내 턴 마무리 ──
    runHook(relics, 'onTurnEnd', K);
    if (S.powers.AQUA_RING) healMember(active(), S.powers.AQUA_RING);
    if (S.powers.SANDSTORM) for (const e of aliveEnemies()) hurtEnemy(e, S.powers.SANDSTORM);

    // 적 도트 피해
    for (const e of aliveEnemies()) {
      const d = tickStatus(e.status, { burnMul: burnMul() });
      if (d) hurtEnemy(e, d, { dot: true });
    }
    // 내 도트 피해
    const mine = tickStatus(active().status);
    if (mine) hurtMemberDirect(active(), mine);

    discardHand();

    // 턴이 끝나면 방어도가 사라진다 (빛의점토가 있으면 절반 남는다)
    // 뿌리박기 — 턴이 끝날 때 방어도를 준다. 이 방어도는 적 턴을 버텨야 하므로
    // 여기서 주고, 지우는 건 다음 내 턴 시작 때 한다(startPlayerTurn 참고).
    if (S.powers.INGRAIN) {
      S.block += S.powers.INGRAIN;
      fx({ kind: 'block', side: 'player', value: S.powers.INGRAIN });
    }

    checkWin();
    notify();
    if (S.phase !== 'PLAYER') return;

    // ── 적 턴 ──
    S.phase = 'ENEMY';
    notify();
    await pause(260);

    for (const e of S.enemies) {
      if (e.dead) continue;
      if (e.status.FREEZE > 0) { say(`${eunNeun(e.ko)} 얼어붙어 움직이지 못한다!`); notify(); await pause(420); continue; }
      await takeEnemyTurn(e);
      if (S.phase === 'LOST') break;
    }

    // 적 턴이 끝나면 적 방어도도 사라진다
    for (const e of S.enemies) e.block = 0;

    if (S.phase === 'LOST') return;

    rollIntents();
    startPlayerTurn();
  }

  async function takeEnemyTurn(e) {
    const mv = e.def.moves[e.intent];
    if (!mv) return;
    e.history.push(e.intent);
    say(`${e.ko}의 ${mv.ko}!`);
    fx({ kind: 'enemyAct', uid: e.uid, move: mv });
    notify();
    await pause(320);

    if (mv.power) {
      const hits = mv.hits || 1;
      let dealt = 0;
      for (let i = 0; i < hits; i++) {
        const r = enemyDamage({
          power: mv.power,
          moveType: mv.type,
          attackerTypes: e.types,
          defenderTypes: active().types,
          atkRank: e.ranks.ATK,
          defRank: S.ranks.DEF,
          burned: e.status.BURN > 0,
          paralyzed: e.status.PARA > 0,
          powerMul: dmgMul,
        });
        if (r.mult === 0) {
          say(`${active().ko}에게는 효과가 없다!`);           // '에게' 는 받침과 무관하다
          fx({ kind: 'immune', side: 'player' });
          break;
        }
        // 방어도부터 깎고 남은 만큼 HP
        let n = r.dmg;
        if (S.block > 0) {
          const absorbed = Math.min(S.block, n);
          S.block -= absorbed;
          n -= absorbed;
        }
        if (n > 0) {
          const m = active();
          // 기합의띠 — 전투당 한 번, 쓰러질 피해를 1로 버틴다
          if (m.hp - n <= 0 && S.enduresLeft > 0) {
            S.enduresLeft--;
            n = m.hp - 1;
            say(`${m.ko}이(가) 기합으로 버텼다!`);
          }
          m.hp -= n;
        }
        dealt += r.dmg;
        fx({ kind: 'damage', side: 'player', value: r.dmg, mult: r.mult, type: mv.type });
        checkFaint(active());
        notify();
        if (S.phase === 'LOST') return;
        if (hits > 1) await pause(160);
      }
      if (dealt) { /* 로그는 이미 남겼다 */ }
    }

    if (mv.block) e.block += mv.block;
    if (mv.heal) { e.hp = Math.min(e.maxHp, e.hp + mv.heal); }
    if (mv.status) addStatus(active().status, mv.status.kind, mv.status.amount);
    if (mv.rank) {
      if (mv.rank.to === 'self') e.ranks[mv.rank.stat] = clampRank(e.ranks[mv.rank.stat] + mv.rank.delta);
      else S.ranks[mv.rank.stat] = clampRank(S.ranks[mv.rank.stat] + mv.rank.delta);
    }
    notify();
    await pause(240);
  }

  let onEnd = null;
  let finished = false;
  /**
   * 전투가 끝났음을 바깥(화면)에 딱 한 번 알린다.
   *
   * ★ 예전에는 endTurn 끝에서만 불렀다. 그런데 전투는 대부분 **카드로 마지막
   *   적을 눕히면서** 끝나므로, 그 경로에서는 알림이 아예 가지 않아 보상
   *   화면이 뜨지 않고 전투 화면에 갇혔다. 이겼는데 진행이 안 되는 셈이라
   *   런이 거기서 끝났다. 그래서 playCard 쪽에서도 부른다.
   */
  const finish = () => {
    if (finished) return;
    if ((S.phase === 'WON' || S.phase === 'LOST') && onEnd) {
      finished = true;
      onEnd(S.phase);
    }
  };

  // ── 시작 ─────────────────────────────────────────────────
  function begin() {
    // 상태이상은 전투가 끝나면 낫는다. 판을 넘겨 끌고 다니면 이미 진 판을
    // 계속 붙들고 있게 되는데, 로그라이크에서 그건 벌이 아니라 지루함이다.
    for (const m of S.party) m.status = emptyStatus();
    S.drawPile = rng.shuffle(deckCards.slice());
    runHook(relics, 'onCombatStart', K);
    rollIntents();
    startPlayerTurn();
  }

  // ── 저장·복원 ────────────────────────────────────────────
  // 전투 중에 페이지를 닫아도 이어서 하게 하려면 S 를 통째로 적어 둬야 한다.
  // 두 군데만 그냥 넣으면 안 된다:
  //   · 카드는 run 의 덱과 **같은 객체**를 공유한다. uid 만 적고 복원할 때
  //     덱에서 다시 찾아 잇는다. 복사해 두면 전투 중 강화가 덱에 안 남는다.
  //   · 적의 def 는 enemies.js 표를 가리키는 참조다. id 만 적는다.
  const cardUids = (pile) => pile.map((c) => c.uid);

  function snapshot() {
    return {
      turn: S.turn, phase: S.phase, energy: S.energy, maxEnergy: S.maxEnergy,
      active: S.active, block: S.block, ranks: { ...S.ranks },
      enemies: S.enemies.map((e) => ({
        uid: e.uid, slot: e.slot, id: e.id, hp: e.hp, maxHp: e.maxHp,
        block: e.block, ranks: { ...e.ranks }, status: { ...e.status },
        turn: e.turn, history: e.history.slice(), intent: e.intent, dead: e.dead,
      })),
      drawPile: cardUids(S.drawPile), hand: cardUids(S.hand),
      discardPile: cardUids(S.discardPile), exhaustPile: cardUids(S.exhaustPile),
      switchedThisTurn: S.switchedThisTurn,
      cardsThisTurn: S.cardsThisTurn, attacksThisTurn: S.attacksThisTurn,
      nextMult: S.nextMult, bonusEnergyNext: S.bonusEnergyNext,
      powers: { ...S.powers }, enduresLeft: S.enduresLeft,
      log: S.log.slice(-12),
      rng: rng.getState(),
    };
  }

  /** begin() 대신 부른다 — 적었던 자리에서 그대로 이어 붙인다 */
  function resume(snap) {
    const byUid = new Map(deckCards.map((c) => [c.uid, c]));
    const pile = (uids) => (uids || []).map((u) => byUid.get(u)).filter(Boolean);

    Object.assign(S, {
      turn: snap.turn, phase: snap.phase, energy: snap.energy, maxEnergy: snap.maxEnergy,
      active: snap.active, block: snap.block, ranks: { ...snap.ranks },
      drawPile: pile(snap.drawPile), hand: pile(snap.hand),
      discardPile: pile(snap.discardPile), exhaustPile: pile(snap.exhaustPile),
      switchedThisTurn: snap.switchedThisTurn,
      cardsThisTurn: snap.cardsThisTurn, attacksThisTurn: snap.attacksThisTurn,
      nextMult: snap.nextMult, bonusEnergyNext: snap.bonusEnergyNext,
      powers: { ...snap.powers }, enduresLeft: snap.enduresLeft,
      log: snap.log ? snap.log.slice() : [],
      busy: false,
    });

    S.enemies = snap.enemies.map((e) => {
      const def = enemyOf(e.id);
      return {
        uid: e.uid, slot: e.slot, id: e.id, ko: def.ko, def,
        types: def.types.slice(),
        hp: e.hp, maxHp: e.maxHp, block: e.block,
        ranks: { ...e.ranks }, status: { ...e.status },
        turn: e.turn, history: e.history.slice(), intent: e.intent, dead: e.dead,
      };
    });
    // 적 uid 카운터가 뒤로 가 있으면 다음 전투에서 uid 가 겹친다
    for (const e of S.enemies) if (e.uid > enemyUid) enemyUid = e.uid;

    rng.setState(snap.rng);
    notify();
  }

  return {
    state: S,
    begin,
    resume,
    snapshot,
    playCard,
    switchTo,
    canSwitch,
    endTurn,
    playability,
    previewCard,
    previewIntent,
    activeMember: active,
    aliveEnemies,
    rankMul,
    set onEnd(fn) { onEnd = fn; },
  };
}
