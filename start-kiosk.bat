@echo off
REM =============================================
REM Sınıf Paneli - Kiosk Modu Başlatıcı
REM Chrome'u tam ekran kiosk modunda açar
REM =============================================

echo Sinif Paneli Kiosk Modu Baslatiliyor...

REM Sunucuyu başlat (arka planda)
start /B node backend/server.js

REM 3 saniye bekle (sunucu başlasın)
timeout /t 3 /nobreak > nul

REM Chrome'u kiosk modunda aç
REM --kiosk: Tam ekran, adres çubuğu yok
REM --disable-infobars: Bilgi çubuklarını gizle
REM --disable-session-crashed-bubble: Çökme uyarısını gizle

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-infobars --disable-session-crashed-bubble --disable-translate --noerrdialogs --disable-pinch --overscroll-history-navigation=0 http://localhost:3000

echo.
echo Panel acildi! Kapatmak icin Alt+F4 kullanin.
