// ─────────────────────────────────────────────────────────────
// session.js — 멀티 한 판의 진행 (로비 + 락스텝)
//
// ── 왜 락스텝인가 ──
// 상태를 통째로 보내는 방식(호스트가 계산하고 나머지는 그림만 받는)도
// 생각했는데, 그러려면 화면 코드가 "살아 있는 엔진" 대신 "받은 그림"을
// 그리도록 통째로 갈아엎어야 했다. 카드 미리보기(자속·상성이 곱해진 실제
// 피해)와 적 의도 미리보기가 전부 엔진 함수를 부르기 때문이다.
//
// 그래서 반대로 갔다. **모두가 같은 엔진을 돌린다.** 오가는 건 상태가
// 아니라 행동이다:
//
//   손님: "카드 7번을 3번 적에게" → 방장
//   방장: 순서를 매겨 → 전원에게 (자기 자신 포함)
//   전원: 받은 순서대로 그대로 적용
//
// 이 게임의 엔진은 난수가 시드 스트림 하나뿐이고 Math.random 도 Date 도 안
// 쓴다. 같은 시드 + 같은 행동 순서 = 같은 결과가 보장된다. 덕분에 화면
// 코드를 한 줄도 안 고치고 멀티가 됐다.
//
// 그래도 어긋날 수 있으므로(버그·재접속) 방장이 이따금 지문을 같이 보낸다.
// 안 맞으면 방장의 상태를 통째로 받아 덮어쓴다(combat.snapshot / resume).
// ─────────────────────────────────────────────────────────────
import * as PEER from './peer.js';

export const MAX_PLAYERS = 3;

/**
 * @param onLobby  로비가 바뀔 때 (players, code, isHost)
 * @param onStart  게임이 시작될 때 (seed, players)
 * @param onAction 확정된 행동 하나 (kind, ...)
 * @param onSync   방장이 보낸 전체 상태
 * @param onClose  연결이 끊겼을 때 (사유)
 */
