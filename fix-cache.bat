@echo off
echo Fixing Next.js cache issues...
echo.

echo Step 1: Removing .next folder...
if exist .next (
    rmdir /s /q .next
    echo .next folder removed
) else (
    echo .next folder not found
)

echo.
echo Step 2: Removing node_modules/.cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo node_modules\.cache removed
) else (
    echo node_modules\.cache not found
)

echo.
echo Step 3: Starting development server...
npm run dev

pause
