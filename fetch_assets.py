# ─────────────────────────────────────────────────────────────
# fetch_assets.py — 그림 자산을 PokeAPI 에서 받아 온다
#
# 이 저장소에는 포켓몬·아이템 그림이 들어 있지 않다. 닌텐도·게임프리크의
# 저작물이라 재배포하지 않기 위해서다. 대신 받아 오는 방법만 담아 둔다 —
# 팬 프로젝트에서 흔히 쓰는 방식이다.
#
#   py fetch_assets.py
#
# 안 받아도 게임은 돌아간다. render/pokemonSprites.js 에 코드로 찍은 도트가
# 대체 그림으로 들어 있어서, 자산이 없으면 그쪽으로 떨어진다.
#
# 받아 온 그림은 개인적으로 돌려보는 범위에서만 쓸 것. 공개 배포하거나
# 수익화하려면 오리지널로 갈아야 한다 (README 의 IP 항목 참고).
# ─────────────────────────────────────────────────────────────
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.abspath(__file__))
SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'

# 종 id → 전국도감 번호
POKEMON = {
    'bulbasaur': 1, 'charmander': 4, 'squirtle': 7, 'caterpie': 10, 'weedle': 13,
    'beedrill': 15, 'pidgey': 16, 'rattata': 19, 'ekans': 23, 'arbok': 24,
    'pikachu': 25, 'sandshrew': 27, 'vulpix': 37, 'zubat': 41, 'oddish': 43,
    'mankey': 56, 'primeape': 57, 'poliwag': 60, 'abra': 63, 'machop': 66,
    'geodude': 74, 'magnemite': 81, 'gastly': 92, 'onix': 95,
}

# 지닌 도구·UI 에 쓰는 아이템 스프라이트
ITEMS = [
    'charcoal', 'mystic-water', 'miracle-seed', 'magnet', 'silk-scarf', 'power-anklet',
    'assault-vest', 'oran-berry', 'amulet-coin', 'rare-candy', 'quick-powder', 'everstone',
    'light-clay', 'escape-rope', 'flame-orb', 'toxic-orb', 'scope-lens', 'choice-band',
    'focus-sash', 'leftovers', 'moon-stone', 'fire-stone', 'water-stone', 'thunder-stone',
    'leaf-stone', 'master-ball', 'soothe-bell', 'shell-bell', 'metal-coat', 'lucky-egg',
    'poke-ball', 'great-ball', 'ultra-ball', 'potion', 'super-potion', 'full-restore',
    'revive', 'repel', 'tm-normal', 'tm-fire', 'tm-water', 'tm-grass', 'tm-electric',
]


def grab(url, dst):
    """이미 있으면 건너뛴다 — 여러 번 돌려도 안전하다"""
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return ('skip', dst)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'pokemon-spire/1.0'})
        data = urllib.request.urlopen(req, timeout=30).read()
        if not data:
            return ('fail', f'{dst}: 빈 응답')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as f:
            f.write(data)
        return ('ok', dst)
    except Exception as e:
        return ('fail', f'{os.path.basename(dst)}: {e.__class__.__name__}')


def main():
    jobs = []
    for name, dex in POKEMON.items():
        jobs.append((f'{SPRITES}/pokemon/other/official-artwork/{dex}.png',
                     os.path.join(ROOT, 'src', 'assets', 'pokemon', f'{name}.png')))
    for slug in ITEMS:
        jobs.append((f'{SPRITES}/items/{slug}.png',
                     os.path.join(ROOT, 'src', 'assets', 'items', f'{slug}.png')))

    print(f'{len(jobs)}개를 받는다…')
    # 한 번에 여덟 개씩 — 순서대로 받으면 1분 넘게 걸린다
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda j: grab(*j), jobs))

    ok = sum(1 for s, _ in results if s == 'ok')
    skip = sum(1 for s, _ in results if s == 'skip')
    fails = [m for s, m in results if s == 'fail']

    print(f'받음 {ok} · 이미 있음 {skip} · 실패 {len(fails)}')
    for m in fails:
        print('  -', m)
    if fails:
        print('\n실패한 것이 있어도 게임은 돌아간다. 그 종만 도트 대체 그림으로 나온다.')
        sys.exit(1)
    print('\n끝. 이제 `py serve.py` 로 띄우면 된다.')


if __name__ == '__main__':
    main()
