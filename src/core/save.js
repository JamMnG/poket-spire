// ─────────────────────────────────────────────────────────────
// save.js — 브라우저에 런을 적어 둔다
//
// 한 판이 세 막이라 30분 넘게 걸린다. 탭을 닫으면 사라지는 건
// 로그라이크에서 벌이 아니라 그냥 사고다. 그래서 방을 옮길 때마다,
// 그리고 전투 중에도 턴이 넘어갈 때마다 적어 둔다.
//
// ★ 무엇을 적지 않는가
//   화면 상태(어떤 덮개가 열려 있었는지 등)는 안 적는다. 이어하면 지도
//   화면에서 시작하고, 전투 중이었으면 그 전투부터 다시 이어 붙는다.
//   보상 화면 한가운데서 껐다면 그 보상은 못 받는다 — 이걸 살리려면
//   화면 흐름 전체를 직렬화해야 하는데, 얻는 것에 비해 깨질 곳이 너무 많다.
//
// ★ 왜 카드를 uid 로만 적는가
//   전투의 뽑을/손/버린 더미는 run 의 덱과 **같은 객체**를 공유한다.
//   각자 복사해 두면 이어했을 때 전투 중 강화가 덱에 안 남는다.
//   그래서 덱만 통째로 적고, 더미는 uid 목록으로 적어 다시 잇는다.
// ─────────────────────────────────────────────────────────────

const KEY = 'pokespire.save.v1';

/** 저장 형식이 바뀌면 올린다 — 옛 저장은 조용히 버려진다 */
const VERSION = 1;

const store = () => {
  try { return window.localStorage; } catch { return null; }   // 사생활 보호 모드
};

export function hasSave() {
  return !!peek();
}

/** 헤더만 읽는다 — 타이틀 화면의 "이어하기" 버튼 문구에 쓴다 */
export function peek() {
  const ls = store();
  if (!ls) return null;
  try {
    const raw = ls.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== VERSION) { ls.removeItem(KEY); return null; }
    return data;
  } catch {
    // 깨진 저장은 붙들고 있어 봐야 매번 같은 자리에서 터진다
    try { ls.removeItem(KEY); } catch { /* 무시 */ }
    return null;
  }
}

export function clearSave() {
  const ls = store();
  if (ls) { try { ls.removeItem(KEY); } catch { /* 무시 */ } }
}

/**
 * @param run     core/run.js 가 돌려준 객체
 * @param combat  전투 중이면 combat 객체, 아니면 null
 */
export function writeSave(run, combat) {
  const ls = store();
  if (!ls) return false;
  const R = run.state;
  if (R.dead || R.won) { clearSave(); return false; }

  const data = {
    version: VERSION,
    at: Date.now(),
    seed: R.seed,
    act: R.act,
    starter: R.starter,
    rng: R.streams.getState(),
    party: R.party.map((m) => ({
      species: m.species, hp: m.hp, maxHp: m.maxHp,
      fainted: m.fainted, status: { ...m.status },
    })),
    deck: R.deck.map((c) => ({ uid: c.uid, id: c.id, upgraded: !!c.upgraded, owner: c.owner || null })),
    relics: R.relics.slice(),
    gold: R.gold,
    map: R.map,
    currentNode: R.currentNode,
    visitedFloors: R.visitedFloors,
    eventsSeen: R.eventsSeen.slice(),
    weakUsed: R.weakUsed,
    usedEncounters: R.usedEncounters.slice(),
    eliteBag: R.eliteBag.map((g) => g.slice()),
    lastRoom: R.lastRoom,
    // 전투 중이었다면 그 전투까지
    combat: combat ? { roomType: R.lastCombatRoom || 'MONSTER', snap: combat.snapshot() } : null,
  };

  try {
    ls.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    // 용량이 찼거나 막혀 있으면 저장을 포기하되 게임은 계속 돌게 둔다
    return false;
  }
}

/** 이어하기 버튼에 붙일 한 줄 요약 */
export function describe(data) {
  if (!data) return '';
  const where = data.combat ? '전투 중' : `${data.visitedFloors || 0}층`;
  const hp = data.party.reduce((s, m) => s + m.hp, 0);
  const max = data.party.reduce((s, m) => s + m.maxHp, 0);
  return `${data.act}막 · ${where} · 파티 ${data.party.length}마리 HP ${hp}/${max}`;
}
