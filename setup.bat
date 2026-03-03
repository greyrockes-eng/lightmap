@echo off
REM ============================================
REM LIGHTMAP SETUP SCRIPT
REM Run this from C:\Users\TonyGriffith\Documents\LightMap
REM ============================================

echo.
echo === Installing dependencies ===
echo.

REM Core dependencies
call npm install @supabase/supabase-js @anthropic-ai/sdk three @types/three

REM Dev dependencies  
call npm install -D @types/three

echo.
echo === Dependencies installed! ===
echo.
echo === Next steps: ===
echo.
echo 1. Copy the files Claude generated into these locations:
echo.
echo    .env.example          → C:\Users\TonyGriffith\Documents\LightMap\.env.example
echo    .env.example          → C:\Users\TonyGriffith\Documents\LightMap\.env.local (and fill in your keys)
echo    README.md             → C:\Users\TonyGriffith\Documents\LightMap\README.md
echo    supabase-client.ts    → C:\Users\TonyGriffith\Documents\LightMap\src\lib\supabase.ts
echo    moderate-route.ts     → C:\Users\TonyGriffith\Documents\LightMap\src\app\api\moderate\route.ts
echo    supabase-schema.sql   → Run in Supabase SQL Editor (not a local file)
echo.
echo 2. Go to your Supabase dashboard → SQL Editor → paste supabase-schema.sql → Run
echo.
echo 3. Go to Supabase → Settings → API → Copy your Project URL and anon key into .env.local
echo.
echo 4. Run: npm run dev
echo.
pause
