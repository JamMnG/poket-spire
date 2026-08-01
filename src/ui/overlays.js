// ─────────────────────────────────────────────────────────────
// overlays.js — 전투 밖의 화면들 (보상 · 상점 · 포켓몬센터 · 이벤트 · 덱)
//
// 전부 같은 덮개 하나를 갈아 끼운다. 화면마다 컨테이너를 따로 두면
// 열고 닫는 상태가 여기저기 흩어져 결국 두 개가 동시에 열린다.
// ─────────────────────────────────────────────────────────────
import { el, $, mount, clear, boldNums } from './dom.js';
import { cardEl } from './cardView.js';
import { attachTip } from './tooltip.js';
import { CARDS, makeCard, resolveCard } from '../data/cards.js';
import { RELICS } from '../data/relics.js';
import { POKEMON } from '../data/pokemon.js';
import { EVENTS } from '../data/events.js';
import { typeKo, typeColor } from '../data/types.js';
import { spriteUrl } from '../render/pokemonSprites.js';
import { itemUrl } from '../render/itemArt.js';
import { COIN, CARDS_ICON } from './icons.js';

const overlay = () => $('#overlay');
const body = () => $('#overlay-body');

export function closeOverlay() { overlay().classList.remove('is-on'); clear(body()); }

function open(...children) {
  mount(body(), ...children);
  overlay().classList.add('is-on');
  body().scrollTop = 0;
}

const title = (t) => el('div.ov-title', { text: t });
const sub = (t) => el('div.ov-sub', { html: t });
const actions = (...btns) => el('div.ov-actions', {}, btns.filter(Boolean));

/** 도구 하나를 동그란 배지로 — 상단 도구줄과 같은 모양을 쓴다 */
export function relicBadge(id) {
  const r = RELICS[id];
  const src = itemUrl(r.icon);
  const n = el(`div.relic${r.rarity === 'BOSS' ? '.is-boss' : ''}`, {},
    // 실제 아이템 도트가 있으면 그것을, 없으면 이름 첫 글자로 떨어진다
    src ? [el('img', { src, alt: r.ko })] : [el('span', { text: r.ko[0] })]);
  attachTip(n, `<div class="tt-name">${r.ko}</div>${r.desc}`);
  return n;
}

/** 보상·상점에서 도구를 크게 보여 줄 때 */
export function relicIcon(id, size = 40) {
  const r = RELICS[id];
  const src = itemUrl(r.icon);
  return src
    ? el('img.relic-big', { src, alt: r.ko, style: { width: `${size}px`, height: `${size}px` } })
    : el('div.reward-ic', { text: '🎒' });
}

// ══ 전투 보상 ═══════════════════════════════════════════════
export function showReward(run, { gold, cardIds, relicId }, onDone) {
  const R = run.state;
  const taken = { gold: false, card: false, relic: false };

  function rebuild() {
    const items = [];

    if (gold) items.push(el(`button.reward-item${taken.gold ? '.is-taken' : ''}`, {
      onclick: () => { if (taken.gold) return; run.addGold(gold); taken.gold = true; rebuild(); },
    }, [
      el('div.reward-ic', { html: COIN }),
      el('div', {}, [el('div.reward-tx', { text: `${gold} 원` }), el('div.reward-sub', { text: '주머니에 넣는다' })]),
    ]));

    if (cardIds?.length) items.push(el(`button.reward-item${taken.card ? '.is-taken' : ''}`, {
      onclick: () => {
        if (taken.card) return;
        showCardPick(cardIds, '배울 기술을 고른다', (id) => {
          if (id) run.addCard(id);
          taken.card = true;
          rebuild();
        }, { skippable: true });
      },
    }, [
      el('div.reward-ic', { html: CARDS_ICON }),
      el('div', {}, [el('div.reward-tx', { text: '기술 카드' }), el('div.reward-sub', { text: '세 장 중 하나를 배운다' })]),
    ]));

    if (relicId) items.push(el(`button.reward-item${taken.relic ? '.is-taken' : ''}`, {
      onclick: () => { if (taken.relic) return; run.addRelic(relicId); taken.relic = true; rebuild(); },
    }, [
      relicIcon(relicId),
      el('div', {}, [
        el('div.reward-tx', { text: RELICS[relicId].ko }),
        el('div.reward-sub', { text: RELICS[relicId].desc }),
      ]),
    ]));

    const allTaken = items.length === 0 ||
      (taken.gold || !gold) && (taken.card || !cardIds?.length) && (taken.relic || !relicId);

    open(
      title('전투에서 이겼다'),
      sub('가져갈 것을 고른다.'),
      ...items,
      actions(el('button.btn.btn-primary.btn-lg', {
        text: allTaken ? '지도로' : '남기고 지도로', onclick: () => { closeOverlay(); onDone(); },
      })),
    );
  }
  rebuild();
}

