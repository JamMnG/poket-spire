// ─────────────────────────────────────────────────────────────
// pokemonSprites.js — 종별 도트 (24종)
//
// ★ 전부 **정면**이다. 처음엔 옆모습으로 찍었는데, 좌우 대칭 헬퍼와
//   옆모습이 서로 맞지 않아 귀가 몸통 위에 뜨는 식으로 계속 망가졌다.
//   원작 배틀 화면도 정면이고, 정면은 중심선 하나만 지키면 되므로
//   같은 노력으로 훨씬 또렷하게 읽힌다.
//
// 부위를 무작위로 조합하면 "그 포켓몬다움" 이 안 나온다. 한눈에 알아보게
// 하는 요소가 종마다 완전히 다르기 때문이다:
//
//   파이리   꼬리 끝의 불꽃 + 크림색 배 + 몸통만 한 머리
//   꼬부기   갈색 등껍질 테두리와 크림색 배딱지
//   피카츄   검은 끝의 뾰족 귀 + 빨간 볼
//   발챙이   배의 검은 소용돌이. 그것 말고는 아무 무늬도 없다
//   주뱃     눈이 없다. 펼친 날개와 벌린 입뿐
//   고오스   검은 얼굴 구체를 감싼 보라 가스
//   코일     자석 두 개 + 십자 나사 + 외눈
//   롱스톤   위로 갈수록 작아지는 바위 사슬 + 머리의 뿔
//
// 그래서 24종을 하나씩 찍는다. 아래 공용 부품은 실루엣을 통일해
// 전부 같은 세계에 사는 것처럼 보이게 하는 역할만 한다.
//
// ★ 원본 이미지를 옮긴 것이 아니라, 알아볼 수 있는 특징만 살려 새로 찍은
//   도트다. 이름·색과 함께 IP 격리 계층에 속한다 — 공개 배포하려면
//   이 파일과 data/pokemon.js, data/enemies.js 를 오리지널로 갈아야 한다.
//
// 격자 24×26, 중심 x = 11.5. 위가 머리, 아래가 발.
// ─────────────────────────────────────────────────────────────
import { createSprite } from './pixelSprite.js';
import { shade, inkOf } from './shading.js';

const W = 24, H = 26;

const INKY    = '#2b2118';
const WHITE   = '#f4efe6';
const CREAM   = '#f7e4be';
const FLAME_O = '#ff8c1a';
const FLAME_Y = '#ffd457';
const RED     = '#e0483a';
const STEELC  = '#c2ccd8';

// ── 공용 부품 ────────────────────────────────────────────────

/** 두 발 — 정면이므로 중심에서 같은 거리에 벌려 놓는다 */
function feet(S, y, col, w = 4, gap = 1) {
  const l = Math.round(S.cx - gap - w + 0.5);
  S.sym(l, y, w, 2, col);
}

/** 양옆으로 뻗은 팔 */
function arms(S, y, col, w = 3, h = 4) {
  S.sym(1, y, w, h, col);
}

/** 불꽃 — 위로 갈수록 노래진다 */
function flame(S, x, y) {
  S.rect(x, y + 3, 3, 2, FLAME_O);
  S.rect(x, y + 2, 3, 1, shade(FLAME_O, 0.18));
  S.rect(x + 1, y, 1, 3, FLAME_Y);
  S.set(x, y + 2, FLAME_Y);
  S.set(x + 2, y + 1, shade(FLAME_O, 0.4));
}

/** 웃는 입 / 다문 입 */
const mouth = (S, y, w, col) => S.crect(y, w, 1, col);

/**
 * 위로 좁아지는 뿔·귀.
 * taper() 는 grow 값과 상관없이 아래로만 좁아져서(가로 정렬만 바뀐다)
 * 귀를 그리면 각목이 된다. 귀·뿔은 이쪽을 쓴다.
 */
function spikeUp(S, x, y, w, h, col) {
  for (let j = 0; j < h; j++) {
    const t = j / Math.max(1, h - 1);                 // 0 = 끝, 1 = 밑동
    const ww = Math.max(1, Math.round(1 + (w - 1) * t));
    S.rect(x + Math.floor((w - ww) / 2), y + j, ww, 1, j < 2 ? shade(col, 0.22) : col);
  }
}
const symSpikeUp = (S, x, y, w, h, col) => {
  spikeUp(S, x, y, w, h, col);
  spikeUp(S, S.w - x - w, y, w, h, col);
};

