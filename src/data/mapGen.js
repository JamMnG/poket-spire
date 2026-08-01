// ─────────────────────────────────────────────────────────────
// mapGen.js — 막(act) 지도 생성
//
// 슬더스 지도의 규칙을 그대로 옮겼다. 핵심은 "갈래가 실제로 갈라져야
// 한다" 는 것이다. 길을 여섯 개 그려 놓고 전부 같은 칸을 지나면 지도가
// 아니라 일직선이 된다. 그래서 시작 칸 중복을 막고, 경로가 서로 겹칠 때
// 다른 칸으로 밀어낸다.
//
// 방 배치 규칙도 슬더스 것을 따랐다. 규칙마다 이유가 있다:
//   · 1층은 무조건 전투      — 첫 선택은 배우고 나서 하게
//   · 엘리트는 5층부터       — 준비 없이 만나면 배울 기회가 없다
//   · 9층은 무조건 보물      — 중반에 도구 하나를 보장
//   · 15층(보스 직전)은 휴식 — 보스 앞에서 회복·강화를 고르게
//   · 휴식·상점은 연속 금지  — 같은 방을 두 번 지나면 선택이 아니다
// ─────────────────────────────────────────────────────────────

export const ROOM = {
  MONSTER:  { ko: '전투',   icon: '⚔' },
  ELITE:    { ko: '엘리트', icon: '☠' },
  EVENT:    { ko: '?',      icon: '?' },
  SHOP:     { ko: '상점',   icon: '$' },
  REST:     { ko: '포켓몬센터', icon: '✚' },
  TREASURE: { ko: '보물',   icon: '◆' },
  BOSS:     { ko: '보스',   icon: '★' },
};

export const FLOORS = 15;      // 보스 층은 따로
export const COLUMNS = 7;
export const PATHS = 6;

/**
 * 지도 하나를 만든다.
 * 반환: { nodes: [[node,...] × FLOORS+1], start: [노드id...] }
 * 노드: { id, floor, col, type, next: [노드id...] }
 */
export function generateMap(rng) {
  const grid = Array.from({ length: FLOORS }, () => new Array(COLUMNS).fill(null));
  const nodeAt = (f, c) => grid[f]?.[c] || null;

  const ensure = (f, c) => {
    if (!grid[f][c]) grid[f][c] = { id: `${f}-${c}`, floor: f, col: c, type: null, next: [], prev: [] };
    return grid[f][c];
  };

  // ── 1. 길 여섯 개를 위로 그린다 ──────────────────────────
  const firstCols = [];
  for (let p = 0; p < PATHS; p++) {
    let col = rng.int(COLUMNS);
    // 처음 두 길은 서로 다른 칸에서 출발시킨다 — 지도가 한 점에서 시작하면
    // 첫 선택이 선택이 아니게 된다
    if (p < 2) {
      let guard = 0;
      while (firstCols.includes(col) && guard++ < 20) col = rng.int(COLUMNS);
    }
    firstCols.push(col);

    ensure(0, col);
    for (let f = 0; f < FLOORS - 1; f++) {
      const here = ensure(f, col);
      // 좌·중·우 중에서 고르되 지도 밖으로는 안 나간다
      const options = [ col - 1, col, col + 1 ].filter((c) => c >= 0 && c < COLUMNS);
      let nextCol = rng.pick(options);

      // 선이 서로 교차하면 지도가 읽히지 않는다 — 교차를 만드는 선택은 버린다
      const crosses = (nc) => {
        if (nc === col) return false;
        const sideCol = nc;
        const side = nodeAt(f, sideCol);
        return !!(side && side.next.includes(`${f + 1}-${col}`));
      };
      let guard = 0;
      while (crosses(nextCol) && guard++ < 10) nextCol = rng.pick(options);

      const up = ensure(f + 1, nextCol);
      if (!here.next.includes(up.id)) here.next.push(up.id);
      if (!up.prev.includes(here.id)) up.prev.push(here.id);
      col = nextCol;
    }
  }

  // ── 2. 방 종류를 정한다 ──────────────────────────────────
  const all = grid.flat().filter(Boolean);
  const byId = new Map(all.map((n) => [n.id, n]));

  /**
   * 층에 따라 후보 자체를 바꾼다.
   *
   * ★ 처음엔 표 하나를 두고 "엘리트가 나오면 다시 굴린다" 식으로 걸렀는데,
   *   그러면 걸러진 가중치가 남은 항목으로 전부 흘러가 1~4층이 상점 천지가
   *   됐다. 돈도 없는 2층에 상점이 세 개 있는 지도는 선택지가 아니다.
   *   그래서 아예 그 층에 나올 수 있는 것만 표에 넣는다.
   */
  const tableFor = (floor) => {
    const t = [{ type: 'MONSTER', w: 50 }, { type: 'EVENT', w: 22 }];
    if (floor >= 3) t.push({ type: 'SHOP', w: 9 });        // 살 돈이 모인 뒤부터
    if (floor >= 4) t.push({ type: 'ELITE', w: 17 }, { type: 'REST', w: 12 });
    return t;
  };

  const prevTypes = (n) => n.prev.map((id) => byId.get(id)?.type).filter(Boolean);

  for (const n of all) {
    // 고정 층
    if (n.floor === 0) { n.type = 'MONSTER'; continue; }
    if (n.floor === 8) { n.type = 'TREASURE'; continue; }
    if (n.floor === FLOORS - 1) { n.type = 'REST'; continue; }

    const table = tableFor(n.floor);
    let pick, guard = 0;
    do {
      pick = rng.weighted(table, (x) => x.w).type;
      guard++;
      // 휴식·상점이 앞 방과 연달아 나오면 그건 선택이 아니다
      if ((pick === 'REST' || pick === 'SHOP') && prevTypes(n).includes(pick)) continue;
      break;
    } while (guard < 20);
    n.type = pick || 'MONSTER';
  }

  // ── 3. 보스 ──────────────────────────────────────────────
  const boss = { id: 'boss', floor: FLOORS, col: 3, type: 'BOSS', next: [], prev: [] };
  for (const n of grid[FLOORS - 1].filter(Boolean)) {
    n.next.push('boss');
    boss.prev.push(n.id);
  }
  byId.set('boss', boss);

  return {
    floors: FLOORS,
    columns: COLUMNS,
    nodes: Object.fromEntries([...byId].map(([k, v]) => [k, v])),
    start: grid[0].filter(Boolean).map((n) => n.id),
    boss: 'boss',
  };
}

/** 지금 위치에서 갈 수 있는 노드 id 들 */
export function reachableFrom(map, currentId) {
  if (!currentId) return map.start.slice();
  return map.nodes[currentId]?.next.slice() || [];
}
