@echo off
chcp 65001 >nul
title Sınıf Paneli - Kapatılıyor...
color 0C

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║                                                           ║
echo  ║            🛑 SINIF PANELİ KAPATILIYOR...                ║
echo  ║                                                           ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: Node.js süreçlerini kapat
echo  [~] Sunucu durduruluyor...
taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [✓] Sunucu durduruldu
) else (
    echo  [!] Sunucu zaten çalışmıyordu
)

:: Chrome kiosk pencerelerini kapat (opsiyonel)
echo  [~] Kiosk penceresi kapatılıyor...
taskkill /F /FI "WINDOWTITLE eq localhost:3000*" >nul 2>&1

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║                                                           ║
echo  ║            ✓ SINIF PANELİ KAPATILDI                      ║
echo  ║                                                           ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

timeout /t 2 /nobreak >nul
