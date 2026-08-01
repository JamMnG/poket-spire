// ─────────────────────────────────────────────────────────────
// cardEmblem.js — 카드 그림칸의 기술 엠블럼 (벡터)
//
// ★ 처음엔 **타입별로** 그렸다. 그랬더니 몸통박치기·발버둥·은혜갚기가
//   전부 같은 노말 별이 됐다. 카드가 101종인데 그림은 18종이니 당연한 일이다.
//
//   그래서 **형태는 기술이, 색은 타입이** 정하게 바꿨다.
//     화염방사 = 광선 + 불꽃색      냉동빔 = 광선 + 얼음색
//     몸통박치기 = 충돌            발버둥 = 마구 휘두름
//   같은 계열이라도 색이 다르고, 같은 타입이라도 형태가 다르다.
//
// 형태는 40종. 기술마다 하나씩 그리는 대신 "무엇을 하는 동작인가" 로 묶었다
// (물어뜯기 / 광선 / 던지기 / 베기 …). 이 정도 해상도면 손패에 뜬 다섯 장이
// 서로 헷갈리지 않는다.
//
// viewBox 64×40 — 그림칸이 가로로 길다.
// ─────────────────────────────────────────────────────────────
import { typeColor, typeInk } from '../data/types.js';

const lite = (c) => `color-mix(in srgb, ${c} 62%, #ffffff)`;
const dark = (c) => `color-mix(in srgb, ${c} 68%, #000000)`;
const PALE = '#f6f1e4';

