@echo off
REM ============================================================
REM APlusZ — Step 11: Git Init + Push to GitHub
REM File: git-init.bat
REM Save: D:\Destop\AplusZ\git-init.bat
REM Run: double-click OR `git-init.bat` from cmd
REM ============================================================

cd /d D:\Destop\AplusZ

echo.
echo === APlusZ Git Setup ===
echo.

REM 1. Initialize git
git init -b main

REM 2. Stage all
git add .

REM 3. First commit
git commit -m "Initial APlusZ build — steps 1-9 (frontend + PWA + i18n + result card)"

REM 4. Add remote (EDIT THIS LINE with your GitHub URL after creating the repo)
echo.
echo NEXT STEPS:
echo   1. Go to https://github.com/new
echo   2. Repo name: aplusz
echo   3. Set to PUBLIC (so GitHub Actions cron is unlimited free)
echo   4. Do NOT initialize with README, .gitignore, or license
echo   5. Click "Create repository"
echo   6. Copy the URL (looks like: https://github.com/YOUR_USERNAME/aplusz.git)
echo   7. Run these two commands manually:
echo.
echo      git remote add origin https://github.com/YOUR_USERNAME/aplusz.git
echo      git push -u origin main
echo.
pause
