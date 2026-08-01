// ─────────────────────────────────────────────────────────────
// icons.js — 인라인 SVG 아이콘
//
// 적의 의도는 전투에서 제일 먼저 읽어야 하는 정보다. 그걸 이모지로 두면
// 글꼴에 따라 크기·굵기·세로 위치가 제각각이 되고, 어떤 환경에서는
// 아예 네모로 뜬다. 그래서 이 몇 개만 직접 그린다.
//
// 나머지(카드 그림의 타입 기호 같은 것)는 이모지로 둔다 — 없어도
// 게임을 읽는 데 지장이 없는 장식이라서.
// ─────────────────────────────────────────────────────────────

const svg = (body, size = 26) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" ` +
  `stroke="#100c08" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

/** 공격 — 아래를 향한 검 */
const SWORD = svg(`
  <path d="M12 2.5 L15.4 7 L15.4 14 L8.6 14 L8.6 7 Z" fill="#e8d9b4"/>
  <path d="M6.5 14.4 h11 v2.2 h-11 z" fill="#a8763a"/>
  <path d="M11 16.6 h2 v4.6 h-2 z" fill="#7a5326"/>
  <path d="M12 2.5 L13.6 6.6 L12 6.6 Z" fill="#fff8e4" stroke="none"/>
`);

/** 방어 — 방패 */
const SHIELD = svg(`
  <path d="M12 2.4 L20 5.4 v6.4 c0 4.6 -3.4 8 -8 9.8 c-4.6 -1.8 -8 -5.2 -8 -9.8 V5.4 Z" fill="#7ea8d8"/>
  <path d="M12 5 L17.2 7 v4.6 c0 3.2 -2.3 5.6 -5.2 6.9 V5 Z" fill="#3f6ea8" stroke="none"/>
`);

/** 강화 — 위로 향한 화살 */
const UP = svg(`
  <path d="M12 2.6 L20 11 h-4.6 v9.4 H8.6 V11 H4 Z" fill="#7fd88a"/>
`);

/** 약화 — 아래로 향한 화살 */
const DOWN = svg(`
  <path d="M12 21.4 L4 13 h4.6 V3.6 h6.8 V13 H20 Z" fill="#e0796a"/>
`);

/** 공격 + 약화 — 검에 아래 화살을 겹친다 */
const SWORD_DOWN = svg(`
  <path d="M9.6 2.6 L12.6 6.4 L12.6 13 L6.6 13 L6.6 6.4 Z" fill="#e8d9b4"/>
  <path d="M4.8 13.4 h9.6 v2 H4.8 z" fill="#a8763a"/>
  <path d="M8.6 15.4 h2 v4.2 h-2 z" fill="#7a5326"/>
  <path d="M18.5 21 L14.4 16 h2.6 v-5.4 h3 V16 h2.6 Z" fill="#e0796a"/>
`);

/** 공격 + 방어 */
const SWORD_SHIELD = svg(`
  <path d="M9 2.6 L12 6.4 L12 13 L6 13 L6 6.4 Z" fill="#e8d9b4"/>
  <path d="M4.2 13.4 h9.6 v2 H4.2 z" fill="#a8763a"/>
  <path d="M8 15.4 h2 v4.2 H8 z" fill="#7a5326"/>
  <path d="M18 9.4 L23 11.2 v3.6 c0 2.8 -2.1 4.9 -5 6 c-2.9 -1.1 -5 -3.2 -5 -6 v-3.6 Z" fill="#7ea8d8"/>
`);

/** 얼어붙어 아무것도 못 할 때 */
const SNOW = svg(`
  <path d="M12 2.6 v18.8 M4 7 l16 10 M20 7 L4 17" stroke="#8fe4dc" stroke-width="2.4"/>
  <path d="M12 2.6 l-2.4 2.6 M12 2.6 l2.4 2.6 M12 21.4 l-2.4 -2.6 M12 21.4 l2.4 -2.6" stroke="#d4f6f2" stroke-width="1.8"/>
`);

/** 무엇을 할지 알 수 없을 때 */
const UNKNOWN = svg(`
  <circle cx="12" cy="12" r="9" fill="#5a5366"/>
  <path d="M9 9.4 a3 3 0 1 1 3.4 3.2 v1.6" stroke="#f0dca8" stroke-width="2.2" fill="none"/>
  <circle cx="12.2" cy="17.4" r="1.3" fill="#f0dca8" stroke="none"/>
`);

export const INTENT_SVG = {
  ATTACK: SWORD,
  DEFEND: SHIELD,
  BUFF: UP,
  DEBUFF: DOWN,
  ATTACK_DEBUFF: SWORD_DOWN,
  ATTACK_DEFEND: SWORD_SHIELD,
  SLEEP: SNOW,
  FROZEN: SNOW,
  UNKNOWN,
};

export const intentIcon = (kind) => INTENT_SVG[kind] || UNKNOWN;

/** 상단 정보띠의 돈 표시 — 이모지 대신 */
export const COIN = svg(`
  <circle cx="12" cy="12" r="8.6" fill="#e8c56a"/>
  <circle cx="12" cy="12" r="5.6" fill="#c49a3a" stroke="none"/>
  <path d="M10 9.6 h4 M12 9.6 v5.2 M10 12.4 h4" stroke="#7a5a18" stroke-width="1.5"/>
