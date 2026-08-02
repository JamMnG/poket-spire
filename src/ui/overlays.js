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
import { monImg } from '../render/pokemonSprites.js';
import { itemImg } from '../render/itemArt.js';
import { COIN, CARDS_ICON } from './icons.js';

const overlay = () => $('#overlay');
const body = () => $('#overlay-body');

export function closeOverlay() { overlay().classList.remove('is-on'); clear(body()); }

function open(...children) {
  mount(body(), ...children);
  overlay().classList.add('is-on');
  body().scrollTop = 0;
}

/** 받침에 맞는 조사를 고른다 — "상록의 숲 을(를)" 같은 표기를 안 쓰려고 */
function josa(word, withBatchim, without) {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return without;   // 한글이 아니면 그냥
  return (last - 0xac00) % 28 ? withBatchim : without;
}

const title = (t) => el('div.ov-title', { text: t });
const sub = (t) => el('div.ov-sub', { html: t });
const actions = (...btns) => el('div.ov-actions', {}, btns.filter(Boolean));

/** 도구 하나를 동그란 배지로 — 상단 도구줄과 같은 모양을 쓴다 */
export function relicBadge(id) {
  const r = RELICS[id];
  // ★ itemUrl 을 <img> 에 직접 꽂지 말 것. 파일이 없으면(배포본에는 그림
  //   자산이 아예 없다) 깨진 그림 아이콘이 그대로 떴다 — itemImg 가 실패를
  //   잡아 이름 첫 글자 배지로 바꿔 끼운다.
  const n = el(`div.relic${r.rarity === 'BOSS' ? '.is-boss' : ''}`, {},
    [itemImg(r.icon, { alt: r.ko, fallback: r.ko[0] })]);
  attachTip(n, `<div class="tt-name">${r.ko}</div>${r.desc}`);
  return n;
}

/** 보상·상점에서 도구를 크게 보여 줄 때 */
export function relicIcon(id, size = 40) {
  const r = RELICS[id];
  return el('div.relic-big-wrap', { style: { width: `${size}px`, height: `${size}px` } },
    [itemImg(r.icon, {
      alt: r.ko, className: 'relic-big', fallback: r.ko[0],
      style: { width: `${size}px`, height: `${size}px` },
    })]);
}

// ══ 전투 보상 ═══════════════════════════════════════════════
/**
 * @param onCard 멀티용. 카드를 고르면 여기로 알린다 — 덱에 넣는 일은
 *               부르는 쪽(main.js)이 확정된 행동을 받고 나서 한다.
 */
export function showReward(run, { gold, cardIds, relicId, waitFor = false, team = null }, onDone, onCard = null) {
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
          if (onCard) onCard(id); else if (id) run.addCard(id);
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
      sub(team ? '돈과 도구는 파티가 나눠 가졌다. 기술은 각자 고른다.' : '가져갈 것을 고른다.'),
      // 멀티: 팀 몫은 이미 들어갔으므로 결과만 보여 준다
      team ? el('div.act-gain', {}, [el('div', {
        html: `돈 <b>+${team.gold}</b>${team.relicId ? ` · <b>${RELICS[team.relicId].ko}</b>` : ''}`,
      })]) : null,
      ...items,
      actions(el('button.btn.btn-primary.btn-lg', {
        // 멀티에서는 카드를 고르기 전에는 넘어갈 수 없다. 안 고른 채로
        // 넘어가면 다른 사람들이 영영 기다리게 된다.
        text: waitFor ? (taken.card ? '다 골랐다' : '기술을 먼저 고른다')
          : (allTaken ? '지도로' : '남기고 지도로'),
        disabled: waitFor && !taken.card,
        onclick: () => { closeOverlay(); onDone(); },
      })),
    );
  }
  rebuild();
}

// ══ 알림 · 기다림 ═══════════════════════════════════════════
export function showNotice(heading, text, onDone) {
  open(
    title(heading),
    sub(text),
    actions(el('button.btn.btn-primary.btn-lg', {
      text: '확인', onclick: () => { closeOverlay(); onDone?.(); },
    })),
  );
}

/** 남을 기다리는 동안 — 버튼이 없다. 다음 행동이 오면 화면이 알아서 넘어간다 */
export function showWaiting(text) {
  open(title('잠시만'), sub(text), el('div.waiting-dots', { html: '<span></span><span></span><span></span>' }));
}

// ══ 카드 고르기 (보상·상점 공용) ════════════════════════════
// ★ 한 번 누르면 **고르기만** 하고, 버튼을 눌러야 확정된다. 예전에는 첫
//   클릭이 곧 확정이라, 더블클릭 버릇이 있는 사람은 보기도 전에 카드가
//   덱에 들어갔다. 실수를 되돌릴 수 없는 화면에서 원클릭 확정은 함정이다.
export function showCardPick(cardIds, heading, onPick, opts = {}) {
  const cards = cardIds.map((id) => makeCard(id));
  let picked = null;

  function rebuild() {
    open(
      title(heading),
      sub(picked ? '아래 버튼을 누르면 확정된다.' : '카드를 한 번 눌러 고른다.'),
      el('div.card-grid', {}, cards.map((inst) =>
        cardEl(inst, {
          picked: picked === inst.id,
          onclick: () => { picked = picked === inst.id ? null : inst.id; rebuild(); },
        }))),
      actions(
        el('button.btn.btn-primary.btn-lg', {
          text: picked ? `${CARDS[picked].ko}을(를) 배운다` : '카드를 먼저 고른다',
          disabled: !picked,
          onclick: () => { if (picked) { closeOverlay(); onPick(picked); } },
        }),
        opts.skippable && el('button.btn.btn-ghost', {
          text: '아무것도 배우지 않는다', onclick: () => { closeOverlay(); onPick(null); },
        }),
      ),
    );
  }
  rebuild();
}


