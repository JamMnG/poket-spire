// ─────────────────────────────────────────────────────────────
// mapView.js — 지도 화면
//
// 아래에서 위로 올라간다. 선은 캔버스로, 방은 DOM으로 그린다 —
// 방마다 마우스 올림·클릭·툴팁이 필요한데 그걸 캔버스로 하려면
// 히트 테스트를 직접 짜야 하고, 얻는 게 없다.
//
// 갈 수 있는 방만 밝고 나머지는 눌러 둔다. 로그라이크 지도의 핵심은
// "지금 무엇을 고를 수 있는가" 를 한눈에 보이게 하는 것이다.
// ─────────────────────────────────────────────────────────────
import { el, $, mount } from './dom.js';
import { attachTip } from './tooltip.js';
import { roomIcon } from './icons.js';
import { ROOM } from '../data/mapGen.js';

const COL_W = 96;
const ROW_H = 92;
const PAD_X = 60;
const PAD_Y = 60;

const ROOM_TIP = {
  MONSTER:  '야생 포켓몬과 싸운다. 이기면 돈과 기술 카드를 얻는다.',
  ELITE:    '강한 상대다. 위험한 대신 지닌 도구를 준다.',
  EVENT:    '무슨 일이 일어날지 가 봐야 안다.',
  SHOP:     '카드와 도구를 사고, 기술을 잊을 수 있다.',
  REST:     '파티를 회복하거나 기술 하나를 강화한다.',
  TREASURE: '지닌 도구가 들어 있다.',
  BOSS:     '이 막의 주인. 준비하고 올라가라.',
};

export function renderMap(run, onPick) {
  const { map, currentNode } = run.state;
  const act = run.act();
  const head = document.querySelector('.map-head h2');
  if (head) head.textContent = `${act.n}막 · ${act.name}`;

  // 범례 — 항상 비어 있던 칸이다. 아이콘과 이름을 붙여 준다
  const legend = document.querySelector('.map-legend');
  if (legend && !legend.childElementCount) {
    mount(legend, ...['MONSTER', 'ELITE', 'EVENT', 'SHOP', 'REST', 'TREASURE', 'BOSS'].map((t) =>
      el('span.legend-chip', {}, [
        el('span.legend-ic', { html: roomIcon(t) }),
        el('span', { text: ROOM[t].ko }),
      ])));
  }
  const nodesEl = $('#map-nodes');
  const canvas = $('#map-canvas');

  const width = PAD_X * 2 + (map.columns - 1) * COL_W;
  const height = PAD_Y * 2 + map.floors * ROW_H;

  nodesEl.style.width = `${width}px`;
  nodesEl.style.height = `${height}px`;
  canvas.width = width;
  canvas.height = height;

  // 아래가 1층이 되도록 y를 뒤집는다
  const pos = (n) => ({
    x: PAD_X + n.col * COL_W,
    y: height - PAD_Y - n.floor * ROW_H,
  });

  const open = run.options();
  const done = (n) => currentNode && map.nodes[currentNode] && n.floor < map.nodes[currentNode].floor;

  // ── 선 ────────────────────────────────────────────────────
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, width, height);
  for (const n of Object.values(map.nodes)) {
    const a = pos(n);
    for (const nid of n.next) {
      const m = map.nodes[nid];
      if (!m) continue;
      const b = pos(m);
      const live = n.id === currentNode || (!currentNode && map.start.includes(n.id) && false);
      g.beginPath();
      g.moveTo(a.x, a.y);
      // 살짝 휘게 — 직선만 있으면 지도가 회로도처럼 보인다
      g.quadraticCurveTo((a.x + b.x) / 2 + (b.x - a.x) * 0.18, (a.y + b.y) / 2, b.x, b.y);
      g.strokeStyle = live ? 'rgba(240,208,120,.92)' : 'rgba(150,124,84,.5)';
      g.lineWidth = live ? 3.5 : 2.2;
      g.setLineDash(live ? [] : [6, 7]);
      g.stroke();
    }
  }

  // ── 방 ────────────────────────────────────────────────────
  const els = Object.values(map.nodes).map((n) => {
    const p = pos(n);
    const isOpen = open.includes(n.id);
    const isHere = n.id === currentNode;
    const cls = [
      'mnode', `t-${n.type}`,
      isOpen ? 'is-open' : '',
      isHere ? 'is-here' : '',
      !isOpen && !isHere && done(n) ? 'is-done' : '',
    ].filter(Boolean).join('.');

    const node = el(`div.${cls}`, {
      style: { left: `${p.x}px`, top: `${p.y}px` },
      html: roomIcon(n.type),
      onclick: () => { if (isOpen) onPick(n.id); },
    });
    attachTip(node, `<div class="tt-name">${ROOM[n.type].ko}</div>${ROOM_TIP[n.type]}`);
    if (isOpen || isHere) node.appendChild(el('div.mnode-label', { text: ROOM[n.type].ko }));
    return node;
  });

  mount(nodesEl, ...els);

  // 갈 수 있는 방이 화면 아래쪽에 오도록 스크롤을 맞춘다.
  // (부르는 쪽에서 화면을 먼저 켜 둬야 clientHeight 가 잡힌다)
  const scroll = $('.map-scroll');
  const target = open.length ? map.nodes[open[0]] : map.nodes[currentNode];
  if (target) {
    const y = pos(target).y;
    scroll.scrollTop = Math.max(0, y - scroll.clientHeight * 0.62);
  }
}