`, 15);

/** 보상 목록의 카드 뭉치 */
export const CARDS_ICON = svg(`
  <rect x="3.5" y="5" width="11" height="15" rx="2" fill="#d8c9a4" transform="rotate(-10 9 12.5)"/>
  <rect x="8" y="3.6" width="12" height="16.4" rx="2" fill="#f2e8cf"/>
  <path d="M14 6.6 l1.5 3.2 3.4 .4 -2.6 2.3 .7 3.4 -3-1.8 -3 1.8 .7-3.4 -2.6-2.3 3.4-.4 Z" fill="#c8a03a" stroke="none"/>
`, 26);

// ── 지도의 방 아이콘 ─────────────────────────────────────────
// 지도는 이 게임에서 제일 오래 들여다보는 화면이다. 기호 글꼴에 맡기면
// 환경에 따라 네모로 뜨므로 여기도 직접 그린다.

const ROOM_SIZE = 24;
const r = (body) => svg(body, ROOM_SIZE);

export const ROOM_SVG = {
  MONSTER: r(`
    <path d="M4 3.6 L9.5 14 L7.6 15.6 L3 5.6 Z" fill="#e8d9b4"/>
    <path d="M20 3.6 L14.5 14 L16.4 15.6 L21 5.6 Z" fill="#e8d9b4"/>
    <path d="M6.4 15 l3.2 2.6 -2 2.6 -3.4 -2.6 Z" fill="#a8763a"/>
    <path d="M17.6 15 l-3.2 2.6 2 2.6 3.4 -2.6 Z" fill="#a8763a"/>
  `),
  ELITE: r(`
    <path d="M12 2.6 c5 0 8 3.4 8 7.6 c0 2.6 -1.2 4.4 -2.8 5.6 v3 h-10.4 v-3 C5.2 14.6 4 12.8 4 10.2 C4 6 7 2.6 12 2.6 Z" fill="#e0796a"/>
    <circle cx="8.8" cy="10.4" r="2.2" fill="#2b1a16" stroke="none"/>
    <circle cx="15.2" cy="10.4" r="2.2" fill="#2b1a16" stroke="none"/>
    <path d="M10.4 15 h3.2 v3.8 h-3.2 z" fill="#2b1a16" stroke="none"/>
  `),
  EVENT: r(`
    <circle cx="12" cy="12" r="9" fill="#8a76c8"/>
    <path d="M8.8 9.4 a3.2 3.2 0 1 1 3.6 3.4 v1.6" stroke="#f4ecd8" stroke-width="2.3" fill="none"/>
    <circle cx="12.3" cy="17.6" r="1.4" fill="#f4ecd8" stroke="none"/>
  `),
  SHOP: r(`
    <path d="M5.4 8.4 h13.2 l1.4 11.4 h-16 Z" fill="#e8c56a"/>
    <path d="M8.6 8.4 v-1.6 a3.4 3.4 0 0 1 6.8 0 v1.6" stroke="#7a5a18" stroke-width="2" fill="none"/>
    <path d="M9.6 12.6 h4.8 M12 12.6 v4.4 M9.6 15.2 h4.8" stroke="#7a5a18" stroke-width="1.6"/>
  `),
  REST: r(`
    <circle cx="12" cy="12" r="9" fill="#f2f0ea"/>
    <path d="M10.2 5.6 h3.6 v4.6 h4.6 v3.6 h-4.6 v4.6 h-3.6 v-4.6 H5.6 v-3.6 h4.6 z" fill="#e0483a" stroke="none"/>
  `),
  TREASURE: r(`
    <path d="M3.4 9.4 h17.2 v10.4 H3.4 Z" fill="#a8763a"/>
    <path d="M3.4 9.4 c0 -3.4 3.8 -5.4 8.6 -5.4 s8.6 2 8.6 5.4 Z" fill="#c99248"/>
    <path d="M10.2 9.4 h3.6 v4.4 h-3.6 z" fill="#e8c56a"/>
    <path d="M3.4 12.6 h17.2" stroke="#6d4a1e" stroke-width="1.4"/>
  `),
  BOSS: r(`
    <path d="M12 2.4 l2.9 6.4 6.9 .7 -5.2 4.7 1.5 6.9 -6.1 -3.6 -6.1 3.6 1.5 -6.9 -5.2 -4.7 6.9 -.7 Z" fill="#ff9a6a"/>
    <path d="M12 7.4 l1.5 3.3 3.5 .4 -2.6 2.4 .7 3.5 -3.1 -1.9 -3.1 1.9 .7 -3.5 -2.6 -2.4 3.5 -.4 Z" fill="#c8543a" stroke="none"/>
  `),
};

export const roomIcon = (type) => ROOM_SVG[type] || ROOM_SVG.EVENT;
