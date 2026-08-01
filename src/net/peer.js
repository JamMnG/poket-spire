// ─────────────────────────────────────────────────────────────
// peer.js — 브라우저끼리 직접 잇는다 (WebRTC / PeerJS)
//
// 서버를 두지 않기로 했으므로 P2P 로 간다. PeerJS 의 공개 시그널링 서버가
// "누가 어느 방에 있는지"만 중개해 주고, 실제 주고받는 데이터는 브라우저
// 사이를 직접 지나간다.
//
// ★ 이 파일이 이 프로젝트의 **유일한 외부 요청**이다. 1인 게임은 이 모듈을
//   아예 안 불러오므로, 혼자 할 때는 여전히 외부 요청이 0건이다.
//
// ★ 공개 시그널링 서버라 가끔 안 붙는다. 그때는 방 코드를 다시 만들면
//   대개 풀린다. 안정성이 필요해지면 여기만 갈아 끼우면 된다 —
//   위층(session.js)은 send/onData 만 알고 있다.
//
// 별 모양이다. 손님끼리는 직접 안 잇고 전부 방장을 거친다. 3인이면 연결이
// 두 개뿐이라 그물로 엮을 이유가 없고, 순서를 정하는 곳이 하나여야
// 락스텝이 성립한다.
// ─────────────────────────────────────────────────────────────

const PEERJS_SRC = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const ID_PREFIX = 'pokespire-v1-';

/** 사람이 불러 줄 수 있는 방 코드 — 헷갈리는 글자(0/O, 1/I)는 뺐다 */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(n = 4) {
  let s = '';
  for (let i = 0; i < n; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

let loading = null;
/** PeerJS 를 처음 쓸 때만 받아 온다 */
function loadPeerJs() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = PEERJS_SRC;
    tag.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error('PeerJS 를 읽지 못했다')));
    tag.onerror = () => reject(new Error('연결 라이브러리를 받지 못했다. 인터넷 연결을 확인해 주세요.'));
    document.head.appendChild(tag);
  });
  return loading;
}

const peerIdOf = (code) => ID_PREFIX + code.toUpperCase();

/**
 * 방을 연다.
 * @returns { code, isHost:true, send(msg, to?), close(), 그리고 콜백 훅 }
 */
export async function host({ onJoin, onLeave, onData, onError } = {}) {
  const Peer = await loadPeerJs();
  const conns = new Map();          // peerId → DataConnection

  // 코드가 이미 쓰이고 있으면 다른 코드로 몇 번 더 시도한다
  let peer = null, code = null;
  for (let attempt = 0; attempt < 5 && !peer; attempt++) {
    const tryCode = randomCode();
    try {
      peer = await openPeer(Peer, peerIdOf(tryCode));
      code = tryCode;
    } catch (err) {
      if (String(err && err.type) !== 'unavailable-id') throw err;
    }
  }
  if (!peer) throw new Error('방 코드를 만들지 못했다. 잠시 뒤 다시 시도해 주세요.');

  peer.on('connection', (conn) => {
    conn.on('open', () => {
      conns.set(conn.peer, conn);
      onJoin?.(conn.peer);
    });
    conn.on('data', (msg) => onData?.(msg, conn.peer));
    conn.on('close', () => { conns.delete(conn.peer); onLeave?.(conn.peer); });
    conn.on('error', () => { conns.delete(conn.peer); onLeave?.(conn.peer); });
  });
  peer.on('error', (err) => onError?.(err));

  return {
    code, isHost: true,
    peerCount: () => conns.size,
    /** to 를 주면 그 사람에게만, 안 주면 전원에게 */
    send(msg, to) {
      if (to) { conns.get(to)?.send(msg); return; }
      for (const c of conns.values()) c.send(msg);
    },
    close() { for (const c of conns.values()) c.close(); peer.destroy(); },
  };
}

/** 방에 들어간다 */
export async function join(code, { onData, onClose, onError } = {}) {
  const Peer = await loadPeerJs();
  const peer = await openPeer(Peer, null);

  const conn = peer.connect(peerIdOf(code), { reliable: true });
  await new Promise((resolve, reject) => {
    // 코드가 틀리면 PeerJS 는 error 를 늦게 준다. 기다리다 지치는 것보다
    // 8초에 끊고 "코드를 확인하라"고 말해 주는 편이 낫다.
    const timer = setTimeout(() => reject(new Error('방을 찾지 못했다. 코드를 확인해 주세요.')), 8000);
    conn.on('open', () => { clearTimeout(timer); resolve(); });
    peer.on('error', (err) => { clearTimeout(timer); reject(err); });
  });

  conn.on('data', (msg) => onData?.(msg));
  conn.on('close', () => onClose?.());
  conn.on('error', (err) => onError?.(err));

  return {
    code: code.toUpperCase(), isHost: false,
    send(msg) { if (conn.open) conn.send(msg); },
    close() { conn.close(); peer.destroy(); },
  };
}

function openPeer(Peer, id) {
  return new Promise((resolve, reject) => {
    const p = id ? new Peer(id) : new Peer();
    const timer = setTimeout(() => reject(new Error('연결 서버에 닿지 못했다.')), 12000);
    p.on('open', () => { clearTimeout(timer); resolve(p); });
    p.on('error', (err) => { clearTimeout(timer); p.destroy(); reject(err); });
  });
}