// ══ 카드 고르기 (보상·상점 공용) ════════════════════════════
export function showCardPick(cardIds, heading, onPick, opts = {}) {
  const cards = cardIds.map((id) => makeCard(id));
  open(
    title(heading),
    sub('마우스를 올리면 효과를 볼 수 있다.'),
    el('div.card-grid', {}, cards.map((inst) =>
      cardEl(inst, { onclick: () => { closeOverlay(); onPick(inst.id); } }))),
    actions(opts.skippable && el('button.btn.btn-ghost', {
      text: '아무것도 배우지 않는다', onclick: () => { closeOverlay(); onPick(null); },
    })),
  );
}

// ══ 덱에서 한 장 고르기 (강화·제거) ═════════════════════════
export function showDeckPick(run, heading, filter, onPick, opts = {}) {
  const list = run.state.deck.filter(filter || (() => true));
  open(
    title(heading),
    sub(`덱 ${run.state.deck.length}장 중 ${list.length}장을 고를 수 있다.`),
    el('div.deck-grid', {}, list.map((inst) =>
      cardEl(inst, { onclick: () => { closeOverlay(); onPick(inst); } }))),
    actions(opts.cancellable && el('button.btn.btn-ghost', {
      text: '그만둔다', onclick: () => { closeOverlay(); onPick(null); },
    })),
  );
}

// ══ 더미 들여다보기 (뽑을 카드 · 버린 카드) ═════════════════
//
// 전에는 카드 선택창(showDeckPick)을 그대로 돌려썼는데, "덱 2장 중 2장을
// 고를 수 있다 / 그만둔다" 라는 문구가 뜨는 데다 카드를 눌러도 아무 일이
// 없어서 고장난 화면처럼 보였다. 읽기 전용이라는 걸 화면이 말하게 한다.
export function showPile(cards, heading, note) {
  open(
    title(heading),
    sub(note),
    cards.length
      ? el('div.deck-grid', {}, cards.map((inst) => cardEl(inst)))
      : el('div.ov-sub', { text: '아직 아무 카드도 없다.' }),
    actions(el('button.btn.btn-primary.btn-lg', { text: '닫기', onclick: closeOverlay })),
  );
}

// ══ 덱 보기 ═════════════════════════════════════════════════
export function showDeck(run) {
  const deck = run.state.deck;
  open(
    title(`덱 · ${deck.length}장`),
    sub('전투를 시작하면 이 카드를 전부 섞어 쓴다.'),
    el('div.deck-grid', {}, deck.map((inst) => cardEl(inst))),
    actions(el('button.btn.btn-primary', { text: '닫기', onclick: closeOverlay })),
  );
}

// ══ 파티 보기 ═══════════════════════════════════════════════
export function showParty(run) {
  const R = run.state;
  open(
    title(`파티 · ${R.party.length}/${run.partySlots()}`),
    sub('선두만 공격을 받는다. 쓰러진 포켓몬의 전용 기술은 그 전투 동안 쓸 수 없다.'),
    el('div.party-panel', {}, R.party.map((m) => el('div.party-card', {}, [
      el('img', { src: spriteUrl(m.species, POKEMON[m.species], 4), alt: m.ko }),
      el('div.p-name', { text: m.ko }),
      el('div.unit-types', { style: { justifyContent: 'center' } }, m.types.map((t) =>
        el('span.tbadge', { text: typeKo(t), style: { background: typeColor(t) } }))),
      el('div.reward-sub', { style: { marginTop: '6px' }, text: `HP ${m.hp}/${m.maxHp}` }),
    ]))),
    actions(el('button.btn.btn-primary', { text: '닫기', onclick: closeOverlay })),
  );
}

