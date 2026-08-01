// ─────────────────────────────────────────────────────────────
// combatView.js — 전투 화면
//
// 화면이 답해야 하는 질문은 매 턴 똑같다:
//   "이번 턴에 무엇을 맞고, 누구를 앞에 세울 것인가."
//
// 그래서 두 가지에 자리를 크게 줬다.
//   1) 적 의도에 **실제 피해 숫자와 타입 배지**를 같이 띄운다.
//      상성이 이미 반영된 값이라 그대로 믿고 계산하면 된다.
//   2) 벤치 포켓몬에 마우스를 올리면 그 숫자가 **그 포켓몬 기준으로**
//      바뀐다. 20이 0이 되는 걸 눈으로 보면 교체를 설명할 필요가 없다.
// ─────────────────────────────────────────────────────────────
import { el, $, mount, clear, batched } from './dom.js';
import { cardEl, layoutFan } from './cardView.js';
import { showTip, hideTip, attachTip } from './tooltip.js';
import { spriteUrl } from '../render/pokemonSprites.js';
import { POKEMON } from '../data/pokemon.js';
import { ENEMIES } from '../data/enemies.js';
import { typeKo, typeColor, relationText, weaknessesOf } from '../data/types.js';
import { activeStatuses, STATUS } from '../combat/status.js';
import { resolveCard } from '../data/cards.js';
import { rankMul } from '../combat/formula.js';
import { SWITCH_COST } from '../combat/combat.js';
import { intentIcon } from './icons.js';
import { euro } from '../core/ko.js';