// ── 형태 40종 ────────────────────────────────────────────────
const SHAPE = {
  // ── 때리기 ────────────────────────────────────────────────
  impact: (c) => `
    <path d="M32 2 L38 14 L52 9 L45 20 L58 26 L43 27 L45 38 L33 30 L22 38 L24 27 L8 26 L21 20 L13 8 L26 13 Z" fill="${c}"/>
    <path d="M32 12 L36 20 L31 27 L26 20 Z" fill="${lite(c)}"/>`,
  claw: (c) => `
    <g fill="${c}">
      <path d="M12 2 C17 11 20 23 19 37 C14 26 11 13 8 4 Z"/>
      <path d="M30 1 C35 10 38 23 37 37 C32 26 29 12 26 3 Z"/>
      <path d="M48 3 C53 12 56 24 55 37 C50 26 47 13 44 5 Z"/>
    </g>
    <g fill="${lite(c)}">
      <path d="M12 2 C15 7 17 12 18 17 C15 11 13 7 10 3 Z"/>
      <path d="M48 3 C51 8 53 13 54 18 C51 12 49 8 46 4 Z"/>
    </g>`,
  slash: (c) => `
    <path d="M6 36 C18 26 38 12 58 3 C46 16 28 30 12 38 Z" fill="${c}"/>
    <path d="M14 30 C26 22 42 12 55 5 C43 15 28 25 16 32 Z" fill="${lite(c)}"/>`,
  fang: (c) => `
    <path d="M8 2 h48 v7 H8 Z" fill="${dark(c)}"/>
    <g fill="${PALE}">
      <path d="M12 9 l5 13 5-13 Z"/><path d="M26 9 l6 17 6-17 Z"/><path d="M42 9 l5 13 5-13 Z"/>
    </g>
    <path d="M8 31 h48 v7 H8 Z" fill="${dark(c)}"/>
    <g fill="${PALE}">
      <path d="M14 31 l5-11 5 11 Z"/><path d="M30 31 l5-13 5 13 Z"/><path d="M44 31 l4-9 4 9 Z"/>
    </g>
    <path d="M8 2 h48 v7 H8 Z" fill="${c}" opacity=".45"/>`,
  horn: (c) => `
    <path d="M58 4 C40 8 22 16 4 30 L10 36 C26 24 44 14 60 12 Z" fill="${c}"/>
    <path d="M58 4 L60 12 L48 12 Z" fill="${lite(c)}"/>
    <path d="M4 30 l6 6 -8 2 Z" fill="${dark(c)}"/>`,
  kick: (c) => `
    <path d="M4 8 C18 6 30 12 38 22 L48 16 l8 14 -16 6 -4-9 C20 22 12 18 2 18 Z" fill="${c}"/>
    <path d="M4 8 C15 7 24 11 31 17 C22 13 13 11 4 12 Z" fill="${lite(c)}"/>`,
  punch: (c) => `
    <path d="M18 12 h26 a6 6 0 0 1 6 6 v9 a6 6 0 0 1-6 6 H20 a8 8 0 0 1-8-8 v-5 Z" fill="${c}"/>
    <g fill="${lite(c)}"><rect x="20" y="10" width="6" height="8"/><rect x="28" y="9" width="6" height="9"/>
      <rect x="36" y="10" width="6" height="8"/><rect x="44" y="12" width="5" height="6"/></g>
    <path d="M12 20 a6 6 0 0 1 6-6 v10 a6 6 0 0 1-6-4 Z" fill="${dark(c)}"/>`,
  press: (c) => `
    <path d="M6 4 h52 v9 H6 Z" fill="${c}"/>
    <path d="M6 4 h52 v3 H6 Z" fill="${lite(c)}"/>
    <path d="M26 13 h12 v10 H26 Z" fill="${dark(c)}"/>
    <path d="M10 25 h44 v11 H10 Z" fill="${c}"/>
    <path d="M18 27 h28 v3 H18 Z" fill="${dark(c)}"/>`,
  thrash: (c) => `
    <path d="M8 34 C14 22 10 14 18 4 C20 16 26 18 30 8 C32 20 40 20 42 10 C46 22 52 20 56 12 C56 28 44 38 32 38 C22 38 14 37 8 34 Z" fill="${c}"/>
    <path d="M18 4 C19 12 22 15 25 14 C21 18 18 13 18 4 Z" fill="${lite(c)}"/>`,
  dash: (c) => `
    <path d="M26 2 L54 6 L34 20 L58 24 L22 38 L34 22 L10 18 Z" fill="${c}"/>
    <g fill="${dark(c)}"><rect x="2" y="8" width="14" height="3.4" rx="1.7"/>
      <rect x="0" y="18" width="10" height="3.4" rx="1.7"/><rect x="4" y="27" width="13" height="3.4" rx="1.7"/></g>`,
  tail: (c) => `
    <path d="M2 32 C14 32 24 26 30 16 C34 9 42 6 50 9 L56 4 l6 12 -13 3 2-7 c-5-2-9 0-11 5 C33 30 18 38 2 38 Z" fill="${c}"/>
    <path d="M50 9 l6 -5 4 8 Z" fill="${lite(c)}"/>`,
  multi: (c) => `
    <g fill="${c}">
      <path d="M2 6 h26 l-6 5 6 5 H2 l6-5 Z"/>
      <path d="M14 17 h26 l-6 5 6 5 H14 l6-5 Z"/>
      <path d="M28 28 h26 l-6 5 6 5 H28 l6-5 Z"/>
    </g>
    <g fill="${lite(c)}"><path d="M2 6 h10 l-6 5 6 5 H2 l6-5 Z"/></g>`,

  // ── 쏘기 ──────────────────────────────────────────────────
  beam: (c) => `
    <path d="M2 14 h30 v12 H2 Z" fill="${c}"/>
    <path d="M2 17 h30 v5 H2 Z" fill="${lite(c)}"/>
    <path d="M32 8 L60 20 L32 32 Z" fill="${c}"/>
    <path d="M36 14 L52 20 L36 26 Z" fill="${lite(c)}"/>`,
  spray: (c) => `
    <path d="M2 20 C10 14 16 13 22 15 C18 20 18 22 22 26 C16 28 10 27 2 20 Z" fill="${dark(c)}"/>
    <path d="M22 10 C36 6 48 10 58 20 C48 30 36 34 22 30 C28 24 28 16 22 10 Z" fill="${c}"/>
    <path d="M28 15 C38 13 46 16 52 20 C46 24 38 27 28 25 C31 22 31 18 28 15 Z" fill="${lite(c)}"/>`,
  ball: (c) => `
    <circle cx="40" cy="20" r="16" fill="${c}"/>
    <circle cx="35" cy="15" r="7" fill="${lite(c)}"/>
    <g fill="${dark(c)}"><rect x="2" y="12" width="16" height="4" rx="2"/>
      <rect x="0" y="24" width="13" height="4" rx="2"/></g>`,
  bolt: (c) => `
    <path d="M40 1 L18 21 h11 L24 39 L46 17 H34 Z" fill="${c}"/>
    <path d="M38 5 L26 18 h6 Z" fill="${lite(c)}"/>`,
  burst: (c) => `
    <path d="M32 1 L40 13 L54 6 L50 20 L63 24 L49 28 L52 39 L38 33 L32 39 L26 33 L12 39 L15 28 L1 24 L14 20 L10 6 L24 13 Z" fill="${c}"/>
    <path d="M32 11 L39 20 L32 29 L25 20 Z" fill="${lite(c)}"/>
    <circle cx="32" cy="20" r="4" fill="${PALE}"/>`,
  wave: (c) => `
    <path d="M2 30 C10 22 18 22 26 30 C34 38 42 38 50 30 C54 26 58 25 62 26 v10 H2 Z" fill="${c}"/>
    <path d="M2 20 C10 12 18 12 26 20 C34 28 42 28 50 20 C54 16 58 15 62 16 v8 C58 23 54 24 50 28 C42 36 34 36 26 28 C18 20 10 20 2 28 Z" fill="${lite(c)}"/>`,
  pulse: (c) => `
    <g fill="none" stroke="${c}" stroke-width="4">
      <circle cx="16" cy="20" r="6"/><path d="M28 8 a16 16 0 0 1 0 24"/><path d="M40 3 a24 24 0 0 1 0 34"/>
    </g>
    <circle cx="16" cy="20" r="4" fill="${lite(c)}" stroke="none"/>`,
  whip: (c) => `
    <path d="M2 6 C22 6 30 16 34 24 C37 30 42 32 48 29 L52 34 C42 39 34 35 30 27 C26 18 20 12 2 12 Z" fill="${c}"/>
    <path d="M48 29 l10-5 2 8 Z" fill="${lite(c)}"/>`,
  leaves: (c) => `
    <g fill="${c}">
      <path d="M4 12 C14 4 26 6 30 14 C22 20 10 20 4 12 Z"/>
      <path d="M22 26 C32 18 44 20 48 28 C40 34 28 34 22 26 Z"/>
      <path d="M36 4 C46 -2 58 2 60 10 C52 16 40 14 36 4 Z"/>
    </g>
    <g stroke="${dark(c)}" stroke-width="1.8" fill="none">
      <path d="M4 12 C14 12 24 13 30 14"/><path d="M22 26 C32 26 42 27 48 28"/><path d="M36 4 C46 5 55 8 60 10"/>
    </g>`,
  rock: (c) => `
    <path d="M22 4 L40 2 L52 12 L48 30 L30 36 L14 28 L12 12 Z" fill="${c}"/>
    <path d="M22 4 L34 16 L12 12 Z" fill="${lite(c)}"/>
    <path d="M34 16 L48 30 L30 36 L14 28 Z" fill="${dark(c)}"/>
    <path d="M2 30 l7 3 -3 5 Z" fill="${c}"/><path d="M56 6 l6 3 -4 4 Z" fill="${c}"/>`,
  gem: (c) => `
    <path d="M20 4 h24 l10 12 -22 22 -22-22 Z" fill="${c}"/>
    <path d="M20 4 L30 16 L10 16 Z" fill="${lite(c)}"/>
    <path d="M44 4 L54 16 L34 16 Z" fill="${dark(c)}"/>
    <path d="M30 16 h4 L32 34 Z" fill="${PALE}" opacity=".7"/>`,
  wind: (c) => `
    <g fill="none" stroke="${c}" stroke-width="4.4" stroke-linecap="round">
      <path d="M4 10 h34 a5 5 0 1 0-5-5"/>
      <path d="M4 21 h44 a6 6 0 1 1-6 6"/>
      <path d="M6 32 h24 a4 4 0 1 0-4-4"/>
    </g>`,
  wing: (c) => `
    <path d="M4 8 C22 6 44 12 60 28 C44 24 32 26 20 34 C16 25 11 15 4 8 Z" fill="${c}"/>
    <path d="M8 11 C22 12 38 18 50 26 C36 22 22 18 8 11 Z" fill="${lite(c)}"/>
    <path d="M20 34 C30 28 42 26 56 27 C42 30 30 34 20 34 Z" fill="${dark(c)}"/>`,
  web: (c) => `
    <g stroke="${c}" stroke-width="2.6" fill="none">
      <path d="M2 2 L44 20 M2 20 L44 20 M2 38 L44 20"/>
      <path d="M14 10 C22 14 24 26 14 30"/>
      <path d="M26 6 C38 12 38 28 26 34"/>
    </g>
    <circle cx="46" cy="20" r="5" fill="${c}"/>`,
  drip: (c) => `
    <path d="M18 2 C26 12 32 18 32 24 a10 10 0 0 1-20 0 C12 18 12 12 18 2 Z" fill="${c}"/>
    <path d="M15 22 a6 6 0 0 0 4 7 a8 8 0 0 1-7-8 Z" fill="${lite(c)}"/>
    <circle cx="46" cy="12" r="6" fill="${c}"/><circle cx="44" cy="10" r="2.4" fill="${lite(c)}"/>
    <circle cx="48" cy="30" r="4.4" fill="${c}"/>`,
  powder: (c) => `
    <g fill="${c}">
      <circle cx="10" cy="10" r="5"/><circle cx="26" cy="5" r="3.4"/><circle cx="40" cy="12" r="6"/>
      <circle cx="55" cy="6" r="3"/><circle cx="18" cy="24" r="4"/><circle cx="33" cy="28" r="5"/>
      <circle cx="50" cy="26" r="4.4"/><circle cx="60" cy="34" r="3"/><circle cx="6" cy="33" r="3.4"/>
    </g>
    <g fill="${lite(c)}"><circle cx="8" cy="8" r="2"/><circle cx="38" cy="10" r="2.4"/><circle cx="31" cy="26" r="2"/></g>`,
  eye: (c) => `
    <path d="M2 20 C14 6 50 6 62 20 C50 34 14 34 2 20 Z" fill="${PALE}"/>
    <circle cx="32" cy="20" r="11" fill="${c}"/>
    <circle cx="32" cy="20" r="5" fill="#241a10"/>
    <circle cx="28" cy="16" r="2.6" fill="${PALE}"/>
    <path d="M2 20 C14 6 50 6 62 20" fill="none" stroke="${dark(c)}" stroke-width="2.6"/>`,
  moon: (c) => `
    <path d="M40 4 a18 18 0 1 0 0 32 a15 15 0 0 1 0-32 Z" fill="${c}"/>
    <path d="M28 9 a13 13 0 0 0-4 9 a17 17 0 0 1 6-11 Z" fill="${lite(c)}"/>
    <path d="M52 8 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6-4 -4-1.6 4-1.6 Z" fill="${lite(c)}"/>`,

  // ── 땅·굴 ─────────────────────────────────────────────────
  dig: (c) => `
    <path d="M2 26 h60 v12 H2 Z" fill="${dark(c)}"/>
    <path d="M20 26 C22 18 42 18 44 26 Z" fill="${c}"/>
    <path d="M46 2 l6 4 -14 20 -6-4 Z" fill="${c}"/>
    <path d="M36 22 l10 5 -6 5 -6-6 Z" fill="${lite(c)}"/>
    <path d="M2 26 h60 v3 H2 Z" fill="${lite(c)}" opacity=".5"/>`,
  quake: (c) => `
    <path d="M2 22 L12 10 L20 24 L30 6 L40 24 L50 12 L62 22 v14 H2 Z" fill="${c}"/>
    <path d="M2 22 L12 10 L20 24 L30 6 L40 24 L50 12 L62 22 v3 L50 16 L40 28 L30 11 L20 29 L12 15 L2 26 Z" fill="${lite(c)}"/>
    <g stroke="${dark(c)}" stroke-width="2.4"><path d="M16 28 v8 M34 26 v10 M48 29 v7"/></g>`,
  root: (c) => `
    <path d="M28 2 h8 v18 h-8 Z" fill="${c}"/>
    <g stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round">
      <path d="M32 20 C22 24 16 30 12 38"/><path d="M32 20 C42 24 48 30 52 38"/><path d="M32 20 v18"/>
    </g>
    <g stroke="${dark(c)}" stroke-width="2.4" fill="none" stroke-linecap="round">
      <path d="M20 28 C16 30 14 33 13 36"/><path d="M44 28 C48 30 50 33 51 36"/>
    </g>
    <path d="M24 2 h16 v5 H24 Z" fill="${lite(c)}"/>`,

  // ── 홀리기·지속 ───────────────────────────────────────────
  psy: (c) => `
    <path d="M32 3 a17 17 0 1 0 17 17 h-7 a10 10 0 1 1-10-10 Z" fill="${c}"/>
    <path d="M32 13 a7 7 0 1 0 7 7 h-4 a3 3 0 1 1-3-3 Z" fill="${lite(c)}"/>`,
  ghost: (c) => `
    <path d="M32 3 a15 15 0 0 1 15 15 v19 l-6-5 -5 5 -4-5 -4 5 -5-5 -6 5 V18 A15 15 0 0 1 32 3 Z" fill="${c}"/>
    <circle cx="26" cy="18" r="3.4" fill="#241a2c"/><circle cx="38" cy="18" r="3.4" fill="#241a2c"/>
    <path d="M27 26 q5 5 10 0" stroke="${dark(c)}" stroke-width="2.4" fill="none"/>`,
  hexmark: (c) => `
    <g fill="none" stroke="${c}" stroke-width="3">
      <circle cx="32" cy="20" r="16"/><circle cx="32" cy="20" r="9"/>
      <path d="M32 4 L46 28 H18 Z"/>
    </g>
    <circle cx="32" cy="20" r="3.4" fill="${lite(c)}"/>
    <g fill="${c}"><circle cx="32" cy="4" r="2.6"/><circle cx="46" cy="28" r="2.6"/><circle cx="18" cy="28" r="2.6"/></g>`,
  wisp: (c) => `
    <path d="M22 38 C14 32 12 24 18 16 C20 22 24 22 24 16 C26 26 32 24 32 14 C40 22 44 30 38 38 Z" fill="${c}"/>
    <path d="M26 34 C22 30 22 25 25 21 C26 27 30 27 30 22 C34 27 34 32 31 35 Z" fill="${lite(c)}"/>
    <circle cx="52" cy="10" r="5" fill="${c}"/><circle cx="51" cy="9" r="2" fill="${lite(c)}"/>`,
  weather: (c) => `
    <circle cx="44" cy="12" r="9" fill="${lite(c)}"/>
    <g stroke="${lite(c)}" stroke-width="2.6" stroke-linecap="round">
      <path d="M44 0 v-0 M44 26 v-2 M56 12 h1 M31 12 h1 M53 3 l1-1 M35 21 l-1 1"/>
    </g>
    <path d="M12 30 a8 8 0 0 1 2-15 a11 11 0 0 1 21 3 a7 7 0 0 1 0 12 Z" fill="${c}"/>
    <path d="M14 15 a11 11 0 0 1 16 0 a14 14 0 0 0-16 0 Z" fill="${lite(c)}"/>`,
  ring: (c) => `
    <ellipse cx="32" cy="20" rx="27" ry="12" fill="none" stroke="${c}" stroke-width="5"/>
    <ellipse cx="32" cy="20" rx="27" ry="12" fill="none" stroke="${lite(c)}" stroke-width="2" stroke-dasharray="6 10"/>
    <circle cx="32" cy="20" r="8" fill="${c}"/><circle cx="30" cy="18" r="3" fill="${lite(c)}"/>`,
  drain: (c) => `
    <circle cx="14" cy="20" r="10" fill="${dark(c)}"/>
    <g fill="${c}">
      <path d="M28 6 h20 l-5 5 5 5 H28 l5-5 Z"/>
      <path d="M28 24 h20 l-5 5 5 5 H28 l5-5 Z"/>
    </g>
    <circle cx="52" cy="20" r="8" fill="${c}"/><circle cx="50" cy="17" r="3" fill="${lite(c)}"/>
    <circle cx="11" cy="17" r="3.4" fill="${lite(c)}"/>`,
  bond: (c) => `
    <path d="M32 38 C14 26 6 18 6 12 A9 9 0 0 1 23 7 A9 9 0 0 1 41 7 A9 9 0 0 1 58 12 C58 18 50 26 32 38 Z" fill="${c}"/>
    <path d="M18 12 a5 5 0 0 1 8-3 a8 8 0 0 0-6 10 Z" fill="${lite(c)}"/>
    <path d="M50 4 l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4-3.6 -3.6-1.4 3.6-1.4 Z" fill="${lite(c)}"/>`,

  // ── 지키기·태세 ───────────────────────────────────────────
  shield: (c) => `
    <path d="M32 2 L52 9 v13 c0 10-8 15-20 19 C20 37 12 32 12 22 V9 Z" fill="${c}"/>
    <path d="M32 8 v25 c-8-3-14-7-14-13 V11 Z" fill="${lite(c)}"/>
    <path d="M32 8 L46 12 v9 c0 6-6 10-14 13 Z" fill="${dark(c)}"/>`,
  barrier: (c) => `
    <g fill="${c}">
      <path d="M6 6 h16 v12 H6 Z"/><path d="M26 6 h16 v12 H26 Z"/><path d="M46 6 h12 v12 H46 Z"/>
      <path d="M6 22 h10 v12 H6 Z"/><path d="M20 22 h16 v12 H20 Z"/><path d="M40 22 h18 v12 H40 Z"/>
    </g>
    <g fill="${lite(c)}"><path d="M6 6 h16 v3 H6 Z"/><path d="M20 22 h16 v3 H20 Z"/></g>`,
  shell: (c) => `
    <path d="M32 4 a20 16 0 0 1 20 16 a20 16 0 0 1-40 0 a20 16 0 0 1 20-16 Z" fill="${c}"/>
    <g stroke="${dark(c)}" stroke-width="2.4" fill="none">
      <path d="M32 4 v16 M12 20 h40 M18 9 L46 31 M46 9 L18 31"/>
    </g>
    <path d="M12 20 a20 16 0 0 0 40 0 v8 a20 12 0 0 1-40 0 Z" fill="${dark(c)}"/>
    <path d="M22 8 a16 12 0 0 1 12-3 a20 16 0 0 0-14 8 Z" fill="${lite(c)}"/>`,
  curl: (c) => `
    <circle cx="32" cy="21" r="17" fill="${c}"/>
    <path d="M32 4 a17 17 0 0 1 12 5 a12 12 0 0 0-18 16 a9 9 0 0 0 13 2 a5 5 0 0 1-8-6" fill="none" stroke="${dark(c)}" stroke-width="3"/>
    <path d="M20 10 a17 17 0 0 1 10-6 a20 20 0 0 0-12 9 Z" fill="${lite(c)}"/>`,
  wall: (c) => `
    <path d="M4 4 h56 v32 H4 Z" fill="${c}"/>
    <g stroke="${dark(c)}" stroke-width="2.4">
      <path d="M4 14 h56 M4 26 h56 M20 4 v10 M44 4 v10 M12 14 v12 M32 14 v12 M52 14 v12 M24 26 v10 M46 26 v10"/>
    </g>
    <path d="M4 4 h56 v3 H4 Z" fill="${lite(c)}"/>`,
  endure: (c) => `
    <path d="M32 2 a7 7 0 1 1 0 .1 Z" fill="${c}"/>
    <path d="M26 12 h12 v12 l8 14 h-7 l-7-11 -7 11 h-7 l8-14 Z" fill="${c}"/>
    <path d="M14 18 L26 14 v5 L18 22 Z M50 18 L38 14 v5 l8 3 Z" fill="${dark(c)}"/>
    <path d="M26 12 h6 v10 h-6 Z" fill="${lite(c)}"/>`,
  stockpile: (c) => `
    <path d="M14 28 h36 v8 H14 Z" fill="${dark(c)}"/>
    <path d="M18 18 h28 v9 H18 Z" fill="${c}"/>
    <path d="M22 8 h20 v9 H22 Z" fill="${lite(c)}"/>
    <path d="M32 0 l7 7 h-14 Z" fill="${c}"/>`,
  muscle: (c) => `
    <path d="M8 26 C8 14 18 6 30 6 C42 6 50 12 54 22 C56 28 52 34 46 34 C38 34 36 28 30 28 C22 28 20 34 14 34 C10 34 8 31 8 26 Z" fill="${c}"/>
    <path d="M18 14 C24 10 32 10 38 14 C30 12 24 12 18 14 Z" fill="${lite(c)}"/>
    <g stroke="${dark(c)}" stroke-width="2.4" fill="none"><path d="M30 28 C34 22 40 20 48 22"/></g>`,
  sword: (c) => `
    <path d="M32 1 L38 10 v18 H26 V10 Z" fill="${PALE}"/>
    <path d="M32 1 L35 8 h-6 Z" fill="#ffffff"/>
    <path d="M18 28 h28 v5 H18 Z" fill="${c}"/>
    <path d="M29 33 h6 v6 h-6 Z" fill="${dark(c)}"/>
    <path d="M26 10 h3 v18 h-3 Z" fill="${dark(c)}" opacity=".35"/>`,
  drum: (c) => `
    <ellipse cx="32" cy="10" rx="22" ry="7" fill="${lite(c)}"/>
    <path d="M10 10 v18 a22 7 0 0 0 44 0 V10 Z" fill="${c}"/>
    <g stroke="${dark(c)}" stroke-width="2.4"><path d="M14 13 L22 27 M32 12 v16 M50 13 L42 27"/></g>
    <path d="M4 2 l6 6 -4 3 Z M60 2 l-6 6 4 3 Z" fill="${dark(c)}"/>`,

  // ── 상태 변화 ─────────────────────────────────────────────
  buff: (c) => `
    <path d="M32 2 L50 20 h-9 v6 H23 v-6 h-9 Z" fill="${c}"/>
    <path d="M32 2 L41 11 h-4 v6 h-10 v-6 h-4 Z" fill="${lite(c)}"/>
    <path d="M23 30 h18 v8 H23 Z" fill="${c}"/>`,
  debuff: (c) => `
    <path d="M32 38 L14 20 h9 v-6 h18 v6 h9 Z" fill="${c}"/>
    <path d="M32 38 L23 29 h4 v-6 h10 v6 h4 Z" fill="${dark(c)}"/>
    <path d="M23 2 h18 v8 H23 Z" fill="${c}"/>`,
  heal: (c) => `
    <path d="M32 6 C38-2 52 1 52 12 C52 22 40 30 32 37 C24 30 12 22 12 12 C12 1 26-2 32 6 Z" fill="${c}"/>
    <path d="M29 12 h6 v5 h5 v6 h-5 v5 h-6 v-5 h-5 v-6 h5 z" fill="${PALE}"/>`,
  swap: (c) => `
    <path d="M6 12 h34 v-6 l14 10 -14 10 v-6 H6 Z" fill="${c}"/>
    <path d="M58 30 H24 v6 L10 26 l14-10 v6 h34 Z" fill="${dark(c)}"/>
    <path d="M6 12 h20 v4 H6 Z" fill="${lite(c)}"/>`,
  recycle: (c) => `
    <g fill="${c}">
      <path d="M32 2 l10 16 h-7 v6 h-6 v-6 h-7 Z"/>
      <path d="M8 34 L4 16 l6 4 3-5 5 3 -3 5 6 4 Z"/>
      <path d="M56 34 L60 16 l-6 4 -3-5 -5 3 3 5 -6 4 Z"/>
    </g>
    <path d="M32 2 l5 8 h-10 Z" fill="${lite(c)}"/>`,
  glare: (c) => `
    <path d="M4 8 L22 16 L4 20 Z M60 8 L42 16 L60 20 Z" fill="${dark(c)}"/>
    <path d="M10 22 C20 12 44 12 54 22 C44 32 20 32 10 22 Z" fill="${PALE}"/>
    <circle cx="32" cy="22" r="8" fill="${c}"/><circle cx="32" cy="22" r="3.6" fill="#241a10"/>
    <path d="M8 6 L26 14 M56 6 L38 14" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`,
  hand: (c) => `
    <path d="M20 38 V22 l-8-6 a4 4 0 0 1 5-6 l6 5 V6 a3.5 3.5 0 0 1 7 0 v8 V4 a3.5 3.5 0 0 1 7 0 v10 V8 a3.5 3.5 0 0 1 7 0 v12 c0 10-4 18-12 18 Z" fill="${c}"/>
    <path d="M23 15 l-6-5 a4 4 0 0 0-4 3 Z" fill="${lite(c)}"/>
    <path d="M52 6 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2 Z" fill="${lite(c)}"/>`,
  substitute: (c) => `
    <circle cx="32" cy="10" r="8" fill="${c}"/>
    <path d="M22 20 h20 v10 h-6 v8 h-8 v-8 h-6 Z" fill="${c}"/>
    <path d="M4 22 h18 v6 H4 Z M42 22 h18 v6 H42 Z" fill="${dark(c)}"/>
    <circle cx="29" cy="9" r="1.8" fill="#241a10"/><circle cx="35" cy="9" r="1.8" fill="#241a10"/>
    <path d="M26 12 a5 5 0 0 0 12 0 Z" fill="${lite(c)}"/>`,
  wheel: (c) => `
    <circle cx="32" cy="20" r="17" fill="none" stroke="${c}" stroke-width="6"/>
    <g stroke="${c}" stroke-width="3.4"><path d="M32 6 v28 M18 20 h28 M22 10 L42 30 M42 10 L22 30"/></g>
    <g fill="${lite(c)}"><circle cx="32" cy="20" r="4"/></g>
    <path d="M2 12 h10 M0 22 h8 M3 31 h9" stroke="${dark(c)}" stroke-width="3" stroke-linecap="round"/>`,
  eruption: (c) => `
    <path d="M6 38 L24 12 h16 l18 26 Z" fill="${dark(c)}"/>
    <path d="M24 12 h16 l6 9 H18 Z" fill="${c}"/>
    <path d="M32 0 C36 8 42 8 44 3 C46 12 40 14 32 14 C24 14 18 12 20 3 C22 8 28 8 32 0 Z" fill="${c}"/>
    <path d="M32 3 C34 8 36 9 37 7 C38 11 35 12 32 12 C29 12 26 11 27 7 C28 9 30 8 32 3 Z" fill="${lite(c)}"/>
    <circle cx="10" cy="10" r="3.4" fill="${c}"/><circle cx="54" cy="14" r="3" fill="${c}"/>`,
  blizzard: (c) => `
    <g stroke="${c}" stroke-width="3" stroke-linecap="round">
      <path d="M8 6 v14 M2 9 l12 8 M14 9 L2 17"/>
      <path d="M32 20 v16 M25 24 l14 8 M39 24 l-14 8"/>
    </g>
    <g stroke="${lite(c)}" stroke-width="2.4" stroke-linecap="round">
      <path d="M46 4 v12 M41 7 l10 6 M51 7 l-10 6"/>
    </g>
    <g fill="${c}"><circle cx="54" cy="26" r="3"/><circle cx="18" cy="30" r="2.6"/></g>`,
  sonic: (c) => `
    <path d="M6 14 h10 L28 4 v32 L16 26 H6 Z" fill="${c}"/>
    <g fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round">
      <path d="M36 13 a10 10 0 0 1 0 14"/><path d="M44 7 a18 18 0 0 1 0 26"/><path d="M52 2 a26 26 0 0 1 0 36"/>
    </g>
    <path d="M6 14 h10 L28 4 v6 L16 18 H6 Z" fill="${lite(c)}"/>`,
  seed: (c) => `
    <ellipse cx="24" cy="26" rx="12" ry="10" fill="${c}"/>
    <path d="M24 16 C24 8 30 2 40 2 C40 12 34 16 24 16 Z" fill="${lite(c)}"/>
    <path d="M24 16 C24 10 20 6 12 6 C12 13 16 16 24 16 Z" fill="${dark(c)}"/>
    <ellipse cx="20" cy="23" rx="4" ry="3" fill="${lite(c)}"/>
    <circle cx="50" cy="14" r="4" fill="${c}"/><circle cx="54" cy="30" r="3" fill="${c}"/>`,
  bubbles: (c) => `
    <g fill="none" stroke="${c}" stroke-width="3.4">
      <circle cx="18" cy="24" r="10"/><circle cx="38" cy="14" r="7"/><circle cx="50" cy="28" r="6"/>
    </g>
    <g fill="${lite(c)}"><circle cx="14" cy="19" r="3"/><circle cx="35" cy="11" r="2.2"/><circle cx="48" cy="25" r="2"/></g>`,
  whirl: (c) => `
    <path d="M32 2 C48 2 60 12 60 22 C60 30 52 36 42 36 C34 36 28 31 28 25 C28 20 32 17 37 17 C41 17 43 19 43 22" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
    <path d="M32 2 C22 2 12 8 8 16" fill="none" stroke="${lite(c)}" stroke-width="5" stroke-linecap="round"/>`,
  meditate: (c) => `
    <circle cx="32" cy="9" r="6" fill="${c}"/>
    <path d="M14 34 C14 24 22 18 32 18 C42 18 50 24 50 34 Z" fill="${c}"/>
    <g fill="none" stroke="${lite(c)}" stroke-width="2.6">
      <path d="M32 2 a12 5 0 0 0 0-0"/><path d="M20 6 a16 8 0 0 1 24 0"/>
    </g>
    <circle cx="8" cy="14" r="3" fill="${lite(c)}"/><circle cx="56" cy="14" r="3" fill="${lite(c)}"/>`,
  charge: (c) => `
    <g fill="none" stroke="${c}" stroke-width="4">
      <circle cx="18" cy="20" r="12"/>
    </g>
    <path d="M22 9 L11 22 h6 L14 33 L25 19 h-6 Z" fill="${c}"/>
    <path d="M34 14 h18 v12 H34 Z" fill="${c}"/>
    <path d="M34 17 h18 v6 H34 Z" fill="${lite(c)}"/>
    <path d="M52 10 L62 20 L52 30 Z" fill="${c}"/>`,
  star: (c) => `
    <path d="M32 2 L39 16 L55 18 L43 29 L46 38 L32 31 L18 38 L21 29 L9 18 L25 16 Z" fill="${c}"/>
    <path d="M32 2 L39 16 L32 19 Z" fill="${lite(c)}"/>
    <path d="M32 31 L46 38 L43 29 Z" fill="${dark(c)}"/>`,

  // ── 같은 계열 안에서 한 번 더 가르는 형태들 ────────────────
  // 전기쇼크/번개/스파크처럼 타입도 형태도 같아지던 묶음을 갈라 놓는다.
  boltbig: (c) => `
    <path d="M40 1 L14 18 h10 L18 39 L50 16 H36 Z" fill="${c}"/>
    <path d="M52 4 L44 12 h5 L45 22 L56 11 h-6 Z" fill="${lite(c)}"/>
    <path d="M12 26 L6 33 h4 L7 39 L15 31 h-5 Z" fill="${lite(c)}"/>`,
  sparks: (c) => `
    <g fill="${c}">
      <path d="M16 2 L8 14 h5 L9 26 L21 12 h-6 Z"/>
      <path d="M42 6 L36 15 h4 L37 25 L46 13 h-5 Z"/>
      <path d="M28 20 L22 29 h4 L23 38 L32 27 h-5 Z"/>
      <path d="M56 18 L51 26 h3 L52 34 L59 24 h-4 Z"/>
    </g>
    <g fill="${lite(c)}"><circle cx="8" cy="32" r="3"/><circle cx="52" cy="6" r="2.6"/></g>`,
  splash: (c) => `
    <ellipse cx="32" cy="30" rx="20" ry="8" fill="${c}"/>
    <ellipse cx="32" cy="28" rx="12" ry="4" fill="${dark(c)}"/>
    <g fill="${c}">
      <path d="M12 22 C10 14 8 10 6 4 C12 10 14 16 16 22 Z"/>
      <path d="M52 22 C54 14 56 10 58 4 C52 10 50 16 48 22 Z"/>
      <path d="M30 18 C29 10 30 6 32 0 C34 6 35 10 34 18 Z"/>
    </g>
    <g fill="${lite(c)}"><circle cx="18" cy="8" r="3"/><circle cx="46" cy="10" r="2.6"/></g>`,
  drench: (c) => `
    <path d="M4 4 C20 6 30 12 34 22 C36 28 42 30 48 27 L52 33 C42 38 32 34 28 24 C25 16 18 12 4 11 Z" fill="${c}"/>
    <g fill="${dark(c)}">
      <path d="M20 20 C22 26 22 30 20 36 C18 30 18 26 20 20 Z"/>
      <path d="M34 26 C36 31 36 34 34 39 C32 34 32 31 34 26 Z"/>
      <path d="M48 27 C50 31 50 34 48 38 C46 34 46 31 48 27 Z"/>
    </g>
    <circle cx="8" cy="6" r="3" fill="${lite(c)}"/>`,
  jaws: (c) => `
    <path d="M2 8 C14 2 50 2 62 8 L56 16 C44 12 20 12 8 16 Z" fill="${c}"/>
    <path d="M2 34 C14 40 50 40 62 34 L56 26 C44 30 20 30 8 26 Z" fill="${c}"/>
    <g fill="${PALE}">
      <path d="M10 15 l6 10 6-10 Z"/><path d="M26 15 l7 12 7-12 Z"/><path d="M44 15 l6 10 6-10 Z"/>
      <path d="M12 27 l6-9 6 9 Z"/><path d="M30 27 l6-11 6 11 Z"/><path d="M46 27 l5-8 5 8 Z"/>
    </g>
    <path d="M2 8 C14 2 50 2 62 8 L60 11 C48 6 16 6 4 11 Z" fill="${lite(c)}"/>`,
  rockfall: (c) => `
    <g fill="${c}">
      <path d="M6 2 L16 0 L20 8 L12 14 L4 10 Z"/>
      <path d="M32 8 L44 6 L50 16 L40 24 L30 18 Z"/>
      <path d="M12 22 L22 20 L26 28 L18 34 L10 30 Z"/>
      <path d="M46 26 L56 24 L60 32 L52 38 L44 34 Z"/>
    </g>
    <g fill="${lite(c)}">
      <path d="M6 2 L16 0 L12 6 Z"/><path d="M32 8 L44 6 L38 14 Z"/><path d="M12 22 L22 20 L17 26 Z"/>
    </g>`,
  psybig: (c) => `
    <g fill="none" stroke="${c}" stroke-width="4">
      <path d="M32 2 a18 18 0 1 0 18 18 h-8 a10 10 0 1 1-10-10 Z"/>
    </g>
    <path d="M32 2 a18 18 0 0 1 18 18 h-8 a10 10 0 0 0-10-10 Z" fill="${c}"/>
    <g fill="${lite(c)}"><circle cx="12" cy="8" r="3"/><circle cx="54" cy="32" r="3.4"/><circle cx="8" cy="30" r="2.4"/></g>
    <circle cx="32" cy="20" r="4" fill="${lite(c)}"/>`,
  baton: (c) => `
    <rect x="10" y="16" width="44" height="9" rx="4.5" fill="${c}"/>
    <rect x="10" y="16" width="44" height="3.4" rx="1.7" fill="${lite(c)}"/>
    <circle cx="10" cy="20.5" r="7" fill="${dark(c)}"/><circle cx="54" cy="20.5" r="7" fill="${dark(c)}"/>
    <path d="M20 6 h24 v-5 l10 8 -10 8 v-5 H20 Z" fill="${c}" opacity=".85"/>`,
  boost: (c) => `
    <path d="M32 0 C42 10 46 20 44 30 L36 26 L32 36 L28 26 L20 30 C18 20 22 10 32 0 Z" fill="${c}"/>
    <path d="M32 8 C37 14 39 20 38 26 L32 22 L26 26 C25 20 27 14 32 8 Z" fill="${lite(c)}"/>
    <g fill="${dark(c)}"><path d="M8 32 l6-8 3 3 -5 8 Z"/><path d="M56 32 l-6-8 -3 3 5 8 Z"/></g>`,
  leafstorm: (c) => `
    <path d="M32 20 m0-17 a17 17 0 1 1-.1 0" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="14 9"/>
    <g fill="${c}">
      <path d="M30 0 C38-2 46 2 48 8 C40 12 32 8 30 0 Z"/>
      <path d="M4 24 C10 18 18 18 22 24 C16 30 8 30 4 24 Z"/>
      <path d="M44 32 C50 26 58 26 62 32 C56 38 48 38 44 32 Z"/>
    </g>
    <circle cx="32" cy="20" r="5" fill="${lite(c)}"/>`,
};

