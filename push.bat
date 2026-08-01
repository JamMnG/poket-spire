@echo off
chcp 949 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo   포켓스파이어 - GitHub 푸시
echo   ==========================
echo.

rem ── git 이 있는지 ────────────────────────────────────────
where git >nul 2>&1
if errorlevel 1 (
  echo   [X] git 이 설치되어 있지 않습니다.
  echo       https://git-scm.com/download/win 에서 받으세요.
  goto :end
)

rem ── 이름·메일이 잡혀 있는지 (없으면 커밋이 실패한다) ─────
for /f "delims=" %%i in ('git config user.name 2^>nul') do set "GITNAME=%%i"
if "!GITNAME!"=="" (
  echo   [X] git 사용자 정보가 없습니다. 이 두 줄을 먼저 실행하세요:
  echo.
  echo       git config --global user.name "이름"
  echo       git config --global user.email "메일주소"
  echo.
  goto :end
)

rem ── 처음이면 저장소를 만든다 ─────────────────────────────
if not exist ".git" (
  echo   처음 실행입니다. 저장소를 만듭니다...
  git init -q
  git branch -M main
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin https://github.com/JamMnG/poket-spire.git
  echo   원격 연결: https://github.com/JamMnG/poket-spire.git
)

rem ── 무엇이 올라가는지 먼저 보여 준다 ─────────────────────
git add -A
git diff --cached --quiet
if errorlevel 1 (
  echo   올라갈 파일:
  git diff --cached --name-status
  echo.
) else (
  echo   바뀐 파일이 없습니다. 푸시만 시도합니다.
  echo.
  goto :dopush
)

rem ── 아트워크가 딸려 들어가는지 확인 ──────────────────────
rem   이 저장소는 공개다. 닌텐도·게임프리크 그림이 한 번이라도 올라가면
rem   커밋 기록에 영원히 남으므로, 올리기 전에 여기서 끊는다.
set "ART="
for /f "delims=" %%i in ('git diff --cached --name-only ^| findstr /i "src/assets/"') do set "ART=%%i"
if not "!ART!"=="" (
  echo   [X] 중단합니다. 그림 자산이 커밋에 들어가 있습니다:
  echo       !ART!
  echo.
  echo       이 저장소는 공개라 포켓몬 아트워크를 올리면 안 됩니다.
  echo       .gitignore 에 src/assets/ 가 있는지 확인하고,
  echo       이미 추적 중이라면 아래로 빼내세요:
  echo             git rm -r --cached src/assets
  git reset -q
  goto :end
)

rem ── 커밋 메시지: 인자로 주면 그것, 없으면 날짜시각 ───────
rem   예)  push.bat 3막 밸런스 조정
set "MSG=%*"
if "!MSG!"=="" (
  for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format \"yyyy-MM-dd HH:mm\""') do set "STAMP=%%i"
  set "MSG=업데이트 !STAMP!"
)

git commit -q -m "!MSG!"
if errorlevel 1 (
  echo   [X] 커밋에 실패했습니다.
  goto :end
)
for /f "delims=" %%i in ('git rev-parse --short HEAD') do set "SHA=%%i"
echo   커밋 !SHA! : !MSG!
echo.

:dopush
echo   푸시하는 중...
git push -u origin main
if errorlevel 1 (
  echo.
  echo   [X] 푸시에 실패했습니다. 흔한 원인:
  echo       - 로그인 창이 떴다면 GitHub 계정으로 로그인해 주세요.
  echo       - 원격에 다른 커밋이 있으면 아래로 합친 뒤 다시 시도하세요:
  echo             git pull --rebase origin main
  goto :end
)

echo.
echo   완료.
echo     저장소  https://github.com/JamMnG/poket-spire
echo     배포    https://poket-spire.vercel.app/  ^(Vercel 이 자동으로 올립니다^)

:end
echo.
pause
endlocal
