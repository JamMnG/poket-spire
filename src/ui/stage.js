// ─────────────────────────────────────────────────────────────
// stage.js — 작은 화면(휴대폰·태블릿)에서 판을 통째로 축소해 얹는다
//
// 화면 요소를 하나씩 반응형으로 줄이는 방법도 있지만, 이 게임에서는
// 안 통했다. 세로 공간이 상단띠 46 + 도구줄 34 + 손패 232 로 이미
// 312px 을 먹는데, 휴대폰 가로가 390px 이라 아레나에 78px 밖에 안 남는다.
// 카드를 줄이면 글씨를 못 읽고, 손패를 줄이면 카드가 안 보인다.
//
// 그래서 **논리 화면**을 하나 정해 두고(높이 고정, 너비는 기기 비율을
// 따라감) 그 위에 전체를 그린 다음, CSS transform 으로 한 번에 축소한다.
// 데스크톱에서 보던 배치가 그대로 작아질 뿐이라 새로 깨질 곳이 없다.
//
// 세로로 들면 안내를 띄운다. 이 게임은 좌우로 넓은 아레나가 전제라
// 세로 화면에서는 어떻게 줄여도 읽을 수가 없다.
// ─────────────────────────────────────────────────────────────

const STAGE_H = 660;          // 논리 높이 — 데스크톱 배치가 편하게 들어가는 값
const STAGE_W_MIN = 940;
const STAGE_W_MAX = 1500;

/** 이 크기를 그냥 쓰면 되는가 */
const fitsNatively = (w, h) => w >= 900 && h >= 620;

/**
 * 안내를 띄울 만큼 세로로 길쭉한가.
 * 처음엔 "손가락 기기이면서 세로일 때"로 뒀는데, 데스크톱 창을 390px 로
 * 좁혀도 똑같이 못 쓰는 건 마찬가지였다. 기기 종류가 아니라 모양으로 본다.
 */
const tooTall = () => window.innerHeight > window.innerWidth && window.innerWidth < 820;

/**
 * 노치·홈바가 먹는 가장자리 크기. 가로로 든 아이폰은 노치가 화면 왼쪽이나
 * 오른쪽에 오는데, index.html 이 viewport-fit=cover 라 그냥 두면 판이 그
 * 밑으로 깔린다. CSS 의 env() 값을 재서 쓸 수 있는 크기부터 빼 둔다.
 */
function safeArea() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
    + 'top:0;left:0;'
    + 'padding:env(safe-area-inset-top) env(safe-area-inset-right)'
    + ' env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const px = (v) => parseFloat(v) || 0;
  const out = {
    l: px(cs.paddingLeft), r: px(cs.paddingRight),
    t: px(cs.paddingTop), b: px(cs.paddingBottom),
  };
  probe.remove();
  return out;
}

function apply() {
  const root = document.documentElement;
  const body = document.body;
  const ins = safeArea();
  const vw = window.innerWidth - ins.l - ins.r;
  const vh = window.innerHeight - ins.t - ins.b;

  body.classList.toggle('is-portrait', tooTall());

  if (fitsNatively(vw, vh)) {
    body.classList.remove('is-scaled');
    for (const k of ['--stage-w', '--stage-h', '--stage-scale', '--stage-dx', '--stage-dy']) {
      root.style.removeProperty(k);
    }
    return;
  }

  // 높이는 고정하고 너비만 기기 비율을 따라간다. 이렇게 해야 21:9 짜리
  // 휴대폰에서 좌우에 검은 띠가 남지 않는다.
  const w = Math.round(Math.min(STAGE_W_MAX, Math.max(STAGE_W_MIN, STAGE_H * (vw / vh))));
  const scale = Math.min(vw / w, vh / STAGE_H);

  body.classList.add('is-scaled');
  root.style.setProperty('--stage-w', `${w}px`);
  root.style.setProperty('--stage-h', `${STAGE_H}px`);
  root.style.setProperty('--stage-scale', String(scale));
  // 노치가 한쪽에만 있으면 안전 영역의 가운데는 화면 가운데가 아니다
  root.style.setProperty('--stage-dx', `${(ins.l - ins.r) / 2}px`);
  root.style.setProperty('--stage-dy', `${(ins.t - ins.b) / 2}px`);
}

export function initStage() {
  apply();
  window.addEventListener('resize', apply);
  // 기기를 돌리면 resize 가 늦게 오거나 옛 크기로 온다 — 한 박자 뒤 다시 잰다
  window.addEventListener('orientationchange', () => setTimeout(apply, 250));
}
