// ─────────────────────────────────────────────────────────────
// main.js — 화면 흐름
//
// 여기서 하는 일은 하나다: 어떤 방에 들어왔는지 보고 알맞은 화면을 띄운 뒤,
// 그 화면이 끝나면 지도로 돌려보낸다.
// 규칙은 전부 core/run.js 와 combat/ 안에 있고 여기로 새지 않는다.
// ─────────────────────────────────────────────────────────────
import { $, el, mount } from './ui/dom.js';
import { createRun } from './core/run.js';
import { createCombat } from './combat/combat.js';
import { createCombatView } from './ui/combatView.js';
import { renderMap } from './ui/mapView.js';
import * as OV from './ui/overlays.js';
import { attachTip } from './ui/tooltip.js';
import { COIN } from './ui/icons.js';
import { STARTERS, POKEMON } from './data/pokemon.js';
import { RELICS, availableRelics } from './data/relics.js';
import { typeKo, typeColor } from './data/types.js';
import { monImg } from './render/pokemonSprites.js';
import { randomSeed } from './core/rng.js';
import { initStage } from './ui/stage.js';
import * as SAVE from './core/save.js';

initStage();

let run = null;
let combat = null;
let view = null;
let starterPick = STARTERS[0];

const SCREENS = ['screen-title', 'screen-map', 'screen-combat'];
const goto = (id) => { for (const s of SCREENS) $(`#${s}`).classList.toggle('is-on', s === id); };

const typeBadges = (types) => el('div.unit-types', { style: { justifyContent: 'center' } },
  types.map((t) => el('span.tbadge', { text: typeKo(t), style: { background: typeColor(t) } })));

// ── 상단 정보띠 (지도·전투 화면이 같이 쓴다) ─────────────────
function renderTopbars() {
  if (!run) return;
  const R = run.state;
  const lead = run.activeMember();
  const floor = R.currentNode ? R.map.nodes[R.currentNode].floor + 1 : 0;
  const act = run.act();

  for (const bar of document.querySelectorAll('[data-topbar]')) {
    mount(bar,
      el('div.tb-portrait', {}, [monImg(lead.species, POKEMON[lead.species], 3, { alt: lead.ko })]),
      el('div.tb-name', { text: R.party.length > 1 ? `${lead.ko} 외 ${R.party.length - 1}` : lead.ko }),
      attachTip(el('div.tb-stat.tb-hp', {}, [
        el('span.ic', { text: '♥' }),
        el('span', { text: `${run.totalHp()}/${run.totalMaxHp()}` }),
      ]), '파티 전체 HP의 합이다. 선두가 쓰러지면 다음 포켓몬이 나온다.'),
      el('div.tb-stat.tb-gold', {}, [el('span.ic', { html: COIN }), el('span', { text: R.gold })]),
      el('div.tb-spacer'),
      el('button.tb-btn', { text: `파티 ${R.party.length}/${run.partySlots()}`, onclick: () => OV.showParty(run) }),
      el('button.tb-btn', { text: `덱 ${R.deck.length}`, onclick: () => OV.showDeck(run) }),
      el('div.tb-floor', { text: `${act.n}막 ${floor ? floor + '층' : '출발'}` }),
      el('div.tb-seed', { text: R.seed }),
    );
  }

  for (const bar of document.querySelectorAll('[data-relicbar]')) {
    mount(bar, ...(R.relics.length
      ? R.relics.map((id) => OV.relicBadge(id))
      : [el('div.relic-empty', { text: '지닌 도구 없음' })]));
  }
}

// ── 타이틀 ───────────────────────────────────────────────────
function renderTitle() {
  mount($('#starter-list'), ...STARTERS.map((id) => {
    const sp = POKEMON[id];
    return el(`div.starter${id === starterPick ? '.is-sel' : ''}`, {
      onclick: () => { starterPick = id; renderTitle(); },
    }, [
      monImg(id, sp, 5, { alt: sp.ko }),
      el('div.s-name', { text: sp.ko }),
      typeBadges(sp.types),
      el('div.s-blurb', { text: sp.blurb }),
      el('div.s-style', { text: sp.style }),
      el('div.s-hp', { text: `HP ${sp.hp} · 고유 기술 ${sp.signatures.map(CARD_KO).join(' + ')}` }),
    ]);
  }));
  $('#btn-start').disabled = !starterPick;

  // 적어 둔 판이 있으면 이어하기를 위에 띄운다. 새로 시작하는 길은 그대로
  // 아래에 남겨 둔다 — "이어할까 새로 할까"는 플레이어가 정할 일이다.
  const data = SAVE.peek();
  const row = $('#resume-row');
  row.hidden = !data;
  if (data) $('#resume-info').textContent = SAVE.describe(data);
  $('#btn-start').textContent = data ? '새로 시작한다' : '모험을 시작한다';
}