export function createCombatView({ combat, onFinish }) {
  const S = combat.state;

  const arena       = $('#arena');
  const activeSlot  = $('#active-slot');
  const benchEl     = $('#bench');
  const enemySlots  = $('#enemy-slots');
  const handEl      = $('#hand');
  const energyOrb   = $('#energy-orb');
  const energyText  = $('#energy-text');
  const drawPile    = $('#pile-draw');
  const discardPile = $('#pile-discard');
  const endTurnBtn  = $('#btn-endturn');
  const fxLayer     = $('#fx-layer');
  const logEl       = $('#combat-log');
  const switchHint  = $('#switch-hint');

  let pickedCard = null;      // 대상을 고르는 중인 카드
  let hoverBench = null;      // 벤치에 올려 둔 손 — 의도 숫자를 이 기준으로 다시 센다
  let playing = false;        // 카드 연출이 도는 동안 다음 입력을 막는다
  let prevHand = new Set();   // 직전 손패 — 새로 뽑힌 카드만 올라오게 하려고
  let prevPiles = { draw: -1, discard: -1 };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── 작은 조립 부품 ────────────────────────────────────────

  /**
   * HP 바 — 원작처럼 남은 비율에 따라 초록 → 노랑 → 빨강으로 변한다.
   * 숫자를 읽기 전에 색으로 먼저 상황이 들어오는 게 포켓몬 배틀 화면의
   * 핵심이라, 이 한 줄이 "포켓몬답다" 에 제일 크게 기여한다.
   */
  const hpBar = (hp, max) => {
    const pct = Math.max(0, (hp / max) * 100);
    const tier = pct > 50 ? 'is-high' : pct > 20 ? 'is-mid' : 'is-low';
    return el('div.hpbar', {}, [
      el(`div.fill.${tier}`, { style: { width: `${pct}%` } }),
    ]);
  };

  /** 원작 배틀 화면의 정보판 — 이름 · 타입 · HP 를 한 판에 담는다 */
  function hudPlate(name, types, hp, max, { block = 0, badges = [], small = false } = {}) {
    const plate = el(`div.hud${small ? '.hud-sm' : ''}`, {}, [
      el('div.hud-top', {}, [
        el('div.hud-name', { text: name }),
        types ? typeBadges(types) : null,
      ].filter(Boolean)),
      el('div.hud-hp', {}, [
        el('span.hud-lab', { text: 'HP' }),
        hpBar(hp, max),
      ]),
      el('div.hud-num', { text: `${hp} / ${max}` }),
    ]);
    if (block > 0) {
      plate.appendChild(attachTip(
        el('div.blockbadge', { text: block }),
        `<div class="tt-name">방어도 ${block}</div>받는 피해를 먼저 막는다. 턴이 끝나면 사라진다.`,
      ));
    }
    if (badges.length) plate.appendChild(el('div.hud-badges', {}, badges));
    return plate;
  }

  const typeBadges = (types) => el('div.unit-types', {}, types.map((t) =>
    el('span.tbadge', { text: typeKo(t), style: { background: typeColor(t) } })));

  function statusBadges(bag) {
    const list = activeStatuses(bag);
    return el('div.statuses', {}, list.map((s) => attachTip(
      el('span.sbadge', { style: { color: s.color }, text: `${s.icon}${s.n}` }),
      `<div class="tt-name">${s.ko} ${s.n}</div>${STATUS[s.id].desc(s.n)}`,
    )));
  }

  function rankBadges(ranks) {
    const out = [];
    for (const [stat, label] of [['ATK', '공격'], ['DEF', '방어']]) {
      const n = ranks[stat];
      if (!n) continue;
      const mul = stat === 'ATK' ? rankMul(n) : 1 / rankMul(n);
      out.push(attachTip(
        el(`span.rankbadge.${n > 0 ? 'up' : 'down'}`, { text: `${label} ${n > 0 ? '+' : ''}${n}` }),
        `<div class="tt-name">${label} 랭크 ${n > 0 ? '+' : ''}${n}</div>` +
        (stat === 'ATK' ? `주는 피해 ×${mul.toFixed(2)}` : `받는 피해 ×${mul.toFixed(2)}`),
      ));
    }
    return out;
  }

  // ── 내 선두 ──────────────────────────────────────────────
  function renderActive() {
    const m = combat.activeMember();
    const sp = POKEMON[m.species];

    const badges = [
      ...activeStatuses(m.status || {}).map((s) => attachTip(
        el('span.sbadge', { style: { color: s.color }, text: `${s.icon}${s.n}` }),
        `<div class="tt-name">${s.ko} ${s.n}</div>${STATUS[s.id].desc(s.n)}`,
      )),
      ...rankBadges(S.ranks),
    ];

    mount(activeSlot,
      el('div.unit-sprite', {}, [
        el('img', { src: spriteUrl(m.species, sp, 6), alt: m.ko }),
        el('div.unit-shadow'),
      ]),
      hudPlate(m.ko, m.types, m.hp, m.maxHp, { block: S.block, badges }),
    );
    activeSlot.className = 'unit unit-active';
  }

  // ── 벤치 ─────────────────────────────────────────────────
  function renderBench() {
    // 텔레포트·바톤터치를 쓰면 에너지·횟수와 무관하게 한 번 교체할 수 있다
    const awaited = S.awaitSwitch;
    const canSwitch = combat.canSwitch();
    const slots = S.party.map((m, i) => {
      if (i === S.active) return null;
      const sp = POKEMON[m.species];
      const ok = (awaited || canSwitch) && !m.fainted;

      const node = el(`div.bench-slot${ok ? '.can-switch' : ''}${m.fainted ? '.is-fainted' : ''}`, {
        onclick: () => { if (ok) doSwitch(i); },
        onmouseenter: () => { if (!m.fainted) { hoverBench = i; renderEnemies(); showSwitchHint(i); } },
        onmouseleave: () => { hoverBench = null; renderEnemies(); switchHint.classList.remove('is-on'); },
      }, [
        el('img', { src: spriteUrl(m.species, sp, 3), alt: m.ko }),
        hudPlate(m.ko + (m.fainted ? ' (기절)' : ''), null, m.hp, m.maxHp, { small: true }),
      ]);
      return node;
    }).filter(Boolean);

    mount(benchEl, ...slots);

    if (awaited) {
      switchHint.innerHTML = '교체할 포켓몬을 고른다' + (awaited.keepRanks ? ' <b>(능력 랭크를 그대로 넘긴다)</b>' : '');
      switchHint.classList.add('is-on');
    }
  }

  /**
   * 교체하면 이번 턴 예고가 얼마로 바뀌는지 한 줄로 알려 준다.
   * 숫자만 바뀌는 것보다 "0이 된다" 를 말로 못 박는 편이 훨씬 잘 읽힌다.
   */
  function showSwitchHint(i) {
    const m = S.party[i];
    let before = 0, after = 0;
    for (const e of combat.aliveEnemies()) {
      const a = combat.previewIntent(e, S.active);
      const b = combat.previewIntent(e, i);
      if (a) before += a.total;
      if (b) after += b.total;
    }
    const cost = combat.canSwitch() ? `에너지 ${SWITCH_COST}` : '이번 턴은 교체 불가';
    let verdict;
    if (after === 0 && before > 0) verdict = `<b style="color:#8ad8a0">이번 턴 피해를 통째로 막는다</b>`;
    else if (after < before) verdict = `받을 피해 <b>${before} → <span style="color:#8ad8a0">${after}</span></b>`;
    else if (after > before) verdict = `받을 피해 <b>${before} → <span style="color:#ff8a6a">${after}</span></b>`;
    else verdict = `받을 피해는 그대로 <b>${before}</b>`;
    switchHint.innerHTML = `${euro(m.ko)} 교체 · ${cost} — ${verdict}`;
    switchHint.classList.add('is-on');
  }

  function doSwitch(i) {
    const awaited = S.awaitSwitch;
    if (!combat.switchTo(i, awaited || {})) return;
    hoverBench = null;
    switchHint.classList.remove('is-on');
    render();
  }

  // ── 적 ───────────────────────────────────────────────────
  function renderEnemies() {
    const refIndex = hoverBench ?? S.active;

    const nodes = S.enemies.map((e) => {
      const node = el(`div.unit.unit-enemy${e.dead ? '.is-dead' : ''}`, {
        dataset: { uid: e.uid },
        onclick: () => onEnemyClick(e),
        onmouseenter: () => { if (pickedCard) node.classList.add('is-target'); showEnemyTip(node, e); },
        onmouseleave: () => { node.classList.remove('is-target'); hideTip(); },
      });

      // 의도 — 얼어붙었으면 "이번 턴은 못 움직인다" 를 같은 자리에 보여 준다
      if (!e.dead && e.status.FREEZE > 0) {
        node.appendChild(attachTip(
          el('div.intent', {}, [el('div.intent-icon', { html: intentIcon('FROZEN') })]),
          `<div class="tt-name">얼음 ${e.status.FREEZE}</div>얼어붙어 ${e.status.FREEZE}턴 동안 아무것도 하지 못한다.`,
        ));
      } else if (e.intent && !e.dead) {
        const mv = e.def.moves[e.intent];
        const pv = combat.previewIntent(e, refIndex);
        const cls = !pv ? '' : pv.mult === 0 ? 'immune' : pv.mult > 1 ? 'super' : pv.mult < 1 ? 'resist' : '';
        const num = pv
          ? (pv.mult === 0 ? '0' : (pv.hits > 1 ? `${pv.dmg}×${pv.hits}` : `${pv.dmg}`))
          : '';

        node.appendChild(attachTip(el('div.intent', {}, [
          el('div.intent-icon', { html: intentIcon(mv.intent) }),
          num && el(`div.intent-num.${cls}`.replace(/\.$/, ''), { text: num }),
          mv.type && el('div.intent-type', { text: typeKo(mv.type), style: { background: typeColor(mv.type) } }),
        ].filter(Boolean)), () => intentTipHtml(e, mv, refIndex)));
      }

      node.appendChild(el('div.unit-sprite', {}, [
        el('img', { src: spriteUrl(e.id, e.def, Math.round(6 * (e.def.scale || 1))), alt: e.ko }),
        el('div.unit-shadow'),
      ]));
      node.appendChild(hudPlate(e.ko, e.types, e.hp, e.maxHp, {
        block: e.block,
        badges: [
          ...activeStatuses(e.status).map((s) => attachTip(
            el('span.sbadge', { style: { color: s.color }, text: `${s.icon}${s.n}` }),
            `<div class="tt-name">${s.ko} ${s.n}</div>${STATUS[s.id].desc(s.n)}`)),
          ...rankBadges(e.ranks),
        ],
      }));
      return node;
    });

    mount(enemySlots, ...nodes);
  }

  function intentTipHtml(e, mv, refIndex) {
    const pv = combat.previewIntent(e, refIndex);
    const who = S.party[refIndex];
    let body = `<div class="tt-name">${mv.ko}</div>`;
    if (mv.type) body += `${typeKo(mv.type)} 타입<br>`;
    if (pv) {
      const rel = relationText(pv.mult);
      body += `${who.ko}에게 <b>${pv.total}</b>의 피해`;
      if (rel) body += ` <span class="${pv.mult > 1 ? 'tt-super' : 'tt-resist'}">${rel}</span>`;
    }
    if (mv.block) body += `<br>방어도 ${mv.block}`;
    if (mv.heal) body += `<br>HP ${mv.heal} 회복`;
    if (mv.status) body += `<br>${STATUS[mv.status.kind].ko} ${mv.status.amount}`;
    if (mv.rank) body += `<br>${mv.rank.to === 'self' ? '자신' : '이쪽'}의 ${mv.rank.stat === 'ATK' ? '공격' : '방어'} 랭크 ${mv.rank.delta > 0 ? '+' : ''}${mv.rank.delta}`;
    return body;
  }

  function showEnemyTip(node, e) {
    const weak = weaknessesOf(e.types).map(typeKo).join(', ');
    showTip(node, `<div class="tt-name">${e.ko}</div>` +
      `${e.types.map(typeKo).join(' · ')} 타입<br>` +
      `<div class="tt-sec">약점 <span class="tt-super">${weak || '없음'}</span></div>`);
  }

  // ── 손패 ─────────────────────────────────────────────────
  function renderHand() {
    const fresh = [];
    const nodes = S.hand.map((inst, i) => {
      const check = combat.playability(inst);
      const target = pickedCard ? null : combat.aliveEnemies()[0];
      const node = cardEl(inst, {
        preview: combat.previewCard(inst, target),
        unplayable: !check.ok,
        picked: pickedCard === inst.uid,
        onclick: () => onCardClick(inst, check, node),
        onenter: () => node.classList.add('is-hover'),
        onleave: () => node.classList.remove('is-hover'),
      });
      if (!check.ok) node.title = check.reason;
      // 직전 손패에 없던 카드만 아래에서 올라온다
      if (!prevHand.has(inst.uid)) { node.classList.add('is-drawn'); fresh.push([node, i]); }
      return node;
    });

    mount(handEl, ...nodes);
    layoutFan(handEl, nodes);
    // 여러 장을 한꺼번에 뽑으면 차례로 올라오게 살짝 어긋낸다
    for (const [node, i] of fresh) node.style.animationDelay = `${Math.min(i, 9) * 45}ms`;
    prevHand = new Set(S.hand.map((h) => h.uid));
  }

  function onCardClick(inst, check, node) {
    if (!check.ok || playing) return;
    const c = resolveCard(inst);
    const alive = combat.aliveEnemies();

    // 대상이 하나뿐이거나 자신에게 쓰는 카드는 바로 나간다
    if (c.target !== 'ENEMY' || alive.length <= 1) {
      pickedCard = null;
      playWithFx(inst, c, alive[0], node);
      return;
    }
    // 적이 여럿이면 한 번 더 눌러 고르게 한다 (드래그보다 터치에서 안전하다)
    pickedCard = pickedCard === inst.uid ? null : inst.uid;
    render();
  }

  function onEnemyClick(e) {
    if (!pickedCard || e.dead || playing) return;
    const inst = S.hand.find((h) => h.uid === pickedCard);
    const node = handEl.querySelector(`[data-uid="${pickedCard}"]`);
    pickedCard = null;
    if (inst) playWithFx(inst, resolveCard(inst), e, node);
    else render();
  }

  // ── 아래쪽 표시 ──────────────────────────────────────────
  function renderBar() {
    energyText.textContent = `${S.energy}/${S.maxEnergy}`;
    energyOrb.classList.toggle('is-empty', S.energy <= 0);

    drawPile.querySelector('.pile-count').textContent = S.drawPile.length;
    discardPile.querySelector('.pile-count').textContent = S.discardPile.length;
    // 숫자가 바뀌면 톡 튀게 — 카드가 어디로 갔는지 눈이 따라간다
    if (prevPiles.draw >= 0 && S.drawPile.length !== prevPiles.draw) pop(drawPile);
    if (prevPiles.discard >= 0 && S.discardPile.length !== prevPiles.discard) pop(discardPile);
    prevPiles = { draw: S.drawPile.length, discard: S.discardPile.length };

    endTurnBtn.disabled = S.phase !== 'PLAYER' || S.busy || playing;
    endTurnBtn.textContent = S.phase === 'ENEMY' ? '적의 턴…' : '턴 종료';
  }

  function renderLog() {
    mount(logEl, ...S.log.slice(-5).map((t) => el('div', { text: t })));
  }

  // ── 카드 연출 ────────────────────────────────────────────

  /** 쓴 카드가 손에서 떠올라 대상 쪽으로 날아간다 */
  function flyCard(node, toNode) {
    if (!node || !toNode) return;
    const r = node.getBoundingClientRect();
    const t = toNode.getBoundingClientRect();

    const clone = node.cloneNode(true);
    clone.classList.remove('is-hover', 'is-picked');
    clone.classList.add('card-fly');
    Object.assign(clone.style, {
      left: `${r.left}px`, top: `${r.top}px`,
      width: `${r.width}px`, height: `${r.height}px`,
      transform: 'none', opacity: '1',
    });
    document.body.appendChild(clone);
    node.style.visibility = 'hidden';          // 원본은 바로 감춘다 (곧 리렌더로 사라진다)

    // 레이아웃을 한 번 강제로 계산시켜야 전환이 걸린다
    void clone.offsetWidth;

    const dx = t.left + t.width / 2 - (r.left + r.width / 2);
    const dy = t.top + t.height * 0.42 - (r.top + r.height / 2);
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(.34) rotate(7deg)`;
    clone.style.opacity = '0';
    setTimeout(() => clone.remove(), 400);
  }

  /** 때린 자리에 타입 색 파동 */
  function burstAt(node, type) {
    if (!node) return;
    const a = arena.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    const b = el('div.burst', {
      style: {
        left: `${r.left + r.width / 2 - a.left}px`,
        top: `${r.top + r.height * 0.38 - a.top}px`,
        '--bc': type ? typeColor(type) : '#f0d69a',
      },
    });
    fxLayer.appendChild(b);
    setTimeout(() => b.remove(), 470);          // 방금 만든 것만 지운다
  }

  /** 공격하는 쪽이 앞으로 찌른다 */
  function lunge(unitNode) {
    const s = unitNode?.querySelector('.unit-sprite');
    if (!s) return;
    s.classList.remove('is-lunge');
    void s.offsetWidth;
    s.classList.add('is-lunge');
    setTimeout(() => s.classList.remove('is-lunge'), 340);
  }

  const pop = (node, cls = 'is-pop') => {
    if (!node) return;
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), 340);
  };

  /**
   * 카드를 낸다.
   * 규칙 적용을 150ms 늦춰 카드가 날아가는 동안 피해 숫자가 뜨게 맞췄다.
   * 그동안 다른 입력은 playing 으로 막는다 — 안 그러면 연출 중에 카드를
   * 두 장 낼 수 있고, 그건 화면과 상태가 어긋나는 가장 빠른 길이다.
   */
  async function playWithFx(inst, card, targetEnemy, node) {
    if (playing) return;
    playing = true;

    const targetNode = card.target === 'SELF'
      ? activeSlot
      : (targetEnemy ? enemySlots.querySelector(`[data-uid="${targetEnemy.uid}"]`) : enemySlots);

    flyCard(node, targetNode || activeSlot);
    if (card.kind === 'ATTACK') lunge(activeSlot);
    pop(energyOrb);

    await wait(150);
    burstAt(targetNode || activeSlot, card.type);
    combat.playCard(inst.uid, targetEnemy?.uid);

    playing = false;
    render();
  }

  // ── 피해·회복 연출 ───────────────────────────────────────
  function anchorOf(side, uid) {
    const node = side === 'enemy'
      ? enemySlots.querySelector(`[data-uid="${uid}"]`)
      : activeSlot;
    if (!node) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const r = node.getBoundingClientRect();
    const a = arena.getBoundingClientRect();
    return { x: r.left + r.width / 2 - a.left, y: r.top + r.height * 0.35 - a.top };
  }

  function playFx(e) {
    const at = anchorOf(e.side, e.uid);
    const spawn = (cls, text) => {
      const p = el(`div.pop.${cls}`, { text, style: { left: `${at.x}px`, top: `${at.y}px` } });
      fxLayer.appendChild(p);
      setTimeout(() => p.remove(), 900);
    };

    if (e.kind === 'damage') {
      const cls = e.mult > 1 ? 'dmg super' : e.mult < 1 && e.mult > 0 ? 'dmg resist' : 'dmg';
      spawn(cls, `-${e.value}`);
      const rel = relationText(e.mult ?? 1);
      if (rel && e.mult !== 1) setTimeout(() => spawn('text', rel), 130);
      // 맞은 쪽을 흔든다
      const node = e.side === 'enemy' ? enemySlots.querySelector(`[data-uid="${e.uid}"]`) : activeSlot;
      if (node) { node.classList.add('is-hit'); setTimeout(() => node.classList.remove('is-hit'), 300); }
    } else if (e.kind === 'heal')  spawn('heal', `+${e.value}`);
    else if (e.kind === 'block')   spawn('block', `+${e.value}`);
    else if (e.kind === 'immune')  spawn('text', '효과가 없다!');
    else if (e.kind === 'enemyAct') {
      // 적이 기술을 쓰는 순간 — 때리는 기술이면 앞으로 찌르고 파동을 낸다
      const node = enemySlots.querySelector(`[data-uid="${e.uid}"]`);
      if (e.move?.power) {
        lunge(node);
        setTimeout(() => burstAt(activeSlot, e.move.type), 170);
      } else {
        pop(node, 'is-pop');
      }
    }
  }

  // ── 전체 그리기 ──────────────────────────────────────────
  const render = batched(() => {
    renderActive();
    renderBench();
    renderEnemies();
    renderHand();
    renderBar();
    renderLog();
  });

  // ── 배선 ─────────────────────────────────────────────────
  endTurnBtn.onclick = () => {
    if (playing) return;                  // 카드 연출이 도는 중이면 무시
    pickedCard = null;
    hideTip();
    prevHand = new Set();                 // 다음 턴 손패는 전부 새로 뽑힌 것으로 본다
    combat.endTurn();
  };

  combat.onEnd = (result) => setTimeout(() => onFinish(result), 620);

  return { render, playFx, clearFx: () => clear(fxLayer) };
}