// ══ 막 클리어 → 다음 막 ═════════════════════════════════════
export function showActClear(run, cleared, next, onDone) {
  const R = run.state;
  open(
    el('div.result-big.result-win', { text: `${cleared.n}막 돌파` }),
    sub(`<b>${cleared.name}</b>${josa(cleared.name, '을', '를')} 넘었다.`),
    el('div.act-gain', {}, [
      el('div', { html: `파티 전원 최대 HP <b>+12</b> · 완전 회복 · 돈 <b>+120</b>` }),
    ]),
    el('div.ov-title', { style: { marginTop: '18px', fontSize: '20px' }, text: `${next.n}막 · ${next.name}` }),
    sub(next.blurb + '<br>여기서부터 적이 확실히 강해진다.'),
    el('div.party-panel', {}, R.party.map((m) => el('div.party-card', {}, [
      monImg(m.species, POKEMON[m.species], 4, { alt: m.ko }),
      el('div.p-name', { text: m.ko }),
      el('div.reward-sub', { text: `HP ${m.hp}/${m.maxHp}` }),
    ]))),
    actions(el('button.btn.btn-primary.btn-lg', { text: '올라간다', onclick: () => { closeOverlay(); onDone(); } })),
  );
}

// ══ 덱에서 한 장 고르기 (강화·제거) ═════════════════════════
export function showDeckPick(run, heading, filter, onPick, opts = {}) {
  const list = run.state.deck.filter(filter || (() => true));

  // 강화 화면에서는 **강화하면 어떻게 되는지**를 나란히 보여 준다.
  // 이름 옆에 + 만 붙여 놓으면 무엇이 얼마나 좋아지는지 알 수가 없어서,
  // 무엇을 고를지 정할 근거가 화면에 없었다.
  const card = (inst) => {
    if (!opts.showUpgrade) {
      return cardEl(inst, { onclick: () => { closeOverlay(); onPick(inst); } });
    }
    const after = { ...inst, upgraded: true };
    return el('div.upg-pair', { onclick: () => { closeOverlay(); onPick(inst); } }, [
      el('div.upg-side', {}, [el('div.upg-lab', { text: '지금' }), cardEl(inst)]),
      el('div.upg-arrow', { text: '→' }),
      el('div.upg-side.is-after', {}, [el('div.upg-lab.is-after', { text: '강화 후' }), cardEl(after)]),
    ]);
  };

  open(
    title(heading),
    sub(opts.showUpgrade
      ? `덱 ${run.state.deck.length}장 중 강화할 수 있는 ${list.length}장. 바뀌는 부분이 오른쪽에 보인다.`
      : `덱 ${run.state.deck.length}장 중 ${list.length}장을 고를 수 있다.`),
    list.length
      ? el(opts.showUpgrade ? 'div.upg-grid' : 'div.deck-grid', {}, list.map(card))
      : el('div.ov-sub', { text: '고를 수 있는 카드가 없다.' }),
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
      monImg(m.species, POKEMON[m.species], 4, { alt: m.ko }),
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
  // 쓰러진 포켓몬도 여기서 일어난다(healAllPercent 가 fainted 를 푼다).
  // 부활이 전투 승리에서 회복 방으로 옮겨 오면서, 이 30% 가 "눕느냐
  // 강화하느냐"를 진짜 고민으로 만든다.
  const healPct = 0.30;
  const heal = () => {
    run.healAllPercent(healPct);
    closeOverlay(); onDone();
  };
  const upgrade = () => showDeckPick(run, '강화할 기술을 고른다', (c) => !c.upgraded, (inst) => {
    if (inst) run.upgradeCard(inst.uid);
    if (!inst) { showRest(run, onDone); return; }     // 취소하면 되돌아온다
    onDone();
  }, { cancellable: true, showUpgrade: true });

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
    ? monImg(data.species, POKEMON[data.species], 5, { style: { width: '120px' } })
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
      monImg(m.species, POKEMON[m.species], 4, { alt: m.ko }),
      el('div.p-name', { text: m.ko }),
      el('div.reward-sub', { text: `HP ${m.hp}/${m.maxHp}` }),
    ]))),
    sub(`덱 ${R.deck.length}장 · 도구 ${R.relics.length}개 · 돈 ${R.gold}원<br>시드 <b>${R.seed}</b>`),
    actions(el('button.btn.btn-primary.btn-lg', { text: '다시 시작', onclick: () => { closeOverlay(); onRestart(); } })),
  );
}
