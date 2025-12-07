@echo off
chcp 65001 >nul
title Sınıf Paneli - Başlatılıyor...
color 0A

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║                                                           ║
echo  ║            🎓 SINIF PANELİ BAŞLATILIYOR...               ║
echo  ║                                                           ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: Mevcut dizini belirle
set "BASEDIR=%~dp0"
cd /d "%BASEDIR%"

:: Node.js'i bul (önce portable, sonra sistem)
set "NODE_EXE="

:: 1. Portable Node.js kontrol
if exist "%BASEDIR%runtime\node\node.exe" (
    set "NODE_EXE=%BASEDIR%runtime\node\node.exe"
    echo  [✓] Portable Node.js bulundu
) else (
    :: 2. Sistem Node.js kontrol
    where node >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "NODE_EXE=node"
        echo  [✓] Sistem Node.js bulundu
    ) else (
        echo.
        echo  [✗] HATA: Node.js bulunamadı!
        echo.
        echo  Çözüm seçenekleri:
        echo  1. runtime\node klasörüne portable Node.js kopyalayın
        echo  2. veya nodejs.org adresinden Node.js kurun
        echo.
        pause
        exit /b 1
    )
)

:: Sunucuyu arka planda başlat
echo  [~] Sunucu başlatılıyor...
start /B "" "%NODE_EXE%" "%BASEDIR%backend\server.js"

:: Sunucunun başlaması için bekle
echo  [~] Sunucu hazırlanıyor (3 saniye)...
timeout /t 3 /nobreak >nul

:: Bağlantıyı test et
echo  [~] Bağlantı kontrol ediliyor...

:: Tarayıcıyı aç
echo  [~] Tarayıcı açılıyor...

:: Chrome'un olası konumları
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

:: Chrome varsa kiosk modunda aç, yoksa varsayılan tarayıcı
if defined CHROME_PATH (
    echo  [✓] Chrome bulundu - Kiosk modu açılıyor
    start "" "%CHROME_PATH%" --kiosk --disable-infobars --disable-session-crashed-bubble --disable-translate --noerrdialogs --disable-pinch --overscroll-history-navigation=0 --app=http://localhost:3000
) else (
    echo  [!] Chrome bulunamadı - Varsayılan tarayıcı açılıyor
    start http://localhost:3000
)

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║                                                           ║
echo  ║            ✓ SINIF PANELİ BAŞLATILDI!                    ║
echo  ║                                                           ║
echo  ║  Ana Panel:   http://localhost:3000                       ║
echo  ║  Admin Panel: http://localhost:3000/admin                 ║
echo  ║                                                           ║
echo  ║  Kapatmak için: Kapat.bat dosyasını çalıştırın           ║
echo  ║                 veya bu pencereyi kapatın                 ║
echo  ║                                                           ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: Sunucu çalışırken bekle (pencere kapanmasın)
echo  Sunucu çalışıyor... (Bu pencereyi kapatmayın)
echo.

:: Sunucu sürecini bekle
:waitloop
timeout /t 5 /nobreak >nul
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %ERRORLEVEL% EQU 0 goto waitloop

echo  Sunucu durdu. Pencere kapanıyor...
timeout /t 2 /nobreak >nul
