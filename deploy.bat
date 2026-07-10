@echo off
echo ========================================================
echo   Evaluasi Kegiatan - Deploy ke Oracle Cloud VM
echo   Target: 168.110.208.72:/home/opc/Evaluasi-Kegiatan
echo ========================================================
echo.

set SSH_KEY=D:\2026\Gemini Environment\GASPOL-Backend\ssh-key-2026-06-05.key
set SSH_OPTS=-o StrictHostKeyChecking=no
set REMOTE=opc@168.110.208.72

echo [1/4] Membungkus file proyek ke evaluasi-deploy.tar.gz...
tar.exe -czvf evaluasi-deploy.tar.gz server.js package.json config routes controllers views templates public
if %errorlevel% neq 0 (echo GAGAL membungkus file! & exit /b 1)

echo.
echo [2/4] Membuat folder remote dan mengunggah...
ssh -i "%SSH_KEY%" %SSH_OPTS% %REMOTE% "mkdir -p /home/opc/Evaluasi-Kegiatan"
scp -i "%SSH_KEY%" %SSH_OPTS% evaluasi-deploy.tar.gz %REMOTE%:/home/opc/Evaluasi-Kegiatan/
if %errorlevel% neq 0 (echo GAGAL mengunggah! & exit /b 1)

echo.
echo [3/4] Mengeksekusi di server: extract, install deps, start PM2...
ssh -i "%SSH_KEY%" %SSH_OPTS% %REMOTE% "cd /home/opc/Evaluasi-Kegiatan && tar -xzvf evaluasi-deploy.tar.gz && npm install --production && (pm2 describe Evaluasi-Kegiatan > /dev/null 2>&1 && pm2 restart Evaluasi-Kegiatan || pm2 start server.js --name Evaluasi-Kegiatan) && pm2 save"
if %errorlevel% neq 0 (echo GAGAL eksekusi remote! & exit /b 1)

echo.
echo [4/4] Verifikasi port 4001...
timeout /t 3 /nobreak > nul
ssh -i "%SSH_KEY%" %SSH_OPTS% %REMOTE% "curl -s http://localhost:4001 > /dev/null && echo 'Port 4001 merespons!'"

echo.
echo ========================================================
echo   Deploy Node.js Evaluasi selesai! 
echo   Pastikan Anda memperbarui Nginx di VM agar mengarah ke 4001.
echo ========================================================
