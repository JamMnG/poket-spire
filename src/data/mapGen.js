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
export function generateMap(rng, floors = FLOORS) {
  const FL = floors;
  const grid = Array.from({ length: FL }, () => new Array(COLUMNS).fill(null));
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
    for (let f = 0; f < FL - 1; f++) {
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
    if (n.floor === Math.floor(FL / 2) - 1) { n.type = 'TREASURE'; continue; }
    if (n.floor === FL - 1) { n.type = 'REST'; continue; }

    const table = tableFor(n.floor);
    let pick, guard = 0;
    do {
      pick = rng.weighted(table, (x) => x.w).type;
      guard++;
      // 휴식·상점·? 가 앞 방과 연달아 나오면 그건 선택이 아니고,
      // 엘리트 두 개가 연달아 있으면 그 길은 선택이 아니라 함정이다.
      // (? 를 안 걸렀더니 한 길에 ? 가 여섯 번 이어지는 지도가 실제로 나왔다)
      if ((pick === 'REST' || pick === 'SHOP' || pick === 'ELITE' || pick === 'EVENT')
        && prevTypes(n).includes(pick)) continue;
      break;
    } while (guard < 20);
    n.type = pick || 'MONSTER';
  }

  // ── 2.5 최소 보장 ────────────────────────────────────────
  // 가중치 추첨은 평균만 지킨다 — 엘리트가 지도에 하나뿐이거나 상점이 아예
  // 없는 지도가 실제로 나왔다. 로그라이크의 무작위는 "어떤 조합이 나올까"
  // 이지 "지도가 성립할까"가 아니므로, 종류별 최소·최대를 못 박는다.
  {
    // 추첨 단계의 재시도(guard 20회)를 다 써 버리면 겹친 채로 남는다 —
    // 여기서 확정적으로 지운다. 아래 clampType 이 최소 개수를 되살린다.
    const SPECIAL = ['EVENT', 'ELITE', 'REST', 'SHOP'];
    for (const n of all) {
      if (!SPECIAL.includes(n.type)) continue;
      if (n.prev.some((id) => byId.get(id)?.type === n.type)) n.type = 'MONSTER';
    }

    const assignable = all.filter((n) =>
      n.floor > 0 && n.floor !== Math.floor(FL / 2) - 1 && n.floor !== FL - 1);
    const ofType = (t) => assignable.filter((n) => n.type === t);
    const nearSame = (n, t) =>
      n.prev.some((id) => byId.get(id)?.type === t) ||
      n.next.some((id) => byId.get(id)?.type === t);

    /** count 를 min~max 로 맞춘다. 늘릴 때는 MONSTER 를 바꿔 쓴다 */
    const clampType = (t, min, max, floorMin) => {
      let have = ofType(t);
      // 넘치면 무작위로 골라 전투로 되돌린다
      while (have.length > max) {
        const kill = rng.pick(have);
        kill.type = 'MONSTER';
        have = ofType(t);
      }
      // 모자라면 조건 맞는 전투 방을 바꾼다 (같은 종류와 이웃하지 않게)
      let guard = 0;
      while (have.length < min && guard++ < 40) {
        const cand = assignable.filter((n) =>
          n.type === 'MONSTER' && n.floor >= floorMin && !nearSame(n, t));
        if (!cand.length) break;
        rng.pick(cand).type = t;
        have = ofType(t);
      }
    };

    clampType('ELITE', 2, 3, 4);      // 막마다 엘리트 2~3 — 하나뿐이면 도구가 안 돈다
    clampType('SHOP', 1, 2, 3);       // 상점 최소 1 — 돈이 쓸 곳 없이 쌓이면 죽은 자원
    clampType('REST', 1, 3, 4);       // 꼭대기 고정 휴식 말고도 최소 1
    // ? 는 전체의 30% 를 넘지 않게 — 넘치는 만큼 전투로
    const evMax = Math.max(3, Math.floor(assignable.length * 0.30));
    clampType('EVENT', 2, evMax, 1);
  }

  // ── 3. 보스 ──────────────────────────────────────────────
  const boss = { id: 'boss', floor: FL, col: 3, type: 'BOSS', next: [], prev: [] };
  for (const n of grid[FL - 1].filter(Boolean)) {
    n.next.push('boss');
    boss.prev.push(n.id);
  }
  byId.set('boss', boss);

  return {
    floors: FL,
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
