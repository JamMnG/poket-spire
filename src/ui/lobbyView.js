// ─────────────────────────────────────────────────────────────
// lobbyView.js — 멀티 로비 화면
//
// 방을 만들거나 코드로 들어가고, 각자 파트너를 고른 뒤 방장이 출발시킨다.
// 여기서 화면은 세션(net/session.js)이 주는 players 배열만 보고 그린다 —
// 연결 상태를 화면 코드가 따로 들고 있으면 반드시 어긋난다.
// ─────────────────────────────────────────────────────────────
import { el, $, mount } from './dom.js';
import { STARTERS, POKEMON } from '../data/pokemon.js';
import { monImg } from '../render/pokemonSprites.js';
import { scaleFor } from '../data/acts.js';
import { typeKo, typeColor } from '../data/types.js';

const typeBadges = (types) => el('div.unit-types', { style: { justifyContent: 'center' } },
  types.map((t) => el('span.tbadge', { text: typeKo(t), style: { background: typeColor(t) } })));

export function showEntry() {
  $('#lobby-entry').hidden = false;
  $('#lobby-room').hidden = true;
  msg('');
}

export function showRoom(code) {
  $('#lobby-entry').hidden = true;
  $('#lobby-room').hidden = false;
  $('#room-code-text').textContent = code || '----';
}

export function msg(text, kind = '') {
  const box = $('#lobby-msg');
  box.textContent = text || '';
  box.className = `lobby-msg${kind ? ' is-' + kind : ''}`;
}

/**
 * @param state  { players, myId, isHost }
 * @param onPick 스타터를 골랐을 때
 */
export function renderRoom(state, onPick) {
  const { players, myId, isHost } = state;
  const mine = players.find((p) => p.id === myId);

  mount($('#lobby-players'), ...players.map((p) => {
    const sp = p.starter ? POKEMON[p.starter] : null;
    return el(`div.lobby-player${p.ready ? '.is-ready' : ''}${p.id === myId ? '.is-me' : ''}`, {}, [
      el('div.lp-slot', { text: `${p.id + 1}P` }),
      sp ? monImg(p.starter, sp, 3, { alt: sp.ko }) : el('div.lp-empty', { text: '?' }),
      el('div.lp-name', { text: p.name + (p.id === myId ? ' (나)' : '') }),
      el('div.lp-state', { text: p.starter ? (p.ready ? '준비 완료' : sp.ko) : '고르는 중…' }),
    ]);
  }));

  // 파트너는 겹쳐도 되게 뒀다. 셋이 같은 스타터를 고르면 상성이 통째로
  // 한쪽으로 쏠려 3막에서 벽을 만나는데, 그건 막을 게 아니라 배울 일이다.
  mount($('#lobby-starters'), ...STARTERS.map((id) => {
    const sp = POKEMON[id];
    return el(`div.starter${mine && mine.starter === id ? '.is-sel' : ''}`, {
      onclick: () => onPick(id),
    }, [
      monImg(id, sp, 4, { alt: sp.ko }),
      el('div.s-name', { text: sp.ko }),
      typeBadges(sp.types),
      el('div.s-style', { text: sp.style }),
    ]);
  }));

  // 인원수가 늘면 적이 얼마나 세지는지 미리 보여 준다. 모르고 3인으로
  // 들어갔다가 벽을 만나면 게임이 고장 난 것처럼 보이기 때문이다.
  const sc = scaleFor(players.length);
  $('#lobby-diff').innerHTML = players.length > 1
    ? `<b>${players.length}인</b> — 적 HP <b>×${sc.hp}</b> · 적 피해 <b>×${sc.dmg}</b>`
    : '혼자면 지금까지와 같은 난이도입니다.';

  const allReady = players.length >= 2 && players.every((p) => p.starter && p.ready);
  $('#btn-ready').textContent = mine && mine.ready ? '준비 취소' : '준비 완료';
  $('#btn-ready').disabled = !(mine && mine.starter);
  $('#btn-go').hidden = !isHost;
  $('#btn-go').disabled = !allReady;
  $('#btn-go').textContent = allReady
    ? '모두 모였다, 출발'
    : (players.length < 2 ? '아직 혼자다' : '아직 준비 중인 사람이 있다');
}