// 시그니처 카드 이름만 필요해서 데이터 표를 직접 읽는다
import { CARDS } from './data/cards.js';
const CARD_KO = (id) => CARDS[id]?.ko ?? id;

// ── 런 시작 ─────────────────────────────────────────────────
function startRun() {
  const typed = $('#seed-input').value.trim().toUpperCase();
  SAVE.clearSave();               // 새로 시작하면 옛 판은 버린다
  run = createRun({ seed: typed || randomSeed(), starterId: starterPick });
  save();
  refreshMap();
}

/**
 * 적어 둔 판을 이어서 연다.
 * 전투 중이었으면 그 전투를 그대로 되살리고, 아니면 지도에서 시작한다.
 */
function resumeRun() {
  const data = SAVE.peek();
  if (!data) return;
  try {
    run = createRun({ saved: data });
  } catch (err) {
    // 저장 형식이 안 맞으면 붙들고 있어 봐야 매번 같은 자리에서 터진다
    console.error('저장을 불러오지 못했다', err);
    SAVE.clearSave();
    renderTitle();
    return;
  }
  if (data.combat) startCombat(data.combat.roomType, data.combat.snap);
  else refreshMap();
}

/** 지금 상태를 적어 둔다. 방을 옮길 때와 턴이 넘어갈 때마다 부른다 */
function save() {
  if (!run) return;
  SAVE.writeSave(run, combat);
}

function refreshMap() {
  // ★ 화면을 먼저 켜고 나서 그린다. 반대로 하면 지도가 display:none 인 채로
  //   그려져 높이가 0 이고, "갈 수 있는 방으로 스크롤" 이 통째로 무시된다.
  //   지도를 열면 맨 위(마지막 층)가 보여서 갈 곳이 안 보였던 원인이다.
  combat = view = null;           // 지도에 섰다는 건 전투가 끝났다는 뜻
  save();
  goto('screen-map');
  renderTopbars();
  renderMap(run, enterRoom);
}

// ── 방 진입 ─────────────────────────────────────────────────
function enterRoom(nodeId) {
  const node = run.travelTo(nodeId);
  if (!node) return;
  renderTopbars();

  switch (node.type) {
    case 'MONSTER':
    case 'ELITE':
    case 'BOSS':
      startCombat(node.type);
      break;

    case 'TREASURE': {
      const before = run.state.relics.length;
      run.grantRandomRelic();
      const got = run.state.relics.length > before ? run.state.relics.at(-1) : null;
      OV.showTreasure(run, got, refreshMap);
      break;
    }

    case 'REST':
      OV.showRest(run, refreshMap);
      break;

    case 'SHOP':
      OV.showShop(run, run.rollShop(), refreshMap);
      break;

    case 'EVENT':
      // 이벤트 선택이 다른 화면(카드 강화·전투)으로 이어지는 경우가 있다
      OV.showEvent(run, run.pickEvent(), (chained) => (chained ? handleRequest() : refreshMap()));
      break;

    default:
      refreshMap();
  }
}

function handleRequest() {
  const req = run.state.request;
  run.state.request = null;
  if (!req) return refreshMap();

  if (req.kind === 'UPGRADE') {
    OV.showDeckPick(run, '강화할 기술을 고른다', (c) => !c.upgraded, (inst) => {
      if (inst) run.upgradeCard(inst.uid);
      refreshMap();
    }, { cancellable: true, showUpgrade: true });
  } else if (req.kind === 'REMOVE') {
    OV.showDeckPick(run, '잊을 기술을 고른다', null, (inst) => {
      if (inst) run.removeCard(inst.uid);
      refreshMap();
    }, { cancellable: true });
  } else if (req.kind === 'COMBAT') {
    startCombat(req.roomType || 'ELITE');
  } else {
    refreshMap();
  }
}