// ── 종별 도트 ────────────────────────────────────────────────
// (S, c) 를 받는다. c = { body, accent, belly }

const DRAW = {

  // ══ 스타터 ═════════════════════════════════════════════════
  charmander(S, c) {                          // 파이리 — 꼬리 불꽃 + 크림 배 + 큰 머리
    S.rect(18, 16, 4, 3, c.body);             // 꼬리 (오른쪽으로)
    S.rect(20, 13, 3, 4, c.body);
    flame(S, 20, 8);
    S.cblob(13, 12, 8, c.body, 2);            // 몸통
    S.cblob(15, 8, 5, c.belly, 1);            // 배
    S.cdome(3, 14, 11, c.body, 4);            // 머리 — 몸통보다 크다
    S.eyes(8, 3);
    S.set(8, 9, shade(c.body, -0.35));
    S.set(15, 9, shade(c.body, -0.35));
    mouth(S, 11, 5, shade(c.body, -0.38));
    S.sym(3, 14, 3, 5, c.body);               // 팔
    feet(S, 21, shade(c.body, -0.1), 5, 0);
  },

  squirtle(S, c) {                            // 꼬부기 — 등껍질 테두리 + 배딱지
    S.rect(19, 17, 4, 3, c.accent);           // 말린 꼬리
    S.cblob(12, 15, 9, '#a8703a', 3);         // 껍질 바깥 테두리
    S.cblob(14, 11, 6, c.belly, 2);           // 배딱지
    S.crect(14, 11, 1, shade('#a8703a', -0.25));
    S.cdome(3, 13, 10, c.body, 4);            // 머리
    S.eyes(7, 3);
    mouth(S, 10, 4, shade(c.body, -0.4));
    S.sym(2, 13, 4, 4, c.body);               // 팔
    feet(S, 21, shade(c.body, -0.08), 5, 0);
  },

  bulbasaur(S, c) {                           // 이상해씨 — 등의 구근 + 낮고 넓은 몸
    // 구근을 먼저 그리고 머리를 그 앞에 겹친다 — 그래야 "등에 얹힌" 것으로 읽힌다
    S.cblob(0, 15, 9, c.accent, 4);
    S.crect(1, 7, 1, shade(c.accent, 0.4));
    S.sym(6, 3, 2, 3, shade(c.accent, -0.26)); // 구근 결
    S.sym(9, 2, 2, 4, shade(c.accent, -0.2));
    S.cblob(12, 18, 9, c.body, 3);            // 낮고 넓은 몸통
    S.cdome(6, 14, 9, c.body, 4);             // 머리
    S.eyes(10, 3);
    mouth(S, 13, 6, shade(c.body, -0.4));
    S.sym(4, 8, 2, 2, shade(c.body, -0.22));  // 얼굴 옆 무늬
    S.sym(7, 11, 2, 2, shade(c.body, -0.22));
    S.sym(2, 19, 4, 4, shade(c.body, -0.1));  // 앞다리
    S.sym(7, 20, 4, 3, shade(c.body, -0.2));  // 뒷다리
  },

  // ══ 야생 · 합류 ════════════════════════════════════════════
  pikachu(S, c) {                             // 피카츄 — 검은 끝 귀 + 빨간 볼
    S.rect(18, 14, 3, 2, c.body);             // 번개 꼬리
    S.rect(20, 10, 3, 4, c.body);
    S.rect(19, 16, 3, 2, shade(c.body, -0.22));
    S.sym(4, 0, 3, 7, c.body);                // 귀
    S.sym(4, 0, 3, 3, INKY);                  // 귀 끝은 검다
    S.cblob(13, 12, 8, c.body, 2);            // 몸통
    S.cdome(5, 14, 10, c.body, 4);            // 머리
    S.eyes(9, 3);
    S.sym(4, 11, 3, 2, RED);                  // 볼주머니
    mouth(S, 12, 3, shade(c.body, -0.45));
    S.sym(4, 14, 2, 4, c.body);
    feet(S, 21, shade(c.body, -0.12), 5, 0);
  },

  rattata(S, c) {                             // 꼬렛 — 큰 귀 + 앞니 + 크림 배
    S.rect(19, 15, 4, 1, c.accent);           // 가는 꼬리
    S.rect(21, 12, 2, 4, c.accent);
    S.sym(2, 4, 5, 5, c.body);                // 큰 귀
    S.sym(3, 5, 3, 3, shade(RED, 0.35));      // 귀 안쪽
    S.cblob(13, 14, 8, c.body, 3);            // 몸통
    S.cblob(15, 8, 5, c.belly, 1);            // 배
    S.cdome(6, 12, 9, c.body, 3);             // 머리
    S.eyes(10, 3);
    S.crect(14, 4, 2, WHITE);                 // 앞니 — 꼬렛의 표식
    S.set(11, 13, shade(c.body, -0.45)); S.set(12, 13, shade(c.body, -0.45));
    S.sym(4, 20, 4, 3, shade(c.body, -0.18));
  },

  pidgey(S, c) {                              // 구구 — 부리 + 머리깃 + 눈가 무늬
    symSpikeUp(S, 9, 0, 3, 4, c.accent);      // 머리깃 두 갈래
    S.cblob(8, 15, 13, c.body, 4);            // 통통한 몸
    S.cblob(12, 10, 8, c.belly, 3);           // 배
    S.cdome(2, 13, 8, c.body, 3);             // 머리
    S.sym(5, 5, 3, 2, shade(c.accent, -0.4)); // 눈가 무늬
    S.eyes(5, 3);
    S.crect(8, 4, 2, '#e0a83c');              // 부리
    S.crect(10, 2, 1, shade('#e0a83c', -0.32));
    // 날개는 몸에 붙여 아래로 좁아지게 — 옆으로 뻗으면 상자처럼 보인다
    S.taper(1, 11, 5, 8, shade(c.body, -0.22), 1);
    S.taper(18, 11, 5, 8, shade(c.body, -0.22), -1);
    feet(S, 21, '#e0a83c', 3, 1);
  },

  sandshrew(S, c) {                           // 모래두지 — 웅크린 몸 + 등의 갈라진 무늬
    S.cblob(7, 18, 14, c.body, 4);            // 둥근 등
    for (let i = 0; i < 3; i++) S.rect(6 + i * 5, 8, 1, 5, shade(c.accent, -0.15));
    S.cdome(10, 13, 10, c.belly, 3);          // 앞으로 나온 얼굴·배
    S.eyes(13, 3);
    mouth(S, 16, 4, shade(c.belly, -0.35));
    S.sym(2, 15, 3, 3, c.body);               // 발톱
    S.sym(3, 16, 1, 1, WHITE);
    feet(S, 22, shade(c.body, -0.15), 4, 0);
  },

  zubat(S, c) {                               // 주뱃 — 눈이 없다. 날개와 입뿐
    S.taper(0, 5, 8, 10, c.accent, -1);       // 날개
    S.taper(16, 5, 8, 10, c.accent, -1);
    S.rect(1, 6, 6, 8, shade(c.accent, -0.14));
    S.rect(17, 6, 6, 8, shade(c.accent, -0.14));
    S.sym(6, 2, 3, 6, c.body);                // 큰 귀
    S.cblob(7, 10, 11, c.body, 3);            // 몸통
    S.crect(12, 6, 4, '#3a2028');             // 벌린 입
    S.set(9, 12, WHITE); S.set(14, 12, WHITE);// 송곳니
    S.set(9, 15, WHITE); S.set(14, 15, WHITE);
    feet(S, 21, shade(c.body, -0.25), 3, 1);
  },

  vulpix(S, c) {                              // 식스테일 — 갈라진 꼬리 + 이마 말린 털
    for (let i = 0; i < 3; i++) S.taper(17, 11 + i * 4, 7, 5, c.accent, 1);   // 꼬리 다발
    symSpikeUp(S, 3, 1, 5, 6, c.body);        // 뾰족 귀
    S.set(5, 5, shade(RED, 0.3)); S.set(18, 5, shade(RED, 0.3));
    S.cblob(14, 12, 8, c.body, 3);            // 몸통
    S.cdome(6, 13, 9, c.body, 4);             // 머리
    S.cblob(4, 9, 5, c.accent, 2);            // 이마 말린 털
    S.eyes(11, 3);
    mouth(S, 14, 3, shade(c.body, -0.42));
    S.sym(4, 20, 4, 3, shade(c.body, -0.18));
  },

  poliwag(S, c) {                             // 발챙이 — 배의 소용돌이. 그것뿐이다
    S.rect(19, 5, 3, 3, c.body);              // 가는 꼬리
    S.rect(21, 2, 2, 4, shade(c.body, -0.12));
    S.cblob(4, 18, 17, c.body, 5);            // 거의 원형인 몸
    S.eyes(8, 4);                             // 눈은 배 위쪽 파란 면에
    S.cblob(11, 12, 9, c.belly, 3);           // 배는 몸의 절반만 — 전에는 몸을 다 덮었다
    // 소용돌이 — 이 다섯 줄이 발챙이의 전부다
    S.rect(9, 13, 7, 1, INKY);
    S.rect(9, 13, 1, 5, INKY);
    S.rect(9, 17, 7, 1, INKY);
    S.rect(15, 14, 1, 3, INKY);
    S.rect(11, 15, 3, 1, INKY);
    feet(S, 21, shade(c.body, -0.25), 4, 0);
  },

  geodude(S, c) {                             // 꼬마돌 — 바위 덩어리 + 양팔
    S.cblob(6, 16, 14, c.body, 3);            // 각진 바위
    S.rect(6, 7, 4, 2, shade(c.body, 0.24));  // 면 분할
    S.rect(14, 16, 4, 2, shade(c.body, -0.26));
    S.sym(5, 12, 3, 1, shade(c.body, -0.3));
    S.eyes(11, 3);
    mouth(S, 15, 6, shade(c.body, -0.42));
    S.rect(0, 11, 5, 4, c.accent);            // 팔
    S.rect(19, 11, 5, 4, c.accent);
    S.rect(0, 14, 4, 3, shade(c.accent, -0.15));
    S.rect(20, 14, 4, 3, shade(c.accent, -0.15));
  },

  abra(S, c) {                                // 캐이시 — 감은 눈 + 어깨 갑판
    S.taper(2, 1, 5, 6, c.body, 1);           // 여우 귀
    S.taper(17, 1, 5, 6, c.body, 1);
    S.cblob(14, 12, 8, c.body, 2);            // 앉은 몸
    S.cdome(5, 13, 10, c.body, 4);            // 머리
    S.rect(7, 10, 3, 1, INKY);                // 감은 눈
    S.rect(14, 10, 3, 1, INKY);
    S.set(7, 11, shade(c.body, -0.3)); S.set(16, 11, shade(c.body, -0.3));
    mouth(S, 13, 3, shade(c.body, -0.4));
    S.sym(3, 14, 5, 3, c.accent);             // 어깨 갑판
    S.crect(13, 8, 2, c.accent);
    feet(S, 22, shade(c.body, -0.15), 4, 0);
  },

  gastly(S, c) {                              // 고오스 — 검은 구체를 감싼 가스
    for (const [x, y, w, h] of [[1,5,7,5],[16,5,7,5],[0,13,7,5],[17,13,7,5],[7,0,10,5],[6,19,12,5]])
      S.blob(x, y, w, h, c.body, 2);          // 주변 가스
    S.cblob(6, 14, 14, c.accent, 5);          // 검은 얼굴 구체
    S.rect(8, 10, 2, 2, WHITE);               // 흰 눈
    S.rect(14, 10, 2, 2, WHITE);
    S.crect(15, 8, 1, WHITE);                 // 웃는 입
    S.set(7, 14, WHITE); S.set(16, 14, WHITE);
    S.set(9, 16, WHITE); S.set(14, 16, WHITE);
  },

  caterpie(S, c) {                            // 캐터피 — 큰 눈 + 이마 촉수 + 마디
    S.crect(0, 2, 3, c.accent);               // 이마 촉수
    S.crect(2, 4, 2, c.accent);
    S.cblob(15, 16, 8, c.body, 3);            // 몸 마디
    S.rect(4, 17, 16, 1, shade(c.body, -0.22));
    S.rect(4, 20, 16, 1, shade(c.body, -0.22));
    S.cdome(4, 15, 12, c.body, 4);            // 큰 머리
    S.rect(6, 8, 4, 4, WHITE); S.rect(7, 9, 2, 2, INKY);   // 큰 눈
    S.rect(14, 8, 4, 4, WHITE); S.rect(15, 9, 2, 2, INKY);
    mouth(S, 13, 4, shade(c.body, -0.4));
    S.sym(3, 22, 3, 2, shade(c.body, -0.28));
  },

  machop(S, c) {                              // 알통몬 — 근육 + 머리의 볏 셋
    S.crect(0, 2, 3, c.accent);               // 볏
    S.rect(7, 1, 2, 2, c.accent);
    S.rect(15, 1, 2, 2, c.accent);
    S.cblob(12, 14, 9, c.body, 2);            // 두꺼운 몸통
    S.cblob(14, 9, 5, shade(c.belly, -0.04), 1);
    S.cdome(3, 12, 10, c.body, 4);            // 머리
    S.eyes(8, 3);
    mouth(S, 11, 4, shade(c.body, -0.4));
    S.rect(0, 12, 5, 5, c.body);              // 굵은 팔
    S.rect(19, 12, 5, 5, c.body);
    feet(S, 21, shade(c.body, -0.14), 5, 0);
  },

  magnemite(S, c) {                           // 코일 — 자석 둘 + 나사 + 외눈
    S.cblob(6, 13, 13, c.body, 4);            // 구체
    S.rect(0, 10, 6, 4, STEELC);              // 왼쪽 자석
    S.rect(0, 10, 6, 2, RED);
    S.rect(18, 10, 6, 4, STEELC);             // 오른쪽 자석
    S.rect(18, 12, 6, 2, '#4a6ec7');
    S.crect(10, 6, 6, WHITE);                 // 외눈
    S.crect(11, 4, 4, INKY);
    S.crect(2, 4, 5, '#9aa4b0');              // 위쪽 나사
    S.crect(3, 6, 1, shade('#9aa4b0', -0.32));
    S.rect(8, 19, 3, 4, '#9aa4b0');           // 아래 나사
    S.rect(13, 19, 3, 4, '#9aa4b0');
  },

  // ══ 적 전용 ════════════════════════════════════════════════
  weedle(S, c) {                              // 뿔충이 — 머리 위 독침 + 붉은 코
    S.crect(0, 2, 5, c.accent);               // 독침
    S.crect(4, 4, 2, c.accent);
    S.cblob(15, 16, 8, c.body, 3);            // 몸 마디
    S.rect(4, 17, 16, 1, shade(c.body, -0.2));
    S.rect(4, 20, 16, 1, shade(c.body, -0.2));
    S.cdome(6, 14, 10, c.body, 4);            // 머리
    S.rect(7, 9, 3, 3, INKY);                 // 눈
    S.rect(14, 9, 3, 3, INKY);
    S.crect(13, 4, 2, RED);                   // 붉은 코
    S.sym(3, 22, 3, 2, shade(c.body, -0.28));
  },

  ekans(S, c) {                               // 아보 — 또아리 + 노란 배 무늬 + 혀
    S.cblob(18, 20, 6, shade(c.body, -0.18), 4);   // 아래 또아리
    S.crect(20, 14, 2, c.accent);
    S.cblob(13, 15, 6, c.body, 3);            // 위 또아리
    S.crect(15, 10, 2, c.accent);
    S.cdome(3, 13, 11, c.body, 4);            // 머리
    S.eyes(8, 3);
    S.set(8, 7, RED); S.set(15, 7, RED);
    S.crect(11, 6, 1, shade(c.body, -0.45));
    S.crect(12, 2, 3, RED);                   // 갈라진 혀
    S.set(10, 14, RED); S.set(13, 14, RED);
  },

  arbok(S, c) {                               // 아보크 — 펼친 후드 + 얼굴 무늬
    S.cblob(19, 12, 6, shade(c.body, -0.2), 3);
    S.taper(2, 7, 20, 10, c.body, -1);        // 후드
    S.rect(3, 8, 18, 8, c.body);
    S.rect(6, 10, 4, 4, c.accent);            // 후드 무늬 — 아보크의 표식
    S.rect(14, 10, 4, 4, c.accent);
    S.crect(15, 8, 2, shade(c.accent, -0.22));
    S.cdome(1, 11, 8, c.body, 3);             // 머리
    S.set(9, 4, RED); S.set(9, 5, INKY);
    S.set(14, 4, RED); S.set(14, 5, INKY);
    S.crect(7, 5, 1, INKY);
    S.crect(8, 3, 3, RED);
  },

  oddish(S, c) {                              // 뚜벅쵸 — 파란 몸 + 잎사귀
    S.blob(2, 3, 8, 6, c.accent, 2);          // 잎
    S.blob(14, 3, 8, 6, c.accent, 2);
    S.cblob(0, 10, 7, c.accent, 3);
    S.crect(6, 8, 4, shade(c.accent, -0.16));
    S.cblob(11, 14, 10, c.body, 3);           // 무 같은 몸
    S.rect(6, 14, 4, 4, WHITE); S.rect(7, 15, 2, 2, INKY);
    S.rect(14, 14, 4, 4, WHITE); S.rect(15, 15, 2, 2, INKY);
    S.crect(18, 5, 1, shade(c.body, -0.38));
    feet(S, 22, shade(c.body, -0.22), 4, 0);
  },

  mankey(S, c) {                              // 망키 — 털뭉치 + 돼지코
    S.cblob(6, 17, 15, c.body, 5);            // 둥근 털 몸
    S.sym(2, 8, 3, 4, c.accent);              // 귀
    S.rect(7, 10, 4, 3, WHITE); S.rect(8, 11, 2, 2, INKY);
    S.rect(13, 10, 4, 3, WHITE); S.rect(14, 11, 2, 2, INKY);
    S.crect(14, 5, 3, c.accent);              // 돼지코
    S.set(10, 15, INKY); S.set(13, 15, INKY);
    S.rect(0, 14, 4, 5, c.accent);            // 팔
    S.rect(20, 14, 4, 5, c.accent);
    feet(S, 22, c.accent, 4, 0);
  },

  onix(S, c) {                                // 롱스톤 — 위로 갈수록 작아지는 바위 사슬
    const chain = [[19, 16], [14, 13], [9, 11]];
    for (const [y, w] of chain) {
      S.cblob(y, w, 6, c.body, 2);
      S.rect(S.cx0(w) + 1, y + 1, Math.max(2, w - 6), 1, shade(c.body, 0.3));
      S.rect(S.cx0(w) + 3, y + 4, Math.max(2, w - 7), 1, shade(c.body, -0.32));
    }
    S.cdome(2, 12, 9, c.body, 4);             // 머리
    S.crect(0, 2, 3, c.accent);               // 뿔
    S.crect(0, 4, 1, c.accent);
    S.rect(7, 5, 4, 3, WHITE); S.rect(8, 6, 2, 2, INKY);
    S.rect(13, 5, 4, 3, WHITE); S.rect(14, 6, 2, 2, INKY);
    S.crect(9, 6, 1, shade(c.body, -0.42));
  },

  primeape(S, c) {                            // 성원숭 — 화난 눈 + 치켜든 팔
    S.cblob(5, 18, 17, c.body, 6);            // 둥근 털뭉치가 거의 전부다
    S.rect(5, 8, 5, 2, INKY);                 // 치켜뜬 눈썹
    S.rect(14, 8, 5, 2, INKY);
    S.rect(6, 10, 4, 3, WHITE); S.rect(6, 11, 3, 2, RED);
    S.rect(14, 10, 4, 3, WHITE); S.rect(15, 11, 3, 2, RED);
    S.crect(14, 4, 3, c.accent);              // 코
    S.crect(18, 6, 2, INKY);                  // 벌린 입
    S.rect(0, 10, 5, 6, c.accent);            // 치켜든 팔
    S.rect(19, 10, 5, 6, c.accent);
    feet(S, 23, c.accent, 4, 0);
  },

  beedrill(S, c) {                            // 비주기 — 앞다리 침 + 줄무늬 배 + 겹눈
    S.taper(1, 2, 8, 8, '#dce8f4', -1);       // 날개
    S.taper(15, 2, 8, 8, '#dce8f4', -1);
    S.cblob(4, 12, 8, c.body, 2);             // 가슴
    S.cblob(12, 10, 9, c.body, 3);            // 배
    S.crect(14, 10, 2, c.accent);             // 검은 줄무늬
    S.crect(17, 10, 2, c.accent);
    S.rect(0, 7, 6, 2, STEELC);               // 앞다리 침
    S.rect(0, 5, 2, 3, STEELC);
    S.rect(18, 7, 6, 2, STEELC);
    S.rect(22, 5, 2, 3, STEELC);
    S.crect(21, 2, 4, STEELC);                // 꼬리침
    S.rect(6, 5, 5, 4, RED); S.rect(7, 6, 3, 2, INKY);     // 붉은 겹눈
    S.rect(13, 5, 5, 4, RED); S.rect(14, 6, 3, 2, INKY);
  },
};

