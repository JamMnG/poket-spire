// ─────────────────────────────────────────────────────────────
// cardView.js — 카드 한 장의 DOM
//
// 카드는 손패·보상·상점·덱보기 네 군데에 나온다. 전부 같은 함수를 쓰고
// 자리 배치만 바깥에서 정한다 — 카드 모양이 화면마다 미묘하게 달라지는
// 것만큼 게임이 싸구려로 보이는 것도 없다.
//
// 테두리 색 = 타입 색. 슬더스가 공격/스킬/파워를 색으로 나누는 자리에
// 타입을 넣었다. 이 게임에서 한 장의 카드를 볼 때 제일 먼저 알아야 하는
// 것이 "무슨 타입인가" 이기 때문이다.
// ─────────────────────────────────────────────────────────────
import { el, boldNums } from './dom.js';
import { resolveCard, KIND } from '../data/cards.js';
import { typeKo, typeColor } from '../data/types.js';
import { POKEMON } from '../data/pokemon.js';
import { monImg } from '../render/pokemonSprites.js';
import { cardEmblem } from '../render/cardEmblem.js';

/**
 * @param inst    덱 개체 {uid,id,upgraded,owner}
 * @param opts    { preview:{dmg,mult,hits}, unplayable, picked, onclick, onenter, onleave }
 */
export function cardEl(inst, opts = {}) {
  const c = resolveCard(inst);
  const tc = c.type ? typeColor(c.type) : '#8a7a5a';

  // 소유 포켓몬이 있으면 그 도트를 — "누구의 기술인가" 가 타입보다 먼저 알아야
  // 하는 정보라서. 나머지는 타입 엠블럼을 그린다.
  const art = (c.owner && POKEMON[c.owner])
    ? monImg(c.owner, POKEMON[c.owner], 4, { className: 'art-mon', alt: POKEMON[c.owner].ko })
    : el('div.art-emblem', { html: cardEmblem(c) });

  const kids = [
    el('div.card-cost', { text: c.cost }),
    el('div.card-name', { text: c.ko, title: c.ko }),
    c.type && el('div.card-type', { text: typeKo(c.type) }),
    el('div.card-art', {}, [art]),
    el('div.card-kind', { text: KIND[c.kind] || '' }),
    el('div.card-text', { html: boldNums(c.text) }),
  ];

  // 실제로 몇 대미지가 나가는지 — 상성·랭크·도구까지 반영된 값
  if (opts.preview) {
    const p = opts.preview;
    const cls = p.mult > 1 ? 'super' : p.mult < 1 ? 'resist' : '';
    const label = p.hits > 1 ? `${p.dmg}×${p.hits}` : `${p.dmg}`;
    kids.push(el(`div.card-preview.${cls}`.replace(/\.$/, ''), { text: label }));
  }

  const node = el('div.card', {
    style: { '--tc': tc },
    dataset: { uid: inst.uid, id: inst.id },
    onclick: opts.onclick,
    onmouseenter: opts.onenter,
    onmouseleave: opts.onleave,
  }, kids.filter(Boolean));

  if (c.upgraded) node.classList.add('card-upg');
  if (opts.unplayable) node.classList.add('is-unplayable');
  if (opts.picked) node.classList.add('is-picked');
  return node;
}

/**
 * 손패를 부채꼴로 편다.
 * 장수에 따라 각도와 간격을 줄여 열 장까지 화면 안에 들어오게 한다.
 */
export function layoutFan(handEl, cards) {
  const n = cards.length;
  if (!n) return;
  const rect = handEl.getBoundingClientRect();
  const cardW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w')) || 148;

  const maxSpread = Math.min(rect.width - cardW, n * cardW * 0.78);
  const step = n > 1 ? maxSpread / (n - 1) : 0;
  const angleStep = n > 1 ? Math.min(4.2, 26 / n) : 0;
  const mid = (n - 1) / 2;

  // 부채꼴은 가장자리가 아래로 처진다. 그만큼 손패 전체를 올려 두지 않으면
  // 장수가 늘었을 때 바깥쪽 카드가 화면 아래로 잘려 나간다.
  const droop = 1.7;
  handEl.style.setProperty('--fan-lift', `${mid * mid * droop}px`);

  cards.forEach((node, i) => {
    const off = i - mid;
    const tx = off * step;
    const rot = off * angleStep;
    const ty = Math.abs(off) * Math.abs(off) * droop;   // 가장자리가 아래로 처지게
    node.style.setProperty('--tx', `${tx}px`);
    node.style.setProperty('--ty', `${ty}px`);
    node.style.left = `calc(50% - var(--card-w) / 2)`;
    node.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
    node.style.zIndex = String(10 + i);
  });
}
