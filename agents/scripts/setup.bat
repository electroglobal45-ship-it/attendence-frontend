@echo off
echo Setting up Multi-Agent System...
echo.

echo Installing dependencies...
call npm install

echo.
echo Building TypeScript files...
call npm run build

echo.
echo Creating directories...
if not exist "memory" mkdir memory
if not exist "skills" mkdir skills
if not exist "logs" mkdir logs

echo.
echo Setup complete!
echo.
echo Next steps:
echo   1. Review config/agent-config.json
echo   2. Run examples: node dist/examples/usage-example.js
echo   3. Try CLI: npm run execute code-generation "Your task"
echo.
pause