// ── 이미지 자산 ──────────────────────────────────────────────
//
// 실제 화면에는 `src/assets/pokemon/<종id>.png` (PokeAPI 공식 아트워크)를 쓴다.
// 위의 도트는 자산이 없는 종을 위한 **대체 그림**으로 남는다 — 종을 새로
// 추가했는데 파일을 아직 안 받아 왔을 때 빈 네모가 뜨는 대신 알아볼 수 있는
// 실루엣이라도 나오게 하려는 것이다.
//
// 경로는 문서 URL이 아니라 이 모듈 위치를 기준으로 잡는다. 하위 경로에
// 배포하든 어디서 부르든 깨지지 않는다.

const ASSET_BASE = new URL('../assets/pokemon/', import.meta.url);

/** 내려받아 둔 종 — 여기 없으면 도트로 떨어진다 */
const HAS_ASSET = new Set([
  'bulbasaur', 'charmander', 'squirtle', 'caterpie', 'weedle', 'beedrill',
  'pidgey', 'rattata', 'ekans', 'arbok', 'pikachu', 'sandshrew',
  'vulpix', 'zubat', 'oddish', 'mankey', 'primeape', 'poliwag',
  'abra', 'machop', 'geodude', 'magnemite', 'gastly', 'onix',
]);

export const artPath = (id) => new URL(`${id}.png`, ASSET_BASE).href;
export const hasArt = (id) => HAS_ASSET.has(id);

