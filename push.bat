@echo off
chcp 949 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo   포켓스파이어 - GitHub 푸시
echo   ==========================
echo.

rem git 이 있는지
where git >nul 2>&1
if errorlevel 1 (
  echo   [!] git 이 설치되어 있지 않습니다.
  echo       https://git-scm.com/download/win 에서 받으세요.
  goto :end
)

rem 이름 메일이 설정돼 있는지 (없으면 커밋이 실패한다)
for /f "delims=" %%i in ('git config user.name 2^>nul') do set "GITNAME=%%i"
if "!GITNAME!"=="" (
  echo   [!] git 사용자 정보가 없습니다. 한 번만 설정하면 됩니다:
  echo.
  echo       git config --global user.name "이름"
  echo       git config --global user.email "메일주소"
  echo.
  goto :end
)

rem 처음이면 저장소를 만든다
if not exist ".git" (
  echo   처음 실행입니다. 저장소를 만듭니다...
  git init -q
  git branch -M main
)

rem 원격이 없으면 붙인다
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin https://github.com/JamMnG/poket-spire.git
  echo   원격 연결: https://github.com/JamMnG/poket-spire.git
)

rem 커밋 메시지: 인자로 주면 그것, 없으면 날짜시각
rem   예)  push.bat 카드 밸런스 조정
set "MSG=%*"
if "!MSG!"=="" (
  for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format \"yyyy-MM-dd HH:mm\""') do set "STAMP=%%i"
  set "MSG=업데이트 !STAMP!"
)

rem 커밋
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "!MSG!"
  if errorlevel 1 (
    echo   [!] 커밋에 실패했습니다.
    goto :end
  )
  echo   커밋: !MSG!
) else (
  echo   바뀐 내용이 없습니다. 푸시만 시도합니다.
)

rem 푸시
echo.
echo   푸시하는 중...
git push -u origin main
if errorlevel 1 (
  echo.
  echo   [!] 푸시에 실패했습니다. 흔한 원인:
  echo       - 로그인 창이 떴다면 GitHub 계정으로 로그인해 주세요.
  echo       - 원격에 다른 커밋이 있으면 아래를 실행한 뒤 다시 시도하세요:
  echo             git pull --rebase origin main
) else (
  echo.
  echo   완료.  https://github.com/JamMnG/poket-spire
)

:end
echo.
pause
endlocal