// ── 전투 ────────────────────────────────────────────────────
function startCombat(roomType, snap = null) {
  // 이어하기면 적을 새로 굴리면 안 된다 — 스냅샷 안에 그때 만난 적이 들어 있다.
  // 여기서 rollEncounter 를 또 부르면 난수 스트림이 한 칸 밀려서, 이어할
  // 때마다 이후 보상이 조금씩 달라진다.
  const encounter = snap
    ? { ids: snap.enemies.map((e) => e.id) }
    : run.rollEncounter(roomType);
  run.state.lastCombatRoom = roomType;

  const { hpMul, dmgMul } = run.actMul(roomType);
  combat = createCombat({
    party: run.state.party,
    deckCards: run.state.deck,
    relics: run.state.relics,
    encounter,
    hpMul, dmgMul,
    rng: run.state.streams.combat,
    // 카드 한 장 낼 때마다 적어 둔다. 턴 경계에서만 적으면 "긴 턴을 다 짜
    // 놓고 탭을 닫았다" 가 통째로 날아간다. 쓰기는 1ms 안쪽이라 부담이 없다.
    onChange: () => { view?.render(); renderTopbars(); save(); },
    onFx: (e) => view?.playFx(e),
  });

  view = createCombatView({ combat, onFinish: (result) => finishCombat(result, roomType) });

  goto('screen-combat');
  view.clearFx();
  if (snap) combat.resume(snap); else combat.begin();
  view.render();
  renderTopbars();
  save();
}

function finishCombat(result, roomType) {
  combat = view = null;
  run.state.lastCombatRoom = null;
  if (result === 'LOST') {
    run.state.dead = true;
    SAVE.clearSave();             // 죽으면 되돌아갈 자리는 없다
    OV.showResult(run, false, backToTitle);
    return;
  }
  save();

  if (roomType === 'BOSS') {
    run.grantRandomRelic(['BOSS']);
    const act = run.act();
    const more = run.advanceAct();        // 다음 막이 있으면 지도를 새로 깐다
    if (more) {
      // ★ 여기서 반드시 다시 적는다. advanceAct 전에 적은 저장에는 아직
      //   이전 막이 들어 있는데, 그 상태로 이어하면 이미 잡은 보스 방에
      //   서 있게 되어 갈 수 있는 방이 하나도 없다 — 판이 막힌다.
      save();
      OV.showActClear(run, act, run.act(), () => { renderTopbars(); refreshMap(); });
    } else {
      run.state.won = true;
      SAVE.clearSave();
      OV.showResult(run, true, backToTitle);
    }
    return;
  }

  const gold = run.goldReward(roomType);
  const cardIds = run.rollCardReward(3, { rareBias: roomType === 'ELITE' ? 0.12 : 0 });
  const pool = availableRelics(run.state.relics);
  const relicId = roomType === 'ELITE' && pool.length ? run.state.streams.reward.pick(pool) : null;

  OV.showReward(run, { gold, cardIds, relicId }, () => { renderTopbars(); refreshMap(); });
}

function backToTitle() {
  run = combat = view = null;
  $('#seed-input').value = '';
  goto('screen-title');
  renderTitle();
}

// ── 더미 들여다보기 ──────────────────────────────────────────
// 비용 → 이름 순. 뽑을 더미는 이 순서로만 보여 준다.
const byCostName = (a, b) => {
  const A = CARDS[a.id], B = CARDS[b.id];
  return (A.v.cost - B.v.cost) || A.ko.localeCompare(B.ko, 'ko');
};

// ── 배선 ────────────────────────────────────────────────────
$('#btn-start').onclick = startRun;
$('#btn-resume').onclick = resumeRun;
$('#btn-discard').onclick = () => { SAVE.clearSave(); renderTitle(); };

// 탭을 닫거나 뒤로 갈 때 마지막으로 한 번 더. 평소 저장은 카드를 낼 때마다
// 이미 돌지만, 덮개(보상·상점)에서 값이 바뀐 직후에 닫는 경우가 남는다.
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
$('#seed-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') startRun(); });
$('#pile-draw').onclick = () => {
  if (!combat) return;
  // ★ 뽑히는 순서는 일부러 감춘다. 무엇이 남았는지는 세어 볼 수 있어야 하지만,
  //   다음 다섯 장을 그대로 보여 주면 덱빌딩의 긴장이 통째로 사라진다.
  const cards = combat.state.drawPile.slice().sort(byCostName);
  OV.showPile(cards, `뽑을 카드 · ${cards.length}장`,
    '무엇이 남았는지만 보여 준다. 뽑히는 순서는 알 수 없다.');
};
$('#pile-discard').onclick = () => {
  if (!combat) return;
  const cards = combat.state.discardPile.slice().reverse();
  OV.showPile(cards, `버린 카드 · ${cards.length}장`,
    '가장 최근에 버린 카드가 앞에 온다. 뽑을 카드가 떨어지면 이 더미를 다시 섞는다.');
};

// 손패 부채꼴은 창 너비에 따라 다시 편다
window.addEventListener('resize', () => view?.render());

// 콘솔에서 상태를 들여다볼 수 있게
// 콘솔·테스트에서 흐름을 직접 태울 수 있게 열어 둔다
window.__game = {
  get run() { return run; },
  get combat() { return combat; },
  enterRoom, refreshMap, save,
};

renderTitle();