// ══ 포켓몬센터 (모닥불) ═════════════════════════════════════
export function showRest(run, onDone) {
  const healPct = 0.35;
  const heal = () => {
    run.healAllPercent(healPct);
    closeOverlay(); onDone();
  };
  const upgrade = () => showDeckPick(run, '강화할 기술을 고른다', (c) => !c.upgraded, (inst) => {
    if (inst) run.upgradeCard(inst.uid);
    if (!inst) { showRest(run, onDone); return; }     // 취소하면 되돌아온다
    onDone();
  }, { cancellable: true });

  open(
    title('포켓몬센터'),
    sub('"포켓몬을 맡아 드릴까요? 아니면… 기술을 다듬어 볼까요?"'),
    el('div.ov-row', {}, [
      el('button.reward-item', { onclick: heal }, [
        el('div.reward-ic', { text: '✚' }),
        el('div', {}, [
          el('div.reward-tx', { text: '회복한다' }),
          el('div.reward-sub', { text: `파티 전원이 최대 HP의 ${Math.round(healPct * 100)}%를 회복한다` }),
        ]),
      ]),
      el('button.reward-item', { onclick: upgrade }, [
        el('div.reward-ic', { text: '⬆' }),
        el('div', {}, [
          el('div.reward-tx', { text: '기술을 다듬는다' }),
          el('div.reward-sub', { text: '카드 한 장을 영구히 강화한다' }),
        ]),
      ]),
    ]),
  );
}

// ══ 상점 ════════════════════════════════════════════════════
export function showShop(run, stock, onDone) {
  const R = run.state;

  function rebuild() {
    const cardRow = el('div.ov-row', {}, stock.cards.map((entry) => {
      if (entry.sold) return el('div.shop-card', {}, [el('div.reward-sub', { text: '판매됨' })]);
      const inst = makeCard(entry.id);
      const can = R.gold >= entry.price;
      const node = el('div.shop-card', {}, [
        cardEl(inst, {
          unplayable: !can,
          onclick: () => {
            if (!can) return;
            run.addGold(-entry.price);
            run.addCard(entry.id);
            entry.sold = true;
            rebuild();
          },
        }),
        el(`div.price${can ? '' : '.cant'}`, { text: `${entry.price} 원` }),
      ]);
      return node;
    }));

    const relicRow = el('div.ov-row', {}, stock.relics.map((entry) => {
      if (entry.sold) return el('div.shop-card', {}, [el('div.reward-sub', { text: '판매됨' })]);
      const can = R.gold >= entry.price;
      return el('button.reward-item', {
        style: { width: '340px', opacity: can ? 1 : .5 },
        onclick: () => { if (!can) return; run.addGold(-entry.price); run.addRelic(entry.id); entry.sold = true; rebuild(); },
      }, [
        relicIcon(entry.id),
        el('div', {}, [
          el('div.reward-tx', { text: RELICS[entry.id].ko }),
          el('div.reward-sub', { text: RELICS[entry.id].desc }),
          el(`div.price${can ? '' : '.cant'}`, { text: `${entry.price} 원` }),
        ]),
      ]);
    }));

    const canRemove = !stock.removal.used && R.gold >= stock.removal.price;
    const removalBtn = el('button.reward-item', {
      style: { width: '340px', margin: '0 auto', opacity: stock.removal.used ? .4 : canRemove ? 1 : .5 },
      onclick: () => {
        if (!canRemove) return;
        showDeckPick(run, '잊을 기술을 고른다', null, (inst) => {
          if (inst) { run.removeCard(inst.uid); run.addGold(-stock.removal.price); stock.removal.used = true; }
          rebuild();
        }, { cancellable: true });
      },
    }, [
      el('div.reward-ic', { text: '🗑' }),
      el('div', {}, [
        el('div.reward-tx', { text: stock.removal.used ? '이미 잊었다' : '기술 하나를 잊는다' }),
        el('div.reward-sub', { text: '덱에서 카드 한 장을 없앤다' }),
        el(`div.price${canRemove ? '' : '.cant'}`, { text: `${stock.removal.price} 원` }),
      ]),
    ]);

    open(
      title('상점'),
      sub(`가진 돈 <b style="color:#e8c56a">${R.gold}</b> 원`),
      el('div.shop-sec', {}, [el('h3', { text: '기술 카드' }), cardRow]),
      el('div.shop-sec', {}, [el('h3', { text: '지닌 도구' }), relicRow]),
      el('div.shop-sec', {}, [el('h3', { text: '기술 삭제' }), removalBtn]),
      actions(el('button.btn.btn-primary.btn-lg', { text: '떠난다', onclick: () => { closeOverlay(); onDone(); } })),
    );
  }
  rebuild();
}

