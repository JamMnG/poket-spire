// ─────────────────────────────────────────────────────────────
// itemArt.js — 지닌 도구·몬스터볼 그림
//
// PokeAPI 아이템 스프라이트(30×30 도트)를 쓴다. 도구 배지가 26px 라
// 원래 크기 그대로 붙는 셈이라 흐려지지 않는다.
//
// ★ 카드 그림칸(104×60)에는 쓰지 않는다. 30px 도트를 세 배로 늘리면
//   매끄러운 포켓몬 일러스트 옆에서 혼자 뭉개져 보인다. 카드는 벡터
//   엠블럼(cardEmblem.js)을 그대로 쓴다.
//
// 경로는 문서 URL이 아니라 이 모듈 위치를 기준으로 잡는다.
// ─────────────────────────────────────────────────────────────

const BASE = new URL('../assets/items/', import.meta.url);

/** 내려받아 둔 아이템 슬러그 — 없으면 그린 대체 배지로 떨어진다 */
const HAS = new Set([
  'charcoal', 'mystic-water', 'miracle-seed', 'magnet', 'silk-scarf', 'power-anklet',
  'assault-vest', 'oran-berry', 'amulet-coin', 'rare-candy', 'quick-powder', 'everstone',
  'light-clay', 'escape-rope', 'flame-orb', 'toxic-orb', 'scope-lens', 'choice-band',
  'focus-sash', 'leftovers', 'moon-stone', 'fire-stone', 'water-stone', 'thunder-stone',
  'leaf-stone', 'master-ball', 'soothe-bell', 'shell-bell', 'metal-coat', 'lucky-egg',
  'poke-ball', 'great-ball', 'ultra-ball', 'potion', 'super-potion', 'full-restore',
  'revive', 'repel', 'tm-normal', 'tm-fire', 'tm-water', 'tm-grass', 'tm-electric',
]);

export const itemUrl = (slug) => (slug && HAS.has(slug) ? new URL(`${slug}.png`, BASE).href : null);
export const hasItem = (slug) => HAS.has(slug);

/**
 * 몬스터볼 — CSS/SVG 로 그린다.
 * 30px 스프라이트를 에너지 구슬(78px)만큼 키우면 뭉개지므로,
 * 크게 쓰는 자리는 벡터로 따로 그린다.
 */
export function pokeball(size = 78, { top = '#e8483c', bottom = '#f2ede1', band = '#241d18' } = {}) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="pb">
    <defs>
      <radialGradient id="pbT" cx="34%" cy="26%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".55"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="47" fill="${bottom}" stroke="${band}" stroke-width="6"/>
    <path d="M3 50 A47 47 0 0 1 97 50 Z" fill="${top}"/>
    <rect x="3" y="44" width="94" height="12" fill="${band}"/>
    <circle cx="50" cy="50" r="47" fill="url(#pbT)"/>
  </svg>`;
}