// ── 기술 → 형태 ──────────────────────────────────────────────
// 여기 없는 카드는 아래 타입 기본값으로 떨어진다.
const MOVE_ART = {
  // ── 스타터 3계열 전용 카드 ──
  // 없는 id 는 타입 기본 모양으로 떨어지는데(544줄), 그러면 새 카드 스무 장이
  // 전부 같은 그림이 된다. "기술마다 그림이 다르다"가 이 게임 카드의 규칙이라
  // 새로 넣을 때마다 여기도 같이 채운다.
  emberfang: 'jaws', dragonrage: 'burst', wingattack: 'multi', dragondance: 'boost',
  smokescreen: 'ghost', overheat: 'charge', blastburn: 'quake',
  bubble: 'drip', rapidspin: 'whirl', skullbash: 'press', aquatail: 'tail',
  shellarmor: 'shell', irondefensecard: 'stockpile', hydrocannon: 'drench',
  stunspore: 'powder', sleeppowder: 'moon', growth: 'root', petaldance: 'whirl',
  toxicvine: 'web', solarbeam: 'beam', frenzyplant: 'rockfall',

  // 때리기
  tackle: 'impact', scratch: 'claw', metalclaw: 'claw', nightslash: 'slash', airslash: 'slash',
  quickattack: 'dash', aquajet: 'dash', volttackle: 'dash', nitrocharge: 'boost', flamewheel: 'wheel',
  struggle: 'thrash', returnmove: 'bond', bodypress: 'press', irontail: 'tail',
  bite: 'fang', crunch: 'jaws', poisonfang: 'fang', firefang: 'fang',
  megahorn: 'horn', poisonsting: 'horn', dig: 'dig', bulldoze: 'pulse', earthquake: 'quake',
  lowkick: 'kick', closecombat: 'punch', bulkup: 'muscle', swordsdance: 'sword', bellydrum: 'drum',
  bulletseed: 'multi', vinewhip: 'whip', razorleaf: 'leaves', leafstorm: 'leafstorm',
  rockthrow: 'rock', rockslide: 'rockfall', powergem: 'gem',

  // 쏘기
  ember: 'spray', watergun: 'spray', flamethrower: 'beam', hydropump: 'beam',
  icebeam: 'beam', thunderbolt: 'beam', chargebeam: 'charge', dragonbreath: 'spray',
  fireblast: 'burst', eruption: 'eruption', heatwave: 'wave', surf: 'wave', blizzard: 'blizzard',
  icywind: 'wind', gust: 'wind', fly: 'wing', bravebird: 'dash',
  thundershock: 'bolt', thunder: 'boltbig', spark: 'sparks', thunderwave: 'pulse', waterpulse: 'pulse',
  focusblast: 'ball', sludgebomb: 'ball', seedbomb: 'ball', shadowball: 'ball',
  bubblebeam: 'bubbles', whirlpool: 'whirl', confusion: 'psy', psychicmove: 'psybig',
  nightshade: 'eye', glare: 'glare', moonblast: 'moon', lick: 'ghost', hex: 'hexmark',
  leechseed: 'root', gigadrain: 'drain', bugbite: 'drain', venoshock: 'splash',
  // 스타터 고유 — 서로 엮이는 두 장이 한눈에 구분되게
  kindle: 'wisp', shellstrike: 'shell', absorb: 'seed',

  // 변화
  defend: 'shield', protect: 'barrier', withdraw: 'shell', defensecurl: 'curl',
  harden: 'wall', irondefense: 'wall', endurecard: 'endure', stockpile: 'charge',
  substitute: 'substitute', ingrain: 'stockpile', aquaring: 'ring',
  recover: 'heal', synthesis: 'heal',
  teleport: 'swap', batonpass: 'baton', recycle: 'recycle', helpinghand: 'hand',
  calmmind: 'meditate', sandattack: 'powder', poisonpowder: 'powder',
  toxic: 'drip', venomdrench: 'drench', willowisp: 'ghost',
  stringshot: 'web', supersonic: 'sonic',
  sunnyday: 'weather', raindance: 'weather', sandstorm: 'weather',
};

