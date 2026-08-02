// ─────────────────────────────────────────────────────────────
// events.js — ? 방
//
// ? 방의 값어치는 "공짜 보상"이 아니라 **값을 치르는 선택**에 있다.
// 그래서 대부분의 선택지에 대가가 붙는다. 아무 대가 없는 선택지는
// 반드시 다른 선택지보다 눈에 띄게 작다.
//
// 선택지 effect(R) 는 결과 문구를 돌려준다. R 은 run.js 가 넘기는 창구다.
// ─────────────────────────────────────────────────────────────
import { POKEMON } from './pokemon.js';
import { CARDS } from './cards.js';

export const EVENTS = {
  // 이 게임에만 있는 방. 파티를 늘리는 거의 유일한 통로라 자주 나온다.
  wild: {
    ko: '풀숲이 흔들린다',
    text: '풀이 부스럭거린다. 야생 포켓몬이 이쪽을 보고 있다.',
    weight: 3,
    // 막마다 만나는 종이 다르다 — 2·3막에서 파티를 새로 짤 여지를 준다
    setup: (R) => {
      const pool = R.catchablesHere();
      return { species: pool.length ? R.rng.pick(pool) : null };
    },
    choices: [
      {
        label: '몬스터볼을 던진다',
        desc: (R, d) => (d.species
          ? `${POKEMON[d.species].ko}을(를) 잡는다. 덱에 들어오는 기술: ${
              POKEMON[d.species].cards.map((c) => CARDS[c].ko).join(' · ')}`
          : '더 잡을 만한 포켓몬이 없다.'),
        enabled: (R, d) => R.partyHasRoom() && !!d.species,
        effect: (R, d) => {
          if (!d.species) return '풀숲은 이미 조용했다.';
          if (R.hasSpecies(d.species)) return `이미 ${POKEMON[d.species].ko}이(가) 있다. 그냥 보내 줬다.`;
          R.catchPokemon(d.species);
          return `좋아! ${POKEMON[d.species].ko}을(를) 잡았다!`;
        },
      },
      {
        label: '먹이를 주고 보낸다',
        desc: () => '선두 포켓몬의 HP를 5 회복한다.',
        effect: (R) => { R.healActive(5); return '포켓몬은 배를 채우고 풀숲으로 사라졌다.'; },
      },
      { label: '그냥 지나간다', desc: () => '아무 일도 없다.', effect: () => '조용히 지나쳤다.' },
    ],
  },

  berry: {
    ko: '나무열매밭',
    text: '나무마다 열매가 달려 있다. 몇 개는 잘 익었고, 몇 개는 어딘가 이상하다.',
    weight: 2,
    choices: [
      {
        label: '잘 익은 것을 먹는다',
        desc: () => '파티 전원의 HP를 8 회복한다.',
        effect: (R) => { R.healAll(8); return '기운이 돈다.' },
      },
      {
        label: '이상한 것을 먹인다',
        desc: () => '최대 HP가 5 오르지만 현재 HP를 12 잃는다.',
        effect: (R) => {
          R.raiseMaxHpAll(5);
          R.damageActive(12);
          return '속은 뒤집혔지만 몸이 단단해졌다.';
        },
      },
    ],
  },

  tm: {
    ko: '버려진 기술머신',
    text: '바위 틈에 기술머신이 끼어 있다. 한 번은 쓸 수 있을 것 같다.',
    weight: 2,
    choices: [
      {
        label: '기술을 강화한다',
        desc: () => '카드 한 장을 강화한다.',
        effect: (R) => { R.openUpgrade(); return null; },   // null = UI가 카드 선택을 띄운다
      },
      {
        label: '분해해서 판다',
        desc: () => '돈을 40 얻는다.',
        effect: (R) => { R.addGold(40); return '부품이 제법 값을 쳤다.'; },
      },
    ],
  },

  oldchest: {
    ko: '낡은 상자',
    text: '이끼 낀 상자가 놓여 있다. 자물쇠는 이미 부서졌고, 안쪽이 어둡다.',
    weight: 2,
    choices: [
      {
        label: '손을 넣는다',
        desc: () => '지닌 도구를 하나 얻지만 선두 포켓몬이 14의 피해를 입는다.',
        effect: (R) => {
          const got = R.grantRandomRelic();
          R.damageActive(14);
          return got ? `무언가에 물렸다. 하지만 ${got}을(를) 손에 넣었다.` : '무언가에 물렸다. 상자는 비어 있었다.';
        },
      },
      {
        label: '돈만 챙긴다',
        desc: () => '돈을 30 얻는다.',
        effect: (R) => { R.addGold(30); return '동전 몇 닢이 굴러 나왔다.'; },
      },
      { label: '건드리지 않는다', desc: () => '아무 일도 없다.', effect: () => '그냥 지나쳤다.' },
    ],
  },

  shrine: {
    ko: '오래된 사당',
    text: '누군가 오래전에 세운 돌탑이다. 여기서 기술 하나를 잊을 수 있을 것 같다.',
    weight: 2,
    choices: [
      {
        label: '기술을 잊는다',
        desc: () => '덱에서 카드 한 장을 없앤다.',
        effect: (R) => { R.openRemove(); return null; },
      },
      {
        label: '돈을 바친다',
        desc: () => '돈 70을 내고 파티 전원을 완전히 회복한다.',
        enabled: (R) => R.gold >= 70,
        effect: (R) => { R.addGold(-70); R.healAll(999); return '따뜻한 기운이 파티를 감쌌다.'; },
      },
      { label: '기도만 한다', desc: () => '아무 일도 없다.', effect: () => '조용히 기도하고 떠났다.' },
    ],
  },

  trainer: {
    ko: '길목의 트레이너',
    text: '"거기 너! 눈이 마주쳤으니 승부다!"',
    weight: 2,
    choices: [
      {
        label: '승부한다',
        desc: () => '엘리트 전투를 치른다. 이기면 도구와 큰 상금.',
        effect: (R) => { R.startElite(); return null; },
      },
      {
        label: '못 본 척한다',
        desc: () => '돈 30을 잃는다. (도망치며 흘렸다)',
        effect: (R) => { R.addGold(-Math.min(30, R.gold)); return '뒤에서 뭐라고 외치는 소리가 들렸다.'; },
      },
    ],
  },

  center: {
    ko: '이동식 회복기',
    text: '낡았지만 아직 돌아가는 회복기다. 전력이 한 번 분량 남아 있다.',
    weight: 1,
    choices: [
      {
        label: '파티를 회복한다',
        desc: () => '파티 전원의 HP를 절반 회복한다.',
        effect: (R) => { R.healAllPercent(0.5); return '삐빅— 전력이 반쯤에서 끊겼다.' },
      },
      {
        label: '전력을 뽑아 쓴다',
        desc: () => '최대 HP가 7 오른다. 회복은 없다.',
        effect: (R) => { R.raiseMaxHpAll(7); return '어딘가 몸이 든든해졌다.' },
      },
    ],
  },
};

export const ALL_EVENT_IDS = Object.keys(EVENTS);

/** 가중치를 반영해 ? 방 하나를 고른다 */
export function pickEvent(rng, seen = []) {
  const pool = ALL_EVENT_IDS.filter((id) => !seen.includes(id));
  const use = pool.length ? pool : ALL_EVENT_IDS;
  return rng.weighted(use.map((id) => ({ id, weight: EVENTS[id].weight ?? 1 }))).id;
}
