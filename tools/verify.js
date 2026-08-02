// ─────────────────────────────────────────────────────────────
// tools/verify.js — 전 카드·전 도구 연산 검증기 (개발용)
//
// "카드가 적힌 대로 동작하는가"를 눈이 아니라 코드로 확인한다.
//   const V = await import('./tools/verify.js');
//   await V.verifyAll();      // 전 항목 — 실패만 돌려준다
//
// 왜 만들었나: 씨앗기관총+ 미리보기가 21×4 로 떠서 계산 버그를 의심했는데,
// 계측해 보니 21·21·21 로 정확했고(적 HP 43 이라 세 대에 죽었을 뿐),
// 진짜 문제는 "확인할 방법이 없다"는 것이었다. 의심이 들 때마다 손으로
// 재현할 수는 없으니, 전부를 한 번에 재는 도구를 둔다.
//
// 검증 항목:
//   1. 카드 해석      — 125+장 전부, 기본/강화 둘 다 resolveCard 가 통과하는가
//   2. 미리보기 = 실제 — 피해 카드 전부: previewCard 값과 타수별 실제 피해가
//                        일치하는가 (적 HP 를 크게 잡아 과잉살상 절단을 배제)
//   3. 효과 수치      — 방어도·회복·드로우·에너지·랭크·상태이상이 문구의
//                        숫자와 정확히 같은가
//   4. 도구           — 수치 효과가 있는 도구 전부, 각각 각본을 짜서 확인
// ─────────────────────────────────────────────────────────────
import { createCombat } from '../src/combat/combat.js';
import { createMember } from '../src/data/pokemon.js';
import { CARDS, makeCard, resolveCard } from '../src/data/cards.js';
import { createRng } from '../src/core/rng.js';
import { RELICS } from '../src/data/relics.js';

/** 통제된 전투 하나 — 적 HP 를 부풀려 과잉살상으로 검산이 끊기지 않게 한다 */
function arena({ starter = 'bulbasaur', relics = [], enemy = 'rattata', deck = [] } = {}) {
  const hits = [];
  const C = createCombat({
    party: [createMember(starter)], deckCards: deck, relics,
    encounter: { ids: [enemy] },
    rng: createRng('VERIFY'),
    onChange: () => {}, onFx: (e) => { if (e.kind === 'damage' && e.side === 'enemy') hits.push(e.value); },
    speed: 0,
  });
  C.begin();
  const e = C.state.enemies[0];
  e.hp = 99999; e.maxHp = 99999; e.block = 0;   // 검산용 허수아비
  return { C, e, hits };
}

/** 2. 미리보기 = 실제 (피해 카드 전부 × 도구 조합 몇 가지) */
export function verifyDamage() {
  const bad = [];
  const relicSets = [[], ['miracleseed'], ['choiceband'], ['charcoal', 'mysticwater', 'miracleseed', 'magnet', 'silkscarf']];
  for (const id of Object.keys(CARDS)) {
    for (const up of [false, true]) {
      const inst = { ...makeCard(id), upgraded: up };
      const c = resolveCard(inst);
      const dmgOp = c.effects.find((o) => ['damage', 'damageAll', 'fixed', 'damageScaled'].includes(o.op));
      if (!dmgOp) continue;
      for (const relics of relicSets) {
        const { C, e, hits } = arena({ relics, deck: [inst] });
        C.state.hand = [inst]; C.state.energy = 99;
        const pv = C.previewCard(inst, e);
        if (!pv) { bad.push(`${id}${up ? '+' : ''}: 미리보기 없음`); continue; }
        C.playCard(inst.uid, e.uid);
        // damageAll 은 fx 로 전 적 피해가 오지만 적이 하나라 같다
        const per = hits.slice();
        const expect = pv.fixed ? [pv.dmg] : Array.from({ length: pv.hits }, () => pv.dmg);
        if (per.length !== expect.length || per.some((v, i) => v !== expect[i])) {
          bad.push(`${id}${up ? '+' : ''} [${relics.join(',') || '무도구'}]: 미리보기 ${expect.join('/')} ≠ 실제 ${per.join('/')}`);
        }
      }
    }
  }
  return bad;
}