/** 타입만 아는 경우의 기본 형태 */
const TYPE_ART = {
  NORMAL: 'star', FIRE: 'spray', WATER: 'spray', GRASS: 'leaves', ELECTRIC: 'bolt',
  ICE: 'blizzard', FIGHT: 'punch', POISON: 'drip', GROUND: 'quake', FLYING: 'wing',
  PSYCHIC: 'psy', BUG: 'web', ROCK: 'rock', GHOST: 'ghost', DRAGON: 'claw',
  DARK: 'moon', STEEL: 'wall', FAIRY: 'star',
};

/** 무속성 카드는 효과를 보고 고른다 */
function typelessArt(card) {
  const ops = card.effects || [];
  const has = (fn) => ops.some(fn);
  if (card.kind === 'POWER') return ['ring', '#c48ae0', '#7a4f96'];
  if (has((o) => o.op === 'heal' || o.op === 'drain')) return ['heal', '#6cc07a', '#357a43'];
  if (has((o) => o.op === 'block' || o.op === 'blockScaled')) return ['shield', '#7ea8d8', '#3b4d66'];
  if (has((o) => o.op === 'rank' && o.to === 'enemy')) return ['debuff', '#d1728a', '#8a3a4e'];
  if (has((o) => o.op === 'rank' && o.to !== 'enemy')) return ['buff', '#e0b45a', '#96712a'];
  if (has((o) => o.op === 'switchOut')) return ['swap', '#f85888', '#a92f56'];
  return ['star', '#7ea8d8', '#3b4d66'];
}

/**
 * 카드 한 장의 그림칸 SVG.
 * 형태는 기술이(MOVE_ART), 색은 타입이 정한다.
 * @param card resolveCard() 로 푼 카드
 */
export function cardEmblem(card) {
  let key, c, ink;
  if (card.type) {
    key = MOVE_ART[card.id] || TYPE_ART[card.type] || 'star';
    c = typeColor(card.type);
    ink = typeInk(card.type);
  } else {
    // 무속성은 색도 효과에서 가져온다 — 기술별 형태가 있으면 그쪽을 먼저 쓴다
    const [fallbackShape, col, ik] = typelessArt(card);
    key = MOVE_ART[card.id] || fallbackShape;
    c = col; ink = ik;
  }
  const shape = SHAPE[key] || SHAPE.star;
  return `<svg viewBox="0 0 64 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
    stroke="${ink}" stroke-width="1.6" stroke-linejoin="round">${shape(c)}</svg>`;
}

/** 개발용 — 형태 목록 */
export const SHAPE_NAMES = Object.keys(SHAPE);