// ── 굽기·캐시 ────────────────────────────────────────────────

const cache = new Map();

/** 종 id 로 캔버스를 얻는다. 같은 종·같은 배율은 한 번만 굽는다 */
export function spriteFor(speciesId, colors, scale = 5) {
  const key = `${speciesId}:${scale}`;
  if (cache.has(key)) return cache.get(key);

  const draw = DRAW[speciesId];
  const c = {
    body: colors?.body || '#9fa07f',
    accent: colors?.accent || shade(colors?.body || '#9fa07f', -0.3),
    belly: colors?.belly || CREAM,
  };

  const S = createSprite(W, H);
  if (draw) draw(S, c);
  else {                                      // 도트가 아직 없는 종 — 알아볼 수 있는 대체 실루엣
    S.cblob(9, 13, 12, c.body, 4);
    S.cdome(4, 11, 7, c.body, 3);
    S.eyes(8, 3);
  }
  S.outline(inkOf(c.body));

  const cv = S.bake(scale);
  cache.set(key, cv);
  return cv;
}

/**
 * <img> 에 넣을 주소.
 * 내려받은 아트워크가 있으면 그 파일을, 없으면 도트를 구워 data URL 로 준다.
 * 부르는 쪽은 둘을 구분할 필요가 없다.
 */
export function spriteUrl(speciesId, colors, scale = 5) {
  if (HAS_ASSET.has(speciesId)) return artPath(speciesId);
  return spriteFor(speciesId, colors, scale).toDataURL();
}

export const hasSprite = (id) => !!DRAW[id];