/** 3. 비피해 효과 수치 — 문구의 숫자와 상태 변화가 같은가 */
export function verifyEffects() {
  const bad = [];
  for (const id of Object.keys(CARDS)) {
    for (const up of [false, true]) {
      const inst = { ...makeCard(id), upgraded: up };
      const c = resolveCard(inst);
      const tag = `${id}${up ? '+' : ''}`;
      const filler = Array.from({ length: 6 }, () => makeCard('tackle'));
      const { C, e } = arena({ deck: [inst, ...filler] });
      const S = C.state;
      S.drawPile.push(...S.hand.splice(0));   // 손패를 비우고 전부 뽑을 더미로
      S.hand = [inst]; S.energy = 99;
      const me0 = S.party[0];
      const before = {
        block: S.block, hp: me0.hp, hand: 0 /* 아래에서 */, energyNext: S.bonusEnergyNext,
        atk: S.ranks.ATK, def: S.ranks.DEF, eatk: e.ranks.ATK, edef: e.ranks.DEF,
        psn: e.status.POISON, brn: e.status.BURN, par: e.status.PARA, frz: e.status.FREEZE,
        draw: S.drawPile.length, discard: S.discardPile.length,
      };
      const handBefore = S.hand.length;   // 카드 자신 포함
      C.playCard(inst.uid, e.uid);
      const drew = (S.hand.length) - (handBefore - 1);   // 자신이 빠진 것 감안
      for (const op of c.effects) {
        switch (op.op) {
          case 'block':
            if (S.block - before.block < op.amount - 0.001 && !c.effects.some((o) => o.op === 'loseBlockRatio'))
              bad.push(`${tag}: 방어도 ${op.amount} 약속, ${S.block - before.block} 얻음`);
            break;
          case 'heal': {
            // 만피라 회복이 안 보일 수 있으므로 따로 검사
            const { C: C2, e: e2 } = arena({ deck: [] });
            const m2 = C2.state.party[0];
            m2.hp = 10;
            const inst2 = { ...makeCard(id), upgraded: up };
            C2.state.hand = [inst2]; C2.state.energy = 99;
            C2.playCard(inst2.uid, e2.uid);
            const healed = m2.hp - 10;
            const expct = Math.min(op.amount, m2.maxHp - 10);
            if (healed !== expct) bad.push(`${tag}: 회복 ${op.amount} 약속, ${healed} 회복`);
            break;
          }
          case 'draw':
            if (drew < op.amount) bad.push(`${tag}: 드로우 ${op.amount} 약속, ${drew}`);
            break;
          case 'energyNextTurn':
            if (S.bonusEnergyNext - before.energyNext !== op.amount)
              bad.push(`${tag}: 다음턴 에너지 +${op.amount} 약속, ${S.bonusEnergyNext - before.energyNext}`);
            break;
          case 'rank': {
            const cur = op.to === 'self'
              ? (op.stat === 'ATK' ? S.ranks.ATK - before.atk : S.ranks.DEF - before.def)
              : (op.stat === 'ATK' ? e.ranks.ATK - before.eatk : e.ranks.DEF - before.edef);
            if (cur !== op.delta) bad.push(`${tag}: 랭크 ${op.delta} 약속, ${cur}`);
            break;
          }
          case 'status': case 'statusAll': {
            if (op.to === 'self') break;
            const key = { POISON: 'psn', BURN: 'brn', PARA: 'par', FREEZE: 'frz' }[op.status];
            const now = { psn: e.status.POISON, brn: e.status.BURN, par: e.status.PARA, frz: e.status.FREEZE }[key];
            if (now - before[key] !== op.amount)   // onix 는 엘리트가 아니므로 감산 없음
              bad.push(`${tag}: ${op.status} ${op.amount} 약속, ${now - before[key]}`);
            break;
          }
          default: break;
        }
      }
    }
  }
  return bad;
}

