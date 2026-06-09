@echo off
echo Clearing Next.js cache and rebuilding...
echo.

echo Step 1: Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Deleting .next folder...
if exist .next (
    rmdir /s /q .next
    echo .next folder deleted
) else (
    echo .next folder not found
)

echo Step 3: Deleting node_modules/.cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo node_modules\.cache deleted
) else (
    echo node_modules\.cache not found
)

echo.
echo Cache cleared! Now run: npm run dev
echo Then open browser and press Ctrl+Shift+R to hard refresh
echo.
pause
