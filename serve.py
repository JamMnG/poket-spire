# ─────────────────────────────────────────────────────────────
# serve.py — 개발용 정적 서버
#
# `py -m http.server` 는 캐시 헤더를 붙이지 않아서, 브라우저가 ES 모듈을
# 붙들고 옛 코드를 계속 실행한다. 파일을 고치고 새로고침해도 화면이 그대로라
# "왜 안 고쳐지지" 로 시간을 태우게 되는데, 실제로 두 번 당했다 —
# 한 번은 밸런스 수치를 옛 코드로 재서 결론까지 틀렸다.
#
# 그래서 매 응답에 no-store 를 붙인다. 개발용이므로 느려도 상관없다.
#
#   py serve.py            # 기본 5176 포트
#   py serve.py 8080       # 포트 지정
# ─────────────────────────────────────────────────────────────
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5176
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    # 조건부 요청 헤더를 지운다 — 304 로 돌아오면 결국 옛 파일을 쓰게 된다
    def send_head(self):
        for h in ('If-Modified-Since', 'If-None-Match'):
            if h in self.headers:
                del self.headers[h]
        return super().send_head()

    def log_message(self, fmt, *args):
        # 404 만 알린다. 정상 요청까지 찍으면 콘솔이 묻힌다.
        if args and str(args[1]).startswith('4'):
            sys.stderr.write('  404  %s\n' % (args[0],))


if __name__ == '__main__':
    print(f'포켓스파이어 → http://localhost:{PORT}   (캐시 없음, Ctrl+C 로 종료)')
    ThreadingHTTPServer(('127.0.0.1', PORT), NoCacheHandler).serve_forever()
