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

// 한 번 못 읽은 파일은 다시 시도하지 않는다 — 목록에는 있는데 안 받아 온 경우,
// 배지 하나가 뜰 때마다 404 를 또 내는 것을 막는다
const failed = new Set();

/**
 * 아이템 그림 <img>. **반드시 이걸 쓸 것** — itemUrl() 을 직접 <img> 에 꽂으면
 * 파일이 없을 때 깨진 그림 아이콘이 그대로 뜬다. HAS 는 "받아 왔다면 이
 * 이름일 것"이라는 약속일 뿐이고, 이 저장소는 그림을 배포하지 않으므로
 * (README 의 IP 항목) 배포본에서는 그 약속이 **항상** 깨진다. 실제로 상점의
 * 지닌 도구가 전부 깨진 아이콘으로 떴다.
 *
 * 로드에 실패하면 이름 첫 글자 배지로 바꿔 끼운다 — relicBadge 가 슬러그
 * 없는 도구에 쓰던 것과 같은 모양이라, 받았든 안 받았든 화면이 성립한다.
 *
 * @param slug     아이템 슬러그 (예: 'amulet-coin')
 * @param opts     { alt, className, style, fallback } — fallback 은 배지에 쓸 글자
 */
export function itemImg(slug, opts = {}) {
  const toBadge = () => {
    const s = document.createElement('span');
    s.className = 'item-fallback' + (opts.className ? ` ${opts.className}-fb` : '');
    s.textContent = opts.fallback ?? (opts.alt ? opts.alt[0] : '?');
    return s;
  };

  const url = itemUrl(slug);
  if (!url || failed.has(slug)) return toBadge();

  const img = document.createElement('img');
  if (opts.className) img.className = opts.className;
  img.alt = opts.alt ?? '';
  if (opts.style) Object.assign(img.style, opts.style);
  img.src = url;
  img.addEventListener('error', function onFail() {
    img.removeEventListener('error', onFail);
    failed.add(slug);
    img.replaceWith(toBadge());
  });
  return img;
}

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