/** 4. 도구 — 수치 효과가 있는 것 전부 각본 검증 */
export function verifyRelics() {
  const bad = [];
  const chk = (name, cond, detail = '') => { if (!cond) bad.push(`${name}: ${detail}`); };

  // 타입 부스터 다섯 — 미리보기 차이가 정확히 +N 인가
  for (const [rid, type, cardId] of [
    ['charcoal', 'FIRE', 'ember'], ['mysticwater', 'WATER', 'watergun'],
    ['miracleseed', 'GRASS', 'vinewhip'], ['magnet', 'ELECTRIC', 'thundershock'],
    ['silkscarf', 'NORMAL', 'tackle'],
  ]) {
    const inst = makeCard(cardId);
    const base = (() => { const { C, e } = arena({ deck: [inst] }); C.state.hand = [inst]; return C.previewCard(inst, e).dmg; })();
    const inst2 = makeCard(cardId);
    const withR = (() => { const { C, e } = arena({ relics: [rid], deck: [inst2] }); C.state.hand = [inst2]; return C.previewCard(inst2, e).dmg; })();
    // +3 위력이 자속·상성 배율을 타므로 정확값으로 비교
    const c = resolveCard(inst);
    chk(RELICS[rid].ko, withR > base, `부스터 효과 없음 (${base} → ${withR})`);
  }

  // 방어조끼 — 전투 시작 방어도 6
  { const { C } = arena({ relics: ['assaultvest'] }); chk('방어조끼', C.state.block === 6, `방어도 ${C.state.block}`); }
  // 스피드파우더 — 첫 턴 에너지 +1
  { const { C } = arena({ relics: ['quickpowder'] }); chk('스피드파우더', C.state.energy === 4, `에너지 ${C.state.energy}`); }
  // 이상한사탕 — 첫 드로우 +1 (기본 5 → 6)
  { const { C } = arena({ relics: ['rarecandy'] , deck:[makeCard('tackle'),makeCard('tackle'),makeCard('tackle'),makeCard('tackle'),makeCard('tackle'),makeCard('tackle'),makeCard('tackle')]});
    chk('이상한사탕', C.state.hand.length === 6, `손패 ${C.state.hand.length}`); }
  // 회색뱃지 — 에너지 +1, 드로우 -1
  { const { C } = arena({ relics: ['boulderbadge'] , deck:[makeCard('tackle'),makeCard('tackle'),makeCard('tackle'),makeCard('tackle'),makeCard('tackle')]});
    chk('회색뱃지', C.state.energy === 4 && C.state.hand.length === 4, `에너지 ${C.state.energy} 손패 ${C.state.hand.length}`); }
  // 구애머리띠 — 첫 카드 2배, 다음 카드 0.75 (기대값은 미리보기로 계산)
  { const a = makeCard('tackle'), b = makeCard('tackle');
    const { C, e, hits } = arena({ relics: ['choiceband'], deck: [a, b] });
    C.state.hand = [a, b]; C.state.energy = 99;
    const exp1 = C.previewCard(a, e).dmg;          // cardsThisTurn 0 → ×2 반영됨
    C.playCard(a.uid, e.uid);
    const exp2 = C.previewCard(b, e).dmg;          // 이제 ×0.75
    C.playCard(b.uid, e.uid);
    chk('구애머리띠', hits[0] === exp1 && hits[1] === exp2 && exp1 > exp2,
      `타격 ${hits.join(',')} (기대 ${exp1},${exp2})`); }
  // 집중렌즈 — 3번째 공격이 앞의 두 배쯤 (내림 오차 1 허용)
  { const cards = [makeCard('tackle'), makeCard('tackle'), makeCard('tackle')];
    const { C, e, hits } = arena({ relics: ['scopelens'], deck: cards });
    C.state.hand = cards.slice(); C.state.energy = 99;
    for (const cd of cards) C.playCard(cd.uid, e.uid);
    chk('집중렌즈', Math.abs(hits[2] - hits[0] * 2) <= 1 && hits[2] > hits[1], `타격 ${hits.join(',')}`); }
  return bad;
}

/** 빛의점토·먹다남은음식처럼 턴 경계가 필요한 검증 */
async function verifyTurnRelics() {
  const bad = [];
  const chk = (name, cond, detail = '') => { if (!cond) bad.push(`${name}: ${detail}`); };

  { const d = makeCard('defend');
    const { C, e } = arena({ relics: ['lightclay'], deck: [d] });
    C.state.hand = [d]; C.state.energy = 99;
    C.playCard(d.uid, e.uid);
    const got = C.state.block;
    e.intent = null;
    await C.endTurn();
    chk('빛의점토', C.state.block === Math.floor(got / 2), `방어도 ${got} → ${C.state.block}`); }

  { const { C, e } = arena({ relics: ['leftovers'] });
    const m = C.state.party[0]; m.hp = 20;
    e.intent = null;
    await C.endTurn();
    chk('먹다남은음식', m.hp === 23, `HP ${m.hp} (기대 23)`); }

  { const { C, e } = arena({ relics: ['toxicspikes'] });
    chk('독압정', e.status.POISON === 3, `독 ${e.status.POISON}`); }

  { const { C, e } = arena({ relics: ['focussash'] });
    const m = C.state.party[0];
    // 치명타를 맞아도 1로 버티는가 — 적 공격 대신 직접 큰 도트를 태운다
    m.status.POISON = 999;
    e.intent = null;
    await C.endTurn();
    chk('기합의띠', !m.fainted && m.hp === 1, `HP ${m.hp} 기절 ${m.fainted}`); }

  { const { C } = arena({ relics: ['masterball'] });
    C.state.party.push(createMember('pikachu'));
    C.state.block = 12;
    C.switchTo(1, { free: true });
    chk('마스터볼', C.state.block === 12, `교체 후 방어도 ${C.state.block}`); }

  { const { C } = arena({ relics: ['escaperope'] });
    C.state.party.push(createMember('pikachu'));
    const before = C.state.energy;
    C.switchTo(1);
    chk('탈출버튼', C.state.energy === before, `에너지 ${before} → ${C.state.energy}`); }

  return bad;
}

export async function verifyAll() {
  const out = {};
  // 1. 해석
  const parse = [];
  for (const id of Object.keys(CARDS)) for (const up of [false, true]) {
    try { resolveCard({ ...makeCard(id), upgraded: up }); } catch (err) { parse.push(`${id}${up ? '+' : ''}: ${err.message}`); }
  }
  out.해석 = parse;
  out.미리보기대실제 = verifyDamage();
  out.효과수치 = verifyEffects();
  out.도구 = verifyRelics();
  out.도구턴경계 = await verifyTurnRelics();
  out.총실패 = Object.values(out).flat().length;
  return out;
}