export function createSession({ onLobby, onStart, onAction, onSync, onClose } = {}) {
  let link = null;                  // peer.js 가 준 것
  let isHost = false;
  let myId = 0;                     // 내 자리 번호 (0 = 방장)
  let players = [];                 // [{ id, peer, name, starter, ready }]
  let seq = 0;                      // 방장이 매기는 순번
  let started = false;

  const lobbyChanged = () => onLobby?.({ players: players.slice(), code: link?.code, isHost, myId, started });

  // ── 방장 ──────────────────────────────────────────────────
  async function createRoom(name) {
    isHost = true; myId = 0;
    players = [{ id: 0, peer: null, name: name || '1P', starter: null, ready: false }];
    link = await PEER.host({
      onJoin: (peerId) => {
        if (players.length >= MAX_PLAYERS || started) {
          link.send({ t: 'full' }, peerId);
          return;
        }
        const id = players.length;
        players.push({ id, peer: peerId, name: `${id + 1}P`, starter: null, ready: false });
        link.send({ t: 'welcome', id }, peerId);
        broadcastLobby();
      },
      onLeave: (peerId) => {
        players = players.filter((p) => p.peer !== peerId);
        players.forEach((p, i) => { p.id = i; });
        broadcastLobby();
        if (started) {
          // 게임 중에 한 명이 나가면 판이 성립하지 않는다. 솔직하게 끝낸다 —
          // 남은 사람이 그 자리를 대신 조종하게 만들 수도 있지만, 그건
          // "내 덱이 아닌 덱"을 떠안는 거라 협동이 아니라 벌이 된다.
          link.send({ t: 'closed', why: '같이 하던 사람이 나갔다' });
          onClose?.('같이 하던 사람이 나갔다');
        }
      },
      onData: (msg, peerId) => hostHandle(msg, peerId),
      onError: (err) => onClose?.(String(err?.message || err)),
    });
    lobbyChanged();
    return link.code;
  }

  function broadcastLobby() {
    const view = players.map((p) => ({ id: p.id, name: p.name, starter: p.starter, ready: p.ready }));
    link.send({ t: 'lobby', players: view });
    lobbyChanged();
  }

  function hostHandle(msg, peerId) {
    const p = players.find((x) => x.peer === peerId);
    if (!p) return;
    switch (msg.t) {
      case 'name':    p.name = String(msg.name || p.name).slice(0, 8); broadcastLobby(); break;
      case 'starter': p.starter = msg.starter; p.ready = false; broadcastLobby(); break;
      case 'ready':   p.ready = !!msg.ready; broadcastLobby(); break;
      // 손님이 하고 싶다고 보낸 행동 — 순서를 매겨 전원에게 되돌린다
      case 'want':    pushAction({ ...msg.action, by: p.id }); break;
      case 'needSync': onSync?.({ request: true, to: peerId }); break;
      default: break;
    }
  }

  // ── 손님 ──────────────────────────────────────────────────
  async function joinRoom(code, name) {
    isHost = false;
    link = await PEER.join(code, {
      onData: (msg) => guestHandle(msg),
      onClose: () => onClose?.('방장과의 연결이 끊겼다'),
      onError: (err) => onClose?.(String(err?.message || err)),
    });
    link.send({ t: 'name', name: name || '' });
    lobbyChanged();
    return link.code;
  }

  function guestHandle(msg) {
    switch (msg.t) {
      case 'welcome': myId = msg.id; break;
      case 'full':    onClose?.('방이 꽉 찼다'); break;
      case 'closed':  onClose?.(msg.why || '방이 닫혔다'); break;
      case 'lobby':   players = msg.players; lobbyChanged(); break;
      case 'start':
        started = true;
        onStart?.({ seed: msg.seed, players: msg.players, myId });
        break;
      case 'act':     onAction?.(msg.action); break;
      case 'sync':    onSync?.(msg.state); break;
      default: break;
    }
  }

  // ── 공통 ──────────────────────────────────────────────────
  /** 방장만 부른다. 순번을 붙여 전원에게 돌리고, 자기도 그때 적용한다 */
  function pushAction(action) {
    if (!isHost || !started) return;
    const withSeq = { ...action, seq: ++seq };
    link.send({ t: 'act', action: withSeq });
    onAction?.(withSeq);
  }

  /**
   * 내가 무언가 하고 싶다.
   * 방장이면 바로 순번을 매기고, 손님이면 방장에게 부탁한다.
   * ★ 손님은 여기서 자기 화면을 먼저 바꾸지 않는다. 먼저 바꿔 두면 방장이
   *   순서를 다르게 매겼을 때 되돌릴 방법이 없어서, 한 박자 기다린다.
   */
  function request(action) {
    if (!started) return;
    if (isHost) pushAction({ ...action, by: myId });
    else link.send({ t: 'want', action });
  }

  /** 방장이 게임을 연다 */
  function start(seed) {
    if (!isHost) return null;
    const roster = players.map((p) => ({ id: p.id, name: p.name, starter: p.starter }));
    started = true;
    link.send({ t: 'start', seed, players: roster });
    onStart?.({ seed, players: roster, myId: 0 });
    return roster;
  }

  /** 어긋났을 때 방장이 통째로 던져 준다 */
  function sendSync(state, to) {
    if (!isHost) return;
    link.send({ t: 'sync', state }, to);
  }

  const setMine = (patch) => {
    if (isHost) {
      Object.assign(players[0], patch);
      broadcastLobby();
    } else {
      if ('starter' in patch) link.send({ t: 'starter', starter: patch.starter });
      if ('ready' in patch) link.send({ t: 'ready', ready: patch.ready });
      if ('name' in patch) link.send({ t: 'name', name: patch.name });
    }
  };

  return {
    createRoom, joinRoom, start, request, sendSync, setMine,
    get isHost() { return isHost; },
    get myId() { return myId; },
    get code() { return link?.code; },
    get players() { return players; },
    get started() { return started; },
    close() { started = false; link?.close(); link = null; },
  };
}