// ══ ? 방 ════════════════════════════════════════════════════
export function showEvent(run, eventId, onDone) {
  const ev = EVENTS[eventId];
  const data = ev.setup ? ev.setup(run.eventApi) : {};

  const art = data.species
    ? el('img', { src: spriteUrl(data.species, POKEMON[data.species], 5), style: { imageRendering: 'pixelated', width: '120px' } })
    : null;

  open(
    title(ev.ko),
    art,
    el('div.event-text', { text: ev.text }),
    ...ev.choices.map((ch) => {
      const enabled = ch.enabled ? ch.enabled(run.eventApi, data) : true;
      return el('button.choice', {
        disabled: !enabled,
        onclick: () => {
          const result = ch.effect(run.eventApi, data);
          // effect 가 null 을 돌려주면 다른 화면(카드 선택·전투)이 이어진다
          if (result === null) { closeOverlay(); onDone(true); return; }
          showEventResult(ev.ko, result, onDone);
        },
      }, [
        el('div.choice-label', { text: ch.label }),
        el('div.choice-desc', { html: boldNums(ch.desc(run.eventApi, data)) }),
      ]);
    }),
  );
}

function showEventResult(heading, text, onDone) {
  open(
    title(heading),
    el('div.event-text', { text }),
    actions(el('button.btn.btn-primary.btn-lg', { text: '계속', onclick: () => { closeOverlay(); onDone(false); } })),
  );
}

// ══ 보물 ════════════════════════════════════════════════════
export function showTreasure(run, relicId, onDone) {
  open(
    title('상자를 열었다'),
    relicId ? el('div.reward-item', { style: { pointerEvents: 'none' } }, [
      relicIcon(relicId, 48),
      el('div', {}, [
        el('div.reward-tx', { text: RELICS[relicId].ko }),
        el('div.reward-sub', { text: RELICS[relicId].desc }),
      ]),
    ]) : sub('상자는 비어 있었다.'),
    actions(el('button.btn.btn-primary.btn-lg', { text: '가져간다', onclick: () => { closeOverlay(); onDone(); } })),
  );
}

// ══ 결과 ════════════════════════════════════════════════════
export function showResult(run, won, onRestart) {
  const R = run.state;
  open(
    el(`div.result-big.${won ? 'result-win' : 'result-lose'}`, { text: won ? '1막 돌파' : '전멸' }),
    sub(won
      ? '비주기를 쓰러뜨렸다. 여기까지가 지금 만들어진 만큼이다.'
      : '파티가 전부 쓰러졌다.'),
    el('div.party-panel', {}, R.party.map((m) => el('div.party-card', {}, [
      el('img', { src: spriteUrl(m.species, POKEMON[m.species], 4), alt: m.ko }),
      el('div.p-name', { text: m.ko }),
      el('div.reward-sub', { text: `HP ${m.hp}/${m.maxHp}` }),
    ]))),
    sub(`덱 ${R.deck.length}장 · 도구 ${R.relics.length}개 · 돈 ${R.gold}원<br>시드 <b>${R.seed}</b>`),
    actions(el('button.btn.btn-primary.btn-lg', { text: '다시 시작', onclick: () => { closeOverlay(); onRestart(); } })),
  );
}
